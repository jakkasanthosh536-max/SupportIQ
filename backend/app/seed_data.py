import re
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.core.database import Base, engine
from app.models.models import (
    User, UserRole, Category, Tag, KnowledgeArticle, DocumentChunk,
    Conversation, Message, MessageCitation, AnswerFeedback,
    Ticket, TicketStatus, TicketPriority, TicketNote,
    KnowledgeGap, GapStatus, ArticleStatus
)

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", s)

def seed_database(db: Session):
    """Seed comprehensive NovaStore demo data for hackathon presentation."""
    # Clear tables in safe order
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 1. Seed Users
    admin_user = User(
        email="admin@novastore.com",
        hashed_password=hash_password("admin123"),
        full_name="NovaStore Administrator",
        role=UserRole.ADMIN,
        is_active=True
    )
    agent_user = User(
        email="agent@novastore.com",
        hashed_password=hash_password("agent123"),
        full_name="Alex Morgan (Senior Agent)",
        role=UserRole.AGENT,
        is_active=True
    )
    customer_user = User(
        email="sarah@example.com",
        hashed_password=hash_password("customer123"),
        full_name="Sarah Jenkins (Customer)",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add_all([admin_user, agent_user, customer_user])
    db.commit()
    db.refresh(admin_user)
    db.refresh(agent_user)
    db.refresh(customer_user)

    # 2. Seed Categories
    categories_data = [
        {"name": "Account & Security", "icon": "ShieldCheck", "desc": "Account creation, credentials, 2FA, and profile settings."},
        {"name": "Orders & Shipping", "icon": "Package", "desc": "Order placement, live shipment tracking, and address changes."},
        {"name": "Returns & Refunds", "icon": "RotateCcw", "desc": "Product return window, condition criteria, and refund timelines."},
        {"name": "Billing & Payments", "icon": "CreditCard", "desc": "Payment methods, checkout declines, and invoice management."},
        {"name": "Subscriptions", "icon": "Sparkles", "desc": "NovaStore Plus VIP membership, renewals, and cancellation."}
    ]
    cat_objs = {}
    for c in categories_data:
        cat = Category(
            name=c["name"],
            slug=slugify(c["name"]),
            description=c["desc"],
            icon=c["icon"]
        )
        db.add(cat)
        db.flush()
        cat_objs[c["name"]] = cat

    # 3. Seed 10 Fictional NovaStore Knowledge Articles
    articles_data = [
        {
            "title": "Creating an Account on NovaStore",
            "category": "Account & Security",
            "tags": ["account", "signup", "registration", "getting-started"],
            "desc": "How to register a new verified NovaStore customer account with email or social sign-in.",
            "content": (
                "Creating a NovaStore account is fast and free. To sign up:\n\n"
                "1. Click the 'Sign In / Register' button at the top right of any NovaStore page.\n"
                "2. Enter your valid email address and choose a password containing at least 8 characters, "
                "one number, and one special character.\n"
                "3. Alternatively, select 'Continue with Google' or 'Continue with Apple' for instant single sign-on.\n"
                "4. Check your inbox for a 6-digit verification code sent by security@novastore.com.\n"
                "5. Enter the code to activate your account and enjoy express checkout and order history."
            )
        },
        {
            "title": "How to Reset Your Account Password",
            "category": "Account & Security",
            "tags": ["password", "reset", "login", "forgot", "credentials"],
            "desc": "Step-by-step instructions for resetting a forgotten or compromised NovaStore password.",
            "content": (
                "If you forgot your password or suspect unauthorized access to your account:\n\n"
                "1. Navigate to the NovaStore Login page and click 'Forgot your password?'.\n"
                "2. Enter the registered email address linked to your account.\n"
                "3. A secure password reset link will arrive in your email within 60 seconds (valid for 30 minutes).\n"
                "4. Click the link and enter your new password twice to confirm.\n\n"
                "Note: For security reasons, resetting your password automatically signs out all active mobile and desktop sessions."
            )
        },
        {
            "title": "How to Track Your NovaStore Order",
            "category": "Orders & Shipping",
            "tags": ["tracking", "shipping", "delivery", "order-status", "carrier"],
            "desc": "Learn how to view live tracking information, estimated delivery times, and carrier updates.",
            "content": (
                "Every NovaStore shipment is assigned a real-time carrier tracking number upon fulfillment:\n\n"
                "1. Once your order ships (typically within 24 to 48 hours), you will receive a Shipping Confirmation email.\n"
                "2. Click the 'Track Shipment' link inside the email or visit 'My Orders' in your NovaStore account dashboard.\n"
                "3. Standard delivery takes 3 to 5 business days within the contiguous US; Express delivery arrives in 1 to 2 business days.\n"
                "4. If tracking has not updated for more than 72 hours, our automated system alerts carrier dispatch."
            )
        },
        {
            "title": "Changing Delivery Address Before Shipment",
            "category": "Orders & Shipping",
            "tags": ["address", "delivery", "modify-order", "shipping-address"],
            "desc": "Guidelines on modifying your shipping destination before warehouse packing begins.",
            "content": (
                "To ensure rapid delivery, NovaStore orders are routed to our automated fulfillment center quickly:\n\n"
                "1. You may change your shipping address freely within 60 minutes of placing your order directly under 'My Orders' -> 'Edit Delivery Address'.\n"
                "2. Once an order enters 'Processing' or 'Dispatched' status, the shipping address cannot be modified online.\n"
                "3. If your order has already shipped, contact carrier support using your tracking code to request a package reroute or pickup hold."
            )
        },
        {
            "title": "NovaStore Return Policy & Eligibility",
            "category": "Returns & Refunds",
            "tags": ["returns", "return-policy", "eligibility", "exchange", "refund-window"],
            "desc": "Fictional demo policy detailing our 14-day unused item return window and criteria.",
            "content": (
                "NovaStore offers a clear 14-day return window for customer satisfaction:\n\n"
                "1. Eligibility Window: Eligible items can be returned within 14 calendar days from the delivery date.\n"
                "2. Item Condition: Items must be unused, unwashed, in their original packaging, and with all protective seals and tags intact.\n"
                "3. Non-Returnable Items: Final-sale clearance items, customized apparel, and opened hygiene accessories are strictly non-returnable.\n"
                "4. Return Shipping: Prepaid return shipping labels are generated automatically inside your account portal for $4.99, or free if opting for NovaStore Store Credit."
            )
        },
        {
            "title": "Refund Processing Timelines and Methods",
            "category": "Returns & Refunds",
            "tags": ["refund", "processing", "bank", "credit-card", "reimbursement"],
            "desc": "How long it takes to inspect returns and receive your funds back on your original payment method.",
            "content": (
                "Once your returned package arrives at the NovaStore fulfillment center:\n\n"
                "1. Quality inspection is completed within 2 business days of warehouse receipt.\n"
                "2. Upon inspection approval, your refund is initiated immediately to your original payment method.\n"
                "3. Depending on your financial institution, funds appear on your bank statement within 5 to 7 business days.\n"
                "4. Refunds issued as NovaStore Store Credit are available instantly in your digital wallet."
            )
        },
        {
            "title": "Resolving Payment Failures at Checkout",
            "category": "Billing & Payments",
            "tags": ["payment", "declined", "card-error", "3d-secure", "checkout"],
            "desc": "Common reasons why credit card or payment transactions fail and how to fix them.",
            "content": (
                "If your transaction fails at checkout, check these common causes:\n\n"
                "1. Billing Address Mismatch: The billing address entered must precisely match the address on file with your bank.\n"
                "2. 3D Secure Verification: Make sure to complete any two-factor SMS or bank app verification prompts required by Visa/Mastercard.\n"
                "3. International Transaction Lock: If purchasing from outside North America, verify that international transactions are enabled on your card.\n"
                "4. Alternative Options: We accept PayPal, Apple Pay, Google Pay, and Shop Pay for alternate one-click checkout."
            )
        },
        {
            "title": "How to Cancel Your NovaStore Plus Subscription",
            "category": "Subscriptions",
            "tags": ["subscription", "cancel", "membership", "novastore-plus", "billing"],
            "desc": "Instructions for managing or cancelling your NovaStore Plus premium membership.",
            "content": (
                "You can cancel your NovaStore Plus membership at any time with zero cancellation penalties:\n\n"
                "1. Log into your account and open 'Account Settings' -> 'Subscriptions & Memberships'.\n"
                "2. Select your active NovaStore Plus plan and click 'Manage Subscription'.\n"
                "3. Click 'Cancel Auto-Renewal' and confirm your choice.\n"
                "4. You will continue to retain all VIP benefits, free 2-day delivery, and member pricing until the end of your current billing cycle."
            )
        },
        {
            "title": "Updating Your Personal and Billing Information",
            "category": "Account & Security",
            "tags": ["profile", "settings", "update-info", "email-change", "phone"],
            "desc": "How to update your contact details, phone number, default payment cards, and shipping addresses.",
            "content": (
                "Keep your account information current to prevent delivery hiccups:\n\n"
                "1. Visit the 'Profile' section under your user menu.\n"
                "2. To change your primary email address, click 'Edit' next to your email; an authentication link will be sent to confirm ownership.\n"
                "3. Under 'Payment Methods', you can safely save, edit, or delete stored credit cards.\n"
                "4. You can store up to 5 shipping addresses and mark your primary residential address for 1-click checkout."
            )
        },
        {
            "title": "Contacting Customer Support & Service Hours",
            "category": "Account & Security",
            "tags": ["support", "contact", "agent", "hours", "escalation", "help-desk"],
            "desc": "How to reach human support agents, our operating hours, and ticket response times.",
            "content": (
                "NovaStore is committed to fast and friendly assistance:\n\n"
                "1. AI Support Chat: Available 24 hours a day, 7 days a week directly inside the SupportIQ portal.\n"
                "2. Human Support Agents: On duty Monday through Friday from 9:00 AM to 8:00 PM EST, and Saturdays 10:00 AM to 4:00 PM EST.\n"
                "3. Support Tickets: Can be submitted anytime directly from the chat window or the Ticket Desk.\n"
                "4. Response Target: Urgent issues are resolved within 2 hours; standard tickets are answered within 12 hours."
            )
        }
    ]

    for item in articles_data:
        cat = cat_objs.get(item["category"])
        art = KnowledgeArticle(
            title=item["title"],
            slug=slugify(item["title"]),
            short_description=item["desc"],
            content=item["content"],
            category_id=cat.id if cat else None,
            author_id=admin_user.id,
            status=ArticleStatus.PUBLISHED,
            is_indexed=True,
            view_count=42,
            helpful_count=18,
            unhelpful_count=1
        )
        db.add(art)
        db.flush()
        for t_name in item["tags"]:
            t_slug = slugify(t_name)
            tag = db.query(Tag).filter(Tag.slug == t_slug).first()
            if not tag:
                tag = Tag(name=t_name, slug=t_slug)
                db.add(tag)
                db.flush()
            art.tags.append(tag)

        db.flush()

        # Chunk the article
        from app.services.document_service import chunk_text
        chunks = chunk_text(art.content, chunk_size=400, overlap=80)
        for c_idx, c_text in enumerate(chunks):
            db.add(DocumentChunk(
                article_id=art.id,
                chunk_index=c_idx,
                content=c_text,
                token_count=len(c_text.split())
            ))

    db.commit()

    # 4. Seed Sample Conversations and Messages
    now = datetime.now(timezone.utc)
    conv1 = Conversation(
        customer_id=customer_user.id,
        title="What is the return policy?",
        is_escalated=False,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2)
    )
    db.add(conv1)
    db.flush()

    m1 = Message(
        conversation_id=conv1.id,
        sender_type="customer",
        content="What is the return policy?",
        processing_mode="user_input",
        created_at=now - timedelta(days=2, minutes=5)
    )
    ret_art = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == "novastore-return-policy-eligibility").first()
    m2 = Message(
        conversation_id=conv1.id,
        sender_type="ai",
        content=(
            "Based on our verified knowledge base regarding **NovaStore Return Policy & Eligibility**:\n\n"
            "- **From NovaStore Return Policy & Eligibility**: Eligible unused products can be returned within 14 calendar days from the delivery date in original packaging with tags attached.\n\n"
            "If you have additional questions or need personal account assistance, our support team is available to help."
        ),
        confidence_score=0.91,
        processing_mode="demo_retrieval",
        created_at=now - timedelta(days=2, minutes=4)
    )
    db.add_all([m1, m2])
    db.flush()

    if ret_art:
        c1 = MessageCitation(
            message_id=m2.id,
            article_id=ret_art.id,
            article_title=ret_art.title,
            excerpt="Eligible items can be returned within 14 calendar days from the delivery date...",
            relevance_score=0.91
        )
        db.add(c1)

    fb1 = AnswerFeedback(
        message_id=m2.id,
        user_id=customer_user.id,
        rating=1,
        comment="Very clear and fast answer!"
    )
    db.add(fb1)

    # Conversation 2: Account & Security
    conv_pwd = Conversation(
        customer_id=customer_user.id,
        title="How do I reset my account password?",
        is_escalated=False,
        created_at=now - timedelta(days=3, hours=4),
        updated_at=now - timedelta(days=3, hours=4)
    )
    db.add(conv_pwd)
    db.flush()

    pwd_art = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == "how-to-reset-your-account-password").first()
    m_pwd1 = Message(
        conversation_id=conv_pwd.id,
        sender_type="customer",
        content="How do I reset my account password?",
        processing_mode="user_input",
        created_at=now - timedelta(days=3, hours=4, minutes=2)
    )
    m_pwd2 = Message(
        conversation_id=conv_pwd.id,
        sender_type="ai",
        content=(
            "Based on our verified knowledge base regarding **How to Reset Your Account Password**:\n\n"
            "- Navigate to the NovaStore Login page and click 'Forgot your password?'.\n"
            "- Enter your registered email address; a secure reset link will be sent within 60 seconds (valid for 30 minutes).\n"
            "- Resetting your password automatically signs out all active mobile and desktop sessions."
        ),
        confidence_score=0.94,
        processing_mode="hybrid_rag",
        created_at=now - timedelta(days=3, hours=4, minutes=1)
    )
    db.add_all([m_pwd1, m_pwd2])
    db.flush()

    if pwd_art:
        db.add(MessageCitation(
            message_id=m_pwd2.id,
            article_id=pwd_art.id,
            article_title=pwd_art.title,
            excerpt="Navigate to the NovaStore Login page and click 'Forgot your password?'...",
            relevance_score=0.94
        ))
    db.add(AnswerFeedback(
        message_id=m_pwd2.id,
        user_id=customer_user.id,
        rating=1,
        comment="Reset link worked immediately."
    ))

    # Conversation 3: Orders & Shipping
    conv_ship = Conversation(
        customer_id=customer_user.id,
        title="Where do I find my package tracking number?",
        is_escalated=False,
        created_at=now - timedelta(days=2, hours=6),
        updated_at=now - timedelta(days=2, hours=6)
    )
    db.add(conv_ship)
    db.flush()

    ship_art = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == "tracking-your-novastore-shipment-in-real-time").first()
    m_ship1 = Message(
        conversation_id=conv_ship.id,
        sender_type="customer",
        content="Where do I find my package tracking number?",
        processing_mode="user_input",
        created_at=now - timedelta(days=2, hours=6, minutes=3)
    )
    m_ship2 = Message(
        conversation_id=conv_ship.id,
        sender_type="ai",
        content=(
            "According to verified documentation on **Tracking Your NovaStore Shipment in Real-Time**:\n\n"
            "- Once your order departs our fulfillment warehouse, an email with your carrier tracking number (FedEx, UPS, USPS, DHL) is generated.\n"
            "- You can also click 'Track Shipment' inside your NovaStore 'Order History' tab for live GPS carrier milestones."
        ),
        confidence_score=0.92,
        processing_mode="hybrid_rag",
        created_at=now - timedelta(days=2, hours=6, minutes=2)
    )
    db.add_all([m_ship1, m_ship2])
    db.flush()

    if ship_art:
        db.add(MessageCitation(
            message_id=m_ship2.id,
            article_id=ship_art.id,
            article_title=ship_art.title,
            excerpt="Once your package departs our automated fulfillment warehouse, an email containing a carrier tracking number...",
            relevance_score=0.92
        ))
    db.add(AnswerFeedback(
        message_id=m_ship2.id,
        user_id=customer_user.id,
        rating=1,
        comment="Found my tracking info easily."
    ))

    # Conversation 4: Subscriptions
    conv_sub = Conversation(
        customer_id=customer_user.id,
        title="What benefits come with NovaStore Plus VIP?",
        is_escalated=False,
        created_at=now - timedelta(days=1, hours=8),
        updated_at=now - timedelta(days=1, hours=8)
    )
    db.add(conv_sub)
    db.flush()

    sub_art = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == "novastore-plus-vip-membership-benefits").first()
    m_sub1 = Message(
        conversation_id=conv_sub.id,
        sender_type="customer",
        content="What benefits come with NovaStore Plus VIP?",
        processing_mode="user_input",
        created_at=now - timedelta(days=1, hours=8, minutes=2)
    )
    m_sub2 = Message(
        conversation_id=conv_sub.id,
        sender_type="ai",
        content=(
            "Per the **NovaStore Plus VIP Membership Benefits** knowledge guide:\n\n"
            "- Unlimited free 2-day delivery with zero minimum order threshold.\n"
            "- 5% automatic instant cashback on all electronics and premium accessories.\n"
            "- Dedicated 24/7 priority human VIP telephone and concierge support.\n"
            "- 30-day extended return window."
        ),
        confidence_score=0.95,
        processing_mode="hybrid_rag",
        created_at=now - timedelta(days=1, hours=8, minutes=1)
    )
    db.add_all([m_sub1, m_sub2])
    db.flush()

    if sub_art:
        db.add(MessageCitation(
            message_id=m_sub2.id,
            article_id=sub_art.id,
            article_title=sub_art.title,
            excerpt="NovaStore Plus is our premier membership program priced at $79/year...",
            relevance_score=0.95
        ))
    db.add(AnswerFeedback(
        message_id=m_sub2.id,
        user_id=customer_user.id,
        rating=1,
        comment="Super helpful summary."
    ))

    # Conversation 5: Billing & Payments
    conv_bill = Conversation(
        customer_id=customer_user.id,
        title="What payment methods do you accept?",
        is_escalated=False,
        created_at=now - timedelta(hours=10),
        updated_at=now - timedelta(hours=10)
    )
    db.add(conv_bill)
    db.flush()

    bill_art = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == "accepted-payment-methods-checkout-troubleshooting").first()
    m_bill1 = Message(
        conversation_id=conv_bill.id,
        sender_type="customer",
        content="What payment methods do you accept at checkout?",
        processing_mode="user_input",
        created_at=now - timedelta(hours=10, minutes=3)
    )
    m_bill2 = Message(
        conversation_id=conv_bill.id,
        sender_type="ai",
        content=(
            "According to **Accepted Payment Methods & Checkout Troubleshooting**:\n\n"
            "- We accept Visa, MasterCard, American Express, and Discover.\n"
            "- Express 1-click checkouts via Apple Pay, Google Pay, and PayPal.\n"
            "- NovaStore electronic gift cards and store credit balances."
        ),
        confidence_score=0.93,
        processing_mode="hybrid_rag",
        created_at=now - timedelta(hours=10, minutes=2)
    )
    db.add_all([m_bill1, m_bill2])
    db.flush()

    if bill_art:
        db.add(MessageCitation(
            message_id=m_bill2.id,
            article_id=bill_art.id,
            article_title=bill_art.title,
            excerpt="NovaStore accepts major credit and debit cards, digital wallets, and PayPal...",
            relevance_score=0.93
        ))
    db.add(AnswerFeedback(
        message_id=m_bill2.id,
        user_id=customer_user.id,
        rating=1,
        comment="Clear payment info."
    ))

    # Conversation 6: Unanswered / Escalated
    conv_polar = Conversation(
        customer_id=customer_user.id,
        title="Can I get drone delivery to Antarctica?",
        is_escalated=True,
        created_at=now - timedelta(days=1),
        updated_at=now - timedelta(days=1)
    )
    db.add(conv_polar)
    db.flush()

    m3 = Message(
        conversation_id=conv_polar.id,
        sender_type="customer",
        content="Can I get drone delivery to Antarctica by next week?",
        processing_mode="user_input",
        created_at=now - timedelta(days=1, minutes=10)
    )
    m4 = Message(
        conversation_id=conv_polar.id,
        sender_type="ai",
        content="I couldn't find a verified answer in the current knowledge base. You can create a support ticket or contact a support agent.",
        confidence_score=0.12,
        processing_mode="abstention",
        created_at=now - timedelta(days=1, minutes=9)
    )
    db.add_all([m3, m4])
    db.flush()

    # 5. Seed 10 Realistic Support Tickets
    from app.seed_demo_tickets import seed_demo_tickets
    seed_demo_tickets(db)

    # 6. Seed Knowledge Gaps
    ticket1 = db.query(Ticket).filter(Ticket.ticket_number == "SUP-1001").first()
    gap1 = KnowledgeGap(
        question="Can I get drone delivery to Antarctica by next week?",
        topic="Shipping & Delivery",
        frequency=3,
        status=GapStatus.DETECTED,
        suggested_action="Draft FAQ article covering 'Shipping & Delivery' for remote & polar locations",
        suggested_faq_answer=(
            "### Frequently Asked Question: Remote & Polar Shipping\n\n"
            "**Answer Guidelines**:\n"
            "NovaStore does not offer drone delivery. Standard delivery covers the contiguous United States. "
            "For remote scientific or military shipping inquiries, please contact sales@novastore.com directly."
        ),
        related_ticket_id=ticket1.id,
        last_asked_at=now - timedelta(days=1)
    )
    gap2 = KnowledgeGap(
        question="How do I combine store credit with an Apple Pay purchase?",
        topic="Billing & Payments",
        frequency=5,
        status=GapStatus.REVIEWED,
        suggested_action="Create FAQ explaining split-tender checkout between store credit wallet and Apple Pay",
        suggested_faq_answer=(
            "### Frequently Asked Question: Split Payment with Store Credit\n\n"
            "You can apply digital store credit first on the checkout screen, and charge any remaining balance to Apple Pay."
        ),
        last_asked_at=now - timedelta(hours=14)
    )
    gap3 = KnowledgeGap(
        question="What is the warranty policy on refurbished electronics?",
        topic="General Inquiry",
        frequency=2,
        status=GapStatus.DETECTED,
        suggested_action="Add refurbished product warranty period to Returns & Warranty documentation",
        suggested_faq_answer=(
            "### Frequently Asked Question: Refurbished Electronics Warranty\n\n"
            "All certified refurbished NovaStore products carry a 90-day comprehensive hardware warranty."
        ),
        last_asked_at=now - timedelta(days=2)
    )
    db.add_all([gap1, gap2, gap3])

    db.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    from app.core.database import SessionLocal
    db = SessionLocal()
    seed_database(db)
    db.close()
