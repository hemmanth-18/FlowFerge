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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskModal } from '../components/TaskModal';
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
  }, [activeTeam, currentView]);

  useEffect(() => {
    fetchTasksAndWorkflows();
  }, [fetchTasksAndWorkflows]);

  const handleSaveTask = async (taskData) => {
    try {
      const isEdit = Boolean(editingTask);
      if (isEdit) {
        await api.put(`/tasks/${editingTask.id}`, taskData);
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
    <div className="min-h-screen bg-dark-950 pb-16">
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Task</span>
            </button>
          )
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* View Switcher Tabs: My Tasks vs Team Tasks */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2 bg-dark-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSearchParams({ view: 'mine' })}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'mine'
                  ? 'bg-brand-600 text-white shadow-glow-brand'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>My Tasks</span>
            </button>

            {isManager && (
              <button
                onClick={() => setSearchParams({ view: 'team' })}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'team'
                    ? 'bg-brand-600 text-white shadow-glow-brand'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Team Tasks (Manager View)</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Team: <span className="font-semibold text-slate-200">{activeTeam?.name}</span> • Role:{' '}
            <span className="font-mono text-brand-400">{activeRole}</span>
          </div>
        </div>

        {/* 12. Filters Bar */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-dark-850 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Workflow Filter */}
            <select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              className="px-3 py-2 bg-dark-850 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Workflows</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-dark-850 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-dark-850 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Assignee Filter (in Team Tasks view) */}
            {currentView === 'team' && (
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 bg-dark-850 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Assignees</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Task Cards / Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading tasks from Supabase...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
            <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">No tasks found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {currentView === 'mine'
                ? "You don't have any tasks matching these filters in this team."
                : "No tasks found across the team's workflows."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Completion Checkbox & Info */}
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickStatusChange(
                        task.id,
                        task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
                      )
                    }
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500 border-emerald-500 text-dark-950 shadow-glow-emerald'
                        : 'border-slate-600 hover:border-emerald-400 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          task.status === 'COMPLETED'
                            ? 'line-through text-slate-500'
                            : 'text-slate-100 group-hover:text-brand-300'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <Link
                        to={`/workflows/${task.workflowId}`}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-dark-800 text-slate-400 hover:text-brand-400 border border-slate-700 transition-colors inline-flex items-center space-x-1"
                      >
                        <span>{task.workflowName || 'Workflow'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-300 font-medium">
                          {task.assignedTo || 'Unassigned'}
                        </span>
                      </span>

                      {task.dueDate && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span
                            className={
                              new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                                ? 'text-rose-400 font-semibold'
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
                <div className="flex items-center space-x-3 self-end md:self-center">
                  <PriorityBadge priority={task.priority} size="sm" />
                  <StatusBadge status={task.status} size="sm" />

                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isManager && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-dark-800 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
};

export default TasksPage;
