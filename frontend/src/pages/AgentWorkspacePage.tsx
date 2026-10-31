import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { SupportTicket, TicketStatus, TicketPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatDisplayDateTime } from '../utils/date';
import {
  Ticket, CheckCircle2, Clock, AlertCircle, MessageSquare,
  User as UserIcon, Send, Shield, Lock, ChevronRight, RefreshCw
} from 'lucide-react';

export const AgentWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('id');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    if (ticketIdParam) {
      const parsedId = parseInt(ticketIdParam, 10);
      if (!isNaN(parsedId)) {
        loadTicketDetail(parsedId);
      }
    }
  }, [ticketIdParam]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        search: searchTerm.trim() || undefined,
      });
      setTickets(data);
      if (ticketIdParam) {
        const parsedId = parseInt(ticketIdParam, 10);
        if (!isNaN(parsedId)) {
          loadTicketDetail(parsedId);
          return;
        }
      }
      if (data.length > 0 && !selectedTicket) {
        loadTicketDetail(data[0].id);
      } else if (data.length > 0 && selectedTicket && !data.some(t => t.id === selectedTicket.id)) {
        loadTicketDetail(data[0].id);
      }
    } catch (err) {
      console.warn('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (id: number) => {
    try {
      const detailed = await api.getTicket(id);
      setSelectedTicket(detailed);
      setResolutionSummary(detailed.resolution_summary || '');
    } catch (err) {
      console.warn('Error loading ticket detail:', err);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, {
        status: newStatus,
        resolution_summary: resolutionSummary || undefined,
      });
      setSelectedTicket((prev) => prev ? { ...prev, status: updated.status } : null);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status.');
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!selectedTicket || isCustomer) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, {
        priority: newPriority,
      });
      setSelectedTicket((prev) => prev ? { ...prev, priority: updated.priority } : null);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority.');
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !user || isCustomer) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, {
        assigned_agent_id: user.id,
      });
      setSelectedTicket((prev) => prev ? { ...prev, assigned_agent_name: user.full_name } : null);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket.');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await api.addTicketNote(selectedTicket.id, newNote.trim(), isCustomer ? false : isInternalNote);
      setNewNote('');
      loadTicketDetail(selectedTicket.id);
    } catch (err: any) {
      alert(err.message || 'Failed to post note.');
    } finally {
      setSubmittingNote(false);
    }
  };


  // Dynamic statistics calculated directly from loaded ticket records
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const activeCount = openCount + inProgressCount;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const highPriorityCount = tickets.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;

  const categoriesList = [
    'Orders & Shipping',
    'Refunds',
    'Account & Login',
    'Payments',
    'Returns & Exchange',
    'Offers & Discounts',
    'Product Issues',
    'Product Information',
  ];

  return (
    <div className="h-full flex-1 flex flex-col gap-4 max-w-7xl w-full mx-auto min-h-0">
      {/* Top Demo Statistics & KPI Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
        <button
          onClick={() => { setStatusFilter(''); setPriorityFilter(''); setCategoryFilter(''); setSearchTerm(''); }}
          className={`p-3 rounded-2xl border text-left transition ${
            !statusFilter && !priorityFilter && !categoryFilter
              ? 'bg-slate-800/90 border-brand-500/50 shadow-md shadow-brand-500/10'
              : 'bg-dark-900 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Tickets</span>
          <div className="text-xl font-extrabold text-slate-100 mt-0.5">{totalCount}</div>
          <span className="text-[10px] text-slate-400">All recorded</span>
        </button>

        <button
          onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
          className="p-3 rounded-2xl bg-dark-900 border border-slate-800/80 hover:border-slate-700 text-left transition"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">Active Tickets</span>
          <div className="text-xl font-extrabold text-cyan-300 mt-0.5">{activeCount}</div>
          <span className="text-[10px] text-slate-400">Open + In Progress</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'open' ? '' : 'open')}
          className={`p-3 rounded-2xl border text-left transition ${
            statusFilter === 'open'
              ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/10'
              : 'bg-dark-900 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">Open</span>
          <div className="text-xl font-extrabold text-blue-300 mt-0.5">{openCount}</div>
          <span className="text-[10px] text-slate-400">Awaiting action</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? '' : 'in_progress')}
          className={`p-3 rounded-2xl border text-left transition ${
            statusFilter === 'in_progress'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
              : 'bg-dark-900 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">In Progress</span>
          <div className="text-xl font-extrabold text-amber-300 mt-0.5">{inProgressCount}</div>
          <span className="text-[10px] text-slate-400">Under specialist review</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? '' : 'resolved')}
          className={`p-3 rounded-2xl border text-left transition ${
            statusFilter === 'resolved'
              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
              : 'bg-dark-900 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Resolved</span>
          <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{resolvedCount}</div>
          <span className="text-[10px] text-slate-400">Successfully closed</span>
        </button>

        <button
          onClick={() => setPriorityFilter(priorityFilter === 'high' ? '' : 'high')}
          className={`p-3 rounded-2xl border text-left transition ${
            priorityFilter === 'high'
              ? 'bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-500/10'
              : 'bg-dark-900 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">High Priority</span>
          <div className="text-xl font-extrabold text-rose-300 mt-0.5">{highPriorityCount}</div>
          <span className="text-[10px] text-slate-400">Urgent attention</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Left Column: Tickets Queue */}
        <div className="w-full md:w-80 lg:w-96 bg-dark-900 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-xl min-h-0">
          {/* Queue Header & Filters */}
          <div className="p-3.5 border-b border-slate-800/80 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  {isCustomer ? 'My Support Tickets' : 'Ticket Queue'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {tickets.length}
                </span>
              </div>
              <button
                onClick={loadTickets}
                title="Refresh tickets"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ticket ID or customer..."
                className="w-full bg-dark-950/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-dark-950/80 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
              >
                <option value="">Status: All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_customer">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-dark-950/80 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
              >
                <option value="">Priority: All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-dark-950/80 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
              >
                <option value="">Category: All</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <p>No tickets match filters.</p>
                {(searchTerm || statusFilter || priorityFilter || categoryFilter) && (
                  <button
                    onClick={() => { setSearchTerm(''); setStatusFilter(''); setPriorityFilter(''); setCategoryFilter(''); }}
                    className="mt-2 text-[11px] text-brand-400 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTicketDetail(t.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                    selectedTicket?.id === t.id
                      ? 'bg-brand-600/20 border-brand-500/50 shadow-sm'
                      : 'bg-slate-850/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-cyan-400">{t.ticket_number}</span>
                      {t.is_demo && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          DEMO
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.priority === 'urgent' || t.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : t.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-200 truncate">{t.subject}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="truncate text-slate-300 font-medium">{t.customer_name || 'Guest Customer'}</span>
                    <span
                      className={`capitalize font-semibold ${
                        t.status === 'resolved' || t.status === 'closed'
                          ? 'text-emerald-400'
                          : t.status === 'in_progress'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  {t.category && (
                    <div className="text-[9px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded self-start border border-purple-500/20">
                      {t.category}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

      {/* Right Column: Ticket Workspace Detail */}
      <div className="flex-1 bg-dark-900 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-0">
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select a ticket from the queue to view customer details and add agent notes.
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header / Actions */}
            <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-dark-950/40 shrink-0">
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {selectedTicket.ticket_number}
                  </span>
                  {selectedTicket.is_demo && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                      Demo Record
                    </span>
                  )}
                  {selectedTicket.category && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedTicket.category}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    Created {formatDisplayDateTime(selectedTicket.created_at)}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-0.5">
                  {selectedTicket.subject}
                </h2>
              </div>

              {/* Status / Priority Selectors */}
              <div className="flex items-center gap-2">
                {isCustomer ? (
                  <>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase ${
                        selectedTicket.priority === 'urgent' || selectedTicket.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : selectedTicket.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {selectedTicket.priority} Priority
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl capitalize ${
                        selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                      <button
                        onClick={() => handleStatusChange('resolved' as TicketStatus)}
                        className="px-3 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_for_customer">Waiting on Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <button
                      onClick={handleAssignToMe}
                      className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition"
                    >
                      Assign to Me
                    </button>
                  </>
                )}
              </div>
            </div>


            {/* Scrollable Ticket Detail Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Customer Info Box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-dark-950/70 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Customer Name
                  </span>
                  <span className="text-slate-200 font-semibold">
                    {selectedTicket.customer_name || 'Rahul Sharma'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Customer Email
                  </span>
                  <span className="text-slate-200 font-mono">
                    {selectedTicket.customer_email || 'customer@example.com'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Category
                  </span>
                  <span className="text-purple-300 font-semibold">
                    {selectedTicket.category || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Assigned Specialist
                  </span>
                  <span className="text-brand-300 font-semibold">
                    {selectedTicket.assigned_agent_name || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Issue Description */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Customer Issue Description:
                </span>
                <div className="p-4 rounded-xl bg-slate-850/80 border border-slate-700/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedTicket.issue_description}
                </div>
              </div>

              {/* Resolution Summary Box if Resolved */}
              {selectedTicket.resolution_summary && (
                <div className="space-y-1.5 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolution Summary {selectedTicket.resolved_at ? `(Resolved ${formatDisplayDateTime(selectedTicket.resolved_at)})` : ''}:
                  </span>
                  <p className="text-xs text-emerald-200 leading-relaxed font-sans">
                    {selectedTicket.resolution_summary}
                  </p>
                </div>
              )}

              {/* Escalation Context & Transcript */}
              {selectedTicket.conversation && (
                <div className="space-y-2 p-4 rounded-xl bg-brand-950/20 border border-brand-500/20">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Linked AI Chat Transcript ({selectedTicket.conversation.messages?.length || 0} messages)
                    </span>
                  </div>
                  <div className="space-y-2 pt-2 max-h-48 overflow-y-auto pr-1">
                    {selectedTicket.conversation.messages?.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-lg text-xs ${
                          m.sender_type === 'customer'
                            ? 'bg-brand-900/40 text-brand-200 ml-4 border border-brand-500/20'
                            : 'bg-slate-900 text-slate-300 mr-4 border border-slate-800'
                        }`}
                      >
                        <span className="font-bold text-[10px] block text-slate-400 mb-0.5 capitalize">
                          {m.sender_type}:
                        </span>
                        <span>{m.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Stream */}
              <div className="space-y-3">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  {isCustomer ? 'Conversation & Responses' : 'Internal Notes & Responses'} ({selectedTicket.notes?.length || 0})
                </span>

                <div className="space-y-2">
                  {selectedTicket.notes?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No notes or responses added yet.</p>
                  ) : (
                    selectedTicket.notes?.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-slate-850 border border-slate-700/80 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-purple-400" />
                            {n.author_name || (isCustomer ? 'Support Agent' : 'Agent')}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {formatDisplayDateTime(n.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note / Customer Reply Form */}
                <form onSubmit={handleAddNote} className="pt-2 space-y-2">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={
                      isCustomer
                        ? 'Type a reply to the customer support team...'
                        : 'Add an internal note or resolution comment...'
                    }
                    className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
                    required
                  />
                  <div className="flex items-center justify-between">
                    {!isCustomer ? (
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500"
                        />
                        <span>Internal agent note (hidden from customer)</span>
                      </label>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Replying as {user?.full_name || 'Customer'}
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingNote ? 'Sending...' : isCustomer ? 'Send Reply' : 'Post Note'}</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

