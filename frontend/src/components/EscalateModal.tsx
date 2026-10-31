import React, { useState } from 'react';
import { X, AlertCircle, Send, Check } from 'lucide-react';
import { api } from '../services/api';
import { TicketPriority } from '../types';

interface EscalateModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: number;
  initialSubject?: string;
  onSuccess: (ticketNumber: string) => void;
}

export const EscalateModal: React.FC<EscalateModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  initialSubject = '',
  onSuccess,
}) => {
  const [subject, setSubject] = useState(initialSubject);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSubject) setSubject(initialSubject);
  }, [initialSubject]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide a subject and details of your request.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await api.createTicket({
        subject: subject.trim(),
        issue_description: description.trim(),
        priority,
        conversation_id: conversationId,
        escalation_reason: 'Customer initiated escalation from AI chat assistant',
      });
      onSuccess(ticket.ticket_number);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Escalate to Support Agent</h3>
            <p className="text-xs text-slate-400">
              A human support specialist will review your request and chat transcript.
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Subject / Topic
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your question"
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
            >
              <option value="low">Low — General inquiry</option>
              <option value="medium">Medium — Standard account or order question</option>
              <option value="high">High — Active delivery or payment issue</option>
              <option value="urgent">Urgent — Immediate account lock or security concern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Additional Details
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain what you need assistance with..."
              className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
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
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-brand-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Creating Ticket...' : 'Create Support Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
