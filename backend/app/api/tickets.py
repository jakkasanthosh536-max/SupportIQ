import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    Ticket, TicketNote, Conversation, User, UserRole,
    TicketStatus, TicketPriority, KnowledgeGap, GapStatus
)
from app.schemas.schemas import (
    TicketCreate, TicketUpdate, TicketResponse, TicketDetailResponse,
    TicketNoteCreate, TicketNoteResponse, ConversationDetailResponse,
    ChatMessageResponse, CitationItem
)
from app.api.deps import get_current_user, require_role, get_optional_current_user
from app.services.gap_service import GapService

router = APIRouter(prefix="/tickets", tags=["Support Tickets"])

def generate_ticket_number() -> str:
    return f"TICK-{random.randint(10000, 99999)}"

@router.get("", response_model=List[TicketResponse])
def get_tickets(
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Ticket)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Ticket.customer_id == current_user.id)
    else:
        if assigned_to_me:
            query = query.filter(Ticket.assigned_agent_id == current_user.id)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)

    tickets = query.order_by(Ticket.created_at.desc()).all()
    results = []
    for t in tickets:
        resp = TicketResponse.model_validate(t)
        resp.customer_name = t.customer.full_name if t.customer else "Guest Customer"
        resp.customer_email = t.customer.email if t.customer else "guest@example.com"
        resp.assigned_agent_name = t.assigned_agent.full_name if t.assigned_agent else "Unassigned"
        resp.notes_count = len(t.notes)
        results.append(resp)
    return results

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Prevent duplicate tickets for the same active conversation
    if ticket_in.conversation_id:
        existing_ticket = db.query(Ticket).filter(
            Ticket.conversation_id == ticket_in.conversation_id,
            Ticket.status.in_([
                TicketStatus.OPEN,
                TicketStatus.IN_PROGRESS,
                TicketStatus.WAITING_FOR_CUSTOMER
            ])
        ).first()
        if existing_ticket:
            resp = TicketResponse.model_validate(existing_ticket)
            resp.customer_name = existing_ticket.customer.full_name if existing_ticket.customer else "Guest Customer"
            resp.customer_email = existing_ticket.customer.email if existing_ticket.customer else "guest@example.com"
            resp.assigned_agent_name = existing_ticket.assigned_agent.full_name if existing_ticket.assigned_agent else "Unassigned"
            resp.notes_count = len(existing_ticket.notes)
            return resp

    ticket_number = generate_ticket_number()
    while db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first():
        ticket_number = generate_ticket_number()

    ticket = Ticket(
        ticket_number=ticket_number,
        customer_id=current_user.id if current_user else None,
        subject=ticket_in.subject,
        issue_description=ticket_in.issue_description,
        priority=ticket_in.priority,
        status=TicketStatus.OPEN,
        conversation_id=ticket_in.conversation_id,
        escalation_reason=ticket_in.escalation_reason
    )
    db.add(ticket)

    # If linked to conversation, mark it escalated
    if ticket_in.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == ticket_in.conversation_id).first()
        if conv:
            conv.is_escalated = True
            # Log gap with ticket link
            GapService.record_or_update_gap(
                db=db,
                question=ticket_in.subject,
                related_ticket_id=ticket.id
            )

    db.commit()
    db.refresh(ticket)

    resp = TicketResponse.model_validate(ticket)
    resp.customer_name = ticket.customer.full_name if ticket.customer else "Guest Customer"
    resp.customer_email = ticket.customer.email if ticket.customer else "guest@example.com"
    resp.assigned_agent_name = "Unassigned"
    resp.notes_count = 0
    return resp

