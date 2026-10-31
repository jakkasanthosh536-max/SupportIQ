import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { KnowledgeGap, Category } from '../types';
import { api } from '../services/api';

interface CreateFAQFromGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  gap: KnowledgeGap | null;
  categories: Category[];
  onSuccess: (articleTitle: string) => void;
}

export const CreateFAQFromGapModal: React.FC<CreateFAQFromGapModalProps> = ({
  isOpen,
  onClose,
  gap,
  categories,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('faq, resolved-gap');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gap) {
      setTitle(gap.question.endsWith('?') ? gap.question : `${gap.question}?`);
      setContent(
        gap.suggested_faq_answer ||
        `### Frequently Asked Question: ${gap.question}\n\n` +
        `**Official NovaStore Resolution**:\n` +
        `Provide verified details addressing this inquiry so the AI retrieval engine can answer customer questions directly.`
      );
      // Auto-match category by topic
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase().includes(gap.topic.toLowerCase()) ||
               gap.topic.toLowerCase().includes(c.name.toLowerCase())
      );
      setCategoryId(matchedCat ? matchedCat.id : (categories[0]?.id));
      setTagsStr(`faq, ${gap.topic.toLowerCase().replace(/\s+/g, '-')}, resolved-gap`);
    }
    setError(null);
  }, [gap, categories, isOpen]);

  if (!isOpen || !gap) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please provide a title and official FAQ resolution content.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const tagsArray = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const art = await api.createArticleFromGap(gap.id, {
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId,
        tags: tagsArray,
      });
      onSuccess(art.title);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate FAQ article.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Resolve Gap: Generate Verified FAQ Article
            </h3>
            <p className="text-xs text-slate-400">
              Converts this detected customer question gap into an indexed article and marks it resolved.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Article FAQ Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 shadow-inner"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 shadow-inner"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Verified Resolution / Article Policy Body
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 leading-relaxed shadow-inner"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Indexing Article & Resolving...' : 'Publish Article & Resolve Gap'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
