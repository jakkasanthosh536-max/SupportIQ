from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.models import Ticket, KnowledgeGap
from app.schemas.schemas import SearchResponse, SearchResultItem
from app.services.retrieval_service import RetrievalService

router = APIRouter(prefix="/search", tags=["Smart Search"])

@router.get("", response_model=SearchResponse)
def search_knowledge_base(
    q: str = Query(..., min_length=1, description="Search query string"),
    category_id: Optional[int] = Query(None, description="Optional category filter"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
    db: Session = Depends(get_db)
):
    items: List[SearchResultItem] = []

    # 1. Search knowledge articles (policies, FAQs, guides)
    retrieval_res = RetrievalService.search_knowledge(
        db=db,
        query=q,
        category_id=category_id,
        limit=limit,
        threshold=0.05 # Lower threshold for exploratory search
    )

    for r in retrieval_res["results"]:
        items.append(
            SearchResultItem(
                article_id=r["article_id"],
                title=r["title"],
                slug=r["slug"],
                category_name=r["category_name"],
                excerpt=r["excerpt"],
                score=r["score"],
                match_type=r["match_type"],
                tags=r.get("tags", []),
                item_type="article"
            )
        )

    # 2. If no category filter is specified, also search active Tickets and Knowledge Gaps
    if not category_id:
        # Search Tickets
        matching_tickets = (
            db.query(Ticket)
            .filter(
                or_(
                    Ticket.ticket_number.ilike(f"%{q}%"),
                    Ticket.subject.ilike(f"%{q}%"),
                    Ticket.issue_description.ilike(f"%{q}%")
                )
            )
            .limit(4)
            .all()
        )
        for t in matching_tickets:
            items.append(
                SearchResultItem(
                    article_id=0,
                    title=f"Ticket #{t.ticket_number}: {t.subject}",
                    slug=f"ticket-{t.id}",
                    category_name="Support Ticket",
                    excerpt=f"[{t.priority.upper()} | {t.status.upper()}] {t.issue_description[:160]}...",
                    score=0.95,
                    match_type="ticket_record",
                    tags=[t.priority, t.status],
                    item_type="ticket",
                    ticket_id=t.id,
                    ticket_number=t.ticket_number,
                    status=t.status
                )
            )

        # Search Knowledge Gaps / Unanswered Questions
        matching_gaps = (
            db.query(KnowledgeGap)
            .filter(
                or_(
                    KnowledgeGap.question.ilike(f"%{q}%"),
                    KnowledgeGap.topic.ilike(f"%{q}%")
                )
            )
            .limit(4)
            .all()
        )
        for g in matching_gaps:
            items.append(
                SearchResultItem(
                    article_id=0,
                    title=f"Knowledge Gap: {g.question}",
                    slug=f"gap-{g.id}",
                    category_name=f"Knowledge Gap ({g.topic})",
                    excerpt=g.suggested_action or "Unanswered customer inquiry identified as missing documentation.",
                    score=0.90,
                    match_type="gap_record",
                    tags=[g.topic, g.status],
                    item_type="gap",
                    status=g.status
                )
            )

    return SearchResponse(
        query=q,
        total_results=len(items),
        results=items[:limit]
    )

