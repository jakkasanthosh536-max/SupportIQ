import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Play, Layers } from 'lucide-react';

export const DemoWalkthroughBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const steps = [
    {
      num: 1,
      title: 'Answerable Query',
      desc: 'Ask password reset or return policy — grounded in NovaStore articles.',
      path: '/chat?preset=return',
    },
    {
      num: 2,
      title: 'Safe Abstention',
      desc: 'Ask unsupported polar drone shipping — AI safely abstains without hallucinating.',
      path: '/chat?preset=antarctica',
    },
    {
      num: 3,
      title: 'Human Escalation',
      desc: 'View escalated tickets with customer chat history & agent notes.',
      path: '/tickets',
    },
    {
      num: 4,
      title: 'Knowledge Gaps',
      desc: 'Detect unanswered topics, generate 1-click FAQ draft to resolve gap.',
      path: '/gaps',
    },
    {
      num: 5,
      title: 'Live Analytics',
      desc: 'Real-time metrics, question trends, and CSV export from database.',
      path: '/analytics',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-brand-950/90 via-dark-900 to-indigo-950/90 border-b border-brand-500/20 text-xs text-slate-300 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center p-1 rounded-md bg-brand-500/20 text-brand-400 font-semibold text-[10px] uppercase tracking-wider border border-brand-500/30">
            <Sparkles className="w-3 h-3 mr-1 text-cyan-400 animate-pulse" />
            Hackathon Mode
          </span>
          <span className="font-medium text-slate-200 hidden sm:inline">
            3-Minute Presentation Tour:
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {steps.map((s) => {
            const isActive = location.pathname === s.path.split('?')[0];
            return (
              <button
                key={s.num}
                onClick={() => navigate(s.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  isActive
                    ? 'bg-brand-600/30 text-brand-200 border border-brand-500/50 shadow-sm shadow-brand-500/20 font-medium'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
                title={s.desc}
              >
                <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center text-[10px] font-bold">
                  {s.num}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOpen ? 'Hide Tip' : 'Show Tip'}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="max-w-7xl mx-auto mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <p className="line-clamp-1">
            <strong className="text-cyan-300">Judge Demonstration Tip:</strong> SupportIQ is grounded in verified NovaStore policy data. If external AI API keys are not supplied, it executes deterministic retrieval without hallucination.
          </p>
          <button
            onClick={() => navigate('/chat?preset=return')}
            className="text-brand-300 hover:text-brand-200 flex items-center gap-1 font-semibold ml-4 shrink-0"
          >
            Launch Step 1 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
