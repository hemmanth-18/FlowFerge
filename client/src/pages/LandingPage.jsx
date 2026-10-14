import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  FolderGit2,
  Database,
  Layers,
  Sparkles,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  Users,
  Menu,
  X,
  Phone,
  Mail,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import TechText from '../components/TechText';
import MicroSlats from '../components/MicroSlats';
import ElectricLogo from '../components/ElectricLogo';

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Legal Modal (Privacy Policy / Terms of Service)
  const [legalModal, setLegalModal] = useState(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  // Page title & Meta description
  usePageMeta(
    'FlowForge — Smart Workflow Management Platform',
    'FlowForge is an intelligent workflow orchestration platform featuring interactive DAG visualization, automated task dependencies, and granular team collaboration.'
  );

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSuccess('');
    setContactError('');

    if (!contactName.trim()) {
      const err = 'Please enter your full name.';
      setContactError(err);
      toast.error(err);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail.trim())) {
      const err = 'Please provide a valid business or personal email address.';
      setContactError(err);
      toast.error(err);
      return;
    }
    if (!contactMessage.trim()) {
      const err = 'Please write a brief message or question.';
      setContactError(err);
      toast.error(err);
      return;
    }

    setSendingContact(true);
    setTimeout(() => {
      setSendingContact(false);
      const msg = 'Message sent successfully! Our engineering team will follow up within 2 hours.';
      setContactSuccess(msg);
      toast.success('Message sent successfully! We will get back to you shortly.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 selection:bg-brand-500 selection:text-white flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/10 bg-[#0D1220]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo - Clickable */}
          <Link
            to="/"
            className="flex items-center space-x-3 group cursor-pointer"
            title="FlowForge Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform border border-white/15 flex-shrink-0 overflow-hidden relative">
              <ElectricLogo
                color="#ffffff"
                glowColor="#c084fc"
                scale={0.75}
                thickness={1.5}
                strands={3}
                bend={0.5}
                crackle={1.2}
                arcs={1}
                speed={2.2}
                interactive={true}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white uppercase tracking-wider group-hover:text-brand-300 transition-colors">
                FlowForge
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-brand-400 transition-colors">Features</a>
            <a href="#workflows-demo" className="hover:text-brand-400 transition-colors">Live DAG Demo</a>
            <a href="#solutions" className="hover:text-brand-400 transition-colors">Security & RBAC</a>
            <a href="#contact" className="hover:text-brand-400 transition-colors">Contact</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 cursor-pointer"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#0D1220]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#workflows-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Live DAG Demo
              </a>
              <a
                href="#solutions"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Security & RBAC
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                Contact Support
              </a>
            </nav>

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center px-4 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/10 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}

              {/* Direct clickable contact buttons on mobile */}
              <div className="pt-2 flex items-center justify-around text-xs text-brand-400">
                <a href="tel:+18005550199" className="flex items-center space-x-1.5 py-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Us</span>
                </a>
                <span className="text-slate-700">•</span>
                <a href="mailto:support@flowforge.dev" className="flex items-center space-x-1.5 py-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Support</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-full">
        {/* Continuous Interactive MicroSlats Wave Canvas spanning entire landing page until enquiry section */}
        <div className="relative overflow-hidden">
          {/* Ambient MicroSlats Fluid Waves Canvas */}
          <div className="absolute inset-0 z-0 opacity-25 pointer-events-none overflow-hidden">
            <MicroSlats
              preset="swell"
              color="#A855F7"
              glintColor="#ffffff"
              backgroundColor="transparent"
              slatWidth={10}
              slatHeight={24}
              gap={3}
              roundness={0.75}
              interactive={true}
              cursorStrength={1.2}
              cursorSize={45}
              swirl={0.1}
              trail={1.4}
              lean={0.2}
              intro={true}
            />
          </div>

          {/* Hero Section */}
          <section className="relative pt-16 pb-16 sm:pt-24 sm:pb-24 overflow-hidden">
            {/* Subtle Ambient Background Gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] max-w-full h-[400px] bg-gradient-to-tr from-brand-600/15 to-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-[350px] max-w-full h-[280px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
            {/* Pill Tag */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-6 animate-pulse-subtle">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Smart Workflow Management Platform</span>
            </div>

            {/* TechText Interactive Wordmark — FLOWFoRGE */}
            <div className="w-full h-36 sm:h-48 md:h-56 relative flex items-center justify-center my-2 max-w-4xl mx-auto">
              <TechText
                text="FLOWFORGE"
                fontWeight={800}
                fontSize={120}
                reveal="letter"
                dashLength={4}
                dashGap={2}
                specks={15}
                color="#ffffff"
                accentColor="#A855F7"
                speed={1.2}
              />
              <h1 className="sr-only">FLOWFORGE — FlowForge Workflow Management Platform</h1>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-cyan-400 to-indigo-300 mb-6">
              Build. Collaborate. Automate.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
              Empower your teams with private workflow ownership, DAG dependency tracking, role-based collaborator invitations, and instantaneous automation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-14 px-4 sm:px-0">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 cursor-pointer"
              >
                <span>{user ? 'Open Dashboard' : 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to={user ? '/workflows' : '/login'}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all cursor-pointer"
              >
                <span>{user ? 'View Workflows' : 'Sign In with Email'}</span>
              </Link>
            </div>

            {/* Interactive Visual Workflow Preview */}
            <div
              id="workflows-demo"
              className="relative max-w-4xl mx-auto rounded-3xl bg-[#0D1220]/80 border border-white/10 p-5 sm:p-8 shadow-2xl backdrop-blur-2xl text-left overflow-hidden"
            >
              {/* Top edge highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-2">
                <div>
                  <span className="text-xs font-mono text-brand-400 uppercase tracking-wider block sm:inline mr-2">
                    Live Workflow Demo
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white inline">
                    GDG On Campus CIT Hackathon
                  </h3>
                </div>
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-mono text-emerald-400">Supabase Connected</span>
                </div>
              </div>

              {/* Visual Flow Showcase Nodes */}
              <div className="py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative items-center">
                {/* Node 1 */}
                <div className="p-4 rounded-2xl bg-white/[0.035] border border-emerald-500/30 shadow-md relative group hover:border-emerald-400/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">1. Registration</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">Applicant Portal & Forms</p>
                  <span className="mt-2.5 inline-block text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    COMPLETED
                  </span>
                </div>

                {/* Node 2 */}
                <div className="p-4 rounded-2xl bg-white/[0.035] border border-brand-500/30 shadow-md relative group hover:border-brand-400/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">2. Review</span>
                    <Clock className="w-4 h-4 text-brand-400 animate-spin" />
                  </div>
                  <p className="text-[11px] text-slate-400">Participant Management</p>
                  <span className="mt-2.5 inline-block text-[10px] px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 border border-brand-500/30">
                    IN PROGRESS
                  </span>
                </div>

                {/* Node 3 */}
                <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 shadow-md relative group hover:border-white/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">3. Venue Setup</span>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">Stage, Network & Badges</p>
                  <span className="mt-2.5 inline-block text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-400 border border-white/10">
                    TODO
                  </span>
                </div>

                {/* Node 4 */}
                <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 shadow-md relative group hover:border-white/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">4. Execution</span>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">Hackathon Day 1 & Demos</p>
                  <span className="mt-2.5 inline-block text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-400 border border-white/10">
                    TODO
                  </span>
                </div>
              </div>

              {/* Footer text */}
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">
                  Interactive DAG builder powered by React Flow with Supabase backend state synchronization
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="relative z-10 py-16 sm:py-20 border-t border-white/10 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold block mb-2">
                Engineered for Productivity
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Everything you need to orchestrate complex tasks
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="p-6 rounded-3xl bg-[#0D1220]/80 border border-white/10 space-y-3 hover:border-white/20 transition-colors backdrop-blur-2xl shadow-xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center shadow-inner">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Workflow Ownership & RBAC</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Every user privately owns their workflows. Invite collaborators as Managers, Members, or Viewers with granular server-side authorization.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0D1220]/80 border border-white/10 space-y-3 hover:border-white/20 transition-colors backdrop-blur-2xl shadow-xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shadow-inner">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Supabase PostgreSQL Database</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Enterprise-grade relational database storing workflows, tasks, graphs, RLS security policies, and real-time feeds with zero latency.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#0D1220]/80 border border-white/10 space-y-3 hover:border-white/20 transition-colors backdrop-blur-2xl shadow-xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Team Collaboration & Directory</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Find collaborators by username or email in the People directory and send invitations with real-time notification alerts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Solutions Section */}
        <section id="solutions" className="relative z-10 py-16 sm:py-20 border-t border-white/10 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold block">
                  Security & Anti-IDOR Protection
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Zero Trust Architecture with Supabase Row Level Security
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Workflows and private project tasks are protected at every tier. Whether self-hosted or cloud connected, FlowForge enforces team isolation, cryptographic session tokens, and strict permission barriers.
                </p>
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Role-Based Access Control (Admin, Manager, Member, Viewer)</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Automated dependency validation preventing cyclical deadlocks</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Real-time webhook dispatches for task state changes</span>
                  </div>
                </div>
              </div>

              {/* Code/Architecture Feature Box */}
              <div className="p-6 rounded-3xl bg-[#0D1220]/90 border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto backdrop-blur-2xl shadow-2xl relative">
                <div className="flex items-center space-x-2 pb-3 border-b border-white/10 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] ml-2 text-slate-400">architecture.dag.config</span>
                </div>
                <pre className="pt-4 leading-relaxed text-slate-400 text-[11px]">
                  <code>{`{\n  "workflow": "GDG On Campus CIT Hackathon",\n  "database": "Supabase PostgreSQL",\n  "rbac": {\n    "owner": "user_hemmanth",\n    "manager": "user_priya",\n    "member": "user_ravi"\n  },\n  "dag_resolver": "Kahn Algorithm Topological Sort",\n  "status": "ONLINE & SYNCHRONIZED"\n}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
        </div>

        {/* Contact & Support Section */}
        <section id="contact" className="py-16 sm:py-20 border-t border-white/10 bg-[#080B12]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center space-y-2 mb-10">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold block">
                  Get in Touch
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Have questions or need enterprise support?
                </h3>
                <p className="text-sm text-slate-400">
                  Reach out directly by phone, email, or send us a quick note below.
                </p>
              </div>

              {/* Direct Clickable Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Clickable Phone Number */}
                <a
                  href="tel:+18005550199"
                  className="p-4 rounded-2xl bg-white/[0.035] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 flex items-center space-x-3.5 transition-all group cursor-pointer"
                  title="Click to Call Support"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-brand-500/20 shadow-inner">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-mono">DIRECT PHONE SUPPORT</span>
                    <span className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                      +1 (800) 555-0199
                    </span>
                  </div>
                </a>

                {/* Clickable Email */}
                <a
                  href="mailto:support@flowforge.dev"
                  className="p-4 rounded-2xl bg-white/[0.035] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 flex items-center space-x-3.5 transition-all group cursor-pointer"
                  title="Click to Email Support"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-sky-500/20 shadow-inner">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-mono">EMAIL INQUIRIES</span>
                    <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      support@flowforge.dev
                    </span>
                  </div>
                </a>
              </div>

              {/* Interactive Contact Form */}
              <div className="bg-[#0D1220]/80 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {contactSuccess && (
                  <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>{contactSuccess}</span>
                  </div>
                )}

                {contactError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{contactError}</span>
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Hemmanth Kumar"
                        className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Business Email
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="hemmanth@example.com"
                        className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Message / Inquiry
                    </label>
                    <textarea
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="How can we help optimize your team's workflow automation?"
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/15 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingContact}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {sendingContact ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Comprehensive Footer */}
      <footer className="border-t border-white/10 bg-[#080B12] pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            {/* Brand Column */}
            <div className="space-y-3.5">
              <Link to="/" className="flex items-center space-x-2.5 group cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/25 border border-white/15 overflow-hidden relative">
                  <ElectricLogo
                    color="#ffffff"
                    glowColor="#c084fc"
                    scale={0.75}
                    thickness={1.5}
                    strands={3}
                    bend={0.5}
                    crackle={1.2}
                    arcs={1}
                    speed={2.2}
                    interactive={true}
                  />
                </div>
                <span className="text-base font-black tracking-tight text-white uppercase tracking-wider group-hover:text-brand-300 transition-colors">
                  FlowForge
                </span>
              </Link>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart workflow orchestration with React Flow DAG canvas and Supabase PostgreSQL persistence.
              </p>
              <div className="space-y-1.5 pt-1 text-xs text-slate-400">
                <a
                  href="tel:+18005550199"
                  className="flex items-center space-x-2 hover:text-brand-400 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-400" />
                  <span>+1 (800) 555-0199</span>
                </a>
                <a
                  href="mailto:support@flowforge.dev"
                  className="flex items-center space-x-2 hover:text-sky-400 transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>support@flowforge.dev</span>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3 font-mono">
                Product
              </h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link to="/workflows" className="hover:text-white transition-colors">
                    Workflows Engine
                  </Link>
                </li>
                <li>
                  <Link to="/tasks" className="hover:text-white transition-colors">
                    Task Assignment Board
                  </Link>
                </li>
                <li>
                  <Link to="/automations" className="hover:text-white transition-colors">
                    Smart Automations
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-white transition-colors">
                    Analytics Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Platform & Resources */}
            <div>
              <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3 font-mono">
                Platform
              </h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Core Capabilities
                  </a>
                </li>
                <li>
                  <a href="#workflows-demo" className="hover:text-white transition-colors">
                    Interactive DAG Canvas
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="hover:text-white transition-colors">
                    Security & RBAC
                  </a>
                </li>
                <li>
                  <Link to="/notifications" className="hover:text-white transition-colors">
                    Activity & Feeds
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account & Help */}
            <div>
              <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3 font-mono">
                Get Started
              </h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">
                    Create New Account
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Sign In to Workspace
                  </Link>
                </li>
                <li>
                  <Link to="/forgot-password" className="hover:text-white transition-colors">
                    Reset Password
                  </Link>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact Engineering Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with Dynamic Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-brand-400" />
              <span>FlowForge Platform</span>
              <span>•</span>
              <span>© {new Date().getFullYear()} All rights reserved.</span>
            </div>

            <div className="flex items-center space-x-4 text-slate-400">
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="hover:text-brand-300 transition-colors cursor-pointer text-xs"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="hover:text-brand-300 transition-colors cursor-pointer text-xs"
              >
                Terms of Service
              </button>
              <span>•</span>
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Systems Operational</span>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Privacy Policy & Terms of Service Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B12]/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0D1220]/95 border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setLegalModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {legalModal === 'privacy' ? (
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center space-x-2 text-brand-400 mb-2">
                  <Shield className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">FlowForge Privacy Policy</h3>
                </div>
                <p className="text-slate-400">
                  Last updated: {new Date().getFullYear()}. Your privacy and data governance are fundamental to FlowForge.
                </p>
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-white">1. Data Architecture & Row-Level Security</h4>
                  <p>
                    All workflows, node configurations, task assignees, and audit records stored on FlowForge are isolated per workspace and protected by PostgreSQL Row-Level Security (RLS) policies. Only authenticated members with granted team privileges can inspect or query your team graph.
                  </p>
                  <h4 className="text-sm font-semibold text-white">2. Authentication & Session Cookies</h4>
                  <p>
                    We store cryptographic HTTP-only session tokens to manage authenticated sessions. FlowForge does not track third-party advertising cookies or share client telemetry with unverified vendors.
                  </p>
                  <h4 className="text-sm font-semibold text-white">3. Contact Inquiries & Support</h4>
                  <p>
                    Contact submissions made through the portal are utilized strictly by the engineering team to resolve inquiries, assist with deployment, and coordinate platform integrations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center space-x-2 text-brand-400 mb-2">
                  <Shield className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">FlowForge Terms of Service</h3>
                </div>
                <p className="text-slate-400">
                  Last updated: {new Date().getFullYear()}. Terms governing usage of the FlowForge platform.
                </p>
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-white">1. Acceptance of Terms</h4>
                  <p>
                    By registering or using the FlowForge Workflow Management Platform, your organization agrees to operate workflows in compliance with industry security guidelines and fair usage limits.
                  </p>
                  <h4 className="text-sm font-semibold text-white">2. Team Roles & Granular Permissions</h4>
                  <p>
                    Team Admins and Managers hold authority over workspace configurations, workflow deletions, and member role promotions. Users are solely responsible for actions executed under their authenticated credentials.
                  </p>
                  <h4 className="text-sm font-semibold text-white">3. Platform Availability & Automated Execution</h4>
                  <p>
                    FlowForge automations execute deterministic topological sorts on your DAG pipeline. Cycles in directed graphs are actively rejected by the dependency validator to maintain pipeline integrity.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
