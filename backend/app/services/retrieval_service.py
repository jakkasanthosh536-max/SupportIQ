import re
import math
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import KnowledgeArticle, DocumentChunk, ArticleStatus
from app.core.config import settings

# Optional SentenceTransformer support with graceful TF-IDF fallback
_EMBEDDING_MODEL = None
_EMBEDDING_LOAD_ATTEMPTED = False

def get_embedding_model():
    global _EMBEDDING_MODEL, _EMBEDDING_LOAD_ATTEMPTED
    if not _EMBEDDING_LOAD_ATTEMPTED:
        _EMBEDDING_LOAD_ATTEMPTED = True
        try:
            # Only try loading if already locally cached; avoid network timeouts during offline demo
            from sentence_transformers import SentenceTransformer
            _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            _EMBEDDING_MODEL = None
    return _EMBEDDING_MODEL

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at",
    "to", "for", "with", "about", "against", "between", "into", "through", "during",
    "before", "after", "above", "below", "from", "up", "down", "out", "of", "off",
    "i", "me", "my", "myself", "we", "our", "ours", "you", "your", "yours", "he",
    "him", "his", "she", "her", "it", "its", "they", "them", "their", "this",
    "that", "these", "those", "can", "could", "would", "should", "may", "might",
    "will", "shall", "do", "does", "did", "have", "has", "had", "how", "what",
    "when", "where", "why", "which", "who", "whom", "whose", "be", "been", "being",
    "novastore", "store", "company", "please", "tell", "give", "get", "want", "need"
}

def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text to lowercase alphanumeric words."""
    words = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
    filtered = [w for w in words if w not in STOPWORDS]
    return filtered if filtered else words

def calculate_bm25_score(query_tokens: List[str], doc_tokens: List[str], avg_dl: float, total_docs: int, df_map: Dict[str, int]) -> float:
    """Calculate BM25 relevance score for query tokens against document tokens."""
    if not query_tokens or not doc_tokens:
        return 0.0

    k1 = 1.5
    b = 0.75
    doc_len = len(doc_tokens)
    score = 0.0

    doc_tf = {}
    for t in doc_tokens:
        doc_tf[t] = doc_tf.get(t, 0) + 1

    for q in query_tokens:
        if q in doc_tf:
            tf = doc_tf[q]
            df = df_map.get(q, 1)
            idf = math.log((total_docs - df + 0.5) / (df + 0.5) + 1.0)
            numerator = tf * (k1 + 1)
            denominator = tf + k1 * (1 - b + b * (doc_len / (avg_dl or 1.0)))
            score += idf * (numerator / denominator)

    return max(0.0, score)

def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two numeric vectors."""
    dot = sum(a * b for a, b in zip(vec1, vec2))
    mag1 = math.sqrt(sum(a * a for a in vec1))
    mag2 = math.sqrt(sum(b * b for b in vec2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (mag1 * mag2)))

