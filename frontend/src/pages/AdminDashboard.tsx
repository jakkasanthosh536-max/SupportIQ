import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  AnalyticsOverview, SupportTicket, KnowledgeGap, Category, KnowledgeArticle
} from '../types';
import { CreateFAQFromGapModal } from '../components/CreateFAQFromGapModal';
import {
  BookOpen, MessageSquare, CheckCircle, Ticket,
  ThumbsUp, Plus, Upload, ArrowUpRight,
  AlertTriangle, ShieldCheck, Sparkles, X,
  Clock, CheckCircle2, User as UserIcon, HelpCircle,
  Search, MessageSquareText, ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customerTickets, setCustomerTickets] = useState<SupportTicket[]>([]);
  const [customerArticles, setCustomerArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & interaction state
  const [previewTicket, setPreviewTicket] = useState<SupportTicket | null>(null);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, [user?.role]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      if (user?.role === 'customer') {
        // Customer-safe endpoints that never trigger 403 Forbidden
        const [ticketsRes, catsRes, articlesRes] = await Promise.all([
          api.getTickets(),
          api.getCategories(),
          api.getArticles(),
        ]);
        setCustomerTickets(ticketsRes);
        setCategories(catsRes);
        setCustomerArticles(articlesRes);
      } else {
        // Administrative / Agent Command Center endpoints
        const [overviewRes, ticketsRes, catsRes] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getTickets(),
          api.getCategories(),
        ]);
        setData(overviewRes);
        setTickets(ticketsRes.slice(0, 5));
        setCategories(catsRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };


  const handleGapFaqCreated = (articleTitle: string) => {
    setIsFaqModalOpen(false);
    setSelectedGap(null);
    setToastMessage(`FAQ created: "${articleTitle}" is now live in the Knowledge Base.`);
    loadDashboard();
    setTimeout(() => setToastMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading live database metrics...</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'customer') {
    const activeTicketsCount = customerTickets.filter(
      (t) => t.status !== 'resolved' && t.status !== 'closed'
    ).length;
    const resolvedTicketsCount = customerTickets.filter(
      (t) => t.status === 'resolved' || t.status === 'closed'
    ).length;

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Customer Welcome Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-dark-900 via-indigo-950/40 to-dark-900 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Customer Self-Service Hub
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-400">NovaStore AI Support</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                Welcome back, {user?.full_name || 'Valued Customer'}!
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Get instant, grounded answers to orders, shipping, refunds, and account questions 24/7 or manage your active support tickets.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Ask AI Assistant</span>
              </button>
              <button
                onClick={() => navigate('/tickets')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Ticket className="w-4 h-4 text-blue-400" />
                <span>My Tickets</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/tickets')}
            className="p-4 rounded-2xl glass-card glass-card-hover cursor-pointer border border-slate-800/80 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Active Tickets</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Ticket className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100">{activeTicketsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {activeTicketsCount === 1 ? '1 ticket in progress' : `${activeTicketsCount} tickets in progress`}
            </div>
          </div>

          <div
            onClick={() => navigate('/tickets')}
            className="p-4 rounded-2xl glass-card glass-card-hover cursor-pointer border border-slate-800/80 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Resolved Inquiries</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100">{resolvedTicketsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {resolvedTicketsCount} resolved tickets
            </div>
          </div>

          <div
            onClick={() => navigate('/knowledge')}
            className="p-4 rounded-2xl glass-card glass-card-hover cursor-pointer border border-slate-800/80 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Help Articles</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-100">{customerArticles.length}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {customerArticles.length} verified company guides
            </div>
          </div>

          <div
            onClick={() => navigate('/chat')}
            className="p-4 rounded-2xl glass-card glass-card-hover cursor-pointer border border-slate-800/80 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">AI Support Assistant</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online & Ready</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Grounded answers with citations
            </div>
          </div>
        </div>

        {/* My Recent Support Tickets */}
        <div className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">My Support Tickets</h2>
            </div>
            <button
              onClick={() => navigate('/tickets')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>View All Tickets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {customerTickets.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-dark-950/60 border border-slate-800/60 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
              <p className="text-xs font-semibold text-slate-200">
                No active support tickets found
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Have an inquiry regarding return windows, payment methods, or order tracking? Ask our AI assistant in chat!
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow"
              >
                Open Support Chat
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {customerTickets.slice(0, 6).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setPreviewTicket(ticket)}
                  className="p-3.5 rounded-xl bg-dark-950/70 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {ticket.ticket_number}
                      </span>
                      {ticket.is_demo && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          DEMO
                        </span>
                      )}
                      {ticket.category && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/20">
                          {ticket.category}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          ticket.priority === 'urgent' || ticket.priority === 'high'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : ticket.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                          ticket.status === 'resolved' || ticket.status === 'closed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : ticket.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{ticket.subject}</p>
                    {ticket.customer_name && (
                      <p className="text-[10px] text-slate-400">Customer: <span className="text-slate-300">{ticket.customer_name}</span></p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span className="text-[11px]">
                      {ticket.assigned_agent_name ? `Agent: ${ticket.assigned_agent_name}` : 'Pending Assignment'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tickets?id=${ticket.id}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Featured Store Guides & Policies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-slate-100">Verified Customer Policies & Guides</h2>
            </div>
            <button
              onClick={() => navigate('/knowledge')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>Explore All Guides</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerArticles.slice(0, 6).map((art) => (
              <div
                key={art.id}
                onClick={() => navigate(`/knowledge/${art.slug || art.id}`)}
                className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 hover:bg-dark-850/60 transition cursor-pointer flex flex-col justify-between gap-3 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {art.category_name || 'General Policy'}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      2 min read
                    </span>

                  </div>
                  <h3 className="text-xs font-bold text-slate-100 hover:text-cyan-300 transition line-clamp-1">
                    {art.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {art.short_description || 'Verified customer support policy for NovaStore.'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified by SupportIQ
                  </span>
                  <span className="text-cyan-400 text-xs font-semibold hover:underline">
                    Read Guide →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg space-y-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Browse by Category</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/knowledge?category=${cat.id}`)}
                className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 hover:border-brand-500/40 hover:bg-slate-800/40 text-left transition"
              >
                <p className="text-xs font-bold text-slate-200">{cat.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {cat.article_count || 0} articles
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Modal if viewing ticket */}
        {previewTicket && (
          <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-dark-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {previewTicket.ticket_number}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        previewTicket.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : previewTicket.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {previewTicket.priority}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold capitalize bg-blue-500/10 text-blue-400">
                      {previewTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{previewTicket.subject}</h3>
                </div>
                <button
                  onClick={() => setPreviewTicket(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Issue Description
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {previewTicket.issue_description}
                  </p>
                </div>
                {previewTicket.resolution_summary && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] font-semibold text-emerald-400 block uppercase tracking-wider">
                      Resolution Summary
                    </span>
                    <p className="text-emerald-200 leading-relaxed">
                      {previewTicket.resolution_summary}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  {previewTicket.customer_name && (
                    <p>Customer: <span className="text-slate-200 font-semibold">{previewTicket.customer_name}</span></p>
                  )}
                  {previewTicket.category && (
                    <p>Category: <span className="text-purple-300 font-semibold">{previewTicket.category}</span></p>
                  )}
                </div>
                {previewTicket.assigned_agent_name && (
                  <p className="text-slate-400 text-xs">
                    Assigned Agent: <span className="text-slate-200 font-semibold">{previewTicket.assigned_agent_name}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setPreviewTicket(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const id = previewTicket.id;
                    setPreviewTicket(null);
                    navigate(`/tickets?id=${id}`);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-1.5 shadow-md shadow-brand-500/25"
                >
                  <span>Open Ticket Conversation</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
        <span>{error || 'Unable to load analytics data.'}</span>
        <button
          onClick={loadDashboard}
          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }


  // Accurate stat card calculations derived strictly from database metrics
  const statCards = [
    {
      title: 'Knowledge Articles',
      value: data.total_articles,
      change: `${data.total_published ?? data.total_articles} Published • ${data.total_drafts ?? 0} Draft`,
      icon: BookOpen,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      onClick: () => navigate('/knowledge'),
    },
    {
      title: 'Customer Questions',
      value: data.total_questions,
      change: `${data.total_questions} Questions Processed`,
      icon: MessageSquare,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      onClick: () => navigate('/chat'),
    },
    {
      title: 'Verified Answers',
      value: data.answered_with_knowledge,
      change: `${data.knowledge_coverage_rate}% Resolution Rate (${data.answered_with_knowledge}/${data.total_questions})`,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      onClick: () => navigate('/analytics'),
    },
    {
      title: 'Unanswered / Gaps',
      value: data.unanswered_questions,
      change: `${data.active_knowledge_gaps ?? data.recent_knowledge_gaps?.length ?? 0} Active Gaps Detected`,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      onClick: () => navigate('/gaps'),
    },
    {
      title: 'Open Support Tickets',
      value: data.open_tickets,
      change: `${data.open_tickets} Active • ${data.resolved_tickets} Resolved`,
      icon: Ticket,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      onClick: () => navigate('/tickets'),
    },
    {
      title: 'Satisfaction Score',
      value: `${data.satisfaction_rate}%`,
      change: `${data.feedback_positive}/${data.total_feedback || data.feedback_positive} Positive Ratings`,
      icon: ThumbsUp,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      onClick: () => navigate('/analytics'),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Knowledge Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time analytics, verified question retrieval, and active escalation queue for{' '}
            <span className="text-brand-300 font-semibold">NovaStore</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/knowledge')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-brand-400" />
            <span>New Article</span>
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/25 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch AI Chat</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={c.onClick}
              className="p-4 rounded-2xl glass-card glass-card-hover cursor-pointer border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 truncate">
                  {c.title}
                </span>
                <div className={`p-1.5 rounded-lg ${c.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${c.color}`} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-100">{c.value}</div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {c.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Inquiries & Grounded Answers (Last 7 Days) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                Customer Inquiries & Grounded Answers (Last 7 Days)
              </h2>
              <p className="text-xs text-slate-400">
                Inquiries processed vs. grounded knowledge answers vs. escalations
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Stream
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.question_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEscalated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0f1d',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [`${value} events`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="questions"
                  name="Customer Inquiries"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorQuestions)"
                  dot={{ r: 4, fill: '#8b5cf6', stroke: '#1e1b4b', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="answered"
                  name="Verified Answers"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnswered)"
                  dot={{ r: 3, fill: '#06b6d4', stroke: '#083344', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="escalated"
                  name="Escalated Tickets"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorEscalated)"
                  dot={{ r: 3, fill: '#f59e0b', stroke: '#451a03', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inquiries by Category */}
        <div className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-200">Inquiries by Category</h2>
            <p className="text-xs text-slate-400">Knowledge volume across support domains</p>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topic_distribution}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 'auto']} />
                <YAxis
                  dataKey="topic"
                  type="category"
                  stroke="#64748b"
                  width={130}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0f1d',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} records`, 'Volume']}
                />
                <Bar dataKey="count" name="Articles / Inquiries" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Tickets & Top Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Tickets Queue */}
        <div className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-slate-200">Active Support Escalations</h2>
            </div>
            <button
              onClick={() => navigate('/tickets')}
              className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1 font-medium"
            >
              <span>View Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active tickets.</p>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-slate-850/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] text-cyan-400 font-bold">
                        {t.ticket_number}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          t.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : t.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold capitalize ${
                          t.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : t.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate">{t.subject}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      From: {t.customer_name || 'Sarah Jenkins'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewTicket(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                      title="Quick View Details"
                    >
                      Quick View
                    </button>
                    <button
                      onClick={() => navigate(`/tickets?id=${t.id}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-brand-600/90 hover:bg-brand-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                    >
                      <span>Open Ticket</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Verified Knowledge Sources */}
        <div className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-200">Top Verified Knowledge Sources</h2>
            </div>
            <button
              onClick={() => navigate('/knowledge')}
              className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1 font-medium"
            >
              <span>View Articles</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {data.top_articles.map((art) => (
              <div
                key={art.id}
                onClick={() => navigate(`/knowledge/${art.id}`)}
                className="p-3 rounded-xl bg-slate-850/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-200 truncate">{art.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {art.view_count} views • {art.citations_count} AI Citations
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-emerald-400">
                    {art.helpfulness_ratio}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">Helpfulness</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Knowledge Gaps Section */}
      <div className="p-5 rounded-2xl bg-dark-900/90 border border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200">
              Unanswered Inquiries & Actionable Knowledge Gaps
            </h2>
          </div>
          <button
            onClick={() => navigate('/gaps')}
            className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1 font-medium"
          >
            <span>View All Gaps</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.recent_knowledge_gaps.map((gap) => (
            <div
              key={gap.id}
              className="p-4 rounded-xl bg-slate-850/60 border border-slate-800/80 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {gap.topic}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Asked {gap.frequency}x
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-100 line-clamp-2">
                  "{gap.question}"
                </h3>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                  {gap.suggested_action || 'Draft FAQ article addressing customer question.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 capitalize">
                  Status: {gap.status}
                </span>
                <button
                  onClick={() => {
                    setSelectedGap(gap);
                    setIsFaqModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Review & Create FAQ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Quick View Modal */}
      {previewTicket && (
        <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {previewTicket.ticket_number}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      previewTicket.priority === 'urgent'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : previewTicket.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {previewTicket.priority}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold capitalize bg-blue-500/10 text-blue-400">
                    {previewTicket.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{previewTicket.subject}</h3>
              </div>
              <button
                onClick={() => setPreviewTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Customer & Assignment
                </span>
                <p className="text-slate-200">
                  Customer: <span className="font-semibold">{previewTicket.customer_name || 'Guest Sarah Jenkins'}</span>
                </p>
                <p className="text-slate-400">
                  Assigned Agent: <span className="text-slate-300">{previewTicket.assigned_agent_name || 'Unassigned'}</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Issue Description
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {previewTicket.issue_description}
                </p>
              </div>

              {previewTicket.escalation_reason && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  <span className="font-semibold">Escalation Reason:</span> {previewTicket.escalation_reason}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewTicket(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = previewTicket.id;
                  setPreviewTicket(null);
                  navigate(`/tickets?id=${id}`);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-1.5 shadow-md shadow-brand-500/25"
              >
                <span>Open in Support Desk</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Create FAQ Modal */}
      {selectedGap && (
        <CreateFAQFromGapModal
          isOpen={isFaqModalOpen}
          onClose={() => {
            setIsFaqModalOpen(false);
            setSelectedGap(null);
          }}
          gap={selectedGap}
          categories={categories}
          onSuccess={handleGapFaqCreated}
        />
      )}
    </div>
  );
};
