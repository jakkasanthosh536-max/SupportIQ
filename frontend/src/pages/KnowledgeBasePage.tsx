import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { KnowledgeArticle, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { ArticleModal } from '../components/ArticleModal';
import {
  BookOpen, Plus, Search, Tag as TagIcon, Eye, ThumbsUp,
  Edit2, Trash2, ShieldCheck, CheckCircle2, Clock, Filter
} from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);

  const { isAgent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [selectedCat, statusFilter, searchTerm]);

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await api.getArticles({
        category_id: selectedCat,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      setArticles(data);
    } catch (err) {
      console.warn('Error loading articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete article "${title}"?`)) return;
    try {
      await api.deleteArticle(id);
      loadArticles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete article.');
    }
  };

  const handleEdit = (e: React.MouseEvent, art: KnowledgeArticle) => {
    e.stopPropagation();
    setEditingArticle(art);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Support Knowledge Base
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified articles and customer policies used by the AI answering engine.
          </p>
        </div>

        {isAgent && (
          <button
            onClick={() => {
              setEditingArticle(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-500/25 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Article</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by article title, keywords, or policy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-dark-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCat(undefined)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
              selectedCat === undefined
                ? 'bg-brand-600 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Categories ({articles.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                selectedCat === c.id
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading articles...</div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center bg-dark-900 border border-slate-800 rounded-2xl p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-sm">No knowledge articles match this filter</h3>
          <p className="text-xs text-slate-500">Try clearing your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art) => (
            <div
              key={art.id}
              onClick={() => navigate(`/knowledge/${art.slug || art.id}`)}
              className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 hover:border-brand-500/40 glass-card-hover cursor-pointer transition flex flex-col justify-between space-y-3 shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20">
                    {art.category_name || 'General'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {art.status === 'published' ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100 hover:text-brand-300 transition line-clamp-2">
                  {art.title}
                </h3>

                <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                  {art.short_description}
                </p>
              </div>

              {/* Tags & Footer */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                {art.tags && art.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {art.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {art.view_count}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400/80">
                      <ThumbsUp className="w-3 h-3" />
                      {art.helpful_count}
                    </span>
                  </div>

                  {isAgent && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleEdit(e, art)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-300 transition"
                        title="Edit article"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, art.id, art.title)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                        title="Delete article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Article Modal */}
      <ArticleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        article={editingArticle}
        categories={categories}
        onSaved={loadArticles}
      />
    </div>
  );
};
