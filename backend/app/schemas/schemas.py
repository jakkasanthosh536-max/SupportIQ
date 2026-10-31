from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.models import UserRole, ArticleStatus, DocumentStatus, TicketStatus, TicketPriority, GapStatus

# ----------------- User & Auth Schemas -----------------
class UserBase(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    full_name: str
    role: UserRole = UserRole.CUSTOMER

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DemoLoginRequest(BaseModel):
    role: UserRole

# ----------------- Category & Tag Schemas -----------------
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "HelpCircle"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    slug: str
    article_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class TagBase(BaseModel):
    name: str

class TagResponse(TagBase):
    id: int
    slug: str

    model_config = ConfigDict(from_attributes=True)

# ----------------- Knowledge Article Schemas -----------------
class ArticleBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    short_description: str = Field(..., min_length=5)
    content: str = Field(..., min_length=10)
    category_id: Optional[int] = None
    status: ArticleStatus = ArticleStatus.PUBLISHED
    tags: Optional[List[str]] = []

class ArticleCreate(ArticleBase):
    pass

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    short_description: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[ArticleStatus] = None
    tags: Optional[List[str]] = None

class ArticleResponse(BaseModel):
    id: int
    title: str
    slug: str
    short_description: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    status: ArticleStatus
    is_indexed: bool
    view_count: int
    helpful_count: int
    unhelpful_count: int
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ArticleDetailResponse(ArticleResponse):
    content: str
    author: Optional[UserResponse] = None
    source_document_id: Optional[int] = None

# ----------------- Document Schemas -----------------
class DocumentChunkResponse(BaseModel):
    id: int
    chunk_index: int
    content: str
    token_count: int

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_type: str
    file_size: int
    status: DocumentStatus
    error_message: Optional[str] = None
    chunks_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []

# ----------------- Search & AI Schemas -----------------
class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1)
    category_id: Optional[int] = None
    limit: int = 10

class SearchResultItem(BaseModel):
    article_id: int
    title: str
    slug: str
    category_name: Optional[str] = None
    excerpt: str
    score: float
    match_type: str # 'hybrid', 'keyword', 'semantic'
    tags: List[str] = []
    item_type: str = "article"
    ticket_id: Optional[int] = None
    ticket_number: Optional[str] = None
    status: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]

class CitationItem(BaseModel):
    article_id: int
    article_title: str
    article_slug: Optional[str] = None
    excerpt: str
    relevance_score: float

    model_config = ConfigDict(from_attributes=True)

class ChatMessageCreate(BaseModel):
    conversation_id: Optional[int] = None
    content: str = Field(..., min_length=1)

class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_type: str
    content: str
    confidence_score: Optional[float] = None
    processing_mode: str
    created_at: datetime
    citations: List[CitationItem] = []

    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: int
    title: str
    is_escalated: bool
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class ConversationDetailResponse(ConversationResponse):
    messages: List[ChatMessageResponse] = []

class FeedbackCreate(BaseModel):
    message_id: int
    rating: int = Field(..., ge=-1, le=1) # 1 or -1
    comment: Optional[str] = None

# ----------------- Support Ticket Schemas -----------------
class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=3)
    issue_description: str = Field(..., min_length=5)
    category: Optional[str] = "General"
    priority: TicketPriority = TicketPriority.MEDIUM
    conversation_id: Optional[int] = None
    escalation_reason: Optional[str] = None

class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    issue_description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_agent_id: Optional[int] = None
    resolution_summary: Optional[str] = None

class TicketNoteCreate(BaseModel):
    note: str = Field(..., min_length=1)
    is_internal: bool = True

class TicketNoteResponse(BaseModel):
    id: int
    ticket_id: int
    note: str
    is_internal: bool
    author_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    subject: str
    category: Optional[str] = "General"
    is_demo: Optional[bool] = False
    priority: TicketPriority
    status: TicketStatus
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    assigned_agent_id: Optional[int] = None
    assigned_agent_name: Optional[str] = None
    conversation_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    notes_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class TicketDetailResponse(TicketResponse):
    issue_description: str
    escalation_reason: Optional[str] = None
    resolution_summary: Optional[str] = None
    resolved_at: Optional[datetime] = None
    notes: List[TicketNoteResponse] = []
    conversation: Optional[ConversationDetailResponse] = None

# ----------------- Knowledge Gap Schemas -----------------
class KnowledgeGapResponse(BaseModel):
    id: int
    question: str
    topic: str
    frequency: int
    status: GapStatus
    suggested_action: Optional[str] = None
    suggested_faq_answer: Optional[str] = None
    related_ticket_id: Optional[int] = None
    last_asked_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class KnowledgeGapUpdate(BaseModel):
    status: Optional[GapStatus] = None
    suggested_action: Optional[str] = None

class CreateArticleFromGapRequest(BaseModel):
    title: str
    content: str
    category_id: Optional[int] = None
    tags: Optional[List[str]] = []

# ----------------- Analytics Schemas -----------------
class TrendPoint(BaseModel):
    date: str
    questions: int
    answered: int
    escalated: int

class TopicDistribution(BaseModel):
    topic: str
    count: int
    articles: Optional[int] = 0
    inquiries: Optional[int] = 0

class ArticleUsage(BaseModel):
    id: int
    title: str
    citations_count: int
    view_count: int
    helpfulness_ratio: float

class AnalyticsOverviewResponse(BaseModel):
    total_articles: int
    total_published: Optional[int] = 0
    total_drafts: Optional[int] = 0
    total_questions: int
    answered_with_knowledge: int
    unanswered_questions: int
    escalated_questions: int
    open_tickets: int
    resolved_tickets: int
    total_tickets: Optional[int] = 0
    total_knowledge_gaps: Optional[int] = 0
    active_knowledge_gaps: Optional[int] = 0
    resolved_knowledge_gaps: Optional[int] = 0
    feedback_positive: int
    feedback_negative: int
    total_feedback: Optional[int] = 0
    satisfaction_rate: float
    avg_confidence_score: float
    knowledge_coverage_rate: float
    escalation_rate: Optional[float] = 0.0
    question_trends: List[TrendPoint]
    topic_distribution: List[TopicDistribution]
    top_articles: List[ArticleUsage]
    recent_knowledge_gaps: List[KnowledgeGapResponse]

# ----------------- Settings Schemas -----------------
class SettingsResponse(BaseModel):
    ai_provider: str
    ai_model: str
    is_live_llm: bool
    retrieval_confidence_threshold: float
    max_retrieval_chunks: int
    categories_count: int
    documents_count: int
    articles_count: int

class SettingsUpdate(BaseModel):
    retrieval_confidence_threshold: Optional[float] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
