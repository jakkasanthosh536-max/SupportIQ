from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.models import (
    KnowledgeArticle, Message, MessageCitation, AnswerFeedback,
    Ticket, TicketStatus, KnowledgeGap, ArticleStatus, Category, GapStatus
)

class AnalyticsService:
    @staticmethod
    def get_overview_metrics(db: Session) -> Dict[str, Any]:
        """Compute live aggregated analytics directly from actual database records."""
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

        # Question trends (last 7 days using naive date boundaries for SQLite compatibility)
        now = datetime.now(timezone.utc)
        trends: List[Dict[str, Any]] = []
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_start = datetime.combine(day_date, datetime.min.time())
            day_end = datetime.combine(day_date, datetime.max.time())
            date_str = day_date.strftime("%b %d")

            q_count = db.query(Message).filter(
                Message.sender_type == "customer",
                Message.created_at >= day_start,
                Message.created_at <= day_end
            ).count()

            ans_count = db.query(Message).filter(
                Message.sender_type == "ai",
                Message.processing_mode.in_(VALID_ANSWER_MODES),
                (Message.confidence_score >= 0.35) | (Message.confidence_score == None),
                Message.created_at >= day_start,
                Message.created_at <= day_end
            ).count()

            esc_count = db.query(Ticket).filter(
                Ticket.created_at >= day_start,
                Ticket.created_at <= day_end
            ).count()

            trends.append({
                "date": date_str,
                "questions": q_count,
                "answered": ans_count,
                "escalated": esc_count
            })

        # Topic & Category distribution: include all registered categories
        all_categories = db.query(Category).order_by(Category.name).all()
        topic_distribution = []
        for cat in all_categories:
            art_count = len(cat.articles)
            cat_cits = db.query(MessageCitation).join(KnowledgeArticle).filter(
                KnowledgeArticle.category_id == cat.id
            ).count()
            # Match gaps by keyword in topic
            first_word = cat.name.split()[0]
            cat_gaps = db.query(KnowledgeGap).filter(
                KnowledgeGap.topic.ilike(f"%{first_word}%")
            ).count()
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

        return {
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
