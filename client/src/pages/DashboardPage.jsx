import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WorkflowModal } from '../components/WorkflowModal';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { TeamIcon } from '../components/TeamIcon';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const DashboardPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager, switchTeam } = useTeam();
  const toast = useToast();

  usePageMeta('Dashboard & Analytics', 'Team telemetry, active DAG pipelines, assigned tasks, and real-time activity stream.');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (!activeTeam) {
      setLoading(false);
      return;
    }
    try {
      if (isManual) setRefreshing(true);
      const res = await api.get(`/teams/${activeTeam.id}/dashboard`);
      setData(res.data.data);
      if (isManual) {
        toast.info('Dashboard telemetry updated.');
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      if (isManual) {
        toast.error('Failed to refresh dashboard: ' + err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeam?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for team switch event
  useEffect(() => {
    const handleTeamSwitch = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('flowforge_team_switched', handleTeamSwitch);
    return () => window.removeEventListener('flowforge_team_switched', handleTeamSwitch);
  }, [fetchDashboardData]);

  const handleCreateWorkflow = async (workflowData) => {
    if (!activeTeam) return;
    try {
      await api.post('/workflows', {
        ...workflowData,
        teamId: activeTeam.id,
      });
      toast.success('Workflow created successfully!');
      fetchDashboardData(true);
    } catch (err) {
      toast.error('Failed to create workflow: ' + err.message);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await api.put(`/tasks/${task.id}`, { status: nextStatus });
      toast.success(`Task status changed to ${nextStatus.replace('_', ' ')}!`);
      fetchDashboardData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to update task status');
    }
  };

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name || user?.user_metadata?.name || 'Contributer';

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading Team telemetry...</p>
      </div>
    );
  }

  if (!activeTeam) {
    return (
      <div className="min-h-screen bg-dark-950 p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-dark-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-brand-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Welcome to FlowForge!</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            FlowForge is built around Teams as the central organizational unit. Create your first team or accept an invitation to begin.
          </p>
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-glow-brand transition-all"
          >
            + Create Your First Team
          </button>
        </div>
        <CreateTeamModal
          isOpen={isCreateTeamOpen}
          onClose={() => setIsCreateTeamOpen(false)}
        />
      </div>
    );
  }

  const stats = data?.stats || {
    activeWorkflows: 0,
    totalWorkflows: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    automationRuns: 0,
    memberCount: 0,
  };

  const activeWorkflows = data?.activeWorkflows || [];
  const myTasks = data?.myTasks || [];
  const overdueTasks = data?.overdueTasks || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="min-h-screen bg-dark-950 pb-16">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam.name} Dashboard`}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Refresh Team Telemetry"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            {isManager && (
              <button
                onClick={() => setIsWfModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workflow</span>
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 22. Top Header with Team greeting & create workflow button */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-slate-700 flex items-center justify-center shadow-lg">
                <TeamIcon icon={activeTeam.icon} className="w-7 h-7 text-brand-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    {activeTeam.name}
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase">
                    {activeRole}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {getGreeting()}, <span className="text-slate-200 font-semibold">{userName}</span>. {activeTeam.description || 'Welcome to your team workspace.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <Link
                to="/team"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all"
              >
                <Users className="w-3.5 h-3.5 text-brand-400" />
                <span>{stats.memberCount} Team Members</span>
              </Link>

              {isManager && (
                <button
                  onClick={() => setIsWfModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Workflow</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 & 22. Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Active Workflows */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Active Workflows</span>
              <FolderGit2 className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.activeWorkflows}
            </div>
            <span className="text-[10px] text-slate-500">
              of {stats.totalWorkflows} total pipelines
            </span>
          </div>

          {/* Pending Tasks */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Pending Tasks</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {stats.pendingTasks}
            </div>
            <span className="text-[10px] text-slate-500">
              in queue / in progress
            </span>
          </div>

          {/* Completed Tasks */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Completed Tasks</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {stats.completedTasks}
            </div>
            <span className="text-[10px] text-slate-500">
              successfully delivered
            </span>
          </div>

          {/* Overdue Tasks */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Overdue Tasks</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-bold tracking-tight ${stats.overdueTasks > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {stats.overdueTasks}
            </div>
            <span className="text-[10px] text-slate-500">
              past target deadline
            </span>
          </div>

          {/* Automation Runs */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Automation Runs</span>
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-300 tracking-tight">
              {stats.automationRuns}
            </div>
            <span className="text-[10px] text-slate-500">
              DAG triggers executed
            </span>
          </div>
        </div>

        {/* Overdue Alert Banner if tasks are overdue */}
        {overdueTasks.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-300">
                Action Required: {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''} in {activeTeam.name}
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {overdueTasks.map((t) => (
                  <Link
                    key={t.id}
                    to="/tasks"
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-900/80 border border-rose-500/40 text-[11px] text-slate-200 hover:bg-dark-800"
                  >
                    <span>{t.title}</span>
                    <span className="text-[10px] text-rose-400">({t.dueDate})</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid: Active Workflows & My Tasks / Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Active Workflows (2 Columns Wide on LG) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FolderGit2 className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Active Team Workflows
                  </h3>
                </div>
                <Link
                  to="/workflows"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1 font-medium"
                >
                  <span>View All Workflows</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {activeWorkflows.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No active workflows yet. Click "+ Create Workflow" to start building your first pipeline.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {activeWorkflows.map((wf) => (
                    <Link
                      key={wf.id}
                      to={`/workflows/${wf.id}`}
                      className="p-4 rounded-xl bg-dark-850 hover:bg-dark-800 border border-slate-800 hover:border-brand-500/40 transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-brand-400 transition-colors truncate">
                            {wf.name}
                          </h4>
                          <StatusBadge status={wf.status} size="sm" />
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                          {wf.description || 'DAG visual workflow'}
                        </p>
                      </div>

                      {(() => {
                        const parsedNodes = Array.isArray(wf.nodes) ? wf.nodes : (typeof wf.nodes === 'string' ? (() => { try { return JSON.parse(wf.nodes); } catch (e) { return []; } })() : []);
                        const totalCount = wf.totalTasks !== undefined && wf.totalTasks !== null && wf.totalTasks > 0 ? wf.totalTasks : parsedNodes.length;
                        const completedCount = wf.completedTasks !== undefined && wf.completedTasks !== null && wf.completedTasks > 0
                          ? wf.completedTasks
                          : parsedNodes.filter(n => {
                              const s = (n?.data?.task?.status || n?.data?.status || n?.status || '').toUpperCase();
                              return s === 'COMPLETED';
                            }).length;
                        const currentProgress = wf.progress !== undefined && wf.progress !== null && wf.progress > 0
                          ? wf.progress
                          : (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

                        return (
                          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Progress: {completedCount}/{totalCount} Tasks</span>
                              <span className="font-mono font-bold text-slate-300">{currentProgress}%</span>
                            </div>
                            <ProgressBar progress={currentProgress} />
                          </div>
                        );
                      })()}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* My Tasks Section */}
            <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    My Assigned Tasks ({myTasks.length})
                  </h3>
                </div>
                <Link
                  to="/tasks"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1 font-medium"
                >
                  <span>All Tasks</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {myTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>You have no pending tasks assigned in this team.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {myTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-dark-850 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-500 border-emerald-500 text-dark-950'
                              : 'border-slate-600 hover:border-emerald-400 text-transparent'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <div>
                          <p className={`text-xs font-semibold ${
                            task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}>
                            {task.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {task.workflowName || 'Workflow Task'} • Due {task.dueDate || 'No date'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <PriorityBadge priority={task.priority} size="sm" />
                        <StatusBadge status={task.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Team Activity Feed (1 Column Wide) */}
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Team Recent Activity
                  </h3>
                </div>
                <Link
                  to="/activity"
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  View Feed
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No activity recorded yet in this team.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map((act) => (
                    <div key={act.id} className="flex items-start space-x-2.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-slate-300 leading-snug">
                          <strong className="text-slate-100 font-semibold">{act.userName}</strong> {act.details || act.action}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {act.timestamp?.substring(11, 16)} • {act.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Workflow Modal */}
      <WorkflowModal
        isOpen={isWfModalOpen}
        onClose={() => setIsWfModalOpen(false)}
        onSave={handleCreateWorkflow}
        onSubmit={handleCreateWorkflow}
      />
    </div>
  );
};

export default DashboardPage;
