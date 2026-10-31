import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import AnalyticsOverviewResponse
from app.services.analytics_service import AnalyticsService
from app.models.models import Ticket, Message, User, UserRole
from app.api.deps import require_role

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    return AnalyticsService.get_overview_metrics(db)

@router.get("/export-csv")
def export_tickets_csv(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ticket Number", "Subject", "Priority", "Status",
        "Customer Name", "Assigned Agent", "Created At", "Resolved At"
    ])

    for t in tickets:
        writer.writerow([
            t.ticket_number,
            t.subject,
            t.priority.value if hasattr(t.priority, "value") else str(t.priority),
            t.status.value if hasattr(t.status, "value") else str(t.status),
            t.customer.full_name if t.customer else "Guest",
            t.assigned_agent.full_name if t.assigned_agent else "Unassigned",
            t.created_at.isoformat() if t.created_at else "",
            t.resolved_at.isoformat() if t.resolved_at else ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=supportiq_tickets.csv"}
    )
