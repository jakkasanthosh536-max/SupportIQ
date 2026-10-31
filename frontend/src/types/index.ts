export type UserRole = 'admin' | 'agent' | 'customer';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  article_count?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  content?: string;
  category_id?: number;
  category_name?: string;
  status: 'draft' | 'published';
  is_indexed: boolean;
  view_count: number;
  helpful_count: number;
  unhelpful_count: number;
  source_document_id?: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  author?: User;
}

export interface DocumentChunk {
  id: number;
  chunk_index: number;
  content: string;
  token_count: number;
}

export interface UploadedDocument {
  id: number;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  error_message?: string;
  chunks_count: number;
  created_at: string;
  chunks?: DocumentChunk[];
}

export interface CitationItem {
  article_id: number;
  article_title: string;
  article_slug?: string;
  excerpt: string;
  relevance_score: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: 'customer' | 'ai' | 'agent';
  content: string;
  confidence_score?: number;
  processing_mode: string;
  created_at: string;
  citations: CitationItem[];
}

export interface Conversation {
  id: number;
  title: string;
  is_escalated: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: ChatMessage[];
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketNote {
  id: number;
  ticket_id: number;
  note: string;
  is_internal: boolean;
  author_name?: string;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  ticket_number: string;
  subject: string;
  issue_description: string;
  priority: TicketPriority;
  status: TicketStatus;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  assigned_agent_id?: number;
  assigned_agent_name?: string;
  conversation_id?: number;
  escalation_reason?: string;
  resolution_summary?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  notes_count?: number;
  notes?: TicketNote[];
  conversation?: Conversation;
}

export type GapStatus = 'detected' | 'reviewed' | 'resolved';

export interface KnowledgeGap {
  id: number;
  question: string;
  topic: string;
  frequency: number;
  status: GapStatus;
  suggested_action?: string;
  suggested_faq_answer?: string;
  related_ticket_id?: number;
  last_asked_at: string;
  created_at: string;
}

export interface SearchResultItem {
  article_id: number;
  title: string;
  slug: string;
  category_name?: string;
  excerpt: string;
  score: number;
  match_type: string;
  tags: string[];
  item_type?: 'article' | 'ticket' | 'gap';
  ticket_id?: number;
  ticket_number?: string;
  status?: string;
}

export interface TrendPoint {
  date: string;
  questions: number;
  answered: number;
  escalated: number;
}

export interface TopicDistribution {
  topic: string;
  count: number;
  articles?: number;
  inquiries?: number;
}

export interface TopArticleUsage {
  id: number;
  title: string;
  citations_count: number;
  view_count: number;
  helpfulness_ratio: number;
}

export interface AnalyticsOverview {
  total_articles: number;
  total_published?: number;
  total_drafts?: number;
  total_questions: number;
  answered_with_knowledge: number;
  unanswered_questions: number;
  escalated_questions: number;
  open_tickets: number;
  resolved_tickets: number;
  total_tickets?: number;
  total_knowledge_gaps?: number;
  active_knowledge_gaps?: number;
  resolved_knowledge_gaps?: number;
  feedback_positive: number;
  feedback_negative: number;
  total_feedback?: number;
  satisfaction_rate: number;
  avg_confidence_score: number;
  knowledge_coverage_rate: number;
  escalation_rate?: number;
  question_trends: TrendPoint[];
  topic_distribution: TopicDistribution[];
  top_articles: TopArticleUsage[];
  recent_knowledge_gaps: KnowledgeGap[];
}

export interface SettingsData {
  ai_provider: string;
  ai_model: string;
  is_live_llm: boolean;
  retrieval_confidence_threshold: number;
  max_retrieval_chunks: number;
  categories_count: number;
  documents_count: number;
  articles_count: number;
}
