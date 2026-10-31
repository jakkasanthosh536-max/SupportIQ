import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.seed_data import seed_database
from app.services.document_service import extract_text_from_file, chunk_text
from app.services.retrieval_service import RetrievalService
from app.services.ai_service import AIService

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    db = SessionLocal()
    seed_database(db)
    db.close()

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "SupportIQ"

def test_auth_demo_login_admin():
    response = client.post("/api/auth/demo-login", json={"role": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == "admin@novastore.com"

def test_auth_demo_login_agent():
    response = client.post("/api/auth/demo-login", json={"role": "agent"})
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "agent"

def test_auth_demo_login_customer():
    response = client.post("/api/auth/demo-login", json={"role": "customer"})
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "customer"

def test_get_articles():
    response = client.get("/api/knowledge")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    assert any("Return" in a["title"] for a in data)

def test_get_article_detail():
    response = client.get("/api/knowledge/novastore-return-policy-eligibility")
    assert response.status_code == 200
    data = response.json()
    assert "14 calendar days" in data["content"]
    assert data["view_count"] > 0

def test_create_and_delete_article():
    # Login as admin
    login_resp = client.post("/api/auth/demo-login", json={"role": "admin"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "title": "International Warranty Coverage",
        "short_description": "Details about worldwide warranty for travelers.",
        "content": "NovaStore international warranty covers defects for 12 months across North America and Europe.",
        "status": "published",
        "tags": ["warranty", "international", "repair"]
    }
    create_resp = client.post("/api/knowledge", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    # Verify searchable immediately
    search_resp = client.get("/api/search?q=worldwide+warranty")
    assert search_resp.status_code == 200
    assert any(r["article_id"] == created_id for r in search_resp.json()["results"])

    # Clean up
    del_resp = client.delete(f"/api/knowledge/{created_id}", headers=headers)
    assert del_resp.status_code == 204

def test_smart_search():
    # Article search
    response = client.get("/api/search?q=password+reset")
    assert response.status_code == 200
    data = response.json()
    assert data["total_results"] > 0
    top_result = data["results"][0]
    assert "Password" in top_result["title"]
    assert top_result["score"] > 0.3

    # Ticket search by number or keyword
    ticket_search = client.get("/api/search?q=Antarctica")
    assert ticket_search.status_code == 200
    ts_data = ticket_search.json()
    assert any(r.get("item_type") in ["ticket", "gap"] for r in ts_data["results"])

def test_chat_grounded_answer():
    # Customer asks about return policy
    chat_payload = {"content": "How many days do I have to return an item?"}
    response = client.post("/api/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["sender_type"] == "ai"
    assert data["confidence_score"] >= 0.35
    assert len(data["citations"]) > 0
    assert any("Return" in c["article_title"] for c in data["citations"])
    assert "14" in data["content"]

def test_chat_unsupported_abstention():
    # Customer asks something not in knowledge base
    chat_payload = {"content": "Can I trade my used car for a NovaStore laptop?"}
    response = client.post("/api/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["processing_mode"] == "abstention"
    assert "couldn't find a verified answer" in data["content"].lower()

def test_chat_feedback():
    # First send message to get message_id
    chat_payload = {"content": "How do I track my order?"}
    chat_resp = client.post("/api/chat", json=chat_payload)
    msg_id = chat_resp.json()["id"]

    # Submit positive feedback
    fb_resp = client.post("/api/chat/feedback", json={"message_id": msg_id, "rating": 1, "comment": "Great!"})
    assert fb_resp.status_code == 201

def test_support_tickets_lifecycle():
    # Login as admin
    login_resp = client.post("/api/auth/demo-login", json={"role": "admin"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create ticket
    t_payload = {
        "subject": "Missing promo code on checkout",
        "issue_description": "Applied SAVE20 code but discount was not deducted.",
        "priority": "medium"
    }
    create_resp = client.post("/api/tickets", json=t_payload, headers=headers)
    assert create_resp.status_code == 201
    ticket_id = create_resp.json()["id"]

    # Add note
    note_resp = client.post(
        f"/api/tickets/{ticket_id}/notes",
        json={"note": "Checked coupon database; customer account flagged as already redeemed.", "is_internal": True},
        headers=headers
    )
    assert note_resp.status_code == 201

    # Update ticket status
    update_resp = client.patch(
        f"/api/tickets/{ticket_id}",
        json={"status": "resolved", "resolution_summary": "Explained single-use promo policy."},
        headers=headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "resolved"

def test_knowledge_gap_to_article():
    # Login as admin
    login_resp = client.post("/api/auth/demo-login", json={"role": "admin"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch gaps
    gaps_resp = client.get("/api/knowledge-gaps", headers=headers)
    assert gaps_resp.status_code == 200
    gaps = gaps_resp.json()
    assert len(gaps) > 0
    target_gap = gaps[0]

    # Create FAQ article from gap
    faq_payload = {
        "title": f"FAQ: {target_gap['question']}",
        "content": "Official verified resolution for this recurring customer question.",
        "tags": ["faq", "resolved-gap"]
    }
    create_art_resp = client.post(f"/api/knowledge-gaps/{target_gap['id']}/create-article", json=faq_payload, headers=headers)
    assert create_art_resp.status_code == 201
    assert "FAQ:" in create_art_resp.json()["title"]

def test_analytics_overview():
    # Login as admin
    login_resp = client.post("/api/auth/demo-login", json={"role": "admin"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/analytics/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_articles"] >= 10
    assert data["total_published"] >= 10
    assert data["total_questions"] >= 2
    assert "knowledge_coverage_rate" in data
    assert data["knowledge_coverage_rate"] >= 0.0
    assert "question_trends" in data
    assert len(data["question_trends"]) == 7
    assert len(data["topic_distribution"]) >= 5
    assert len(data["top_articles"]) > 0

def test_document_chunking():
    sample_text = (
        "Paragraph 1 discusses the fundamental architecture of the support system.\n\n"
        "Paragraph 2 outlines the multi-tier escalation protocol for priority incidents.\n\n"
        "Paragraph 3 covers refund policies and payment settlement windows."
    )
    chunks = chunk_text(sample_text, chunk_size=100, overlap=20)
    assert len(chunks) >= 3
