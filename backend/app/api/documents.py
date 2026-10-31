import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    UploadedDocument, DocumentChunk, KnowledgeArticle,
    DocumentStatus, ArticleStatus, User, UserRole
)
from app.schemas.schemas import DocumentResponse, DocumentDetailResponse
from app.api.deps import require_role
from app.services.document_service import extract_text_from_file, chunk_text
import re

router = APIRouter(prefix="/documents", tags=["Document Management"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "markdown", "docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10 MB

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", s)

def process_and_index_document(db: Session, doc: UploadedDocument, auto_create_article: bool = True):
    """Extract text from file, split into chunks, and store chunks in DB."""
    try:
        doc.status = DocumentStatus.PROCESSING
        db.commit()

        text, success, error_msg = extract_text_from_file(doc.file_path, doc.file_type)
        if not success:
            doc.status = DocumentStatus.FAILED
            doc.error_message = error_msg
            db.commit()
            return

        # Clear any prior chunks
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.flush()

        # Chunk the text
        chunks = chunk_text(text, chunk_size=settings.CHUNK_SIZE, overlap=settings.CHUNK_OVERLAP)
        if not chunks and text:
            chunks = [text]

        # Optionally create a KnowledgeArticle for search and citation
        article_id = None
        if auto_create_article:
            clean_title = os.path.splitext(doc.original_name)[0].replace("_", " ").replace("-", " ").title()
            base_slug = slugify(clean_title)
            slug = base_slug
            counter = 1
            while db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1

            first_para = chunks[0] if chunks else clean_title
            short_desc = first_para[:180] + ("..." if len(first_para) > 180 else "")

            article = KnowledgeArticle(
                title=clean_title,
                slug=slug,
                short_description=short_desc,
                content=text,
                status=ArticleStatus.PUBLISHED,
                is_indexed=True,
                source_document_id=doc.id
            )
            db.add(article)
            db.flush()
            article_id = article.id

        # Insert chunks
        for idx, chunk_str in enumerate(chunks):
            chunk_obj = DocumentChunk(
                document_id=doc.id,
                article_id=article_id,
                chunk_index=idx,
                content=chunk_str,
                token_count=len(chunk_str.split())
            )
            db.add(chunk_obj)

        doc.status = DocumentStatus.INDEXED
        doc.chunks_count = len(chunks)
        doc.error_message = None
        db.commit()

    except Exception as e:
        doc.status = DocumentStatus.FAILED
        doc.error_message = f"Indexing failed: {str(e)}"
        db.commit()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    auto_create_article: bool = Form(True),
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    filename = file.filename or "unknown"
    ext = filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type .{ext}. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10 MB."
        )

    # Safe unique filename
    safe_name = f"{uuid.uuid4().hex[:12]}_{re.sub(r'[^a-zA-Z0-9_.-]', '', filename)}"
    save_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    with open(save_path, "wb") as f:
        f.write(file_bytes)

    doc = UploadedDocument(
        filename=safe_name,
        original_name=filename,
        file_type=ext,
        file_size=len(file_bytes),
        file_path=save_path,
        status=DocumentStatus.PENDING,
        chunks_count=0
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process and index immediately
    process_and_index_document(db, doc, auto_create_article=auto_create_article)
    db.refresh(doc)

    return doc

@router.get("", response_model=List[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    return db.query(UploadedDocument).order_by(UploadedDocument.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.post("/{document_id}/reindex", response_model=DocumentResponse)
def reindex_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    process_and_index_document(db, doc, auto_create_article=False)
    db.refresh(doc)
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # Disassociate source_document_id from any generated articles
    db.query(KnowledgeArticle).filter(KnowledgeArticle.source_document_id == document_id).update(
        {KnowledgeArticle.source_document_id: None}
    )
    # Delete associated document chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()

    db.delete(doc)
    db.commit()
    return None
