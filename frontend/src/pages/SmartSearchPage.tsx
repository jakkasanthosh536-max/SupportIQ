import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SearchResultItem, Category } from '../types';
import {
  Search, BookOpen, ExternalLink, Filter, Sparkles,
  ArrowRight, ShieldCheck, Zap
} from 'lucide-react';

export const SmartSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      setQuery(qParam);
      executeSearch(qParam, categoryId);
    }
  }, [searchParams]);

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  };

  const executeSearch = async (searchTerm: string, catId?: number) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setTotalResults(0);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await api.searchKnowledge(searchTerm.trim(), catId);
      setResults(data.results || []);
      setTotalResults(data.total_results || 0);
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      executeSearch(query.trim(), categoryId);
    }
  };

  const handleCategorySelect = (catId?: number) => {
    setCategoryId(catId);
    if (query.trim()) {
      executeSearch(query.trim(), catId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hybrid Retrieval Engine (Keyword BM25 + Semantic Cosine)</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Smart Knowledge Search
        </h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Explore policies, operational procedures, and FAQ answers with relevance ranking.
        </p>
      </div>

      {/* Main Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative shadow-2xl">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keywords, policies, procedures (e.g. return window, refund timeline, password reset)..."
          className="w-full bg-dark-900 border border-slate-700/80 rounded-2xl pl-12 pr-28 py-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition shadow-inner"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition"
        >
          Search
        </button>
      </form>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 justify-center">
        <button
          onClick={() => handleCategorySelect(undefined)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
            categoryId === undefined
              ? 'bg-brand-600 text-white font-semibold'
              : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCategorySelect(c.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
              categoryId === c.id
                ? 'bg-brand-600 text-white font-semibold'
                : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search Results Area */}
      <div className="space-y-4 pt-2">
        {loading && (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping"></div>
            <span>Evaluating candidate article excerpts...</span>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="p-8 rounded-2xl bg-dark-900 border border-slate-800 text-center space-y-3">
            <Search className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">No knowledge articles matched "{query}"</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Our retrieval engine found no verified policies matching this inquiry. You can ask in AI chat or escalate to a support ticket.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Ask SupportIQ Assistant
            </button>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Found {totalResults} relevant knowledge article{totalResults === 1 ? '' : 's'}</span>
              <span>Sorted by hybrid relevance score</span>
            </div>

            {results.map((res, idx) => {
              const isTicket = res.item_type === 'ticket';
              const isGap = res.item_type === 'gap';

              const handleClick = () => {
                if (isTicket && res.ticket_id) {
                  navigate(`/tickets?id=${res.ticket_id}`);
                } else if (isGap) {
                  navigate('/gaps');
                } else {
                  navigate(`/knowledge/${res.slug || res.article_id}`);
                }
              };

              return (
                <div
                  key={`${res.item_type || 'article'}-${res.article_id || res.ticket_id || idx}`}
                  onClick={handleClick}
                  className="p-5 rounded-2xl bg-dark-900 border border-slate-800 hover:border-brand-500/40 glass-card-hover cursor-pointer transition space-y-2.5 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isTicket
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : isGap
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-brand-500/10 text-brand-300 border-brand-500/20'
                        }`}
                      >
                        {isTicket ? 'Support Ticket' : isGap ? 'Knowledge Gap' : res.category_name || 'Knowledge Article'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Match: {res.match_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-brand-500 to-cyan-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.round(res.score * 100))}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-cyan-300 font-mono">
                        {Math.round(res.score * 100)}%
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 hover:text-brand-300 transition">
                    {res.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-dark-950/70 p-3 rounded-xl border border-slate-800/80">
                    {res.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      {res.tags && res.tags.map((t, tIdx) => (
                        <span key={tIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <span className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                      <span>{isTicket ? 'Open Ticket' : isGap ? 'Review Gap' : 'View Article'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
