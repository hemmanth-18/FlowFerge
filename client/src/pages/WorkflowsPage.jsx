import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  ArrowRight,
  Edit2,
  Trash2,
  Loader2,
  Layers,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Shield,
  Crown,
  User,
  Sparkles,
  Lock,
  Unlock,
  Copy,
  Share2,
  UserPlus,
  Eye,
  Check,
  X,
  Paperclip,
  FileText,
  Play,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { TeamIcon } from '../components/TeamIcon';
import { ProgressBar } from '../components/ProgressBar';
import { WorkflowModal } from '../components/WorkflowModal';
import { WorkflowPermissionsModal } from '../components/WorkflowPermissionsModal';
import { ShareWorkflowModal } from '../components/ShareWorkflowModal';
import { HoloCard } from '../components/HoloCard';
import { WorkflowTransitionModal } from '../components/WorkflowTransitionModal';
import { WorkflowDocumentsTab } from '../components/WorkflowDocumentsTab';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const WorkflowsPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager } = useTeam();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  usePageMeta('Workflows & Pipelines', 'Manage, collaborate, and orchestrate DAG workflows with Supabase PostgreSQL state synchronization.');


  const activeTab = searchParams.get('filter') || 'all'; // 'all' | 'owned' | 'shared' | 'team'

  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [topNotification, setTopNotification] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [selectedWfForPerms, setSelectedWfForPerms] = useState(null);
  const [sharingWorkflow, setSharingWorkflow] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [instantiating, setInstantiating] = useState(null);
  const [transitionWf, setTransitionWf] = useState(null);
  const [transitionTarget, setTransitionTarget] = useState('IN_PROGRESS');
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [selectedWfForDocs, setSelectedWfForDocs] = useState(null);

  const fetchWorkflows = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      let endpoint = `/workflows?filter=${activeTab}`;
      if (activeTab === 'team' && activeTeam) {
        endpoint = `/workflows?teamId=${activeTeam.id}`;
      }

      const [wfRes, tmplRes] = await Promise.all([
        api.get(endpoint),
        activeTeam
          ? api.get(`/teams/${activeTeam.id}/templates`).catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
      ]);

      setWorkflows(wfRes.data.data || []);
      setTemplates(tmplRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeTeam]);

  useEffect(() => {
    document.title = 'Workflows | FlowForge';
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleSaveWorkflow = async (data) => {
    try {
      const isEdit = Boolean(editingWorkflow);
      if (isEdit) {
        await api.put(`/workflows/${editingWorkflow.id}`, data);
      } else {
        await api.post('/workflows', {
          ...data,
          teamId: activeTab === 'team' && activeTeam ? activeTeam.id : data.teamId || null,
        });
      }
      toast.success(isEdit ? 'Workflow updated successfully!' : 'Workflow created successfully!');
      fetchWorkflows();
      setEditingWorkflow(null);
      setIsCreateModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save workflow');
    }
  };

  const handleDeleteWorkflow = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete workflow "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/workflows/${id}`);
        toast.success(`Workflow "${name}" deleted.`);
        fetchWorkflows();
      } catch (err) {
        toast.error(err.message || 'Failed to delete workflow');
      }
    }
  };

  const handleDuplicateWorkflow = async (workflow) => {
    try {
      setDuplicatingId(workflow.id);
      const res = await api.post(`/workflows/${workflow.id}/duplicate`);
      if (res.data?.success) {
        toast.success(`Workflow "${workflow.name}" duplicated successfully!`);
        fetchWorkflows();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate workflow');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleInstantiateTemplate = async (templateId) => {
    if (!activeTeam) return;
    try {
      setInstantiating(templateId);
      const res = await api.post(`/teams/${activeTeam.id}/templates/${templateId}/instantiate`);
      toast.success('Workflow template deployed successfully!');
      fetchWorkflows();
    } catch (err) {
      toast.error('Failed to instantiate template: ' + err.message);
    } finally {
      setInstantiating(null);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRoleBadge = (role) => {
    const normalized = (role || 'VIEWER').toUpperCase();
    if (normalized === 'OWNER') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30 backdrop-blur-sm shadow-sm">
          <Crown className="w-3 h-3 text-[#FBBF24]" />
          <span>OWNER</span>
        </span>
      );
    }
    if (normalized === 'MANAGER' || normalized === 'WORKFLOW_MANAGER') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 backdrop-blur-sm shadow-sm">
          <Shield className="w-3 h-3 text-[#A78BFA]" />
          <span>MANAGER</span>
        </span>
      );
    }
    if (normalized === 'MEMBER' || normalized === 'WORKFLOW_MEMBER') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 backdrop-blur-sm shadow-sm">
          <User className="w-3 h-3 text-[#34D399]" />
          <span>MEMBER</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 backdrop-blur-sm shadow-sm">
        <Eye className="w-3 h-3 text-[#38BDF8]" />
        <span>VIEWER</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] pb-16 relative selection:bg-purple-600 selection:text-white">
      {/* Top Banner Notification */}
      {topNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-5 py-2.5 bg-[#0D1220]/90 border border-[#34D399]/40 text-[#34D399] text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-xl animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
          <span>{topNotification}</span>
          <button
            onClick={() => setTopNotification('')}
            className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Navbar
        onOpenSidebar={() => setSidebarOpen && setSidebarOpen(true)}
        title="Workflow Management"
        actions={
          <button
            onClick={() => {
              setEditingWorkflow(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Workflow</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Ownership Navigation Tabs (Section 5) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div className="flex items-center space-x-1 p-1 bg-white/[0.045] border border-white/10 rounded-2xl backdrop-blur-xl overflow-x-auto text-xs whitespace-nowrap shadow-inner">
            <button
              onClick={() => setSearchParams({ filter: 'all' })}
              className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              All Accessible
            </button>
            <button
              onClick={() => setSearchParams({ filter: 'owned' })}
              className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === 'owned'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              My Workflows (Owned)
            </button>
            <button
              onClick={() => setSearchParams({ filter: 'shared' })}
              className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === 'shared'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              Shared With Me
            </button>
            {activeTeam && (
              <button
                onClick={() => setSearchParams({ filter: 'team' })}
                className={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'team'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {activeTeam.name} Pipelines
              </button>
            )}
          </div>

          <div className="text-xs text-[#CBD5E1] flex items-center space-x-2">
            <span className="text-slate-400">Viewing:</span>
            <span className="font-semibold text-white">
              {activeTab === 'owned'
                ? 'Workflows Owned By You'
                : activeTab === 'shared'
                ? 'Workflows Shared With You'
                : activeTab === 'team'
                ? `${activeTeam?.name} Workflows`
                : 'All Workflows'}
            </span>
          </div>
        </div>

        {/* Templates gallery if activeTab is team & isManager */}
        {activeTab === 'team' && isManager && templates.length > 0 && (
          <div className="p-5 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#FBBF24]" />
                <h3 className="text-xs font-bold text-[#F8FAFC]">
                  {activeTeam?.name} Ready-to-Use Templates
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">1-Click Deployment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] flex flex-col justify-between space-y-2.5 transition-all"
                >
                  <div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                      {tmpl.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#F8FAFC] mt-1.5">{tmpl.name}</h4>
                    <p className="text-[10px] text-[#CBD5E1] line-clamp-2 mt-1 leading-snug">
                      {tmpl.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleInstantiateTemplate(tmpl.id)}
                    disabled={instantiating === tmpl.id}
                    className="w-full py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#A78BFA] hover:text-white border border-[#8B5CF6]/30 text-[11px] font-medium transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {instantiating === tmpl.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{instantiating === tmpl.id ? 'Deploying...' : `Use Template`}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Status Filter Bar */}
        <div className="p-4 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search workflows by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/25 transition-all shadow-inner backdrop-blur-md"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.07] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none backdrop-blur-md transition-all cursor-pointer"
            >
              <option value="ALL" className="bg-[#0D1220] text-white">All Statuses</option>
              <option value="ACTIVE" className="bg-[#0D1220] text-white">ACTIVE</option>
              <option value="COMPLETED" className="bg-[#0D1220] text-white">COMPLETED</option>
              <option value="PAUSED" className="bg-[#0D1220] text-white">PAUSED</option>
            </select>
          </div>
        </div>

        {/* Workflows Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl animate-pulse h-64 shadow-xl"
              />
            ))}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
            <FolderGit2 className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">No workflows found</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              {activeTab === 'owned'
                ? "You haven't created any personal workflows yet. Click '+ Create Workflow' to start!"
                : activeTab === 'shared'
                ? 'No workflows have been shared with you yet. Teammates can invite you via the Share button.'
                : 'No workflows match the selected criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkflows.map((wf) => {
              const isOwner = wf.userRole === 'OWNER' || wf.ownerId === user?.id || wf.createdBy === user?.id;
              const isManagerOrOwner = isOwner || wf.userRole === 'MANAGER' || wf.userRole === 'WORKFLOW_MANAGER';

              return (
                <div
                  key={wf.id}
                  className="workflow-glass-card p-5 rounded-3xl flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between mb-2.5 gap-2">
                      <div className="flex items-center space-x-2 truncate">
                        <TeamIcon icon={wf.teamIcon} className="w-5 h-5 text-[#38BDF8] flex-shrink-0" />
                        <h3 className="text-sm font-bold text-[#F8FAFC] group-hover:text-[#A78BFA] transition-colors truncate">
                          {wf.name}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWfForDocs(wf);
                          }}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[10px] text-[#CBD5E1] hover:text-[#38BDF8] transition-colors cursor-pointer backdrop-blur-sm"
                          title="View & manage shared workflow documents"
                        >
                          <Paperclip className="w-3 h-3 text-[#38BDF8]" />
                          <span>Docs</span>
                        </button>
                        <StatusBadge status={wf.status} size="sm" />
                      </div>
                    </div>

                    <p className="text-xs text-[#CBD5E1] line-clamp-2 leading-relaxed">
                      {wf.description || 'FlowForge connected workflow'}
                    </p>

                    {/* Role & Team Metadata Badges */}
                    <div className="flex items-center justify-between mt-3 text-[11px] gap-2">
                      <div className="flex items-center space-x-1.5">
                        {getRoleBadge(wf.userRole)}
                        {wf.teamName && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-[#CBD5E1] border border-white/10 backdrop-blur-sm">
                            {wf.teamName}
                          </span>
                        )}
                      </div>

                      {wf.isRestricted ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] text-[#FBBF24]">
                          <Lock className="w-3 h-3" />
                          <span>Restricted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] text-[#34D399]">
                          <Unlock className="w-3 h-3" />
                          <span>Standard</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress & Stats */}
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
                      <div className="space-y-2 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                          <span>
                            {completedCount}/{totalCount} Tasks
                          </span>
                          <span className="font-mono font-bold text-[#F8FAFC]">
                            {currentProgress}%
                          </span>
                        </div>
                        <ProgressBar progress={currentProgress} />
                      </div>
                    );
                  })()}

                  {/* Card Actions (Section 5, 6, 9) */}
                  <div className="flex items-center justify-between pt-2 gap-1.5 border-t border-white/10 flex-wrap">
                    <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                      {/* Move to In Progress Transition Button */}
                      {wf.status !== 'IN_PROGRESS' && wf.status !== 'ACTIVE' && wf.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransitionWf(wf);
                            setTransitionTarget('IN_PROGRESS');
                            setIsTransitionModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#34D399] hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Start Workflow / Move to In Progress (optional document upload)"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Complete Workflow Transition Button (Requires 25+ words & document) */}
                      {wf.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransitionWf(wf);
                            setTransitionTarget('COMPLETED');
                            setIsTransitionModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#38BDF8] hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Mark Workflow Completed (Mandatory 25-word summary & document)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Duplicate Button */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateWorkflow(wf)}
                        disabled={duplicatingId === wf.id}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
                        title="Duplicate Workflow"
                      >
                        {duplicatingId === wf.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Share Button (Owner & Manager) */}
                      {isManagerOrOwner && (
                        <button
                          type="button"
                          onClick={() => setSharingWorkflow(wf)}
                          className="p-1.5 text-slate-400 hover:text-[#A78BFA] hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Invite Collaborators"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Access & Members Button (Owner & Manager) */}
                      {isManagerOrOwner && (
                        <button
                          type="button"
                          onClick={() => setSelectedWfForPerms(wf)}
                          className="p-1.5 text-slate-400 hover:text-[#A78BFA] hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Manage Workflow Access & Members"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Button */}
                      {isManagerOrOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWorkflow(wf);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Edit Workflow Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Button (Owner Only!) */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkflow(wf.id, wf.name)}
                          className="p-1.5 text-slate-400 hover:text-[#FB7185] hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Delete Workflow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <Link
                      to={`/workflows/${wf.id}`}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-purple-600 text-[#CBD5E1] hover:text-white border border-white/10 text-xs font-semibold transition-all group-hover:border-purple-500/40"
                    >
                      <span>Open Canvas</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workflow Create/Edit Modal */}
      <WorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingWorkflow(null);
        }}
        onSave={handleSaveWorkflow}
        onSubmit={handleSaveWorkflow}
        initialData={editingWorkflow}
      />

      {/* Share Workflow Modal (Section 9) */}
      {sharingWorkflow && (
        <ShareWorkflowModal
          isOpen={!!sharingWorkflow}
          onClose={() => setSharingWorkflow(null)}
          workflow={sharingWorkflow}
          onInvitationSent={(invite) => {
            const name = invite?.invitedUser?.name || invite?.targetIdentifier || 'collaborator';
            setTopNotification(`Invitation sent successfully to ${name}!`);
            setTimeout(() => setTopNotification(''), 4500);
            fetchWorkflows(true); // Silent update, no full page loading indicator
          }}
        />
      )}

      {/* Workflow Granular Permissions Modal */}
      {selectedWfForPerms && (
        <WorkflowPermissionsModal
          isOpen={!!selectedWfForPerms}
          onClose={() => {
            setSelectedWfForPerms(null);
            fetchWorkflows(true);
          }}
          workflowId={selectedWfForPerms.id}
          workflowName={selectedWfForPerms.name}
        />
      )}

      {/* Workflow Transition Lifecycle Modal */}
      {isTransitionModalOpen && transitionWf && (
        <WorkflowTransitionModal
          isOpen={isTransitionModalOpen}
          onClose={() => {
            setIsTransitionModalOpen(false);
            setTransitionWf(null);
          }}
          workflow={transitionWf}
          targetStatus={transitionTarget}
          onSuccess={() => {
            setIsTransitionModalOpen(false);
            setTransitionWf(null);
            fetchWorkflows(true);
          }}
        />
      )}

      {/* Shared Workflow Documents Modal */}
      {selectedWfForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-[#10141D] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedWfForDocs(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-sky-400" />
                <span>Documents &bull; {selectedWfForDocs.name}</span>
              </h2>
            </div>
            <WorkflowDocumentsTab
              workflowId={selectedWfForDocs.id}
              isManager={
                selectedWfForDocs.ownerId === user?.id ||
                selectedWfForDocs.userRole === 'OWNER' ||
                selectedWfForDocs.userRole === 'MANAGER'
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPage;
