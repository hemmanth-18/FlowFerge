import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  MarkerType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  Plus,
  Save,
  RefreshCw,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Circle,
  FolderGit2,
  Loader2,
  Sparkles,
  Zap,
  Info,
  Users,
  Shield,
  ChevronRight,
  UserPlus,
  Trash2,
  X,
  Check,
  Crown,
  User,
  Eye,
  ArrowRight,
  FileText,
  Paperclip,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import TaskNode from '../components/TaskNode';
import DeletableEdge from '../components/DeletableEdge';
import { TaskModal } from '../components/TaskModal';
import { TaskDrawer } from '../components/TaskDrawer';
import { WorkflowPermissionsModal } from '../components/WorkflowPermissionsModal';
import { ShareWorkflowModal } from '../components/ShareWorkflowModal';
import { WorkflowTransitionModal } from '../components/WorkflowTransitionModal';
import { TaskCompletionModal } from '../components/TaskCompletionModal';
import { WorkflowDocumentsTab } from '../components/WorkflowDocumentsTab';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

const nodeTypes = {
  taskNode: TaskNode,
};

const edgeTypes = {
  deletableEdge: DeletableEdge,
  default: DeletableEdge,
};

const defaultEdgeOptions = {
  type: 'deletableEdge',
  animated: true,
  style: {
    stroke: '#8B5CF6',
    strokeWidth: 2.5,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#8B5CF6',
  },
};

