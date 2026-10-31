import React, { useState, useEffect } from 'react';
import { X, BookOpen, Save, Eye, Edit3 } from 'lucide-react';
import { KnowledgeArticle, Category } from '../types';
import { api } from '../services/api';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article?: KnowledgeArticle | null;
  categories: Category[];
  onSaved: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  isOpen,
  onClose,
  article,
  categories,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [shortDesc, setShortDesc] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [previewMode, setPreviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (article) {
      setTitle(article.title || '');
      setCategoryId(article.category_id);
      setShortDesc(article.short_description || '');
      setContent(article.content || '');
      setTagsStr(article.tags ? article.tags.map((t) => t.name).join(', ') : '');
      setStatus(article.status || 'published');
    } else {
      setTitle('');
      setCategoryId(categories.length > 0 ? categories[0].id : undefined);
      setShortDesc('');
      setContent('');
      setTagsStr('');
      setStatus('published');
    }
    setError(null);
    setPreviewMode(false);
  }, [article, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !shortDesc.trim() || !content.trim()) {
      setError('Please provide a title, short description, and full article content.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const tagsArray = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (article) {
        await api.updateArticle(article.id, {
          title: title.trim(),
          category_id: categoryId,
          short_description: shortDesc.trim(),
          content: content.trim(),
          status,
          tags: tagsArray as any,
        });
      } else {
        await api.createArticle({
          title: title.trim(),
          category_id: categoryId,
          short_description: shortDesc.trim(),
          content: content.trim(),
          status,
          tags: tagsArray as any,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save knowledge article.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {article ? 'Edit Knowledge Article' : 'Create Knowledge Article'}
            </h3>
            <p className="text-xs text-slate-400">
              Articles are automatically chunked, indexed, and available for AI grounded answers.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Article Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Return Policy & Eligibility"
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Short Summary / Excerpt *
            </label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="1-2 sentences summarizing the policy for search snippets"
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="returns, refund, window, policy"
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Publish Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
              >
                <option value="published">Published — Active for AI retrieval & search</option>
                <option value="draft">Draft — Internal staging only</option>
              </select>
            </div>
          </div>

          {/* Content Editor with Preview Switcher */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Full Article Content (Markdown supported) *
              </label>
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] ${
                    !previewMode ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] ${
                    previewMode ? 'bg-brand-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="w-full min-h-[220px] max-h-[300px] overflow-y-auto bg-dark-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 prose prose-invert whitespace-pre-wrap leading-relaxed">
                {content || <em className="text-slate-500">No content entered yet.</em>}
              </div>
            ) : (
              <textarea
                rows={9}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write verified company policy or instructions here..."
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:border-brand-500 leading-relaxed shadow-inner"
                required
              />
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 shrink-0">
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-brand-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Indexing & Saving...' : article ? 'Update Article' : 'Publish Article'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
