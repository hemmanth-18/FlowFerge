import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Loader2, Trash2, Users, ShieldAlert } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { api } from '../services/api';

export const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete = null,
  initialData = null,
  workflows = [],
  selectedWorkflowId = null,
  workflowName = '',
  teamMembers: passedTeamMembers = null,
}) => {
  const { activeTeam, activeRole, isAdmin, isManager } = useTeam();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('Unassigned');
  const [workflowId, setWorkflowId] = useState(selectedWorkflowId || '');
  const [teamMembers, setTeamMembers] = useState(passedTeamMembers || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch team members for the assignee dropdown if not provided
  useEffect(() => {
    if (isOpen) {
      if (passedTeamMembers && passedTeamMembers.length > 0) {
        setTeamMembers(passedTeamMembers);
      } else if (activeTeam?.id) {
        api.get(`/teams/${activeTeam.id}/members`)
          .then((res) => {
            const list = res.data.data || [];
            if (list.length > 0) setTeamMembers(list);
          })
          .catch((err) => console.error('Failed to load team members for task assignment:', err));
      } else {
        // Fallback search users
        api.get('/users/search?q=')
          .then((res) => {
            const list = res.data.data || [];
            if (list.length > 0) {
              setTeamMembers(list.map((u) => ({ id: u.id, name: u.name, role: u.role || 'MEMBER' })));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, activeTeam?.id, passedTeamMembers]);

  // Reset form state ONLY when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setStatus(initialData.status || 'TODO');
        setPriority(initialData.priority || 'MEDIUM');
        setDueDate(initialData.dueDate ? initialData.dueDate.split('T')[0] : '');
        setAssignedTo(initialData.assignedTo || 'Unassigned');
        setWorkflowId(initialData.workflowId || selectedWorkflowId || '');
      } else {
        setTitle('');
        setDescription('');
        setStatus('TODO');
        setPriority('MEDIUM');
        setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
        setAssignedTo('Unassigned');
        setWorkflowId(selectedWorkflowId || (workflows && workflows[0]?.id ? workflows[0].id : ''));
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title');
      return;
    }

    const targetWorkflowId = workflowId || selectedWorkflowId || initialData?.workflowId;
    if (!targetWorkflowId && !initialData) {
      setError('Please select a workflow for this task');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const saveHandler = onSave || onSubmit;
      if (typeof saveHandler === 'function') {
        await saveHandler({
          workflowId: targetWorkflowId,
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          dueDate,
          assignedTo,
        });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !initialData) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        setLoading(true);
        await onDelete(initialData.id);
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to delete task');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-dark-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {initialData ? 'Edit Task Details' : 'Create Team Task'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTeam?.name || 'Team Workflow Task'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Target Workflow (if creating) */}
          {!initialData && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Workflow <span className="text-rose-400">*</span>
              </label>
              {selectedWorkflowId ? (
                <div className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-brand-300 truncate">
                    {workflowName || (workflows.find((w) => w.id === selectedWorkflowId)?.name) || 'Current Workflow'}
                  </span>
                  <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-mono flex-shrink-0 ml-2">
                    Builder Active
                  </span>
                </div>
              ) : (
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                  required
                >
                  <option value="" disabled>Select target workflow</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Implement Team Switcher Component"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Task instructions, dependencies, and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs resize-none"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
              />
            </div>

            {/* Task Assignee Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Assignee</span>
                <span className="text-[10px] text-brand-400 font-mono">Team-Scoped</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
              >
                <option value="Unassigned">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id || m.userId || m.name} value={m.name || m.username}>
                    {m.name || m.username} ({m.role ? m.role.replace('TEAM_', '') : 'Member'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-glow-brand transition-all disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{initialData ? 'Save Changes' : 'Create Task'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