@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this ticket.")

    # Filter internal notes if customer
    notes_list = []
    for n in ticket.notes:
        if current_user.role == UserRole.CUSTOMER and n.is_internal:
            continue
        notes_list.append(
            TicketNoteResponse(
                id=n.id,
                ticket_id=n.ticket_id,
                note=n.note,
                is_internal=n.is_internal,
                author_name=n.author.full_name if n.author else "System Agent",
                created_at=n.created_at
            )
        )

    # Format linked conversation if present
    conv_detail = None
    if ticket.conversation:
        c_msgs = []
        for m in ticket.conversation.messages:
            cit_items = [
                CitationItem(
                    article_id=c.article_id,
                    article_title=c.article_title,
                    excerpt=c.excerpt,
                    relevance_score=c.relevance_score
                ) for c in m.citations
            ]
            c_msgs.append(
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
        conv_detail = ConversationDetailResponse(
            id=ticket.conversation.id,
            title=ticket.conversation.title,
            is_escalated=ticket.conversation.is_escalated,
            created_at=ticket.conversation.created_at,
            updated_at=ticket.conversation.updated_at,
            message_count=len(c_msgs),
            messages=c_msgs
        )

    resp = TicketDetailResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        issue_description=ticket.issue_description,
        priority=ticket.priority,
        status=ticket.status,
        customer_id=ticket.customer_id,
        customer_name=ticket.customer.full_name if ticket.customer else "Guest Customer",
        customer_email=ticket.customer.email if ticket.customer else "guest@example.com",
        assigned_agent_id=ticket.assigned_agent_id,
        assigned_agent_name=ticket.assigned_agent.full_name if ticket.assigned_agent else "Unassigned",
        conversation_id=ticket.conversation_id,
        escalation_reason=ticket.escalation_reason,
        resolution_summary=ticket.resolution_summary,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        notes_count=len(notes_list),
        notes=notes_list,
        conversation=conv_detail
    )
    return resp

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_in: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if current_user.role == UserRole.CUSTOMER:
        if ticket.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this ticket.")
        # Customers can only resolve or close their own ticket
        if ticket_in.status:
            if ticket_in.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                raise HTTPException(status_code=403, detail="Customers can only mark tickets as resolved or closed.")
            ticket.status = ticket_in.status
            if not ticket.resolved_at:
                ticket.resolved_at = datetime.now(timezone.utc)
        if ticket_in.priority is not None or ticket_in.assigned_agent_id is not None:
            raise HTTPException(status_code=403, detail="Customers cannot change ticket priority or assign agents.")
    else:
        # Admins and agents have full control
        if ticket_in.subject is not None:
            ticket.subject = ticket_in.subject
        if ticket_in.issue_description is not None:
            ticket.issue_description = ticket_in.issue_description
        if ticket_in.status is not None:
            ticket.status = ticket_in.status
            if ticket_in.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                if not ticket.resolved_at:
                    ticket.resolved_at = datetime.now(timezone.utc)
                # Auto-resolve any knowledge gaps directly linked to this ticket
                linked_gaps = db.query(KnowledgeGap).filter(
                    KnowledgeGap.related_ticket_id == ticket.id,
                    KnowledgeGap.status.in_([GapStatus.DETECTED, GapStatus.REVIEWED])
                ).all()
                for gap in linked_gaps:
                    gap.status = GapStatus.RESOLVED
        if ticket_in.priority is not None:
            ticket.priority = ticket_in.priority
        if ticket_in.assigned_agent_id is not None:
            ticket.assigned_agent_id = ticket_in.assigned_agent_id
        if ticket_in.resolution_summary is not None:
            ticket.resolution_summary = ticket_in.resolution_summary

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    resp = TicketResponse.model_validate(ticket)
    resp.customer_name = ticket.customer.full_name if ticket.customer else "Guest Customer"
    resp.customer_email = ticket.customer.email if ticket.customer else "guest@example.com"
    resp.assigned_agent_name = ticket.assigned_agent.full_name if ticket.assigned_agent else "Unassigned"
    resp.notes_count = len(ticket.notes)
    return resp

@router.post("/{ticket_id}/notes", response_model=TicketNoteResponse, status_code=status.HTTP_201_CREATED)
def add_ticket_note(
    ticket_id: int,
    note_in: TicketNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if current_user.role == UserRole.CUSTOMER:
        if ticket.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to post notes on this ticket.")
        # Customer notes are always public replies
        is_internal = False
        # If ticket was waiting on customer, move to in_progress
        if ticket.status == TicketStatus.WAITING_FOR_CUSTOMER:
            ticket.status = TicketStatus.IN_PROGRESS
    else:
        is_internal = note_in.is_internal

    note = TicketNote(
        ticket_id=ticket.id,
        author_id=current_user.id,
        note=note_in.note.strip(),
        is_internal=is_internal
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    resp = TicketNoteResponse.model_validate(note)
    resp.author_name = current_user.full_name
    return resp