class RetrievalService:
    @staticmethod
    def search_knowledge(
        db: Session,
        query: str,
        category_id: Optional[int] = None,
        limit: int = 5,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Perform hybrid retrieval combining keyword matching (BM25 + title/tag boosts)
        and semantic similarity over published knowledge articles and indexed chunks.
        """
        threshold = threshold if threshold is not None else settings.RETRIEVAL_CONFIDENCE_THRESHOLD
        query_clean = query.strip()
        if not query_clean:
            return {"results": [], "confidence": 0.0, "is_sufficient": False}

        query_tokens = tokenize(query_clean)
        if not query_tokens:
            query_tokens = [query_clean.lower()]

        # Fetch candidate published articles
        article_query = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        )
        if category_id:
            article_query = article_query.filter(KnowledgeArticle.category_id == category_id)

        articles = article_query.all()
        if not articles:
            return {"results": [], "confidence": 0.0, "is_sufficient": False}

        # Build corpus for IDF and BM25
        doc_data = []
        df_map: Dict[str, int] = {}

        for art in articles:
            # Aggregate tags text
            tags_text = " ".join([t.name for t in art.tags]) if art.tags else ""
            category_name = art.category.name if art.category else ""
            
            # Combine content chunks
            chunks = db.query(DocumentChunk).filter(DocumentChunk.article_id == art.id).all()
            if not chunks:
                # If no chunks explicitly exist, use the article content as a chunk
                chunk_texts = [art.content]
            else:
                chunk_texts = [c.content for c in chunks]

            for chunk_idx, chunk_text in enumerate(chunk_texts):
                combined_text = f"{art.title} {tags_text} {category_name} {chunk_text}"
                tokens = tokenize(combined_text)
                doc_data.append({
                    "article": art,
                    "chunk_index": chunk_idx,
                    "chunk_text": chunk_text,
                    "tokens": tokens,
                    "title": art.title,
                    "tags_text": tags_text,
                    "category_name": category_name
                })
                # Update document frequency
                seen_tokens = set(tokens)
                for t in seen_tokens:
                    df_map[t] = df_map.get(t, 0) + 1

        total_docs = len(doc_data)
        if total_docs == 0:
            return {"results": [], "confidence": 0.0, "is_sufficient": False}

        avg_dl = sum(len(d["tokens"]) for d in doc_data) / total_docs

        # Check semantic embedding availability
        embed_model = get_embedding_model()
        query_embedding = None
        if embed_model:
            try:
                query_embedding = embed_model.encode(query_clean).tolist()
            except Exception:
                query_embedding = None

        scored_candidates = []
        max_possible_score = 0.001

        for d in doc_data:
            # 1. Keyword BM25 score
            bm25 = calculate_bm25_score(query_tokens, d["tokens"], avg_dl, total_docs, df_map)

            # Title boost: if words match title directly
            title_lower = d["title"].lower()
            title_matches = sum(1 for q in query_tokens if q in title_lower)
            # Require at least 2 token matches or >50% of query tokens in title to count as title match
            if title_matches >= 2 or (len(query_tokens) == 1 and title_matches == 1):
                title_boost = (title_matches / max(len(query_tokens), 1)) * 1.8
            else:
                title_boost = 0.0

            # Tag boost
            tag_lower = d["tags_text"].lower()
            tag_matches = sum(1 for q in query_tokens if q in tag_lower)
            if tag_matches >= 1 and (bm25 > 0 or title_boost > 0):
                tag_boost = (tag_matches / max(len(query_tokens), 1)) * 1.2
            else:
                tag_boost = 0.0

            # Phrase exact match boost
            phrase_boost = 2.0 if query_clean.lower() in d["chunk_text"].lower() or query_clean.lower() in title_lower else 0.0

            # If no actual content match occurred in chunk and no phrase match, suppress keyword score
            if bm25 == 0.0 and phrase_boost == 0.0 and title_boost == 0.0:
                keyword_score = 0.0
            else:
                keyword_score = bm25 + title_boost + tag_boost + phrase_boost

            # 2. Semantic score
            semantic_score = 0.0
            if embed_model and query_embedding:
                try:
                    chunk_embed = embed_model.encode(d["chunk_text"][:500]).tolist()
                    semantic_score = compute_cosine_similarity(query_embedding, chunk_embed)
                except Exception:
                    semantic_score = 0.0
            else:
                # Fallback: token overlap Jaccard
                set_q = set(query_tokens)
                set_d = set(d["tokens"])
                overlap = len(set_q.intersection(set_d))
                semantic_score = overlap / max(len(set_q.union(set_d)), 1) if overlap > 0 else 0.0

            # Calculate query token coverage across chunk + title + tags
            distinct_q = set(query_tokens)
            matched_q = [w for w in distinct_q if any(w in t for t in d["tokens"])]
            coverage = len(matched_q) / max(len(distinct_q), 1)

            # Quadratic coverage dampening for queries with low subject overlap (prevents incidental word match hallucinations)
            if len(distinct_q) >= 3 and coverage < 0.5:
                coverage_penalty = (coverage / 0.5) ** 2
            else:
                coverage_penalty = 1.0

            # If neither keyword nor semantic match found substantive overlap, score remains near zero
            normalized_keyword = min(1.0, keyword_score / 4.0) * coverage_penalty
            if normalized_keyword == 0.0 and semantic_score < 0.2:
                combined_score = 0.0
            else:
                combined_score = (0.65 * normalized_keyword + 0.35 * semantic_score) * coverage_penalty

            if combined_score > max_possible_score:
                max_possible_score = combined_score

            # Create clean excerpt (highlight relevant part)
            excerpt = d["chunk_text"]
            if len(excerpt) > 280:
                # Find matching token index to anchor snippet
                lower_chunk = excerpt.lower()
                first_pos = -1
                for q in query_tokens:
                    pos = lower_chunk.find(q)
                    if pos != -1 and (first_pos == -1 or pos < first_pos):
                        first_pos = pos
                if first_pos != -1:
                    start_pos = max(0, first_pos - 60)
                    end_pos = min(len(excerpt), start_pos + 260)
                    excerpt = ("..." if start_pos > 0 else "") + excerpt[start_pos:end_pos].strip() + ("..." if end_pos < len(d["chunk_text"]) else "")
                else:
                    excerpt = excerpt[:260] + "..."

            scored_candidates.append({
                "article_id": d["article"].id,
                "title": d["article"].title,
                "slug": d["article"].slug,
                "category_name": d["category_name"],
                "excerpt": excerpt,
                "score": round(combined_score, 4),
                "keyword_score": round(normalized_keyword, 4),
                "semantic_score": round(semantic_score, 4),
                "match_type": "hybrid" if (embed_model and query_embedding) else "keyword_overlap",
                "tags": [t.name for t in d["article"].tags] if d["article"].tags else []
            })

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        # Deduplicate by article_id (keep highest scoring chunk per article)
        seen_articles = set()
        top_results = []
        for cand in scored_candidates:
            if cand["article_id"] not in seen_articles and cand["score"] > 0.05:
                seen_articles.add(cand["article_id"])
                top_results.append(cand)
            if len(top_results) >= limit:
                break

        highest_score = top_results[0]["score"] if top_results else 0.0
        # Confidence score indicator between 0.0 and 1.0
        confidence = round(highest_score, 3)
        is_sufficient = confidence >= threshold and len(top_results) > 0

        return {
            "results": top_results,
            "confidence": confidence,
            "is_sufficient": is_sufficient,
            "threshold": threshold
        }
