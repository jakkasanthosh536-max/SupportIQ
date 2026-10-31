import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SettingsData } from '../types';
import {
  Settings, Sliders, Shield, Key, RefreshCw, AlertTriangle,
  CheckCircle2, Sparkles, Database, Layers, Info
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [threshold, setThreshold] = useState<number>(0.35);
  const [provider, setProvider] = useState<string>('demo');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [groqKey, setGroqKey] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setThreshold(data.retrieval_confidence_threshold);
      setProvider(data.ai_provider);
    } catch (err) {
      console.warn('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const updated = await api.updateSettings({
        retrieval_confidence_threshold: threshold,
        ai_provider: provider,
        gemini_api_key: geminiKey || undefined,
        groq_api_key: groqKey || undefined,
        openai_api_key: openaiKey || undefined,
      });
      setSettings(updated);
      setStatusMsg({ type: 'success', text: 'System configuration saved successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset database to clean NovaStore demo state? This restores the 10 standard policy articles, sample tickets, conversations, and gaps.')) {
      return;
    }
    setResetting(true);
    setStatusMsg(null);
    try {
      await api.resetDemoData();
      await loadSettings();
      setStatusMsg({ type: 'success', text: 'Demo database re-seeded successfully with pristine NovaStore data!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset demo data.' });
    } finally {
      setResetting(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          System Settings & AI Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Tune retrieval confidence thresholds, configure AI providers, or reset the hackathon demo environment.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Retrieval Threshold Card */}
        <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Retrieval Confidence Abstention Threshold
              </h2>
              <p className="text-xs text-slate-400">
                If the highest candidate chunk score is below this threshold, SupportIQ abstains and recommends human escalation.
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">
                Current Threshold: <span className="text-cyan-300 font-mono font-bold">{Math.round(threshold * 100)}%</span>
              </span>
              <span className="text-slate-500">Default: 35% (Recommended for NovaStore)</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10% (Permissive)</span>
              <span>35% (Balanced)</span>
              <span>80% (Strict Abstention)</span>
            </div>
          </div>
        </div>

        {/* AI Provider Config */}
        <div className="p-6 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">AI Provider Abstraction</h2>
              <p className="text-xs text-slate-400">
                SupportIQ operates in 100% local demo mode with zero API keys required, or connects to external LLMs.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Active Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="demo">Demo Mode — Retrieval-Based Answering (No API Key Required)</option>
                <option value="gemini">Google Gemini 1.5 Flash (Backend API Key)</option>
                <option value="groq">Groq LLaMA 3.1 8B (High Speed)</option>
                <option value="openai">OpenAI GPT-4o-mini</option>
              </select>
            </div>

            {provider !== 'demo' && (
              <div className="space-y-3 p-4 rounded-xl bg-dark-950/70 border border-slate-800 text-xs">
                {provider === 'gemini' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-dark-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                )}

                {provider === 'groq' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Groq API Key
                    </label>
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full bg-dark-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                )}

                {provider === 'openai' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-dark-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Note: Keys are stored exclusively on the backend server and never sent to frontend bundles.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>

      {/* Demo Reset Card */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-rose-500/20 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Reset Demo Database</h2>
            <p className="text-xs text-slate-400">
              Restore clean NovaStore seed data, articles, demo tickets, and knowledge gaps for presentation rehearsal.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            Resets all articles, chunks, conversations, tickets, and gap records.
          </span>
          <button
            type="button"
            onClick={handleResetDemoData}
            disabled={resetting}
            className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Re-seeding Database...' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
