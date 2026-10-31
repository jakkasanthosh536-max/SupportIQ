import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles, ShieldCheck, MessageSquareText, Search,
  ArrowRight, Shield, Ticket, User as UserIcon, BookOpen,
  Zap, FileCheck2, Cpu
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { demoLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleDemoAccess = async (role: 'admin' | 'agent' | 'customer') => {
    await demoLogin(role);
    if (role === 'customer') {
      navigate('/chat');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-dark-900/60 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
                Support<span className="text-cyan-400">IQ</span>
              </span>
              <span className="text-[10px] font-semibold text-brand-400 block tracking-widest uppercase">
                AI Customer Support Knowledge System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(user?.role === 'customer' ? '/chat' : '/dashboard')}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition flex items-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-600/15 blur-[120px] pointer-events-none rounded-full"></div>
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[250px] bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-xs text-brand-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>HACK-P380 — AI Customer Support Knowledge System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Grounded AI Support with{' '}
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Zero Hallucinations
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            SupportIQ empowers customer service teams with verified knowledge retrieval, inspectable
            source citations, automated ticket escalation, and self-healing knowledge gap detection.
          </p>

          {/* 1-Click Demo Login Panel */}
          <div className="pt-6">
            <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4">
              Instant Hackathon Demo Access — Select a Seeded Persona:
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
              {/* Admin Card */}
              <div
                onClick={() => handleDemoAccess('admin')}
                className="p-5 rounded-2xl glass-card glass-card-hover cursor-pointer border border-brand-500/30 hover:border-brand-500 bg-gradient-to-b from-brand-950/40 to-slate-900/60"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  Administrator
                  <ArrowRight className="w-4 h-4 text-brand-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Full knowledge CRUD, document indexing, gap resolution, and settings.
                </p>
                <span className="inline-block mt-3 text-[11px] font-mono text-brand-300">
                  admin@novastore.com
                </span>
              </div>

              {/* Agent Card */}
              <div
                onClick={() => handleDemoAccess('agent')}
                className="p-5 rounded-2xl glass-card glass-card-hover cursor-pointer border border-blue-500/30 hover:border-blue-500 bg-gradient-to-b from-blue-950/40 to-slate-900/60"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <Ticket className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  Support Specialist
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ticket queue, customer chat transcripts, internal notes, and resolution.
                </p>
                <span className="inline-block mt-3 text-[11px] font-mono text-blue-300">
                  agent@novastore.com
                </span>
              </div>

              {/* Customer Card */}
              <div
                onClick={() => handleDemoAccess('customer')}
                className="p-5 rounded-2xl glass-card glass-card-hover cursor-pointer border border-cyan-500/30 hover:border-cyan-500 bg-gradient-to-b from-cyan-950/40 to-slate-900/60"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                  <UserIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  Customer (Sarah)
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Interactive AI support chat, citations, confidence scores, and escalation.
                </p>
                <span className="inline-block mt-3 text-[11px] font-mono text-cyan-300">
                  sarah@example.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="px-6 py-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-dark-900/80 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Grounded Citations</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every AI answer quotes verified source excerpts with exact article IDs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-dark-900/80 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Safe Abstention</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When knowledge is absent, SupportIQ refuses to guess and escalates to human support.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-dark-900/80 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Knowledge Gap Loop</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically clusters unanswered inquiries and generates 1-click draft FAQs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-dark-900/80 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Document Processing</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag-and-drop PDF, DOCX, TXT, and Markdown files with real-time text chunking.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        SupportIQ — Production-inspired Hackathon Project HACK-P380. Built with React, FastAPI, SQLAlchemy, and Grounded RAG.
      </footer>
    </div>
  );
};
