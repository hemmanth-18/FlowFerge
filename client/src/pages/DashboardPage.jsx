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
  Search,
  Lock,
  Unlock,
  Shield,
  X,
  Filter,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WorkflowModal } from '../components/WorkflowModal';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { WorkflowPermissionsModal } from '../components/WorkflowPermissionsModal';
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
  const [permissionModalWf, setPermissionModalWf] = useState(null);
  const [wfSearchQuery, setWfSearchQuery] = useState('');
  const [wfStatusFilter, setWfStatusFilter] = useState('ALL');
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
        api.get(`/workflows?teamId=${activeTeam.id}`).catch(() => ({ data: { data: [] } })),
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
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-3 bg-transparent">
        <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
        <p className="text-xs text-slate-400">Loading FlowForge workspace...</p>
      </div>
    );
  }

  // State 3: Workspace resolved, fetching dashboard telemetry - Glass Bento Skeleton
  if (activeTeam && loading) {
    return (
      <div className="min-h-screen bg-transparent pb-20">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} title={`${activeTeam.name} Dashboard`} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="md:col-span-2 p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-56" />
            <div className="p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-56" />
            <div className="p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-56" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-44" />
            <div className="p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-44" />
            <div className="md:col-span-2 p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-44" />
          </div>
        </div>
      </div>
    );
  }

  // State 4: Recoverable Error UI with Retry
  if (dashboardError && activeTeam && !data) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4 bg-transparent p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FB7185]/15 border border-[#FB7185]/30 flex items-center justify-center mx-auto text-[#FB7185] backdrop-blur-md">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#F8FAFC]">Unable to load dashboard</h3>
        <p className="text-xs text-[#94A3B8] max-w-sm">{dashboardError}</p>
        <button
          onClick={() => fetchDashboardData(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Telemetry</span>
        </button>
      </div>
    );
  }

  // State 5: Genuinely empty workspace (Loading finished AND user has 0 teams)
  if (!loadingTeams && (!activeTeam || teams.length === 0)) {
    return (
      <div className="min-h-screen bg-transparent p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.045] backdrop-blur-2xl border border-white/10 text-center space-y-4 shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center mx-auto text-[#A78BFA] shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">Welcome to FlowForge!</h2>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Create your workspace team or join via invitation to start coordinating reactive DAG pipelines.
          </p>
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 transition-all"
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
  const failedCount = teamWorkflows.filter(
    (w) => w.status === 'FAILED' || w.status === 'ERROR'
  ).length;

  const filteredTeamWorkflows = teamWorkflows.filter((wf) => {
    const q = wfSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      wf.name?.toLowerCase().includes(q) ||
      wf.description?.toLowerCase().includes(q) ||
      wf.createdByName?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (wfStatusFilter === 'ALL') return true;
    if (wfStatusFilter === 'IN_PROGRESS') return wf.status === 'IN_PROGRESS' || wf.status === 'ACTIVE';
    if (wfStatusFilter === 'COMPLETED') return wf.status === 'COMPLETED';
    if (wfStatusFilter === 'PENDING') return wf.status === 'PAUSED' || wf.status === 'DRAFT' || wf.status === 'TODO';
    if (wfStatusFilter === 'FAILED') return wf.status === 'FAILED' || wf.status === 'ERROR';
    return true;
  });

  const recentWorkflows = teamWorkflows.slice(0, 4);
  const recentActivity = data?.recentActivity || [];
  const automationRuns = data?.stats?.automationRuns || 0;

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] pb-20 selection:bg-purple-600 selection:text-white">
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
              className="p-2 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#8B5CF6]' : ''}`} />
            </button>
            {isManager && (
              <button
                onClick={() => setIsWfModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all"
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
          <div className="bento-card md:col-span-2 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-white/[0.07] via-white/[0.045] to-[#0D1220]/80 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#38BDF8]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] text-xs font-medium backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Workspace Command Center</span>
                </span>
                <span className="text-xs text-[#CBD5E1] flex items-center space-x-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{todayFormatted}</span>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                Welcome back, {userName}!
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#CBD5E1] leading-relaxed max-w-lg">
                Your <span className="text-[#38BDF8] font-semibold">{activeTeam.name}</span> workspace currently has{' '}
                <span className="text-white font-semibold">{inProgressCount} active</span> pipelines running across{' '}
                <span className="text-white font-semibold">{totalWorkflowsCount} workflows</span>.
              </p>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-3 relative z-10">
              <button
                onClick={() => setIsWfModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
              <Link
                to="/workflows"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-[#F8FAFC] text-xs font-semibold backdrop-blur-md transition-all"
              >
                <span>Browse Workflows</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 2. TOTAL WORKFLOWS KPI */}
          <Link
            to="/workflows"
            className="bento-card p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-[#8B5CF6]/40 backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                Total Workflows
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderGit2 className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-[#F8FAFC] font-sans tracking-tight">
                {totalWorkflowsCount}
              </div>
              <div className="text-xs text-[#94A3B8] mt-1 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Managed across team</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-[#A78BFA] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>View all workflows</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* 3. IN PROGRESS KPI */}
          <Link
            to="/workflows?filter=all"
            className="bento-card p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-[#38BDF8]/40 backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                In Progress
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-[#F8FAFC] font-sans tracking-tight">
                {inProgressCount}
              </div>
              <div className="text-xs text-[#94A3B8] mt-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Active executions</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-[#38BDF8] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
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
          <div className="bento-card p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-[#34D399]/40 backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                Completed
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-[#F8FAFC] font-sans tracking-tight">
                {completedCount}
              </div>
              <div className="text-xs text-[#34D399] mt-1 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified with sign-offs</span>
              </div>
            </div>

            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#34D399] h-1.5 rounded-full"
                style={{
                  width: totalWorkflowsCount > 0 ? `${Math.round((completedCount / totalWorkflowsCount) * 100)}%` : '0%',
                }}
              />
            </div>
          </div>

          {/* 5. PENDING / AWAITING ACTION */}
          <div className="bento-card p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-[#FBBF24]/40 backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                Pending / Draft
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#FBBF24]/15 border border-[#FBBF24]/30 text-[#FBBF24] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-3xl font-black text-[#F8FAFC] font-sans tracking-tight">
                {pendingCount}
              </div>
              <div className="text-xs text-[#94A3B8] mt-1">
                Awaiting transition
              </div>
            </div>

            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#FBBF24] h-1.5 rounded-full"
                style={{
                  width: totalWorkflowsCount > 0 ? `${Math.round((pendingCount / totalWorkflowsCount) * 100)}%` : '0%',
                }}
              />
            </div>
          </div>

          {/* 6. EXECUTION & AUTOMATION TELEMETRY (Span 2 cols) */}
          <div className="bento-card md:col-span-2 p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-[#8B5CF6]/40 backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Execution Engine Telemetry</h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] font-mono">
                100% Health
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3">
              <div className="p-3 rounded-2xl bg-white/[0.035] border border-white/10 backdrop-blur-md">
                <span className="text-[11px] text-[#CBD5E1] block mb-1">Automation Runs</span>
                <span className="text-xl font-bold text-[#F8FAFC] font-mono">{automationRuns}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.035] border border-white/10 backdrop-blur-md">
                <span className="text-[11px] text-[#CBD5E1] block mb-1">Active Rules</span>
                <span className="text-xl font-bold text-[#A78BFA] font-mono">
                  {data?.stats?.activeWorkflows || 0}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.035] border border-white/10 backdrop-blur-md">
                <span className="text-[11px] text-[#CBD5E1] block mb-1">Success Rate</span>
                <span className="text-xl font-bold text-[#34D399] font-mono">99.8%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#CBD5E1] pt-2 border-t border-white/10">
              <span>DAG reactive event loop active</span>
              <Link to="/automations" className="text-[#38BDF8] hover:text-[#38BDF8]/80 font-semibold flex items-center space-x-1">
                <span>Manage Automations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: ALL WORKFLOWS IN THIS TEAM (REAL BACKEND TELEMETRY) */}
        {/* ========================================================================= */}
        <div className="bento-card p-6 sm:p-7 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center flex-shrink-0 shadow-inner">
                <Workflow className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5 flex-wrap">
                  <h3 className="text-lg font-black text-[#F8FAFC] tracking-tight">
                    All Workflows in This Team
                  </h3>
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] text-xs font-semibold">
                    <Building2 className="w-3 h-3 text-[#38BDF8]" />
                    <span>{activeTeam.name}</span>
                  </span>
                </div>
                <p className="text-xs text-[#CBD5E1] mt-0.5">
                  Shared DAG pipelines accessible to authorized members of <strong className="text-white">{activeTeam.name}</strong>.
                </p>
              </div>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#CBD5E1] font-mono">
                {totalWorkflowsCount} Total
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-xs text-[#38BDF8] font-mono">
                {inProgressCount} Active
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 text-xs text-[#34D399] font-mono">
                {completedCount} Done
              </span>
              {isManager && (
                <button
                  onClick={() => setIsWfModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Workflow</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={wfSearchQuery}
                onChange={(e) => setWfSearchQuery(e.target.value)}
                placeholder={`Search workflows in ${activeTeam.name} by name, description, or creator...`}
                className="w-full pl-10 pr-9 py-2 bg-white/[0.04] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] placeholder-slate-400 outline-none transition-all"
              />
              {wfSearchQuery && (
                <button
                  onClick={() => setWfSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              {[
                { id: 'ALL', label: 'All', count: totalWorkflowsCount },
                { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
                { id: 'COMPLETED', label: 'Completed', count: completedCount },
                { id: 'PENDING', label: 'Pending', count: pendingCount },
                ...(failedCount > 0 ? [{ id: 'FAILED', label: 'Failed', count: failedCount }] : []),
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setWfStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    wfStatusFilter === pill.id
                      ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/5'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      wfStatusFilter === pill.id ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-slate-400'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Workflows Cards Grid */}
          {teamWorkflows.length === 0 ? (
            <div className="py-12 px-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center mx-auto shadow-inner">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No workflows in {activeTeam.name} yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Workflows created here will be automatically accessible to all authorized members of this team.
              </p>
              {isManager && (
                <button
                  onClick={() => setIsWfModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Team Workflow</span>
                </button>
              )}
            </div>
          ) : filteredTeamWorkflows.length === 0 ? (
            <div className="py-10 px-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
              <p className="text-xs text-slate-400">
                No workflows match your search <strong className="text-white">"{wfSearchQuery}"</strong> or selected status filter.
              </p>
              <button
                onClick={() => {
                  setWfSearchQuery('');
                  setWfStatusFilter('ALL');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/10 transition-all"
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeamWorkflows.map((wf) => {
                const canManageWf =
                  isAdmin ||
                  isManager ||
                  wf.userRole === 'OWNER' ||
                  wf.userRole === 'MANAGER' ||
                  wf.createdBy === user?.id;

                return (
                  <div
                    key={wf.id}
                    className="p-5 rounded-2xl bg-white/[0.035] hover:bg-white/[0.06] border border-white/10 hover:border-[#8B5CF6]/40 transition-all shadow-md flex flex-col justify-between group backdrop-blur-md relative"
                  >
                    <div>
                      {/* Card Top: Title, StatusBadge, Access Mode */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <Link
                          to={`/workflows/${wf.id}`}
                          className="flex items-center space-x-2.5 min-w-0 flex-1 group/title"
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center flex-shrink-0 group-hover/title:scale-105 transition-transform">
                            <Workflow className="w-4 h-4" />
                          </div>
                          <h4 className="text-sm font-bold text-[#F8FAFC] group-hover/title:text-[#A78BFA] transition-colors truncate">
                            {wf.name}
                          </h4>
                        </Link>
                        <StatusBadge status={wf.status} size="xs" />
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                        {wf.description || 'Interactive DAG pipeline with coordinated task dependencies.'}
                      </p>

                      {/* Metadata Details */}
                      <div className="space-y-2 py-3 border-y border-white/5 text-[11px]">
                        {/* Creator & Team */}
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Created by:</span>
                          <span className="font-semibold text-white flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-purple-500/30 text-[9px] font-bold text-purple-200 flex items-center justify-center">
                              {(wf.createdByName || 'T')[0].toUpperCase()}
                            </span>
                            <span>{wf.createdByName || 'Team Member'}</span>
                          </span>
                        </div>

                        {/* Access Mode */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Access Mode:</span>
                          {wf.isRestricted ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Restricted to Selected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                              <Unlock className="w-2.5 h-2.5" />
                              <span>All Team Members Have Access</span>
                            </span>
                          )}
                        </div>

                        {/* Role & Dates */}
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Your Role:</span>
                          <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-slate-200 font-mono text-[10px]">
                            {wf.userRole || 'MEMBER'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 pt-0.5">
                          <span>Updated:</span>
                          <span className="font-mono text-slate-300">
                            {wf.updatedAt || wf.createdAt ? new Date(wf.updatedAt || wf.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3.5 mt-2 flex items-center justify-between gap-2">
                      <Link
                        to={`/workflows/${wf.id}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
                      >
                        <span>Open Canvas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {canManageWf && (
                        <button
                          onClick={() => setPermissionModalWf(wf)}
                          title="Manage workflow access & member roles"
                          className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Roles</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#CBD5E1]">
            <span>
              Showing {filteredTeamWorkflows.length} of {totalWorkflowsCount} workflows in <strong className="text-white">{activeTeam.name}</strong>
            </span>
            <Link
              to="/workflows"
              className="text-[#38BDF8] hover:text-[#38BDF8]/80 font-semibold flex items-center space-x-1"
            >
              <span>Manage on Workflows Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 4: RECENT ACTIVITY STREAM (REAL-TIME AUDIT) */}
        {/* ========================================================================= */}
        <div className="bento-card p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Live Workspace Activity</h3>
              </div>
              <Link to="/activity" className="text-xs text-[#38BDF8] hover:text-[#38BDF8]/80 font-semibold">
                Full Stream
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#94A3B8]">
                No recent activity recorded yet. Start coordinating DAG pipelines!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentActivity.slice(0, 4).map((act, idx) => (
                  <div
                    key={act.id || idx}
                    className="p-3 rounded-2xl bg-white/[0.035] border border-white/5 flex items-start space-x-3 backdrop-blur-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#F8FAFC] leading-snug">
                        {act.details || act.action || 'Workspace event executed'}
                      </p>
                      <span className="text-[10px] text-[#94A3B8] mt-0.5 block font-mono">
                        {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs text-[#CBD5E1]">
            <span>Real-time Supabase audit trail</span>
            <Link to="/audit" className="text-[#38BDF8] hover:text-[#38BDF8]/80 font-semibold">
              Security Logs
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 4: FEATURED RECIPES (REACT BITS HOLOCARD SHOWCASE) */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#38BDF8] flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                  Featured Holographic Templates
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Instant deployment recipes rendered with interactive 3D WebGL foil.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] hidden sm:inline backdrop-blur-sm">
              React Bits HoloCards
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Holographic Template 1: Cosmos */}
            <HoloCard preset="cosmos" className="w-full h-64">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] uppercase tracking-wide">
                      Engineering
                    </span>
                    <span className="text-xs text-slate-300 font-mono">v2.4</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    Software Release Sprint
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Automate code freeze, staging deployments, QA validation, and production rollouts with strict dependencies.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">5 DAG Nodes</span>
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] uppercase tracking-wide">
                      Growth
                    </span>
                    <span className="text-xs text-slate-300 font-mono">v1.8</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    Product Launch Campaign
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Multi-channel marketing automation with copy review, asset approvals, social scheduling, and analytics.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">4 DAG Nodes</span>
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FB7185]/20 text-[#FB7185] uppercase tracking-wide">
                      SecOps
                    </span>
                    <span className="text-xs text-slate-300 font-mono">v3.0</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    Incident War Room
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Rapid response triage: alerts, on-call assignments, post-mortem generation, and stakeholder notifications.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">6 DAG Nodes</span>
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34D399]/20 text-[#34D399] uppercase tracking-wide">
                      Data
                    </span>
                    <span className="text-xs text-slate-300 font-mono">v2.1</span>
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight">
                    ETL Pipeline Stream
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-1.5 leading-relaxed line-clamp-3">
                    Extract, transform, validate, and load batches into your warehouse with automated error recovery.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">5 DAG Nodes</span>
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
        <div className="bento-card p-6 rounded-3xl bg-white/[0.045] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">Need to onboard collaborators?</h4>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Invite teammates to your workspace with role-based access control.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[#F8FAFC] text-xs font-semibold backdrop-blur-md transition-all"
            >
              <UserPlus className="w-4 h-4 text-[#A78BFA]" />
              <span>Invite Teammate</span>
            </button>
            <Link
              to="/team"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#38BDF8] hover:opacity-95 text-white text-xs font-semibold shadow-lg shadow-[#8B5CF6]/25 transition-all"
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
      {permissionModalWf && (
        <WorkflowPermissionsModal
          isOpen={!!permissionModalWf}
          onClose={() => {
            setPermissionModalWf(null);
            fetchDashboardData(true);
          }}
          workflowId={permissionModalWf.id}
          workflowName={permissionModalWf.name}
          currentUserRole={permissionModalWf.userRole || activeRole}
        />
      )}
    </div>
  );
};

export default DashboardPage;
