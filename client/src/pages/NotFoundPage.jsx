import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Home, LayoutDashboard, FolderGit2, ArrowLeft, Mail, Phone, HelpCircle } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export const NotFoundPage = () => {
  usePageMeta('404 - Page Not Found', 'The requested workflow, task, or page could not be located on FlowForge.');

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white relative overflow-hidden w-full max-w-full">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] max-w-full h-[350px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] max-w-full h-[250px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 bg-dark-900/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center space-x-2.5 group cursor-pointer" title="FlowForge Home">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white uppercase group-hover:text-brand-300 transition-colors">
            FlowForge
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main 404 Hero */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="max-w-lg w-full text-center space-y-6">
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
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
              Page or Workflow Not Found
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              The workflow, task, or page you were looking for doesn't exist, may have been removed, or requires team permission.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-glow-brand transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
            <Link
              to="/workflows"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-dark-850 hover:bg-dark-800 border border-slate-700/80 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Browse Workflows</span>
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-dark-900 hover:bg-dark-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
          </div>

          {/* Support Contacts */}
          <div className="pt-6 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-4">
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
      <footer className="py-4 px-6 border-t border-slate-800/60 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} FlowForge Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default NotFoundPage;
