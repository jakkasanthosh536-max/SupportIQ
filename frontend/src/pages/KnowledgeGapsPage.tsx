import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { KnowledgeGap, Category, GapStatus } from '../types';
import { CreateFAQFromGapModal } from '../components/CreateFAQFromGapModal';
import { formatDisplayDate } from '../utils/date';
import {
  AlertTriangle, CheckCircle2, Clock, Sparkles, Plus,
  RefreshCw, Check, ArrowRight, BookOpen, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const KnowledgeGapsPage: React.FC = () => {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadGaps();
    loadCategories();
  }, [statusFilter]);

  const loadGaps = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeGaps(statusFilter || undefined);
      setGaps(data);
    } catch (err) {
      console.warn('Error loading knowledge gaps:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  };

  const handleMarkStatus = async (gapId: number, newStatus: GapStatus) => {
    try {
      await api.updateKnowledgeGap(gapId, { status: newStatus });
      loadGaps();
    } catch (err: any) {
      alert(err.message || 'Failed to update gap status.');
    }
  };

  const handleOpenFaqModal = (gap: KnowledgeGap) => {
    setSelectedGap(gap);
    setFaqModalOpen(true);
  };

  const handleFaqCreated = (articleTitle: string) => {
    setSuccessToast(`Successfully created & indexed article "${articleTitle}". The gap is now resolved!`);
    loadGaps();
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Autonomous Knowledge Gap Detection</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Knowledge Gaps & FAQ Recommendations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Questions that produced insufficient retrieval confidence, negative feedback, or human escalation.
          </p>
        </div>

        <button
          onClick={loadGaps}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="underline font-bold text-emerald-200 hover:text-white"
          >
            Test in Chat
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            statusFilter === ''
              ? 'bg-brand-600 text-white'
              : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Detected Gaps ({gaps.length})
        </button>
        <button
          onClick={() => setStatusFilter('detected')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            statusFilter === 'detected'
              ? 'bg-amber-600 text-white'
              : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Active / Unresolved
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            statusFilter === 'resolved'
              ? 'bg-emerald-600 text-white'
              : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Resolved via FAQs
        </button>
      </div>

      {/* Gaps Table */}
      <div className="rounded-2xl bg-dark-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Scanning knowledge logs...</div>
          ) : gaps.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No knowledge gaps found in this filter view.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Unanswered Question / Topic</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Suggested Action</th>
                  <th className="py-3 px-4">Last Inquired</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {gaps.map((gap) => (
                  <tr key={gap.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="line-clamp-2">{gap.question}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 mt-1 inline-block">
                            {gap.topic}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                      {gap.frequency}x
                    </td>
                    <td className="py-3.5 px-4">
                      {gap.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : gap.status === 'reviewed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                          Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Detected
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {gap.suggested_action || 'Draft FAQ article to address gap'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {formatDisplayDate(gap.last_asked_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {gap.status !== 'resolved' ? (
                          <button
                            onClick={() => handleOpenFaqModal(gap)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1 transition"
                            title="Generate 1-click FAQ article and resolve gap"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>1-Click FAQ</span>
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolved</span>
                          </span>
                        )}

                        {gap.status === 'detected' && (
                          <button
                            onClick={() => handleMarkStatus(gap.id, 'reviewed' as GapStatus)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                            title="Mark Reviewed"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 1-Click FAQ Generation Modal */}
      <CreateFAQFromGapModal
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        gap={selectedGap}
        categories={categories}
        onSuccess={handleFaqCreated}
      />
    </div>
  );
};
