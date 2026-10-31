import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DemoWalkthroughBar } from '../components/DemoWalkthroughBar';
import {
  LayoutDashboard, MessageSquareText, BookOpen, Search,
  Ticket, AlertTriangle, FileUp, BarChart3, Settings,
  LogOut, Shield, ChevronLeft, ChevronRight, User as UserIcon,
  Sparkles, ExternalLink, RefreshCw
} from 'lucide-react';

import { api } from '../services/api';

export const MainLayout: React.FC = () => {
  const { user, logout, demoLogin, isAdmin, isAgent, isCustomer } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    status?: string;
    is_live_llm: boolean;
    mode_label: string;
    ai_provider?: string;
  } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      try {
        const s = await api.getSystemStatus();
        if (isMounted) setSystemStatus(s);
      } catch (err) {
        if (isMounted) {
          setSystemStatus({
            status: 'offline',
            is_live_llm: false,
            mode_label: 'Offline (Server Unreachable)',
          });
        }
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const navItems = [
    {
      label: user?.role === 'customer' ? 'Customer Portal' : 'Command Center',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'agent', 'customer'],
    },
    { label: 'AI Support Chat', path: '/chat', icon: MessageSquareText, roles: ['admin', 'agent', 'customer'] },
    { label: 'Knowledge Base', path: '/knowledge', icon: BookOpen, roles: ['admin', 'agent', 'customer'] },
    { label: 'Smart Search', path: '/search', icon: Search, roles: ['admin', 'agent', 'customer'] },
    {
      label: user?.role === 'customer' ? 'My Support Tickets' : 'Support Tickets',
      path: '/tickets',
      icon: Ticket,
      roles: ['admin', 'agent', 'customer'],
    },
    { label: 'Knowledge Gaps', path: '/gaps', icon: AlertTriangle, roles: ['admin', 'agent'], badge: 'New' },
    { label: 'Document Center', path: '/documents', icon: FileUp, roles: ['admin', 'agent'] },
    { label: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'agent'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });


  return (
    <div className="h-screen max-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Demo Tour Guide Bar */}
      <DemoWalkthroughBar />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            collapsed ? 'w-16' : 'w-64'
          } bg-dark-900 border-r border-slate-800/80 flex flex-col h-full transition-all duration-300 select-none z-20 shrink-0`}
        >
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
            {!collapsed && (
              <div
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-brand-500/25">
                  <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
                    Support<span className="text-cyan-400">IQ</span>
                  </span>
                  <span className="text-[10px] font-semibold text-brand-400/80 block tracking-widest uppercase">
                    AI Knowledge OS
                  </span>
                </div>
              </div>
            )}
            {collapsed && (
              <div
                onClick={() => setCollapsed(false)}
                className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center cursor-pointer mx-auto shadow-md shadow-brand-500/20"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    } ${collapsed ? 'justify-center px-0' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${collapsed ? 'w-5 h-5' : ''}`} />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User & Role Switcher */}
          <div className="p-3 border-t border-slate-800/80 bg-dark-950/60 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800/80 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow">
                  {user?.full_name ? user.full_name[0] : 'U'}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {user?.full_name || 'Guest User'}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span className="text-[10px] text-brand-300 font-medium capitalize">
                        {user?.role || 'demo'} Role
                      </span>
                    </div>
                  </div>
                )}
                {!collapsed && <RefreshCw className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {/* Fast Role Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl bg-dark-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Quick Role Switcher
                  </div>
                  <button
                    onClick={async () => {
                      await demoLogin('admin');
                      setShowRoleMenu(false);
                      navigate('/dashboard');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-600/20 flex items-center gap-2 ${
                      user?.role === 'admin' ? 'text-brand-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Administrator</span>
                  </button>
                  <button
                    onClick={async () => {
                      await demoLogin('agent');
                      setShowRoleMenu(false);
                      navigate('/dashboard');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-600/20 flex items-center gap-2 ${
                      user?.role === 'agent' ? 'text-brand-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 text-blue-400" />
                    <span>Support Agent</span>
                  </button>
                  <button
                    onClick={async () => {
                      await demoLogin('customer');
                      setShowRoleMenu(false);
                      navigate('/dashboard');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-600/20 flex items-center gap-2 ${
                      user?.role === 'customer' ? 'text-brand-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Customer (Sarah)</span>
                  </button>
                  <div className="my-1 border-t border-slate-800"></div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 bg-dark-900/90 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between gap-4 z-10 shrink-0">
            {/* Global Search Input */}
            <form onSubmit={handleGlobalSearch} className="max-w-md w-full relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search verified articles, policies, FAQs..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-dark-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
              />
            </form>

            {/* Status Indicators & Right Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-950/80 border border-slate-700/60 text-xs">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    systemStatus?.status === 'offline'
                      ? 'bg-rose-500 shadow-rose-500/50 shadow'
                      : systemStatus?.is_live_llm
                      ? 'bg-purple-400 shadow-purple-500/50 shadow'
                      : 'bg-emerald-400 shadow-emerald-500/50 shadow'
                  }`}
                ></span>
                <span className="text-slate-300 font-medium text-[11px]">
                  Engine:{' '}
                  <span
                    className={
                      systemStatus?.status === 'offline'
                        ? 'text-rose-400 font-semibold'
                        : systemStatus?.is_live_llm
                        ? 'text-purple-300 font-semibold'
                        : 'text-emerald-300 font-semibold'
                    }
                  >
                    {systemStatus?.mode_label || 'Online (Local Grounded RAG)'}
                  </span>
                </span>
              </div>


              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Open Chat</span>
              </button>
            </div>
          </header>

          {/* Page Content Viewport */}
          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-dark-950 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
