from datetime import datetime, timezone
import re
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import KnowledgeGap, GapStatus

def clean_words(text: str) -> set:
    return set(re.findall(r"\b[a-zA-Z]{3,}\b", text.lower()))

class GapService:
    @staticmethod
    def record_or_update_gap(
        db: Session,
        question: str,
        related_ticket_id: Optional[int] = None
    ) -> KnowledgeGap:
        """
        Record or cluster a knowledge gap when a question cannot be verified,
        has low retrieval confidence, or is escalated.
        """
        question_clean = question.strip()
        q_words = clean_words(question_clean)

        # Check existing active gaps for similarity / clustering
        existing_gaps = db.query(KnowledgeGap).filter(
            KnowledgeGap.status.in_([GapStatus.DETECTED, GapStatus.REVIEWED])
        ).all()

        best_match: Optional[KnowledgeGap] = None
        best_overlap = 0.0

        for gap in existing_gaps:
            gap_words = clean_words(gap.question)
            if not gap_words or not q_words:
                continue
            intersection = len(q_words.intersection(gap_words))
            union = len(q_words.union(gap_words))
            jaccard = intersection / union if union > 0 else 0
            if jaccard > 0.4 and jaccard > best_overlap:
                best_overlap = jaccard
                best_match = gap

        if best_match:
            best_match.frequency += 1
            best_match.last_asked_at = datetime.now(timezone.utc)
            if related_ticket_id and not best_match.related_ticket_id:
                best_match.related_ticket_id = related_ticket_id
            db.commit()
            db.refresh(best_match)
            return best_match

        # Otherwise create a new Knowledge Gap
        topic = GapService._infer_topic(question_clean)
        suggested_action = f"Draft FAQ article covering '{topic}'"
        suggested_faq = GapService._generate_draft_faq(question_clean, topic)

        new_gap = KnowledgeGap(
            question=question_clean,
            topic=topic,
            frequency=1,
            status=GapStatus.DETECTED,
            suggested_action=suggested_action,
            suggested_faq_answer=suggested_faq,
            related_ticket_id=related_ticket_id,
            last_asked_at=datetime.now(timezone.utc)
        )
        db.add(new_gap)
        db.commit()
        db.refresh(new_gap)
        return new_gap

    @staticmethod
    def _infer_topic(question: str) -> str:
        q_lower = question.lower()
        if any(w in q_lower for w in ["ship", "delivery", "track", "courier", "package"]):
            return "Shipping & Delivery"
        elif any(w in q_lower for w in ["return", "refund", "exchange", "money back"]):
            return "Returns & Refunds"
        elif any(w in q_lower for w in ["password", "login", "auth", "2fa", "account", "email"]):
            return "Account & Security"
        elif any(w in q_lower for w in ["payment", "card", "billing", "invoice", "charge", "failed"]):
            return "Billing & Payments"
        elif any(w in q_lower for w in ["subscription", "cancel", "membership", "plan", "renew"]):
            return "Subscriptions"
        elif any(w in q_lower for w in ["discount", "coupon", "promo", "voucher"]):
            return "Promotions & Discounts"
        elif any(w in q_lower for w in ["api", "developer", "sdk", "integration", "webhook"]):
            return "Developer & API"
        else:
            words = [w.capitalize() for w in re.findall(r"\b[a-zA-Z]{4,}\b", question)[:3]]
            return " ".join(words) if words else "General Inquiry"

    @staticmethod
    def _generate_draft_faq(question: str, topic: str) -> str:
        return (
            f"### Frequently Asked Question: {question.rstrip('?')}?\n\n"
            f"**Topic**: {topic}\n\n"
            f"**Answer Guidelines**:\n"
            f"- Detail the step-by-step procedure for resolving this customer inquiry.\n"
            f"- Clarify any specific timeframes, prerequisites, or account eligibility requirements.\n"
            f"- Include relevant contact points if manual intervention is required."
        )

    @staticmethod
    def resolve_matching_gaps(db: Session, title: str, content: str = "") -> int:
        """
        When an article is published, auto-resolve any active gaps
        that match the article's title or main keywords.
        """
        target_words = clean_words(f"{title} {content}")
        if not target_words:
            return 0

        active_gaps = db.query(KnowledgeGap).filter(
            KnowledgeGap.status.in_([GapStatus.DETECTED, GapStatus.REVIEWED])
        ).all()

        resolved_count = 0
        for gap in active_gaps:
            gap_words = clean_words(gap.question)
            if not gap_words:
                continue
            matched_words = gap_words.intersection(target_words)
            if len(matched_words) / len(gap_words) >= 0.5:
                gap.status = GapStatus.RESOLVED
                resolved_count += 1

        if resolved_count > 0:
            db.commit()
        return resolved_count

