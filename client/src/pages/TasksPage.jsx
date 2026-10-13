import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useSearchParams, Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  Shield,
  ListTodo,
  Paperclip,
  FileText,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskModal } from '../components/TaskModal';
import { TaskCompletionModal } from '../components/TaskCompletionModal';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const TasksPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager } = useTeam();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  usePageMeta('Tasks & Board', 'View, prioritize, and track task execution across workflows and team assignments.');


  const currentView = searchParams.get('view') || (isManager ? 'team' : 'mine');

  const [tasks, setTasks] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [workflowFilter, setWorkflowFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  const fetchTasksAndWorkflows = useCallback(async () => {
    if (!activeTeam) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const isMine = currentView === 'mine';
      const [tasksRes, wfRes, membersRes] = await Promise.all([
        api.get(`/tasks?teamId=${activeTeam.id}&mine=${isMine}`),
        api.get(`/workflows?teamId=${activeTeam.id}`),
        api.get(`/teams/${activeTeam.id}/members`),
      ]);

      setTasks(tasksRes.data.data || []);
      setWorkflows(wfRes.data.data || []);
      setTeamMembers(membersRes.data.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTeam?.id, currentView]);

  useEffect(() => {
    fetchTasksAndWorkflows();
  }, [fetchTasksAndWorkflows]);

  const handleSaveTask = async (taskData) => {
    try {
      const isEdit = Boolean(editingTask);
      if (isEdit) {
        if (taskData instanceof FormData) {
          await api.put(`/tasks/${editingTask.id}`, taskData);
        } else if (taskData?.file) {
          const fd = new FormData();
          Object.entries(taskData).forEach(([k, v]) => {
            if (v !== undefined && v !== null) fd.append(k, v);
          });
          await api.put(`/tasks/${editingTask.id}`, fd);
        } else {
          await api.put(`/tasks/${editingTask.id}`, taskData);
        }
      } else {
        await api.post(`/workflows/${taskData.workflowId}/tasks`, {
          ...taskData,
          teamId: activeTeam.id,
        });
      }
      toast.success(isEdit ? 'Task updated successfully!' : 'Task created successfully!');
      fetchTasksAndWorkflows();
      setEditingTask(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully.');
      fetchTasksAndWorkflows();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      toast.success(`Task status changed to ${newStatus.replace('_', ' ')}!`);
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleDoneClick = (task) => {
    if (task.status === 'COMPLETED') {
      handleQuickStatusChange(task.id, 'IN_PROGRESS');
    } else {
      setCompletingTask(task);
      setIsCompletionModalOpen(true);
    }
  };

  const handleDownloadTaskDocument = async (task) => {
    try {
      const res = await api.get(`/tasks/${task.id}/document`);
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      } else if (res.data?.data?.fileName) {
        toast.info(`Deliverable: ${res.data.data.fileName}`);
      }
    } catch (err) {
      toast.error('Failed to download deliverable: ' + (err.message || 'File not available'));
    }
  };

  // Filter tasks based on search & criteria
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesWorkflow = workflowFilter === 'ALL' || t.workflowId === workflowFilter;
    const matchesAssignee = assigneeFilter === 'ALL' || t.assignedTo === assigneeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesWorkflow && matchesAssignee;
  });

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] pb-16 selection:bg-purple-600 selection:text-white">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={currentView === 'mine' ? 'My Tasks' : `${activeTeam?.name || 'Team'} Tasks`}
        actions={
          isManager && (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Task</span>
            </button>
          )
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* View Switcher Tabs: My Tasks vs Team Tasks */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div className="flex items-center space-x-1.5 bg-white/[0.045] p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-inner">
            <button
              onClick={() => setSearchParams({ view: 'mine' })}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentView === 'mine'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>My Tasks</span>
            </button>

            {isManager && (
              <button
                onClick={() => setSearchParams({ view: 'team' })}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentView === 'team'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Team Tasks (Manager View)</span>
              </button>
            )}
          </div>

          <div className="text-xs text-[#CBD5E1]">
            Team: <span className="font-semibold text-white">{activeTeam?.name}</span> • Role:{' '}
            <span className="font-mono text-[#A78BFA]">{activeRole}</span>
          </div>
        </div>

        {/* 12. Filters Bar */}
        <div className="p-4 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/25 transition-all shadow-inner backdrop-blur-md"
            />
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Workflow Filter */}
            <select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.07] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none cursor-pointer backdrop-blur-md transition-all"
            >
              <option value="ALL" className="bg-[#0D1220] text-white">All Workflows</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id} className="bg-[#0D1220] text-white">
                  {w.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.07] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none cursor-pointer backdrop-blur-md transition-all"
            >
              <option value="ALL" className="bg-[#0D1220] text-white">All Statuses</option>
              <option value="TODO" className="bg-[#0D1220] text-white">TODO</option>
              <option value="IN_PROGRESS" className="bg-[#0D1220] text-white">IN_PROGRESS</option>
              <option value="COMPLETED" className="bg-[#0D1220] text-white">COMPLETED</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.07] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none cursor-pointer backdrop-blur-md transition-all"
            >
              <option value="ALL" className="bg-[#0D1220] text-white">All Priorities</option>
              <option value="HIGH" className="bg-[#0D1220] text-white">High Priority</option>
              <option value="MEDIUM" className="bg-[#0D1220] text-white">Medium Priority</option>
              <option value="LOW" className="bg-[#0D1220] text-white">Low Priority</option>
            </select>

            {/* Assignee Filter (in Team Tasks view) */}
            {currentView === 'team' && (
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.07] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none cursor-pointer backdrop-blur-md transition-all"
              >
                <option value="ALL" className="bg-[#0D1220] text-white">All Assignees</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name} className="bg-[#0D1220] text-white">
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Task Cards / Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-white/[0.035] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
            <CheckSquare className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">No tasks found</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              {currentView === 'mine'
                ? "You don't have any tasks matching these filters in this team."
                : "No tasks found across the team's workflows."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const rawAssignee = task.assignedTo ? String(task.assignedTo).toLowerCase().trim() : '';
              const isAssignedToUser = Boolean(
                user && rawAssignee && (
                  rawAssignee === user.id.toLowerCase().trim() ||
                  (user.name && rawAssignee === user.name.toLowerCase().trim()) ||
                  (user.username && rawAssignee === user.username.toLowerCase().trim()) ||
                  (user.email && rawAssignee === user.email.toLowerCase().trim()) ||
                  (user.username && rawAssignee === `@${user.username.toLowerCase().trim()}`)
                )
              );
              const canAccessTask = isManager || isAdmin || isAssignedToUser;

              return (
                <div
                  key={task.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 backdrop-blur-xl transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left: Completion Checkbox & Info */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      disabled={!canAccessTask}
                      onClick={() => handleDoneClick(task)}
                      title={
                        !canAccessTask
                          ? `View-Only: Assigned to ${task.assignedTo || 'another member'}`
                          : task.status === 'COMPLETED'
                          ? 'Click to mark In Progress'
                          : 'Done (Click to complete task & upload deliverable)'
                      }
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        !canAccessTask
                          ? 'opacity-40 cursor-not-allowed border-slate-600 text-slate-600'
                          : task.status === 'COMPLETED'
                          ? 'bg-[#34D399] border-[#34D399] text-black shadow-md cursor-pointer'
                          : 'border-slate-500 hover:border-[#34D399] text-transparent cursor-pointer'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            task.status === 'COMPLETED'
                              ? 'line-through text-slate-400'
                              : 'text-[#F8FAFC] group-hover:text-[#A78BFA]'
                          }`}
                        >
                          {task.title}
                        </h4>
                        <Link
                          to={`/workflows/${task.workflowId}`}
                          className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-[#CBD5E1] hover:text-purple-300 border border-white/10 transition-colors inline-flex items-center space-x-1 backdrop-blur-sm"
                        >
                          <span>{task.workflowName || 'Workflow'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>

                        {/* Attached Document Pill if available */}
                        {(task.documentName || task.documentId) && (
                          <button
                            type="button"
                            onClick={() => handleDownloadTaskDocument(task)}
                            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-300 hover:bg-purple-500/25 transition-all cursor-pointer backdrop-blur-sm"
                            title="Download attached deliverable document"
                          >
                            <Paperclip className="w-3 h-3 text-purple-400" />
                            <span className="max-w-[140px] truncate">
                              {task.documentName || 'Deliverable Doc'}
                            </span>
                          </button>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#CBD5E1] mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      {/* Completion Deliverable Notes */}
                      {task.completionDescription && (
                        <div className="mt-2 text-[11px] text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/25 rounded-2xl p-2.5 flex items-start space-x-2 backdrop-blur-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-semibold text-white">Completion Notes: </span>
                            <span className="text-[#CBD5E1]">{task.completionDescription}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-[#CBD5E1] font-medium">
                            {task.assignedTo || 'Unassigned'}
                          </span>
                        </span>

                        {task.dueDate && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span
                              className={
                                new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                                  ? 'text-[#FB7185] font-semibold'
                                  : 'text-slate-400'
                              }
                            >
                              Due {task.dueDate}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Actions */}
                  <div className="flex items-center space-x-2 sm:space-x-3 self-end md:self-center flex-wrap gap-y-1.5">
                    <PriorityBadge priority={task.priority} size="sm" />
                    <StatusBadge status={task.status} size="sm" />

                    {/* Explicit Done Task Button */}
                    {task.status !== 'COMPLETED' && canAccessTask && (
                      <button
                        type="button"
                        onClick={() => handleDoneClick(task)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#34D399]/15 hover:bg-[#34D399] hover:text-black text-[#34D399] border border-[#34D399]/30 text-xs font-semibold transition-all cursor-pointer shadow-sm backdrop-blur-sm"
                        title="Done (Upload deliverable & 15-word description)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    )}

                    <div className="flex items-center space-x-1 pl-2 border-l border-white/10">
                      {canAccessTask ? (
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span
                          className="p-1.5 text-slate-500 cursor-not-allowed"
                          title="View-Only: You can only edit tasks assigned to you"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        </span>
                      )}

                      {isManager && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-[#FB7185] hover:bg-white/[0.08] rounded-xl transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialData={editingTask}
        workflows={workflows}
        teamMembers={teamMembers}
      />

      {/* Task Completion Modal (Mandatory Deliverable Upload & 15 words) */}
      <TaskCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => {
          setIsCompletionModalOpen(false);
          setCompletingTask(null);
        }}
        task={completingTask}
        onSuccess={(updatedTask) => {
          if (updatedTask) {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            );
          }
          fetchTasksAndWorkflows();
        }}
      />
    </div>
  );
};

export default TasksPage;
