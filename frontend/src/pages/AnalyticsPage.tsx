import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsOverview } from '../types';
import {
  BarChart3, Download, TrendingUp, CheckCircle2, AlertTriangle,
  ThumbsUp, ShieldCheck, Ticket, Layers, ArrowUpRight, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.warn('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setDownloadingCsv(true);
      await api.downloadTicketsCsv();
    } catch (err: any) {
      alert(err.message || 'Failed to download CSV');
    } finally {
      setDownloadingCsv(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading system performance telemetry...</p>
        </div>
      </div>
    );
  }

  const PIE_COLORS = ['#06b6d4', '#f59e0b'];
  const hasInquiries = (data.answered_with_knowledge + data.unanswered_questions) > 0;

  const distributionPieData = hasInquiries
    ? [
        { name: 'Verified Grounded Answers', value: data.answered_with_knowledge },
        { name: 'Unanswered Gaps / Escalations', value: data.unanswered_questions },
      ]
    : [];

  const totalTickets = data.total_tickets ?? (data.open_tickets + data.resolved_tickets);
  const ticketResolutionRate = totalTickets > 0 ? Math.round((data.resolved_tickets / totalTickets) * 100) : 0;
  const escalationPct = data.escalation_rate !== undefined
    ? data.escalation_rate
    : (data.total_questions > 0 ? Math.round((data.escalated_questions / data.total_questions) * 100) : 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            System Performance & Knowledge Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real aggregated telemetry tracking knowledge coverage, answer accuracy, and ticket velocity.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={downloadingCsv}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto disabled:opacity-50 shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>{downloadingCsv ? 'Exporting...' : 'Export Tickets CSV'}</span>
        </button>
      </div>

      {/* KPI Cards: Derived Strictly from Actual Records */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-medium">Knowledge Coverage Rate</span>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">
            {data.total_questions > 0 ? `${data.knowledge_coverage_rate}%` : '0.0%'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {data.total_questions > 0
              ? `${data.answered_with_knowledge} of ${data.total_questions} inquiries answered`
              : 'No inquiries recorded yet'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-medium">Feedback Satisfaction</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {(data.total_feedback || (data.feedback_positive + data.feedback_negative)) > 0
              ? `${data.satisfaction_rate}%`
              : '0.0%'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {(data.total_feedback || (data.feedback_positive + data.feedback_negative)) > 0
              ? `${data.feedback_positive} positive of ${data.total_feedback || (data.feedback_positive + data.feedback_negative)} ratings`
              : 'No feedback ratings submitted yet'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-medium">Avg Retrieval Confidence</span>
          <div className="text-2xl font-extrabold text-purple-400 mt-1">
            {data.total_questions > 0 ? `${Math.round(data.avg_confidence_score * 100)}%` : '0%'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Cosine similarity + BM25 ranking
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 block font-medium">Escalation Rate</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {data.total_questions > 0 ? `${escalationPct}%` : '0.0%'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {data.total_questions > 0
              ? `${data.escalated_questions} of ${data.total_questions} inquiries escalated`
              : 'No escalations recorded'}
          </span>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-200">
              Inquiry Volume & Verified Resolution Rate
            </h2>
            <p className="text-xs text-slate-400">7-day progression of incoming vs answered customer questions</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.question_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0f1d',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [`${value} inquiries`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="questions"
                  name="Total Inquiries"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#qGrad)"
                  dot={{ r: 4, fill: '#8b5cf6', stroke: '#1e1b4b', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="answered"
                  name="Verified Knowledge Answers"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#aGrad)"
                  dot={{ r: 3, fill: '#06b6d4', stroke: '#083344', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="escalated"
                  name="Escalated Tickets"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#eGrad)"
                  dot={{ r: 3, fill: '#f59e0b', stroke: '#451a03', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Knowledge Coverage Donut */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Knowledge Answering Distribution</h2>
            <p className="text-xs text-slate-400">Answers backed by verified knowledge vs abstentions</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {hasInquiries ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0f1d',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-500 py-10">
                No inquiries recorded yet to render distribution.
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                Grounded Answers
              </span>
              <span className="font-bold text-slate-100">{data.answered_with_knowledge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                Abstentions & Escalations
              </span>
              <span className="font-bold text-slate-100">{data.unanswered_questions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Support Ticket Resolution Metrics Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Queue
          </span>
          <div className="text-xl font-bold text-blue-400 mt-1">{data.open_tickets} Tickets</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Open & in-progress agent tickets</span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Resolved Tickets
          </span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{data.resolved_tickets} Tickets</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Successfully closed by agents</span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Resolution Velocity
          </span>
          <div className="text-xl font-bold text-purple-400 mt-1">{ticketResolutionRate}%</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {data.resolved_tickets} of {totalTickets} total tickets
          </span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Knowledge Gaps
          </span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {data.active_knowledge_gaps ?? data.recent_knowledge_gaps?.length ?? 0} Active
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Actionable FAQ recommendations</span>
        </div>
      </div>

      {/* Top Performing Articles Table */}
      <div className="rounded-2xl bg-dark-900 border border-slate-800 shadow-xl overflow-hidden p-5">
        <h2 className="text-sm font-bold text-slate-200 mb-1">
          Most Utilized Knowledge Articles
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Articles providing the highest frequency of cited excerpts for customer answers
        </p>

        <div className="overflow-x-auto">
          {data.top_articles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No article citations recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Article Title</th>
                  <th className="py-3 px-4">AI Citations Count</th>
                  <th className="py-3 px-4">Customer Views</th>
                  <th className="py-3 px-4">Helpfulness Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {data.top_articles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-slate-100">{art.title}</td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">{art.citations_count}</td>
                    <td className="py-3 px-4 text-slate-400">{art.view_count}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-400">{art.helpfulness_ratio}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