export const WorkflowBuilderPage = () => {
  const { id: workflowId } = useParams();
  const navigate = useNavigate();
  const { activeTeam, teamMembers, isAdmin, isManager, activeRole } = useTeam();
  const toast = useToast();


  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  const nodesRef = React.useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState('IN_PROGRESS');
  const [completingTask, setCompletingTask] = useState(null);
  const [isTaskCompletionModalOpen, setIsTaskCompletionModalOpen] = useState(false);
  const [topNotification, setTopNotification] = useState('');

  const handleInvitationSent = (invite) => {
    const name = invite?.invitedUser?.name || invite?.targetIdentifier || 'collaborator';
    setTopNotification(`Invitation sent successfully to ${name}!`);
    setTimeout(() => setTopNotification(''), 4500);
    loadWorkflowData(true); // Silent reload, no canvas unmounting / no page refresh!
  };

  // Handle edge/arrow deletion
  const handleDeleteEdge = useCallback(
    (edgeId) => {
      setEdges((eds) => {
        const next = eds.filter((e) => e.id !== edgeId);
        const currentNodes = nodesRef.current || [];
        api.put(`/workflows/${workflowId}/graph`, {
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { task: n.data.task },
          })),
          edges: next.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
          })),
        }).catch(console.warn);
        return next;
      });
      setSelectedEdge((prev) => (prev && prev.id === edgeId ? null : prev));
    },
    [workflowId, setEdges]
  );

  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  // Handle live task status updates directly from Node buttons or Drawer
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (newStatus === 'COMPLETED') {
      const node = nodes.find((n) => n.id === taskId);
      const targetTask = node?.data?.task || { id: taskId, workflowId };
      setCompletingTask(targetTask);
      setIsTaskCompletionModalOpen(true);
      return;
    }

    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      const updatedTask = res.data.data;

      // Update node in state
      setNodes((nds) => {
        const next = nds.map((node) => {
          if (node.id === taskId) {
            return {
              ...node,
              data: {
                ...node.data,
                task: updatedTask,
                onUpdateTaskStatus: handleUpdateTaskStatus,
                onEditTask: handleOpenDrawer,
              },
            };
          }
          return node;
        });

        setEdges((currentEdges) => {
          api.put(`/workflows/${workflowId}/graph`, {
            nodes: next.map((n) => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: { task: n.data.task },
            })),
            edges: currentEdges,
          }).catch(console.warn);
          return currentEdges;
        });

        return next;
      });

      // Also update selected task if open in drawer
      setSelectedTask((prev) => (prev && prev.id === taskId ? updatedTask : prev));
      toast.success('Task status updated!');
    } catch (err) {
      toast.error('Failed to update task status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTaskCompleted = (updatedTask) => {
    if (!updatedTask) return;
    const taskId = updatedTask.id;
    setNodes((nds) => {
      const next = nds.map((node) => {
        if (node.id === taskId) {
          return {
            ...node,
            data: {
              ...node.data,
              task: updatedTask,
              onUpdateTaskStatus: handleUpdateTaskStatus,
              onEditTask: handleOpenDrawer,
            },
          };
        }
        return node;
      });

      setEdges((currentEdges) => {
        api.put(`/workflows/${workflowId}/graph`, {
          nodes: next.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { task: n.data.task },
          })),
          edges: currentEdges,
        }).catch(console.warn);
        return currentEdges;
      });

      return next;
    });

    setSelectedTask((prev) => (prev && prev.id === taskId ? updatedTask : prev));
  };

  const [loadError, setLoadError] = useState(null);

  // Load Graph & Tasks from Supabase
  const loadWorkflowData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setLoadError(null);
      const res = await api.get(`/workflows/${workflowId}/graph`);
      const { workflow: wf, nodes: initialNodes, edges: initialEdges } = res.data.data;

      setWorkflow(wf);

      // Enhance node data with callback handlers
      const mappedNodes = (initialNodes || []).map((node) => ({
        ...node,
        type: 'taskNode',
        data: {
          ...node.data,
          onUpdateTaskStatus: handleUpdateTaskStatus,
          onEditTask: handleOpenDrawer,
        },
      }));

      // Enhance edges with deletableEdge type and delete callback
      const mappedEdges = (initialEdges || []).map((edge) => ({
        ...edge,
        sourceHandle: edge.sourceHandle || 'source-right',
        targetHandle: edge.targetHandle || 'target-left',
        type: 'deletableEdge',
        animated: true,
        data: {
          ...edge.data,
          onDeleteEdge: (edgeId) => handleDeleteEdge(edgeId),
        },
        style: { stroke: '#8B5CF6', strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#8B5CF6',
        },
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
    } catch (err) {
      console.error('Failed to load workflow graph:', err);
      setLoadError(err.message || 'Could not load workflow');
    } finally {
      setLoading(false);
    }
  }, [workflowId, handleDeleteEdge]);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData]);

  useEffect(() => {
    if (workflow?.name) {
      document.title = `${workflow.name} | Workflow Builder | FlowForge`;
    } else {
      document.title = 'Workflow Builder | FlowForge';
    }
  }, [workflow?.name]);

  const handleDrawerUpdate = async (taskId, taskUpdates) => {
    if (taskUpdates.status === 'COMPLETED') {
      const node = nodes.find((n) => n.id === taskId);
      const targetTask = node?.data?.task || { id: taskId, workflowId };
      setIsDrawerOpen(false);
      setCompletingTask(targetTask);
      setIsTaskCompletionModalOpen(true);
      return;
    }

    const res = await api.put(`/tasks/${taskId}`, taskUpdates);
    const updated = res.data.data;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === taskId) {
          return {
            ...node,
            data: {
              ...node.data,
              task: updated,
              onUpdateTaskStatus: handleUpdateTaskStatus,
              onEditTask: handleOpenDrawer,
            },
          };
        }
        return node;
      })
    );
    setSelectedTask(updated);
    toast.success('Task details updated!');
  };

  const handleDrawerDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setNodes((nds) => nds.filter((n) => n.id !== taskId));
      setEdges((eds) => eds.filter((e) => e.source !== taskId && e.target !== taskId));
      setIsDrawerOpen(false);
      setSelectedTask(null);
      toast.success('Task deleted from workflow.');
    } catch (e) {
      toast.error('Failed to delete task: ' + e.message);
    }
  };

  // Node Dragging and Connection Handlers
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        const newEdge = {
          ...params,
          id: `e_${params.source}_${params.target}_${Date.now()}`,
          type: 'deletableEdge',
          animated: true,
          data: {
            onDeleteEdge: (edgeId) => handleDeleteEdge(edgeId),
          },
          style: { stroke: '#8B5CF6', strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#8B5CF6',
          },
        };
        const next = addEdge(newEdge, eds);

        // Auto-save graph connections to Supabase
        const currentNodes = nodesRef.current || [];
        api.put(`/workflows/${workflowId}/graph`, {
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { task: n.data.task },
          })),
          edges: next.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
          })),
        }).catch(console.warn);

        return next;
      }),
    [workflowId, handleDeleteEdge, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge, newConnection) => {
      setEdges((els) => {
        const next = reconnectEdge(oldEdge, newConnection, els);
        const currentNodes = nodesRef.current || [];
        api.put(`/workflows/${workflowId}/graph`, {
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { task: n.data.task },
          })),
          edges: next.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
          })),
        }).catch(console.warn);
        return next;
      });
    },
    [workflowId, setEdges]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges) => {
      const deletedIds = new Set(deletedEdges.map((e) => e.id));
      setEdges((eds) => {
        const next = eds.filter((e) => !deletedIds.has(e.id));
        const currentNodes = nodesRef.current || [];
        api.put(`/workflows/${workflowId}/graph`, {
          nodes: currentNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { task: n.data.task },
          })),
          edges: next.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
          })),
        }).catch(console.warn);
        return next;
      });
      setSelectedEdge(null);
    },
    [workflowId, setEdges]
  );

  // Save Graph (Coordinates & Edges) to Supabase
  const handleSaveGraph = async () => {
    try {
      setSaving(true);
      setSaveMessage('');

      const cleanNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          task: n.data.task,
        },
      }));

      const cleanEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      }));

      await api.put(`/workflows/${workflowId}/graph`, {
        nodes: cleanNodes,
        edges: cleanEdges,
      });

      setSaveMessage('Saved to Supabase!');
      toast.success('Workflow canvas saved to Supabase!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      toast.error('Failed to save workflow graph: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Add New Task from Modal
  const handleCreateTask = async (taskData) => {
    try {
      const position = {
        x: 220 + (nodes.length % 3) * 280,
        y: 80 + Math.floor(nodes.length / 3) * 180,
      };

      const res = await api.post(`/workflows/${workflowId}/tasks`, {
        ...taskData,
        position,
      });

      const newTask = res.data.data;

      const newNode = {
        id: newTask.id,
        type: 'taskNode',
        position,
        data: {
          task: newTask,
          onUpdateTaskStatus: handleUpdateTaskStatus,
          onEditTask: handleOpenDrawer,
        },
      };

      const nextNodes = [...nodes, newNode];
      setNodes(nextNodes);
      toast.success(`Task "${newTask.title}" added to workflow!`);

      // Persist graph state immediately so it reflects across reloads
      try {
        await api.put(`/workflows/${workflowId}/graph`, {
          nodes: nextNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: { task: n.data.task },
          })),
          edges,
        });
      } catch (graphSaveErr) {
        console.warn('Auto-save graph warning:', graphSaveErr);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Failed to create task: ' + (err.response?.data?.error || err.message));
    }
  };

  // Auto-arrange nodes in a clean linear/branching DAG layout
  const handleAutoLayout = () => {
    if (nodes.length === 0) return;

    const updated = nodes.map((n, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      return {
        ...n,
        position: {
          x: 220 + (nodes.length > 4 ? col * 320 : 100),
          y: 60 + (nodes.length > 4 ? row * 220 : idx * 190),
        },
      };
    });

    setNodes(updated);
  };

  // Calculate dynamic progress in real time
  const { totalTasks, completedTasks, progressPercent } = useMemo(() => {
    const total = nodes.length;
    const completed = nodes.filter((n) => n.data?.task?.status === 'COMPLETED').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalTasks: total,
      completedTasks: completed,
      progressPercent: percent,
    };
  }, [nodes]);

  const canManageWorkflow = isAdmin || isManager || workflow?.userRole !== 'VIEWER';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B12] flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs">Loading workflow graph from Supabase...</p>
      </div>
    );
  }

  if (loadError || !workflow) {
    return (
      <div className="min-h-screen bg-[#080B12] flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="p-6 rounded-2xl sm:rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 shadow-2xl text-center max-w-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Workflow Unavailable</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {loadError || 'The requested workflow could not be loaded or you may not have permission to view it.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => loadWorkflowData()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              to="/workflows"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Workflows</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#080B12] overflow-hidden relative selection:bg-brand-500 selection:text-white">
      {/* Top Banner Notification */}
      {topNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-5 py-2.5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-md animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{topNotification}</span>
          <button
            onClick={() => setTopNotification('')}
            className="ml-2 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bar */}
      <header className="h-16 border-b border-white/10 bg-[#0D1220]/80 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between z-20 flex-shrink-0 gap-2">
        {/* Left: Back Link & Workflow Info */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <Link
            to="/workflows"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors flex-shrink-0"
            title="Back to Workflows"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="truncate">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mb-0.5">
              <span className="font-semibold text-brand-400 truncate max-w-[140px]">
                {activeTeam?.name || 'Team'}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
              <span className="text-slate-300 truncate max-w-[160px]">
                {workflow?.name || 'Workflow'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {workflow?.name || 'Workflow Builder'}
              </h2>
              <StatusBadge status={workflow?.status} size="xs" />
              {workflow?.isRestricted && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded font-mono">
                  Restricted
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Progress Bar Display */}
        <div className="hidden md:flex items-center space-x-3 bg-white/[0.035] px-4 py-1.5 rounded-xl border border-white/10 min-w-[260px]">
          <div className="w-full">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
              <span className="font-semibold text-slate-300">
                {completedTasks} / {totalTasks} tasks completed
              </span>
              <span className="font-mono font-bold text-emerald-400">{progressPercent}%</span>
            </div>
            <ProgressBar
              progress={progressPercent}
              showLabel={false}
              size="sm"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {saveMessage && (
            <span className="text-xs font-mono text-emerald-400 animate-fadeIn hidden sm:inline-flex items-center space-x-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{saveMessage}</span>
            </span>
          )}

          {/* User Workflow Role Badge */}
          {workflow?.userRole ? (
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border hidden md:inline-flex items-center space-x-1.5 ${
                workflow.userRole === 'ADMIN' || workflow.userRole === 'TEAM_ADMIN' || workflow.userRole === 'OWNER'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : workflow.userRole === 'MANAGER' || workflow.userRole === 'WORKFLOW_MANAGER' || workflow.userRole === 'TEAM_MANAGER'
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {workflow.userRole === 'ADMIN' || workflow.userRole === 'TEAM_ADMIN' || workflow.userRole === 'OWNER' ? (
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              ) : workflow.userRole === 'MANAGER' || workflow.userRole === 'WORKFLOW_MANAGER' || workflow.userRole === 'TEAM_MANAGER' ? (
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>
                {workflow.userRole === 'ADMIN' || workflow.userRole === 'TEAM_ADMIN' || workflow.userRole === 'OWNER'
                  ? (workflow.userRole === 'OWNER' ? 'OWNER' : 'ADMIN')
                  : workflow.userRole === 'MANAGER' || workflow.userRole === 'WORKFLOW_MANAGER' || workflow.userRole === 'TEAM_MANAGER'
                  ? 'MANAGER'
                  : 'MEMBER'}
              </span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono hidden md:inline">
              {activeRole?.replace('TEAM_', '') || 'MEMBER'}
            </span>
          )}

          {/* Reload Button */}
          <button
            onClick={loadWorkflowData}
            title="Reload from Supabase"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Shared Workflow Documents Button */}
          <button
            onClick={() => setIsDocumentsOpen(true)}
            title="View & Attach Workflow Documents"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Documents</span>
          </button>

          {canManageWorkflow ? (
            <>
              {/* Optional Transition to In Progress */}
              {workflow?.status !== 'IN_PROGRESS' && workflow?.status !== 'ACTIVE' && (
                <button
                  onClick={() => {
                    setTransitionTarget('IN_PROGRESS');
                    setIsTransitionModalOpen(true);
                  }}
                  title="Move Workflow to In Progress (Optional Attachment)"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">In Progress</span>
                </button>
              )}

              {/* Mandatory Transition to Completed (>= 25 words + doc) */}
              {workflow?.status !== 'COMPLETED' && (
                <button
                  onClick={() => {
                    setTransitionTarget('COMPLETED');
                    setIsTransitionModalOpen(true);
                  }}
                  title="Complete Workflow (Requires >= 25 words description & document attachment)"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Complete</span>
                </button>
              )}

              {/* Invite Collaborator Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                title="Invite Collaborators to Workflow"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-brand-300 border border-brand-500/30 text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">Invite</span>
              </button>

              {/* Team & Permissions Button */}
              <button
                onClick={() => setIsPermissionsOpen(true)}
                title="Manage Workflow Team & Permissions"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">Access</span>
              </button>

              <button
                onClick={handleAutoLayout}
                title="Auto Align Nodes"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl border border-white/10 transition-colors hidden sm:inline-flex"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-brand-300 hover:text-brand-200 border border-brand-500/30 text-xs font-semibold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4 text-brand-400" />
                <span className="hidden sm:inline">Add Task</span>
              </button>

              <button
                onClick={handleSaveGraph}
                disabled={saving}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Workflow'}</span>
              </button>
            </>
          ) : (
            <span className="px-2.5 py-1 bg-white/[0.04] text-slate-400 border border-white/10 rounded-xl text-xs font-medium hidden sm:inline-flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Member View</span>
            </span>
          )}
        </div>
      </header>

      {/* Main React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodesDraggable={canManageWorkflow}
          nodesConnectable={canManageWorkflow}
          edgesReconnectable={canManageWorkflow}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
          onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgesDelete={onEdgesDelete}
          onEdgeClick={(_e, edge) => setSelectedEdge(edge)}
          onPaneClick={() => setSelectedEdge(null)}
          deleteKeyCode={['Backspace', 'Delete']}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-[#080B12]"
        >
          <Background color="rgba(255,255,255,0.06)" gap={24} size={1} />
          <Controls className="!bg-[#0D1220]/90 !backdrop-blur-xl !border-white/10 !rounded-xl !shadow-2xl overflow-hidden [&>button]:!bg-[#0D1220] [&>button]:!border-white/10 [&>button]:!text-slate-300 hover:[&>button]:!text-white" />
          <MiniMap
            nodeColor={(node) => {
              if (node.data?.task?.status === 'COMPLETED') return '#34D399';
              if (node.data?.task?.status === 'IN_PROGRESS') return '#8B5CF6';
              return '#475569';
            }}
            maskColor="rgba(8, 11, 18, 0.75)"
            className="!bg-[#0D1220]/90 !backdrop-blur-xl !border-white/10 !rounded-xl !shadow-2xl overflow-hidden"
          />
        </ReactFlow>

        {/* Selected Arrow Floating Action Toolbar */}
        {selectedEdge && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 px-4 py-2.5 bg-[#0D1220]/95 border border-brand-500/40 rounded-2xl shadow-2xl backdrop-blur-2xl animate-fadeIn">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <span className="text-slate-400 font-medium">Wrong connection?</span>
              <span className="font-semibold text-brand-300 max-w-[120px] truncate">
                {nodes.find((n) => n.id === selectedEdge.source)?.data?.task?.title || 'Source'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="font-semibold text-brand-300 max-w-[120px] truncate">
                {nodes.find((n) => n.id === selectedEdge.target)?.data?.task?.title || 'Target'}
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <button
              type="button"
              onClick={() => handleDeleteEdge(selectedEdge.id)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Connection</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEdge(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Empty State Banner if no tasks exist */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-6 rounded-2xl sm:rounded-3xl bg-[#0D1220]/90 border border-white/10 shadow-2xl text-center space-y-3 pointer-events-auto max-w-sm backdrop-blur-2xl">
              <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No tasks in this workflow</h3>
              <p className="text-xs text-slate-400">
                Click "Add Task" to start placing task nodes onto the canvas and connect dependencies.
              </p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Task</span>
              </button>
            </div>
          </div>
        )}

        {/* Canvas Instructions Floating Pill */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-[#0D1220]/80 border border-white/10 rounded-xl text-[11px] text-slate-400 backdrop-blur-md pointer-events-none">
          <Info className="w-3.5 h-3.5 text-brand-400" />
          <span className="flex items-center space-x-1">
            <span>Tip: Drag handles to connect tasks. Click</span>
            <X className="w-3 h-3 text-rose-400 inline" />
            <span>on arrow, or select & press Delete to remove connections.</span>
          </span>
        </div>

        {/* Task Details Side Drawer */}
        <TaskDrawer
          task={selectedTask}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedTask(null);
          }}
          onUpdate={handleDrawerUpdate}
          onDelete={handleDrawerDelete}
          teamMembers={teamMembers}
        />
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleCreateTask}
        selectedWorkflowId={workflowId}
        workflowName={workflow?.name}
        workflows={workflow ? [workflow] : []}
        teamMembers={teamMembers}
      />

      {/* Workflow Team & Permissions Modal */}
      <WorkflowPermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => {
          setIsPermissionsOpen(false);
          loadWorkflowData(true);
        }}
        workflowId={workflowId}
        workflowName={workflow?.name}
        currentUserRole={workflow?.userRole}
      />

      {/* Share / Invite Collaborator Modal */}
      {isShareModalOpen && workflow && (
        <ShareWorkflowModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          workflow={workflow}
          onInvitationSent={handleInvitationSent}
        />
      )}

      {/* Workflow Transition Lifecycle Modal */}
      {isTransitionModalOpen && workflow && (
        <WorkflowTransitionModal
          isOpen={isTransitionModalOpen}
          onClose={() => setIsTransitionModalOpen(false)}
          workflow={workflow}
          targetStatus={transitionTarget}
          onSuccess={(res) => {
            setWorkflow((prev) => ({
              ...prev,
              status: res.status,
            }));
            loadWorkflowData(true);
          }}
        />
      )}

      {/* Shared Workflow Documents Modal */}
      {isDocumentsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-[#10141D] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsDocumentsOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <WorkflowDocumentsTab workflowId={workflowId} isManager={canManageWorkflow} />
          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {isTaskCompletionModalOpen && completingTask && (
        <TaskCompletionModal
          isOpen={isTaskCompletionModalOpen}
          onClose={() => {
            setIsTaskCompletionModalOpen(false);
            setCompletingTask(null);
          }}
          task={completingTask}
          onSuccess={handleTaskCompleted}
        />
      )}
    </div>
  );
};
