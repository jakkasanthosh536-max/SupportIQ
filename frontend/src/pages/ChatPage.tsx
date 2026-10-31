import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ChatMessage, Conversation, CitationItem } from '../types';
import { EvidenceDrawer } from '../components/EvidenceDrawer';
import { EscalateModal } from '../components/EscalateModal';
import { formatDisplayDateTime } from '../utils/date';
import {
  Sparkles, Send, ThumbsUp, ThumbsDown, ShieldCheck,
  AlertCircle, ExternalLink, Plus, MessageSquare,
  Copy, Check, RefreshCw, ChevronRight, User as UserIcon, X
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Evidence Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCitations, setActiveCitations] = useState<CitationItem[]>([]);
  const [activeConfidence, setActiveConfidence] = useState<number | undefined>(undefined);

  // Escalate Modal state
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateSubject, setEscalateSubject] = useState('');
  const [escalateSuccessMsg, setEscalateSuccessMsg] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presetExecutedRef = useRef<string | null>(null);

  const suggestedQuestions = [
    { label: 'Return Policy Window', query: 'What is the return policy and eligibility window?' },
    { label: 'Reset Password', query: 'How do I reset my account password?' },
    { label: 'Track Shipment', query: 'How can I track my NovaStore order?' },
    { label: 'Payment Failures', query: 'Why did my credit card payment fail at checkout?' },
    { label: 'Cancel Subscription', query: 'How can I cancel my NovaStore Plus membership?' },
    { label: 'Remote Polar Drone Shipping (Unsupported)', query: 'Can I get drone delivery to Antarctica by next week?' },
  ];

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Handle URL presets for 3-minute hackathon demo (with StrictMode guard)
  useEffect(() => {
    const preset = searchParams.get('preset');
    if (preset && presetExecutedRef.current !== preset) {
      presetExecutedRef.current = preset;
      if (preset === 'return') {
        handleSendMessage('What is the return policy and eligibility window?');
      } else if (preset === 'antarctica') {
        handleSendMessage('Can I get drone delivery to Antarctica by next week?');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        selectConversation(convs[0].id);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    }
  };

  const selectConversation = async (convId: number) => {
    setActiveConvId(convId);
    try {
      const detail = await api.getConversation(convId);
      setMessages(detail.messages || []);
    } catch (err) {
      console.warn('Error fetching conversation detail:', err);
    }
  };

  const handleStartNewChat = () => {
    setActiveConvId(undefined);
    setMessages([]);
    setInput('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    setInput('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: activeConvId || 0,
      sender_type: 'customer',
      content: queryText,
      processing_mode: 'user_input',
      created_at: new Date().toISOString(),
      citations: [],
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.sendChatMessage(queryText, activeConvId);
      setActiveConvId(response.conversation_id);
      setMessages((prev) => [...prev, response]);
      loadConversations();
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: activeConvId || 0,
        sender_type: 'ai',
        content: `Error communicating with knowledge engine: ${err.message}`,
        processing_mode: 'error',
        created_at: new Date().toISOString(),
        citations: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
  };

  const handleFeedback = async (messageId: number, rating: number) => {
    try {
      await api.submitFeedback(messageId, rating);
      setFeedbackToast(
        rating > 0
          ? 'Thank you! Positive feedback recorded.'
          : 'Feedback recorded! Our knowledge team has logged this gap.'
      );
      setTimeout(() => setFeedbackToast(null), 4000);
    } catch (err) {
      console.warn('Error submitting feedback:', err);
    }
  };

  const openEvidence = (citations: CitationItem[], score?: number) => {
    setActiveCitations(citations);
    setActiveConfidence(score);
    setDrawerOpen(true);
  };

  const openEscalation = (subject: string) => {
    setEscalateSubject(subject);
    setEscalateModalOpen(true);
  };

  return (
    <div className="h-full flex-1 flex flex-col md:flex-row gap-4 max-w-7xl w-full mx-auto min-h-0">
      {/* Left Column: Conversation History Sidebar */}
      <div className="hidden md:flex w-64 bg-dark-900 border border-slate-800/80 rounded-2xl flex-col overflow-hidden shrink-0 shadow-xl min-h-0">
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-300">Chat History</span>
          <button
            onClick={handleStartNewChat}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No recent conversations
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs ${
                  activeConvId === conv.id
                    ? 'bg-brand-600/20 text-brand-200 border border-brand-500/30 font-medium'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{conv.title || 'Support Inquiry'}</span>
                </div>
                {conv.is_escalated && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                    Escalated
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Column: Chat Area */}
      <div className="flex-1 bg-dark-900 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-dark-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">SupportIQ AI Assistant</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Zero Hallucination Grounding
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Grounded strictly in verified NovaStore customer knowledge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1 transition"
              title="Clear current conversation messages"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>
        </div>

        {feedbackToast && (
          <div className="m-4 p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between shadow-lg">
            <span>{feedbackToast}</span>
            <button
              onClick={() => setFeedbackToast(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {escalateSuccessMsg && (
          <div className="m-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>{escalateSuccessMsg}</span>
            <button
              onClick={() => navigate('/tickets')}
              className="underline font-bold ml-2 hover:text-white"
            >
              View in Ticket Desk
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto py-8 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/10">
                <Sparkles className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">How can we assist you today?</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Ask any question regarding NovaStore policies, order tracking, returns, billing, or account settings.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q.query)}
                    className="p-3 rounded-xl bg-slate-850/80 hover:bg-slate-800 border border-slate-700/60 hover:border-brand-500/40 text-left transition group"
                  >
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block mb-1">
                      {q.label}
                    </span>
                    <span className="text-xs text-slate-300 group-hover:text-white line-clamp-2">
                      {q.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isCustomer = msg.sender_type === 'customer';
              const isAbstention = msg.processing_mode === 'abstention';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    isCustomer ? 'ml-auto justify-end' : 'mr-auto justify-start'
                  }`}
                >
                  {!isCustomer && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 p-0.5 flex items-center justify-center shrink-0 mt-1">
                      <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-md ${
                      isCustomer
                        ? 'bg-gradient-to-br from-brand-700 to-indigo-700 text-white rounded-br-sm'
                        : isAbstention
                        ? 'bg-dark-950/90 border border-amber-500/40 text-slate-200 rounded-bl-sm'
                        : 'bg-slate-850/90 border border-slate-800 text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {/* Message Header for AI */}
                    {!isCustomer && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-300 text-[11px]">SupportIQ</span>
                          {isAbstention ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Knowledge Base Abstention
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-cyan-400" />
                              Confidence: {msg.confidence_score !== undefined && msg.confidence_score !== null ? `${Math.round(msg.confidence_score * 100)}%` : 'Grounded'}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                            {formatDisplayDateTime(msg.created_at)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {/* Content text */}
                    <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Grounded Citations & Evidence Drawer Trigger */}
                    {!isCustomer && msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Supporting Knowledge Articles:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => openEvidence(msg.citations, msg.confidence_score)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-brand-600/20 border border-slate-700/80 hover:border-brand-500/50 text-[11px] text-brand-300 flex items-center gap-1.5 transition"
                              title="Click to view full excerpt evidence"
                            >
                              <span>{c.article_title}</span>
                              <span className="text-[9px] font-bold text-cyan-400">
                                {Math.round(c.relevance_score * 100)}%
                              </span>
                            </button>
                          ))}

                          <button
                            onClick={() => openEvidence(msg.citations, msg.confidence_score)}
                            className="px-2 py-1 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 text-[11px] text-cyan-300 font-semibold flex items-center gap-1 transition"
                          >
                            <span>Inspect Evidence</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Abstention Escalation Action */}
                    {isAbstention && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-amber-300">
                          Need personal assistance with this topic?
                        </span>
                        <button
                          onClick={() => openEscalation('Assistance needed for unverified question')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Escalate to Human Agent</span>
                        </button>
                      </div>
                    )}

                    {/* Bottom AI Feedback controls */}
                    {!isCustomer && !isAbstention && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Was this answer helpful and accurate?</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(msg.id, 1)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, -1)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                            title="Report knowledge issue / unhelpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            onClick={() => openEscalation(msg.content.slice(0, 40))}
                            className="text-brand-300 hover:text-brand-200 font-medium"
                          >
                            Request Human Agent
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isCustomer && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1 text-slate-300">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 p-0.5 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="rounded-2xl p-4 bg-slate-850/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping"></div>
                <span>Retrieving verified excerpts & synthesizing grounded answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-dark-900 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-dark-950/80 border border-slate-700/80 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 rounded-2xl p-1.5 transition shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about NovaStore policies, shipping, returns, billing..."
              className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              style={{ backgroundColor: 'transparent', color: '#f8fafc' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      </div>

      {/* Slide-out Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        citations={activeCitations}
        confidenceScore={activeConfidence}
      />

      {/* Human Support Escalation Modal */}
      <EscalateModal
        isOpen={escalateModalOpen}
        onClose={() => setEscalateModalOpen(false)}
        conversationId={activeConvId}
        initialSubject={escalateSubject}
        onSuccess={(ticketNum) => {
          setEscalateSuccessMsg(`Support ticket ${ticketNum} created successfully! Our team is on it.`);
        }}
      />
    </div>
  );
};
