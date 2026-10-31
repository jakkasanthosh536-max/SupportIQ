import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from app.models.models import (
    KnowledgeArticle, Message, MessageCitation, AnswerFeedback,
    Ticket, TicketStatus, KnowledgeGap, ArticleStatus, Category, GapStatus
)

_METRICS_CACHE: Optional[Dict[str, Any]] = None
_METRICS_CACHE_TIME: float = 0
METRICS_CACHE_TTL: float = 10.0  # 10-second TTL for instant dashboard loading

def invalidate_metrics_cache():
    global _METRICS_CACHE_TIME
    _METRICS_CACHE_TIME = 0

class AnalyticsService:
    @staticmethod
    def get_overview_metrics(db: Session, force_refresh: bool = False) -> Dict[str, Any]:
        """Compute live aggregated analytics with in-memory caching and batch queries."""
        global _METRICS_CACHE, _METRICS_CACHE_TIME
        now_ts = time.time()
        if not force_refresh and _METRICS_CACHE and (now_ts - _METRICS_CACHE_TIME < METRICS_CACHE_TTL):
            return _METRICS_CACHE

        total_published = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        ).count()
        total_drafts = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.status == ArticleStatus.DRAFT
        ).count()
        total_articles = total_published + total_drafts

        # Customer questions
        customer_messages = db.query(Message).filter(Message.sender_type == "customer").all()
        total_questions = len(customer_messages)

        # AI answers
        VALID_ANSWER_MODES = ["llm", "demo_retrieval", "hybrid_rag", "keyword", "semantic"]
        ai_messages = db.query(Message).filter(Message.sender_type == "ai").all()
        answered_with_knowledge = sum(
            1 for m in ai_messages if m.processing_mode in VALID_ANSWER_MODES and (m.confidence_score or 0) >= 0.35
        )
        unanswered_questions = sum(
            1 for m in ai_messages if m.processing_mode == "abstention" or (m.confidence_score or 0) < 0.35
        )

        # Verified rate strictly matches verified answers / total questions
        knowledge_coverage_rate = (
            round((answered_with_knowledge / total_questions * 100), 1) if total_questions > 0 else 0.0
        )

        # Tickets metrics
        open_tickets = db.query(Ticket).filter(
            Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_CUSTOMER])
        ).count()
        resolved_tickets = db.query(Ticket).filter(
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        ).count()
        total_tickets = open_tickets + resolved_tickets
        escalated_questions = db.query(Ticket).filter(Ticket.conversation_id != None).count()
        escalation_rate = (
            round((escalated_questions / total_questions * 100), 1) if total_questions > 0 else 0.0
        )

        # Knowledge gaps metrics
        total_knowledge_gaps = db.query(KnowledgeGap).count()
        active_knowledge_gaps = db.query(KnowledgeGap).filter(KnowledgeGap.status != GapStatus.RESOLVED).count()
        resolved_knowledge_gaps = db.query(KnowledgeGap).filter(KnowledgeGap.status == GapStatus.RESOLVED).count()

        # Feedback & satisfaction
        feedbacks = db.query(AnswerFeedback).all()
        feedback_positive = sum(1 for f in feedbacks if f.rating > 0)
        feedback_negative = sum(1 for f in feedbacks if f.rating < 0)
        total_feedback = feedback_positive + feedback_negative
        satisfaction_rate = round((feedback_positive / total_feedback * 100), 1) if total_feedback > 0 else 0.0

        # Confidence scores
        conf_scores = [m.confidence_score for m in ai_messages if m.confidence_score is not None]
        avg_confidence = round(sum(conf_scores) / len(conf_scores), 2) if conf_scores else 0.0

        # Batch query for last 7 days metrics (replaces 21 separate queries with 2 batched queries)
        now = datetime.now(timezone.utc)
        seven_days_ago = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)

        recent_messages = db.query(
            Message.sender_type,
            Message.processing_mode,
            Message.confidence_score,
            Message.created_at
        ).filter(Message.created_at >= seven_days_ago).all()

        recent_tickets = db.query(
            Ticket.created_at
        ).filter(Ticket.created_at >= seven_days_ago).all()

        trends: List[Dict[str, Any]] = []
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            date_str = day_date.strftime("%b %d")

            q_count = sum(
                1 for m in recent_messages
                if m.sender_type == "customer"
                and m.created_at
                and (m.created_at.date() if hasattr(m.created_at, "date") else m.created_at) == day_date
            )
            ans_count = sum(
                1 for m in recent_messages
                if m.sender_type == "ai"
                and m.processing_mode in VALID_ANSWER_MODES
                and ((m.confidence_score or 0) >= 0.35 or m.confidence_score is None)
                and m.created_at
                and (m.created_at.date() if hasattr(m.created_at, "date") else m.created_at) == day_date
            )
            esc_count = sum(
                1 for t in recent_tickets
                if t.created_at
                and (t.created_at.date() if hasattr(t.created_at, "date") else t.created_at) == day_date
            )

            trends.append({
                "date": date_str,
                "questions": q_count,
                "answered": ans_count,
                "escalated": esc_count
            })

        # Batch query for categories and distribution (replaces N*2 queries with batched queries)
        all_categories = db.query(Category).options(selectinload(Category.articles)).order_by(Category.name).all()
        category_citations = db.query(
            KnowledgeArticle.category_id,
            func.count(MessageCitation.id).label("cits")
        ).join(MessageCitation, MessageCitation.article_id == KnowledgeArticle.id).group_by(KnowledgeArticle.category_id).all()
        cat_cit_map = {row[0]: row[1] for row in category_citations}

        all_gaps = db.query(KnowledgeGap).all()

        topic_distribution = []
        for cat in all_categories:
            art_count = len(cat.articles)
            cat_cits = cat_cit_map.get(cat.id, 0)
            first_word = cat.name.split()[0].lower() if cat.name else ""
            cat_gaps = sum(1 for g in all_gaps if first_word and first_word in (g.topic or "").lower())
            inquiry_count = cat_cits + cat_gaps
            topic_distribution.append({
                "topic": cat.name,
                "count": inquiry_count if inquiry_count > 0 else art_count,
                "articles": art_count,
                "inquiries": inquiry_count
            })

        # Top articles ranked by actual citations and usage (across ALL articles)
        citation_counts = db.query(
            MessageCitation.article_id,
            func.count(MessageCitation.id).label("citations")
        ).group_by(MessageCitation.article_id).all()
        cit_map = {cid: cnt for cid, cnt in citation_counts}

        published_articles = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        ).all()

        top_articles_data = []
        for art in published_articles:
            cits = cit_map.get(art.id, 0)
            total_revs = art.helpful_count + art.unhelpful_count
            ratio = round((art.helpful_count / total_revs * 100), 1) if total_revs > 0 else (100.0 if art.helpful_count > 0 else 0.0)
            top_articles_data.append({
                "id": art.id,
                "title": art.title,
                "citations_count": cits,
                "view_count": art.view_count,
                "helpfulness_ratio": ratio
            })
        top_articles_data.sort(key=lambda x: (x["citations_count"], x["helpfulness_ratio"], x["view_count"]), reverse=True)
        top_articles_data = top_articles_data[:6]

        # Recent gaps
        gaps = db.query(KnowledgeGap).order_by(KnowledgeGap.last_asked_at.desc()).limit(6).all()

        result = {
            "total_articles": total_articles,
            "total_published": total_published,
            "total_drafts": total_drafts,
            "total_questions": total_questions,
            "answered_with_knowledge": answered_with_knowledge,
            "unanswered_questions": unanswered_questions,
            "escalated_questions": escalated_questions,
            "open_tickets": open_tickets,
            "resolved_tickets": resolved_tickets,
            "total_tickets": total_tickets,
            "total_knowledge_gaps": total_knowledge_gaps,
            "active_knowledge_gaps": active_knowledge_gaps,
            "resolved_knowledge_gaps": resolved_knowledge_gaps,
            "feedback_positive": feedback_positive,
            "feedback_negative": feedback_negative,
            "total_feedback": total_feedback,
            "satisfaction_rate": satisfaction_rate,
            "avg_confidence_score": avg_confidence,
            "knowledge_coverage_rate": knowledge_coverage_rate,
            "escalation_rate": escalation_rate,
            "question_trends": trends,
            "topic_distribution": topic_distribution,
            "top_articles": top_articles_data,
            "recent_knowledge_gaps": gaps
        }
        _METRICS_CACHE = result
        _METRICS_CACHE_TIME = time.time()
        return result
