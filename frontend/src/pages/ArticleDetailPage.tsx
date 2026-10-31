import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { KnowledgeArticle } from '../types';
import {
  ArrowLeft, BookOpen, Clock, Eye, ThumbsUp, Tag as TagIcon,
  ShieldCheck, Share2, Sparkles
} from 'lucide-react';
import { formatDisplayDate } from '../utils/date';

export const ArticleDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadArticle() {
      if (!idOrSlug) return;
      try {
        setLoading(true);
        const data = await api.getArticle(idOrSlug);
        setArticle(data);
      } catch (err: any) {
        setError(err.message || 'Article not found');
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
  }, [idOrSlug]);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading article...</div>;
  }

  if (error || !article) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-rose-400">{error || 'Article not found'}</p>
        <button
          onClick={() => navigate('/knowledge')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Back to Knowledge Base
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/knowledge')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Knowledge Articles</span>
      </button>

      {/* Article Container */}
      <div className="p-6 sm:p-8 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl space-y-6">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20">
              {article.category_name || 'General Policy'}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.view_count} views
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-snug">
            {article.title}
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            {article.short_description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Last updated: {formatDisplayDate(article.updated_at)}
            </span>
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <TagIcon className="w-3 h-3 text-slate-500" />
                {article.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300"
                  >
                    #{t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {article.content}
        </div>

        {/* Grounding Attribution Banner */}
        <div className="p-4 rounded-xl bg-dark-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">
              This article is indexed in the vector knowledge store and used for verified question answers.
            </span>
          </div>
          <button
            onClick={() => navigate(`/chat?preset=return`)}
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 shrink-0 ml-3"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test in AI Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
