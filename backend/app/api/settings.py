import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    KnowledgeArticle, UploadedDocument, Category, User, UserRole
)
from app.schemas.schemas import SettingsResponse, SettingsUpdate
from sqlalchemy import text
from app.api.deps import require_role

router = APIRouter(prefix="/settings", tags=["Application Settings"])

@router.get("/status")
def get_system_status(db: Session = Depends(get_db)):
    """Lightweight public status endpoint for top navigation status indicator."""
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    is_live = bool(settings.GEMINI_API_KEY or settings.GROQ_API_KEY or settings.OPENAI_API_KEY)
    
    if not db_connected:
        status_state = "offline"
        mode_label = "Database Offline"
    elif is_live:
        provider_name = settings.AI_PROVIDER.capitalize()
        model_name = settings.AI_MODEL or ("Gemini 1.5 Flash" if settings.AI_PROVIDER == "gemini" else "Cloud LLM")
        status_state = "online"
        mode_label = f"Online (Live LLM • {provider_name})"
    else:
        status_state = "online"
        mode_label = "Online (Local Grounded RAG)"

    return {
        "status": status_state,
        "is_live_llm": is_live,
        "ai_provider": settings.AI_PROVIDER,
        "ai_model": settings.AI_MODEL if is_live else "Local Semantic BM25+Embeddings",
        "mode_label": mode_label,
        "database_connected": db_connected,
        "required_env_for_cloud_llm": "Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in backend/.env for generative cloud models."
    }

@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    categories_cnt = db.query(Category).count()
    documents_cnt = db.query(UploadedDocument).count()
    articles_cnt = db.query(KnowledgeArticle).count()

    is_live = bool(settings.GEMINI_API_KEY or settings.GROQ_API_KEY or settings.OPENAI_API_KEY)
    
    return SettingsResponse(
        ai_provider=settings.AI_PROVIDER,
        ai_model=settings.AI_MODEL or ("Gemini 1.5 Flash" if settings.AI_PROVIDER == "gemini" else "Demo Retrieval Engine"),
        is_live_llm=is_live,
        retrieval_confidence_threshold=settings.RETRIEVAL_CONFIDENCE_THRESHOLD,
        max_retrieval_chunks=settings.MAX_RETRIEVAL_CHUNKS,
        categories_count=categories_cnt,
        documents_count=documents_cnt,
        articles_count=articles_cnt
    )

@router.patch("", response_model=SettingsResponse)
def update_settings(
    req: SettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    if req.retrieval_confidence_threshold is not None:
        settings.RETRIEVAL_CONFIDENCE_THRESHOLD = max(0.05, min(0.95, req.retrieval_confidence_threshold))
    if req.ai_provider is not None:
        settings.AI_PROVIDER = req.ai_provider
    if req.ai_model is not None:
        settings.AI_MODEL = req.ai_model
    if req.gemini_api_key is not None:
        settings.GEMINI_API_KEY = req.gemini_api_key
    if req.groq_api_key is not None:
        settings.GROQ_API_KEY = req.groq_api_key
    if req.openai_api_key is not None:
        settings.OPENAI_API_KEY = req.openai_api_key

    return get_settings(db=db, _=_)

@router.post("/reset-demo-data")
def reset_demo_data(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    from app.seed_data import seed_database
    seed_database(db)
    return {"status": "success", "message": "Demo data successfully reset to initial NovaStore state."}
