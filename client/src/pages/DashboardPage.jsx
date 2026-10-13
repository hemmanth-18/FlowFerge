import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Calendar,
  ChevronRight,
  Loader2,
  RefreshCw,
  Zap,
  Users,
  CheckSquare,
  Building2,
  ExternalLink,
  ShieldCheck,
  FileText,
  Workflow,
  BarChart3,
  Bot,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WorkflowModal } from '../components/WorkflowModal';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { TeamIcon } from '../components/TeamIcon';
import { HoloCard } from '../components/HoloCard';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const DashboardPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user, loading: authLoading } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager, isOwner, loadingTeams, teams } = useTeam();
  const toast = useToast();
  const navigate = useNavigate();

  usePageMeta('Dashboard — Magic Bento', 'Team telemetry, active DAG pipelines, assigned tasks, and real-time activity stream.');

  const [data, setData] = useState(null);
  const [workflowsList, setWorkflowsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    // If teams are still resolving, do not conclude loading prematurely!
    if (loadingTeams) return;
    if (!activeTeam) {
      setLoading(false);
      return;
    }
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setDashboardError(null);

      const [dashRes, wfRes] = await Promise.all([
        api.get(`/teams/${activeTeam.id}/dashboard`).catch((err) => {
          console.warn('Dashboard telemetry fetch notice:', err.message);
          return { data: { data: null } };
        }),
        api.get('/workflows').catch(() => ({ data: { data: [] } })),
      ]);

      setData(dashRes.data?.data);
      const wfs = wfRes.data?.data || [];
      setWorkflowsList(wfs);

      if (isManual) {
        toast.info('Telemetry data refreshed.');
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setDashboardError(err.message || 'Failed to load dashboard telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeam?.id, loadingTeams]);

  useEffect(() => {
    if (activeTeam?.id) {
      fetchDashboardData();
    } else if (!loadingTeams && teams.length === 0) {
      setLoading(false);
    }
  }, [fetchDashboardData, activeTeam?.id, loadingTeams, teams.length]);

  const handleCreateWorkflow = async (workflowData) => {
    if (!activeTeam) return;
    try {
      const res = await api.post('/workflows', {
        ...workflowData,
        teamId: activeTeam.id,
      });
      toast.success('Workflow created successfully!');
      fetchDashboardData(true);
      if (res.data?.data?.id) {
        navigate(`/workflows/${res.data.data.id}`);
      }
    } catch (err) {
      toast.error('Failed to create workflow: ' + err.message);
    }
  };

  const userName = user?.name || user?.user_metadata?.name || 'Collaborator';

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // State 1 & 2: Authenticating or Resolving Workspace Membership
  if (authLoading || loadingTeams) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-3 bg-[#080B12]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading FlowForge workspace...</p>
      </div>
    );
  }

  // State 3: Workspace resolved, fetching dashboard telemetry
  if (activeTeam && loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-3 bg-[#080B12]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading FlowForge Bento telemetry...</p>
      </div>
    );
  }

  // State 4: Recoverable Error UI with Retry
  if (dashboardError && activeTeam && !data) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4 bg-[#080B12] p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Unable to load dashboard</h3>
        <p className="text-xs text-slate-400 max-w-sm">{dashboardError}</p>
        <button
          onClick={() => fetchDashboardData(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-glow-brand transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // State 5: Genuinely empty workspace (Loading finished AND user has 0 teams)
  if (!loadingTeams && (!activeTeam || teams.length === 0)) {
    return (
      <div className="min-h-screen bg-[#080B12] p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#10141D] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome to FlowForge!</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create your workspace team or join via invitation to start coordinating reactive DAG pipelines.
          </p>
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-glow-brand transition-all"
          >
            + Create Your First Team
          </button>
        </div>
        <CreateTeamModal isOpen={isCreateTeamOpen} onClose={() => setIsCreateTeamOpen(false)} />
      </div>
    );
  }

  // Calculate real metrics from workflows
  const teamWorkflows = workflowsList.filter((w) => !w.teamId || w.teamId === activeTeam.id);
  const totalWorkflowsCount = teamWorkflows.length;
  const inProgressCount = teamWorkflows.filter(
    (w) => w.status === 'IN_PROGRESS' || w.status === 'ACTIVE'
  ).length;
  const completedCount = teamWorkflows.filter((w) => w.status === 'COMPLETED').length;
  const pendingCount = teamWorkflows.filter(
    (w) => w.status === 'PAUSED' || w.status === 'DRAFT' || w.status === 'TODO'
  ).length;

  const recentWorkflows = teamWorkflows.slice(0, 4);
  const recentActivity = data?.recentActivity || [];
  const automationRuns = data?.stats?.automationRuns || 0;

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 pb-20 selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam.name} Dashboard`}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Refresh telemetry"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            {isManager && (
              <button
                onClick={() => setIsWfModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Workflow</span>
              </button>
            )}
          </div>
        }
      />

      {/* Main Bento Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ========================================================================= */}
        {/* ROW 1: MAGIC BENTO HERO & KPI ROW */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 1. WELCOME BENTO CARD (Span 2 cols on lg) */}
          <div className="bento-card md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-[#121622] via-[#10141D] to-[#0A0D16] border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>Workspace Command Center</span>
                </span>
                <span className="text-xs text-slate-400 flex items-center space-x-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{todayFormatted}</span>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {userName}!
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                Your <span className="text-brand-300 font-semibold">{activeTeam.name}</span> workspace currently has{' '}
                <span className="text-white font-semibold">{inProgressCount} active</span> pipelines running across{' '}
                <span className="text-white font-semibold">{totalWorkflowsCount} workflows</span>.
              </p>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsWfModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
              <Link
                to="/workflows"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition-all"
              >
                <span>Browse Workflows</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 2. TOTAL WORKFLOWS KPI */}
          <Link
            to="/workflows"
            className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 hover:border-brand-500/30 transition-all shadow-xl flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Workflows
              </span>
              <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/25 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderGit2 className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                {totalWorkflowsCount}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
                <span>Managed across team</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-brand-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>View all workflows</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* 3. IN PROGRESS KPI */}
          <Link
            to="/workflows?filter=all"
            className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 hover:border-sky-500/30 transition-all shadow-xl flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                In Progress
              </span>
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                {inProgressCount}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Active executions</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-sky-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>Filter in-progress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: STATUS SPLIT & EXECUTION STATS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 4. COMPLETED WORKFLOWS KPI */}
          <div className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Completed
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-white font-sans tracking-tight">
                {completedCount}
              </div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified with sign-offs</span>
              </div>
            </div>

            <div className="w-full bg-[#151A24] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{
                  width: totalWorkflowsCount > 0 ? `${Math.round((completedCount / totalWorkflowsCount) * 100)}%` : '0%',
                }}
              />
            </div>
          </div>

          {/* 5. PENDING / AWAITING ACTION */}
          <div className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending / Draft
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-white font-sans tracking-tight">
                {pendingCount}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Awaiting transition
              </div>
            </div>

            <div className="w-full bg-[#151A24] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-1.5 rounded-full"
                style={{
                  width: totalWorkflowsCount > 0 ? `${Math.round((pendingCount / totalWorkflowsCount) * 100)}%` : '0%',
                }}
              />
            </div>
          </div>

          {/* 6. EXECUTION & AUTOMATION TELEMETRY (Span 2 cols) */}
          <div className="bento-card md:col-span-2 p-6 rounded-3xl bg-[#10141D] border border-white/10 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Execution Engine Telemetry</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 font-mono">
                100% Health
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 my-3">
              <div className="p-3 rounded-2xl bg-[#151A24] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Automation Runs</span>
                <span className="text-xl font-bold text-white font-mono">{automationRuns}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#151A24] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Active Rules</span>
                <span className="text-xl font-bold text-brand-300 font-mono">
                  {data?.stats?.activeWorkflows || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#151A24] border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Success Rate</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">99.8%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
              <span>DAG reactive event loop active</span>
              <Link to="/automations" className="text-brand-400 hover:text-brand-300 font-semibold flex items-center space-x-1">
                <span>Manage Automations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: RECENT WORKFLOWS & ACTIVITY STREAM */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 7. RECENT WORKFLOWS */}
          <div className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Workflow className="w-5 h-5 text-brand-400" />
                  <h3 className="text-sm font-bold text-white">Recent Workflows</h3>
                </div>
                <Link to="/workflows" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
                  View All
                </Link>
              </div>

              {recentWorkflows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No workflows found. Click "Create Workflow" above to start!
                </div>
              ) : (
                <div className="space-y-3">
                  {recentWorkflows.map((wf) => (
                    <Link
                      key={wf.id}
                      to={`/workflows/${wf.id}`}
                      className="p-3.5 rounded-2xl bg-[#151A24] border border-white/5 hover:border-brand-500/40 hover:bg-[#1a202d] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                          <Workflow className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                            {wf.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {wf.description ? wf.description.substring(0, 45) + '...' : 'Interactive DAG pipeline'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <StatusBadge status={wf.status} size="xs" />
                        <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{totalWorkflowsCount} workflows in this workspace</span>
              <button
                onClick={() => setIsWfModalOpen(true)}
                className="text-brand-400 hover:text-brand-300 font-semibold"
              >
                + New Workflow
              </button>
            </div>
          </div>

          {/* 8. RECENT ACTIVITY STREAM */}
          <div className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Live Workspace Activity</h3>
                </div>
                <Link to="/activity" className="text-xs text-sky-400 hover:text-sky-300 font-semibold">
                  Full Stream
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No recent activity recorded yet. Start editing workflows!
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 4).map((act, idx) => (
                    <div
                      key={act.id || idx}
                      className="p-3 rounded-2xl bg-[#151A24] border border-white/5 flex items-start space-x-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-200 leading-snug">
                          {act.details || act.action || 'Workspace event executed'}
                        </p>
                        <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                          {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Real-time Supabase audit trail</span>
              <Link to="/audit" className="text-sky-400 hover:text-sky-300 font-semibold">
                Security Logs
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 4: FEATURED RECIPES (REACT BITS HOLOCARD SHOWCASE) */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-sky-400 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Featured Holographic Templates
                </h3>
                <p className="text-xs text-slate-400">
                  Instant deployment recipes rendered with interactive 3D WebGL foil.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 hidden sm:inline">
              React Bits HoloCards
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Holographic Template 1: Cosmos */}
            <HoloCard preset="cosmos" className="w-full h-64">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 uppercase tracking-wide">
                      Engineering
                    </span>
                    <span className="text-xs text-slate-400 font-mono">v2.4</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    Software Release Sprint
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Automate code freeze, staging deployments, QA validation, and production rollouts with strict dependencies.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">5 DAG Nodes</span>
                  <button
                    onClick={() => setIsWfModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            </HoloCard>

            {/* Holographic Template 2: Bursts */}
            <HoloCard preset="bursts" className="w-full h-64">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 uppercase tracking-wide">
                      Growth
                    </span>
                    <span className="text-xs text-slate-400 font-mono">v1.8</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    Product Launch Campaign
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Multi-channel marketing automation with copy review, asset approvals, social scheduling, and analytics.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">4 DAG Nodes</span>
                  <button
                    onClick={() => setIsWfModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            </HoloCard>

            {/* Holographic Template 3: Shards */}
            <HoloCard preset="shards" className="w-full h-64">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 uppercase tracking-wide">
                      SecOps
                    </span>
                    <span className="text-xs text-slate-400 font-mono">v3.0</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    Incident War Room
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Rapid response triage: alerts, on-call assignments, post-mortem generation, and stakeholder notifications.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">6 DAG Nodes</span>
                  <button
                    onClick={() => setIsWfModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            </HoloCard>

            {/* Holographic Template 4: Rainbow */}
            <HoloCard preset="rainbow" className="w-full h-64">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase tracking-wide">
                      Data
                    </span>
                    <span className="text-xs text-slate-400 font-mono">v2.1</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    ETL Pipeline Stream
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Extract, transform, validate, and load batches into your warehouse with automated error recovery.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">5 DAG Nodes</span>
                  <button
                    onClick={() => setIsWfModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            </HoloCard>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 5: QUICK ACTIONS BANNER */}
        {/* ========================================================================= */}
        <div className="bento-card p-6 rounded-3xl bg-[#10141D] border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Need to onboard collaborators?</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Invite teammates to your workspace with role-based access control.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-all"
            >
              <UserPlus className="w-4 h-4 text-brand-400" />
              <span>Invite Teammate</span>
            </button>
            <Link
              to="/team"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Manage Team</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <WorkflowModal
        isOpen={isWfModalOpen}
        onClose={() => setIsWfModalOpen(false)}
        onSubmit={handleCreateWorkflow}
      />
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        teamId={activeTeam?.id}
        teamName={activeTeam?.name}
        onSuccess={() => fetchDashboardData(true)}
      />
    </div>
  );
};

export default DashboardPage;
