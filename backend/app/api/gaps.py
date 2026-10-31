import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import KnowledgeGap, KnowledgeArticle, Tag, GapStatus, User, UserRole, ArticleStatus
from app.schemas.schemas import KnowledgeGapResponse, KnowledgeGapUpdate, CreateArticleFromGapRequest, ArticleDetailResponse
from app.api.deps import require_role
from app.api.knowledge import index_article_chunks

router = APIRouter(prefix="/knowledge-gaps", tags=["Knowledge Gap Detection"])

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", s)

@router.get("", response_model=List[KnowledgeGapResponse])
def get_knowledge_gaps(
    status: Optional[GapStatus] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    query = db.query(KnowledgeGap)
    if status:
        query = query.filter(KnowledgeGap.status == status)
    return query.order_by(KnowledgeGap.frequency.desc(), KnowledgeGap.last_asked_at.desc()).all()

@router.patch("/{gap_id}", response_model=KnowledgeGapResponse)
def update_gap_status(
    gap_id: int,
    gap_in: KnowledgeGapUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    gap = db.query(KnowledgeGap).filter(KnowledgeGap.id == gap_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="Knowledge gap not found.")

    if gap_in.status:
        gap.status = gap_in.status
    if gap_in.suggested_action:
        gap.suggested_action = gap_in.suggested_action

    db.commit()
    db.refresh(gap)
    return gap

@router.post("/{gap_id}/create-article", response_model=ArticleDetailResponse, status_code=status.HTTP_201_CREATED)
def create_article_from_gap(
    gap_id: int,
    req: CreateArticleFromGapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    """
    1-Click Hackathon differentiator: Converts a detected knowledge gap into an officially
    indexed FAQ article and marks the gap as RESOLVED.
    """
    gap = db.query(KnowledgeGap).filter(KnowledgeGap.id == gap_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="Knowledge gap not found.")

    base_slug = slugify(req.title)
    slug = base_slug
    counter = 1
    while db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    short_desc = req.content[:160] + ("..." if len(req.content) > 160 else "")

    article = KnowledgeArticle(
        title=req.title,
        slug=slug,
        short_description=short_desc,
        content=req.content,
        category_id=req.category_id,
        author_id=current_user.id,
        status=ArticleStatus.PUBLISHED,
        is_indexed=False
    )
    db.add(article)
    db.flush()

    if req.tags:
        for t_name in req.tags:
            t_clean = t_name.strip()
            if not t_clean:
                continue
            t_slug = slugify(t_clean)
            tag = db.query(Tag).filter(Tag.slug == t_slug).first()
            if not tag:
                tag = Tag(name=t_clean, slug=t_slug)
                db.add(tag)
                db.flush()
            article.tags.append(tag)

    # Index article chunks
    index_article_chunks(db, article)

    # Mark gap as resolved
    gap.status = GapStatus.RESOLVED
    gap.suggested_action = f"Resolved via Knowledge Article #{article.id}: '{article.title}'"
    db.commit()
    db.refresh(article)

    resp = ArticleDetailResponse.model_validate(article)
    resp.category_name = article.category.name if article.category else "General"
    return resp
