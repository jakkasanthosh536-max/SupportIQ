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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter]);

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
    if (!selectedTicket) return;
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
    if (!selectedTicket || !user) return;
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
      await api.addTicketNote(selectedTicket.id, newNote.trim(), isInternalNote);
      setNewNote('');
      loadTicketDetail(selectedTicket.id);
    } catch (err: any) {
      alert(err.message || 'Failed to post note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="h-full flex-1 flex flex-col md:flex-row gap-4 max-w-7xl w-full mx-auto min-h-0">
      {/* Left Column: Tickets Queue */}
      <div className="w-full md:w-80 lg:w-96 bg-dark-900 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-xl min-h-0">
        {/* Queue Header & Filters */}
        <div className="p-3.5 border-b border-slate-800/80 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-slate-100">Ticket Queue</h2>
            </div>
            <button
              onClick={loadTickets}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-dark-950/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_customer">Waiting on Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-dark-950/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No tickets found</div>
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
                  <span className="font-mono font-bold text-cyan-400">{t.ticket_number}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      t.priority === 'urgent'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : t.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-200 truncate">{t.subject}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="truncate">{t.customer_name || 'Guest'}</span>
                  <span className="capitalize text-slate-400 font-medium">
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
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
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {selectedTicket.ticket_number}
                  </span>
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
              </div>
            </div>

            {/* Scrollable Ticket Detail Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Customer Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-dark-950/70 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Customer Name
                  </span>
                  <span className="text-slate-200 font-semibold">
                    {selectedTicket.customer_name || 'Sarah Jenkins'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Customer Email
                  </span>
                  <span className="text-slate-200 font-mono">
                    {selectedTicket.customer_email || 'sarah@example.com'}
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
                  Internal Agent Notes ({selectedTicket.notes?.length || 0})
                </span>

                <div className="space-y-2">
                  {selectedTicket.notes?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No notes added yet.</p>
                  ) : (
                    selectedTicket.notes?.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-slate-850 border border-slate-700/80 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-purple-400" />
                            {n.author_name || 'Agent'}
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

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="pt-2 space-y-2">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an internal note or resolution comment..."
                    className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500"
                      />
                      <span>Internal agent note (hidden from customer)</span>
                    </label>
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingNote ? 'Posting...' : 'Post Note'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
