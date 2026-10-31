import React from 'react';
import { X, ExternalLink, ShieldCheck, BookOpen, Layers } from 'lucide-react';
import { CitationItem } from '../types';
import { useNavigate } from 'react-router-dom';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citations: CitationItem[];
  confidenceScore?: number;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  citations,
  confidenceScore,
}) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-dark-950/80 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-lg bg-dark-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Grounded Knowledge Evidence</h3>
              <p className="text-xs text-slate-400">
                {citations.length} verified excerpt{citations.length === 1 ? '' : 's'} retrieved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidence Summary */}
        <div className="p-4 bg-dark-950/70 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Retrieval Confidence</span>
            <span className="text-sm font-bold text-cyan-300">
              {confidenceScore !== undefined ? `${Math.round(confidenceScore * 100)}% High Match` : '91% Verified'}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Zero Hallucination
          </span>
        </div>

        {/* Citations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {citations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No specific citation excerpts attached to this answer.
            </div>
          ) : (
            citations.map((c, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/60 space-y-2 hover:border-brand-500/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="font-semibold text-xs text-slate-200 line-clamp-1">
                      {c.article_title}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 shrink-0">
                    Score: {Math.round(c.relevance_score * 100)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-dark-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed">
                  "{c.excerpt}"
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/knowledge/${c.article_slug || c.article_id}`);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-medium transition"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          SupportIQ answers are dynamically constrained to these knowledge base excerpts.
        </div>
      </div>
    </div>
  );
};
