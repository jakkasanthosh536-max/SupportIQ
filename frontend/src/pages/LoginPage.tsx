import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Lock, Mail, User as UserIcon, Shield, Ticket } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName, role);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (demoRole: 'admin' | 'agent' | 'customer') => {
    setError(null);
    setLoading(true);
    try {
      await demoLogin(demoRole);
      navigate(demoRole === 'customer' ? '/chat' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-brand-500/25 mx-auto mb-3">
            <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {isRegister ? 'Create an Account' : 'Welcome to SupportIQ'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister ? 'Sign up to start chatting with verified AI support' : 'Sign in to access your knowledge & ticket workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 shadow-inner"
              >
                <option value="customer">Customer — End-user access to AI chat</option>
                <option value="agent">Support Agent — Ticket queue & notes</option>
                <option value="admin">Administrator — Knowledge & system settings</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-brand-300 hover:text-brand-200 transition"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        {/* 1-Click Fast Login Section */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-3">
            Instant Demo Logins (No password needed)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemo('admin')}
              className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-[11px] font-semibold text-center transition flex flex-col items-center gap-1"
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => handleDemo('agent')}
              className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 text-[11px] font-semibold text-center transition flex flex-col items-center gap-1"
            >
              <Ticket className="w-4 h-4 text-blue-400" />
              <span>Agent</span>
            </button>
            <button
              onClick={() => handleDemo('customer')}
              className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-[11px] font-semibold text-center transition flex flex-col items-center gap-1"
            >
              <UserIcon className="w-4 h-4 text-cyan-400" />
              <span>Customer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
