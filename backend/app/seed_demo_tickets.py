import re
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.core.database import SessionLocal, engine
from app.models.models import (
    User, UserRole, Ticket, TicketStatus, TicketPriority, TicketNote
)
from app.services.analytics_service import invalidate_metrics_cache

DEMO_CUSTOMERS = [
    {"name": "Rahul Sharma", "email": "rahul.sharma@example.com"},
    {"name": "Priya Reddy", "email": "priya.reddy@example.com"},
    {"name": "Arjun Kumar", "email": "arjun.kumar@example.com"},
    {"name": "Sneha Patel", "email": "sneha.patel@example.com"},
    {"name": "Kiran Rao", "email": "kiran.rao@example.com"},
    {"name": "Ananya Singh", "email": "ananya.singh@example.com"},
    {"name": "Naveen Kumar", "email": "naveen.kumar@example.com"},
    {"name": "Divya Reddy", "email": "divya.reddy@example.com"},
    {"name": "Rohit Verma", "email": "rohit.verma@example.com"},
    {"name": "Meera Joshi", "email": "meera.joshi@example.com"},
]

DEMO_TICKETS = [
    {
        "ticket_number": "SUP-1001",
        "subject": "Order Not Delivered",
        "customer_name": "Rahul Sharma",
        "customer_email": "rahul.sharma@example.com",
        "category": "Orders & Shipping",
        "priority": TicketPriority.HIGH,
        "status": TicketStatus.OPEN,
        "issue_description": "My order was expected yesterday, but I have not received it.",
        "assigned_agent_email": None,
        "created_days_ago": 1,
        "notes": [
            {
                "author": "customer",
                "note": "Package tracking still indicates 'Out for Delivery' since yesterday 2 PM. Please check with logistics.",
                "is_internal": False,
                "hours_ago": 20
            }
        ]
    },
    {
        "ticket_number": "SUP-1002",
        "subject": "Refund Not Received",
        "customer_name": "Priya Reddy",
        "customer_email": "priya.reddy@example.com",
        "category": "Refunds",
        "priority": TicketPriority.HIGH,
        "status": TicketStatus.IN_PROGRESS,
        "issue_description": "My refund was approved five days ago, but the amount has not reached my bank account.",
        "assigned_agent_email": "agent@novastore.com",
        "created_days_ago": 3,
        "notes": [
            {
                "author": "agent",
                "note": "Payment gateway ARN reference #ARN-908231 generated. Bank processing delay detected on beneficiary bank side.",
                "is_internal": True,
                "hours_ago": 48
            },
            {
                "author": "agent",
                "note": "Hello Priya, refund ref #ARN-908231 was successfully processed from our end. It should reflect in your statement within 24-48 business hours.",
                "is_internal": False,
                "hours_ago": 24
            }
        ]
    },
    {
        "ticket_number": "SUP-1003",
        "subject": "Unable to Login",
        "customer_name": "Arjun Kumar",
        "customer_email": "arjun.kumar@example.com",
        "category": "Account & Login",
        "priority": TicketPriority.MEDIUM,
        "status": TicketStatus.OPEN,
        "issue_description": "I cannot log in even after resetting my password.",
        "assigned_agent_email": None,
        "created_days_ago": 2,
        "notes": [
            {
                "author": "customer",
                "note": "Password reset link from email opens to an expired session screen on Chrome mobile browser.",
                "is_internal": False,
                "hours_ago": 36
            }
        ]
    },
    {
        "ticket_number": "SUP-1004",
        "subject": "Payment Deducted Twice",
        "customer_name": "Sneha Patel",
        "customer_email": "sneha.patel@example.com",
        "category": "Payments",
        "priority": TicketPriority.HIGH,
        "status": TicketStatus.IN_PROGRESS,
        "issue_description": "My bank account was charged twice for one order.",
        "assigned_agent_email": "agent@novastore.com",
        "created_days_ago": 2,
        "notes": [
            {
                "author": "agent",
                "note": "Duplicate checkout transaction verified. Charge ID #ch_449102 flagged for automated reversal.",
                "is_internal": True,
                "hours_ago": 30
            }
        ]
    },
    {
        "ticket_number": "SUP-1005",
        "subject": "Wrong Product Received",
        "customer_name": "Kiran Rao",
        "customer_email": "kiran.rao@example.com",
        "category": "Returns & Exchange",
        "priority": TicketPriority.MEDIUM,
        "status": TicketStatus.RESOLVED,
        "issue_description": "I received a different product from the one I ordered.",
        "assigned_agent_email": "agent@novastore.com",
        "resolution_summary": "Verified packaging scan mismatch. Correct unit dispatched via express air courier; reverse pickup arranged for wrongly shipped item.",
        "resolved_days_ago": 1,
        "created_days_ago": 4,
        "notes": [
            {
                "author": "agent",
                "note": "Customer accepted replacement order #REP-8812. Return pickup completed via courier.",
                "is_internal": True,
                "hours_ago": 26
            }
        ]
    },
    {
        "ticket_number": "SUP-1006",
        "subject": "Unable to Apply Coupon",
        "customer_name": "Ananya Singh",
        "customer_email": "ananya.singh@example.com",
        "category": "Offers & Discounts",
        "priority": TicketPriority.LOW,
        "status": TicketStatus.OPEN,
        "issue_description": "My discount coupon is not working during checkout.",
        "assigned_agent_email": None,
        "created_days_ago": 1,
        "notes": [
            {
                "author": "customer",
                "note": "Entering coupon 'SAVE20' on electronics cart displays 'Coupon not applicable to selected products'.",
                "is_internal": False,
                "hours_ago": 16
            }
        ]
    },
    {
        "ticket_number": "SUP-1007",
        "subject": "Account Profile Update",
        "customer_name": "Naveen Kumar",
        "customer_email": "naveen.kumar@example.com",
        "category": "Account & Login",
        "priority": TicketPriority.LOW,
        "status": TicketStatus.RESOLVED,
        "issue_description": "I am unable to update my registered mobile number.",
        "assigned_agent_email": "agent@novastore.com",
        "resolution_summary": "Identity confirmed via 2-factor OTP verification. Registered phone number updated successfully in user profile.",
        "resolved_days_ago": 2,
        "created_days_ago": 5,
        "notes": [
            {
                "author": "agent",
                "note": "User completed email OTP verification. Mobile number updated to +91-9944112233.",
                "is_internal": True,
                "hours_ago": 48
            }
        ]
    },
    {
        "ticket_number": "SUP-1008",
        "subject": "Damaged Product",
        "customer_name": "Divya Reddy",
        "customer_email": "divya.reddy@example.com",
        "category": "Product Issues",
        "priority": TicketPriority.HIGH,
        "status": TicketStatus.IN_PROGRESS,
        "issue_description": "The product arrived damaged.",
        "assigned_agent_email": "agent@novastore.com",
        "created_days_ago": 2,
        "notes": [
            {
                "author": "customer",
                "note": "Outer box was crushed and internal display panel is cracked. Uploaded unboxing photos.",
                "is_internal": False,
                "hours_ago": 28
            },
            {
                "author": "agent",
                "note": "Transit insurance claim initiated with courier partner. Replacement dispatch approved.",
                "is_internal": True,
                "hours_ago": 14
            }
        ]
    },
    {
        "ticket_number": "SUP-1009",
        "subject": "Order Cancellation",
        "customer_name": "Rohit Verma",
        "customer_email": "rohit.verma@example.com",
        "category": "Orders & Shipping",
        "priority": TicketPriority.MEDIUM,
        "status": TicketStatus.RESOLVED,
        "issue_description": "I want to cancel my order and understand the refund process.",
        "assigned_agent_email": "agent@novastore.com",
        "resolution_summary": "Order cancelled prior to packaging cutoff. Full refund of Rs 4,999 processed back to original UPI account.",
        "resolved_days_ago": 1,
        "created_days_ago": 3,
        "notes": [
            {
                "author": "agent",
                "note": "Cancellation confirmation email sent with transaction refund receipt.",
                "is_internal": True,
                "hours_ago": 22
            }
        ]
    },
    {
        "ticket_number": "SUP-1010",
        "subject": "Warranty Information",
        "customer_name": "Meera Joshi",
        "customer_email": "meera.joshi@example.com",
        "category": "Product Information",
        "priority": TicketPriority.LOW,
        "status": TicketStatus.OPEN,
        "issue_description": "I want to know the warranty period for my purchased product.",
        "assigned_agent_email": None,
        "created_days_ago": 1,
        "notes": [
            {
                "author": "customer",
                "note": "Purchased NovaStore Smart Speaker. Need details on manufacturer warranty and local service centers.",
                "is_internal": False,
                "hours_ago": 10
            }
        ]
    }
]

