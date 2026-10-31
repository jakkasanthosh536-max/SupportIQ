from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.models.models import (
    Conversation, Message, MessageCitation, AnswerFeedback,
    User, UserRole
)
from app.schemas.schemas import (
    ChatMessageCreate, ChatMessageResponse, ConversationResponse,
    ConversationDetailResponse, FeedbackCreate, CitationItem
)
from app.api.deps import get_optional_current_user, get_current_user
from app.services.retrieval_service import RetrievalService
from app.services.ai_service import AIService
from app.services.gap_service import GapService
from app.services.analytics_service import invalidate_metrics_cache

router = APIRouter(prefix="/chat", tags=["AI Support Chat"])

@router.post("", response_model=ChatMessageResponse)
def send_chat_message(
    chat_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    question_text = chat_in.content.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # 1. Retrieve or create conversation
    conversation = None
    if chat_in.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == chat_in.conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found.")

    if not conversation:
        title = question_text[:50] + ("..." if len(question_text) > 50 else "")
        conversation = Conversation(
            customer_id=current_user.id if current_user else None,
            title=title
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Record customer message
    user_msg = Message(
        conversation_id=conversation.id,
        sender_type="customer",
        content=question_text,
        processing_mode="user_input"
    )
    db.add(user_msg)
    db.commit()

    # 3. Retrieve relevant knowledge chunks
    retrieval_res = RetrievalService.search_knowledge(
        db=db,
        query=question_text,
        limit=4
    )

    sources = retrieval_res["results"]
    confidence = retrieval_res["confidence"]
    is_sufficient = retrieval_res["is_sufficient"]

    # 4. Generate grounded answer or abstain
    ai_result = AIService.generate_answer(
        question=question_text,
        retrieved_sources=sources,
        confidence_score=confidence,
        is_sufficient=is_sufficient
    )

    # 5. If abstention or low confidence, log knowledge gap
    if ai_result["is_abstention"] or not is_sufficient:
        GapService.record_or_update_gap(
            db=db,
            question=question_text
        )

    # 6. Save AI message
    ai_msg = Message(
        conversation_id=conversation.id,
        sender_type="ai",
        content=ai_result["answer"],
        confidence_score=ai_result["confidence_score"],
        processing_mode=ai_result["processing_mode"]
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    # 7. Save citations
    citation_items = []
    for cit in ai_result.get("citations", []):
        citation_obj = MessageCitation(
            message_id=ai_msg.id,
            article_id=cit["article_id"],
            article_title=cit["article_title"],
            excerpt=cit["excerpt"],
            relevance_score=cit["relevance_score"]
        )
        db.add(citation_obj)
        citation_items.append(
            CitationItem(
                article_id=cit["article_id"],
                article_title=cit["article_title"],
                article_slug=cit.get("article_slug"),
                excerpt=cit["excerpt"],
                relevance_score=cit["relevance_score"]
            )
        )
    db.commit()

    # Update conversation updated_at
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    invalidate_metrics_cache()

    return ChatMessageResponse(
        id=ai_msg.id,
        conversation_id=conversation.id,
        sender_type="ai",
        content=ai_msg.content,
        confidence_score=ai_msg.confidence_score,
        processing_mode=ai_msg.processing_mode,
        created_at=ai_msg.created_at,
        citations=citation_items
    )

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(Conversation).options(selectinload(Conversation.messages))
    if current_user and current_user.role == UserRole.CUSTOMER:
        query = query.filter(Conversation.customer_id == current_user.id)

    conversations = query.order_by(Conversation.updated_at.desc()).limit(20).all()
    results = []
    for c in conversations:
        resp = ConversationResponse.model_validate(c)
        resp.message_count = len(c.messages)
        results.append(resp)
    return results

@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    conversation = db.query(Conversation).options(
        selectinload(Conversation.messages).selectinload(Message.citations)
    ).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if current_user and current_user.role == UserRole.CUSTOMER and conversation.customer_id:
        if conversation.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this conversation.")

    # Build messages with citations
    msgs = []
    for m in conversation.messages:
        cit_items = [
            CitationItem(
                article_id=c.article_id,
                article_title=c.article_title,
                article_slug=c.article.slug if c.article else None,
                excerpt=c.excerpt,
                relevance_score=c.relevance_score
            ) for c in m.citations
        ]
        msgs.append(
            ChatMessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_type=m.sender_type,
                content=m.content,
                confidence_score=m.confidence_score,
                processing_mode=m.processing_mode,
                created_at=m.created_at,
                citations=cit_items
            )
        )

    resp = ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        is_escalated=conversation.is_escalated,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=len(msgs),
        messages=msgs
    )
    return resp

@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    fb_in: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    msg = db.query(Message).filter(Message.id == fb_in.message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    feedback = AnswerFeedback(
        message_id=fb_in.message_id,
        user_id=current_user.id if current_user else None,
        rating=fb_in.rating,
        comment=fb_in.comment
    )
    db.add(feedback)

    # Update article helpfulness counters
    for cit in msg.citations:
        if cit.article:
            if fb_in.rating > 0:
                cit.article.helpful_count += 1
            else:
                cit.article.unhelpful_count += 1

    # If negative feedback, record knowledge gap
    if fb_in.rating < 0:
        # Find preceding customer question
        prev_user_msg = db.query(Message).filter(
            Message.conversation_id == msg.conversation_id,
            Message.sender_type == "customer",
            Message.id < msg.id
        ).order_by(Message.id.desc()).first()

        if prev_user_msg:
            GapService.record_or_update_gap(
                db=db,
                question=prev_user_msg.content
            )

    db.commit()
    return {"status": "success", "message": "Feedback submitted successfully."}
