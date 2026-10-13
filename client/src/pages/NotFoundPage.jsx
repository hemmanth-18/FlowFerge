import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Home, LayoutDashboard, FolderGit2, ArrowLeft, Mail, Phone, HelpCircle } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export const NotFoundPage = () => {
  usePageMeta('404 - Page Not Found', 'The requested workflow, task, or page could not be located on FlowForge.');

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white relative overflow-hidden w-full max-w-full">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] max-w-full h-[400px] bg-gradient-to-tr from-brand-600/15 to-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] max-w-full h-[280px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 border-b border-white/10 bg-[#0D1220]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center space-x-2.5 group cursor-pointer" title="FlowForge Home">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform border border-white/15">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white uppercase group-hover:text-brand-300 transition-colors">
            FlowForge
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main 404 Hero */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="max-w-lg w-full text-center p-8 sm:p-12 rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden space-y-6">
          {/* Top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>ERROR 404 — ROUTE UNRESOLVED</span>
          </div>

          {/* Large 404 Text */}
          <div className="relative">
            <h1 className="text-7xl sm:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-300 to-slate-700 select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center blur-2xl opacity-20 pointer-events-none">
              <span className="text-8xl font-black text-brand-500">404</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Page or Workflow Not Found
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              The workflow, task, or page you were looking for doesn't exist, may have been removed, or requires team permission.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
            <Link
              to="/workflows"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Browse Workflows</span>
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
          </div>

          {/* Support Contacts */}
          <div className="pt-6 border-t border-white/5 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-4">
            <span>Need assistance?</span>
            <a
              href="mailto:support@flowforge.dev"
              className="inline-flex items-center space-x-1.5 text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>support@flowforge.dev</span>
            </a>
            <span className="hidden sm:inline text-slate-600">•</span>
            <a
              href="tel:+18005550199"
              className="inline-flex items-center space-x-1.5 text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+1 (800) 555-0199</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-white/10 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} FlowForge Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default NotFoundPage;