def seed_demo_tickets(db: Session):
    """Seed or update the 10 realistic sample support tickets idempotently."""
    now = datetime.now(timezone.utc)

    # 1. Clean up old synthetic TICK-* placeholders so demo statistics are exact
    db.query(TicketNote).filter(
        TicketNote.ticket_id.in_(
            db.query(Ticket.id).filter(Ticket.ticket_number.like("TICK-%"))
        )
    ).delete(synchronize_session=False)
    db.query(Ticket).filter(Ticket.ticket_number.like("TICK-%")).delete(synchronize_session=False)
    db.commit()

    # 2. Ensure Agent user exists
    agent = db.query(User).filter(User.email == "agent@novastore.com").first()
    if not agent:
        agent = User(
            email="agent@novastore.com",
            hashed_password=hash_password("agent123"),
            full_name="Alex Morgan (Senior Agent)",
            role=UserRole.AGENT,
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

    # 3. Create or fetch customer accounts
    customer_map = {}
    for c in DEMO_CUSTOMERS:
        user = db.query(User).filter(User.email == c["email"]).first()
        if not user:
            user = User(
                email=c["email"],
                hashed_password=hash_password("demo12345"),
                full_name=c["name"],
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(user)
            db.flush()
        else:
            if user.full_name != c["name"]:
                user.full_name = c["name"]
                db.flush()
        customer_map[c["email"]] = user

    db.commit()

    # 4. Upsert the 10 Demo Tickets
    for t_data in DEMO_TICKETS:
        cust = customer_map.get(t_data["customer_email"])
        created_at = now - timedelta(days=t_data["created_days_ago"])
        resolved_at = (
            now - timedelta(days=t_data.get("resolved_days_ago", 0))
            if t_data["status"] == TicketStatus.RESOLVED
            else None
        )

        ticket = db.query(Ticket).filter(Ticket.ticket_number == t_data["ticket_number"]).first()
        if not ticket:
            ticket = Ticket(
                ticket_number=t_data["ticket_number"],
                customer_id=cust.id if cust else None,
                assigned_agent_id=agent.id if t_data["assigned_agent_email"] else None,
                subject=t_data["subject"],
                issue_description=t_data["issue_description"],
                category=t_data["category"],
                priority=t_data["priority"],
                status=t_data["status"],
                is_demo=True,
                resolution_summary=t_data.get("resolution_summary"),
                resolved_at=resolved_at,
                created_at=created_at,
                updated_at=now
            )
            db.add(ticket)
            db.flush()
        else:
            ticket.customer_id = cust.id if cust else ticket.customer_id
            ticket.assigned_agent_id = agent.id if t_data["assigned_agent_email"] else None
            ticket.subject = t_data["subject"]
            ticket.issue_description = t_data["issue_description"]
            ticket.category = t_data["category"]
            ticket.priority = t_data["priority"]
            ticket.status = t_data["status"]
            ticket.is_demo = True
            ticket.resolution_summary = t_data.get("resolution_summary")
            ticket.resolved_at = resolved_at
            ticket.created_at = created_at
            ticket.updated_at = now
            db.flush()

        # Add notes if none exist for this ticket
        existing_notes = db.query(TicketNote).filter(TicketNote.ticket_id == ticket.id).count()
        if existing_notes == 0:
            for n_data in t_data.get("notes", []):
                author_id = agent.id if n_data["author"] == "agent" else (cust.id if cust else None)
                note_created = now - timedelta(hours=n_data["hours_ago"])
                note_obj = TicketNote(
                    ticket_id=ticket.id,
                    author_id=author_id,
                    note=n_data["note"],
                    is_internal=n_data["is_internal"],
                    created_at=note_created
                )
                db.add(note_obj)

    db.commit()
    invalidate_metrics_cache()
    print("Demo tickets seeded successfully!")

    # Summary verification output
    total_tickets = db.query(Ticket).count()
    open_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN).count()
    in_progress = db.query(Ticket).filter(Ticket.status == TicketStatus.IN_PROGRESS).count()
    active_tickets = open_tickets + in_progress
    resolved_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.RESOLVED).count()
    high_priority = db.query(Ticket).filter(Ticket.priority == TicketPriority.HIGH).count()

    print(f"Summary Statistics:")
    print(f"- Total Tickets: {total_tickets}")
    print(f"- Active Tickets: {active_tickets} (Open: {open_tickets}, In Progress: {in_progress})")
    print(f"- Resolved Inquiries: {resolved_tickets}")
    print(f"- High Priority: {high_priority}")

if __name__ == "__main__":
    db = SessionLocal()
    seed_demo_tickets(db)
    db.close()
