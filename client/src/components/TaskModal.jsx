import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Loader2,
  Trash2,
  Users,
  ShieldAlert,
  Paperclip,
  UploadCloud,
  CheckCircle2,
  Check,
  File,
  AlertCircle,
} from 'lucide-react';
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
  const [completionDescription, setCompletionDescription] = useState('');
  const [file, setFile] = useState(null);
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

  const completionWordCount = useMemo(() => {
    return (completionDescription || description || '').trim().split(/\s+/).filter(Boolean).length;
  }, [completionDescription, description]);

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
        setCompletionDescription(initialData.completionDescription || '');
        setFile(null);
      } else {
        setTitle('');
        setDescription('');
        setStatus('TODO');
        setPriority('MEDIUM');
        setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
        setAssignedTo('Unassigned');
        setWorkflowId(selectedWorkflowId || (workflows && workflows[0]?.id ? workflows[0].id : ''));
        setCompletionDescription('');
        setFile(null);
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

    if (status === 'COMPLETED') {
      const words = (completionDescription || description || '').trim().split(/\s+/).filter(Boolean);
      if (words.length < 15) {
        setError(`A completion description of at least 15 words is required to mark this task as completed (currently ${words.length} words).`);
        return;
      }
      if (!file && !initialData?.documentId) {
        setError('A supporting deliverable document (.pdf, .doc, .docx) is mandatory to complete this task.');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      const saveHandler = onSave || onSubmit;
      if (typeof saveHandler === 'function') {
        const payload = {
          workflowId: targetWorkflowId,
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          dueDate,
          assignedTo,
        };
        if (status === 'COMPLETED') {
          payload.completionDescription = (completionDescription || description).trim();
          if (file) payload.file = file;
        }
        await saveHandler(payload);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/80 p-5 sm:p-6 relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialData ? 'Edit Task Details' : 'Create Team Task'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTeam?.name || 'Team Workflow Task'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
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
                <div className="w-full px-3.5 py-2.5 bg-white/[0.045] border border-white/10 rounded-xl text-slate-200 text-xs flex items-center justify-between">
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
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-xs"
                  required
                >
                  <option value="" disabled className="bg-[#111827]">Select target workflow</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id} className="bg-[#111827]">
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
              className="w-full px-3.5 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none text-sm transition-all"
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
              className="w-full px-3.5 py-2 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none text-xs resize-none transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-xs"
              >
                <option value="TODO" className="bg-[#111827]">TODO</option>
                <option value="IN_PROGRESS" className="bg-[#111827]">IN_PROGRESS</option>
                <option value="COMPLETED" className="bg-[#111827]">COMPLETED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-xs"
              >
                <option value="LOW" className="bg-[#111827]">LOW</option>
                <option value="MEDIUM" className="bg-[#111827]">MEDIUM</option>
                <option value="HIGH" className="bg-[#111827]">HIGH</option>
              </select>
            </div>
          </div>

          {/* Deliverable & 15-word Description Requirements (Visible when COMPLETED) */}
          {status === 'COMPLETED' && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Completion Deliverables</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center space-x-1 ${
                    completionWordCount >= 15
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {completionWordCount >= 15 ? (
                    <Check className="w-2.5 h-2.5 inline mr-0.5" />
                  ) : (
                    <AlertCircle className="w-2.5 h-2.5 inline mr-0.5" />
                  )}
                  <span>{completionWordCount} / 15 words</span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverable Summary (Min. 15 words) <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={completionDescription}
                  onChange={(e) => setCompletionDescription(e.target.value)}
                  placeholder="Summarize the completed deliverables and work output (minimum 15 words required)..."
                  className="w-full px-3 py-2 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                />
                <p className="text-[10px] mt-1 text-slate-400">
                  {completionWordCount < 15 ? (
                    <span className="text-amber-400">
                      ⚠️ Need {15 - completionWordCount} more word{15 - completionWordCount === 1 ? '' : 's'}.
                    </span>
                  ) : (
                    <span className="text-emerald-400">✓ Description requirement satisfied.</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverable Document (.pdf, .doc, .docx) <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    id="task-modal-file-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600/20 file:text-emerald-300 hover:file:bg-emerald-600/30 cursor-pointer"
                  />
                  {initialData?.documentName && !file && (
                    <span className="text-[11px] text-cyan-400 flex items-center space-x-1">
                      <Paperclip className="w-3 h-3" />
                      <span>Current: {initialData.documentName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-xs transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-xs"
              >
                <option value="Unassigned" className="bg-[#111827]">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id || m.userId || m.name} value={m.name || m.username} className="bg-[#111827]">
                    {m.name || m.username} ({m.role ? m.role.replace('TEAM_', '') : 'Member'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            ) : <div />}

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
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
