import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from app.core.database import get_db
from app.models.models import (
    KnowledgeArticle, Category, Tag, DocumentChunk,
    User, UserRole, ArticleStatus
)
from app.schemas.schemas import (
    ArticleCreate, ArticleUpdate, ArticleResponse, ArticleDetailResponse,
    CategoryResponse, CategoryCreate, TagResponse
)
from app.api.deps import get_current_user, require_role, get_optional_current_user
from app.services.document_service import chunk_text
from app.services.gap_service import GapService
from app.services.analytics_service import invalidate_metrics_cache

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", s)

def index_article_chunks(db: Session, article: KnowledgeArticle):
    """Chunk and index article content into searchable chunks only if published."""
    # Delete existing chunks for this article
    db.query(DocumentChunk).filter(DocumentChunk.article_id == article.id).delete()
    db.flush()

    if article.status != ArticleStatus.PUBLISHED:
        article.is_indexed = False
        db.commit()
        return

    chunks = chunk_text(article.content, chunk_size=400, overlap=80)
    if not chunks:
        chunks = [article.content]

    for idx, chunk_str in enumerate(chunks):
        chunk_obj = DocumentChunk(
            article_id=article.id,
            chunk_index=idx,
            content=chunk_str,
            token_count=len(chunk_str.split())
        )
        db.add(chunk_obj)
    article.is_indexed = True
    db.commit()

@router.get("", response_model=List[ArticleResponse])
def get_articles(
    category_id: Optional[int] = None,
    status: Optional[ArticleStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(KnowledgeArticle).options(joinedload(KnowledgeArticle.category))

    # Customers only see published articles
    if not current_user or current_user.role == UserRole.CUSTOMER:
        query = query.filter(KnowledgeArticle.status == ArticleStatus.PUBLISHED)
    elif status:
        query = query.filter(KnowledgeArticle.status == status)

    if category_id:
        query = query.filter(KnowledgeArticle.category_id == category_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (KnowledgeArticle.title.ilike(search_term)) |
            (KnowledgeArticle.short_description.ilike(search_term))
        )

    articles = query.order_by(KnowledgeArticle.updated_at.desc()).all()
    
    # Format response with category name
    res = []
    for a in articles:
        resp = ArticleResponse.model_validate(a)
        resp.category_name = a.category.name if a.category else "General"
        res.append(resp)
    return res

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).options(selectinload(Category.articles)).all()
    results = []
    for c in cats:
        resp = CategoryResponse.model_validate(c)
        resp.article_count = len(c.articles)
        results.append(resp)
    return results

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    existing = db.query(Category).filter(Category.name.ilike(cat_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists.")
    slug = slugify(cat_in.name)
    category = Category(
        name=cat_in.name,
        slug=slug,
        description=cat_in.description,
        icon=cat_in.icon or "HelpCircle"
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    resp = CategoryResponse.model_validate(category)
    resp.article_count = 0
    return resp

@router.get("/tags", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return db.query(Tag).all()

@router.get("/{id_or_slug}", response_model=ArticleDetailResponse)
def get_article(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(KnowledgeArticle).options(
        joinedload(KnowledgeArticle.category),
        selectinload(KnowledgeArticle.tags)
    )
    if id_or_slug.isdigit():
        article = query.filter(KnowledgeArticle.id == int(id_or_slug)).first()
    else:
        article = query.filter(KnowledgeArticle.slug == id_or_slug).first()

    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")

    if article.status != ArticleStatus.PUBLISHED:
        if not current_user or current_user.role == UserRole.CUSTOMER:
            raise HTTPException(status_code=403, detail="Article is currently a draft")

    # Increment view count
    article.view_count += 1
    db.commit()
    db.refresh(article)

    resp = ArticleDetailResponse.model_validate(article)
    resp.category_name = article.category.name if article.category else "General"
    return resp

@router.post("", response_model=ArticleDetailResponse, status_code=status.HTTP_201_CREATED)
def create_article(
    article_in: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    clean_title = article_in.title.strip()
    existing = db.query(KnowledgeArticle).filter(KnowledgeArticle.title.ilike(clean_title)).first()
    if existing:
        raise HTTPException(status_code=400, detail="An article with this title already exists.")

    base_slug = slugify(clean_title)
    slug = base_slug
    counter = 1
    while db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    article = KnowledgeArticle(
        title=clean_title,
        slug=slug,
        short_description=article_in.short_description.strip(),
        content=article_in.content.strip(),
        category_id=article_in.category_id,
        author_id=current_user.id,
        status=article_in.status,
        is_indexed=False
    )
    db.add(article)
    db.flush()

    # Handle tags
    if article_in.tags:
        for tag_name in article_in.tags:
            tag_name_clean = tag_name.strip()
            if not tag_name_clean:
                continue
            tag_slug = slugify(tag_name_clean)
            tag = db.query(Tag).filter(Tag.slug == tag_slug).first()
            if not tag:
                tag = Tag(name=tag_name_clean, slug=tag_slug)
                db.add(tag)
                db.flush()
            article.tags.append(tag)

    db.commit()
    db.refresh(article)

    # Index into document chunks
    index_article_chunks(db, article)
    db.refresh(article)

    # If published, auto-resolve matching knowledge gaps
    if article.status == ArticleStatus.PUBLISHED:
        GapService.resolve_matching_gaps(db, article.title, article.content)

    invalidate_metrics_cache()
    resp = ArticleDetailResponse.model_validate(article)
    resp.category_name = article.category.name if article.category else "General"
    return resp

@router.put("/{article_id}", response_model=ArticleDetailResponse)
def update_article(
    article_id: int,
    article_in: ArticleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT))
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")

    if article_in.title is not None:
        article.title = article_in.title.strip()
        base_slug = slugify(article.title)
        slug = base_slug
        counter = 1
        while db.query(KnowledgeArticle).filter(
            KnowledgeArticle.slug == slug,
            KnowledgeArticle.id != article.id
        ).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        article.slug = slug
    if article_in.short_description is not None:
        article.short_description = article_in.short_description.strip()
    if article_in.content is not None:
        article.content = article_in.content.strip()
    if article_in.category_id is not None:
        article.category_id = article_in.category_id
    if article_in.status is not None:
        article.status = article_in.status

    if article_in.tags is not None:
        article.tags = []
        for tag_name in article_in.tags:
            tag_name_clean = tag_name.strip()
            if not tag_name_clean:
                continue
            tag_slug = slugify(tag_name_clean)
            tag = db.query(Tag).filter(Tag.slug == tag_slug).first()
            if not tag:
                tag = Tag(name=tag_name_clean, slug=tag_slug)
                db.add(tag)
                db.flush()
            article.tags.append(tag)

    db.commit()
    db.refresh(article)

    # Re-index chunks
    index_article_chunks(db, article)
    db.refresh(article)

    # If published, auto-resolve matching knowledge gaps
    if article.status == ArticleStatus.PUBLISHED:
        GapService.resolve_matching_gaps(db, article.title, article.content)

    invalidate_metrics_cache()
    resp = ArticleDetailResponse.model_validate(article)
    resp.category_name = article.category.name if article.category else "General"
    return resp

@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN))
):
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Knowledge article not found")

    db.delete(article)
    db.commit()
    invalidate_metrics_cache()
    return None
