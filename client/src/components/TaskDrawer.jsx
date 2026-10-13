import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CheckCircle2, Clock, Circle, Trash2, Save, ExternalLink, Lock, ShieldAlert } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { api } from '../services/api';

export const TaskDrawer = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  teamMembers: passedTeamMembers = null,
}) => {
  const { user } = useAuth();
  const { activeTeam, isAdmin, isManager } = useTeam();
  const [teamMembers, setTeamMembers] = useState(passedTeamMembers || []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('Unassigned');
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'TODO');
      setPriority(task.priority || 'MEDIUM');
      setDueDate(task.dueDate || '');
      setAssignedTo(task.assignedTo || 'Unassigned');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const rawAssignee = assignedTo || task?.assignedTo || '';
  const isAssignedToMe = Boolean(
    user && rawAssignee && (
      rawAssignee === user.name ||
      rawAssignee === user.username ||
      rawAssignee === user.id ||
      rawAssignee === user.email ||
      rawAssignee === `@${user.username}` ||
      (user.name && rawAssignee.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
      (user.username && rawAssignee.toLowerCase().trim() === user.username.toLowerCase().trim())
    )
  );

  const canManageTask = isAdmin || isManager;
  const canEditTask = canManageTask || isAssignedToMe;

  const handleSave = async () => {
    if (!canEditTask) {
      alert('Access denied: You can only update tasks assigned to you.');
      return;
    }
    try {
      setIsSaving(true);
      await onUpdate(task.id, {
        title,
        description,
        status,
        priority,
        dueDate,
        assignedTo,
      });
      setIsSaving(false);
      onClose();
    } catch (e) {
      setIsSaving(false);
      alert('Error updating task: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!canManageTask) {
      alert('Access denied: Only Team Admins and Managers can delete tasks.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      await onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-[#0D1220]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-30 flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-brand-300">
            Node Details
          </span>
          <h4 className="text-sm font-semibold text-white truncate max-w-[220px]">
            {task.title}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Permission Notice */}
        {!canEditTask ? (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start space-x-2.5">
            <Lock className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <strong>View-Only Task:</strong> Assigned to <span className="font-semibold text-white">{task.assignedTo || 'another member'}</span>. As a team member, you can view the workflow and team, but can only access and update tasks assigned to you.
            </div>
          </div>
        ) : isAssignedToMe && !canManageTask ? (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>Assigned to you: You can update status and deliverable notes.</span>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
          <input
            type="text"
            value={title}
            disabled={!canManageTask}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#111827] border border-white/15 rounded-xl text-sm text-slate-100 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            disabled={!canEditTask}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#111827] border border-white/15 rounded-xl text-sm text-slate-100 focus:border-brand-500 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
            <select
              value={status}
              disabled={!canEditTask}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#111827] border border-white/15 rounded-xl text-xs text-slate-100 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="TODO" className="bg-[#111827] text-slate-100">TODO</option>
              <option value="IN_PROGRESS" className="bg-[#111827] text-slate-100">IN_PROGRESS</option>
              <option value="COMPLETED" className="bg-[#111827] text-slate-100">COMPLETED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
            <select
              value={priority}
              disabled={!canManageTask}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-[#111827] border border-white/15 rounded-xl text-xs text-slate-100 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="LOW" className="bg-[#111827] text-slate-100">LOW</option>
              <option value="MEDIUM" className="bg-[#111827] text-slate-100">MEDIUM</option>
              <option value="HIGH" className="bg-[#111827] text-slate-100">HIGH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
            <span>Assigned To</span>
            <span className="text-[10px] text-brand-400 font-mono">Team-Scoped</span>
          </label>
          <select
            value={assignedTo || 'Unassigned'}
            disabled={!canManageTask}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 bg-[#111827] border border-white/15 rounded-xl text-xs text-slate-100 focus:border-brand-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="Unassigned" className="bg-[#111827] text-slate-100">Unassigned</option>
            {assignedTo && assignedTo !== 'Unassigned' && !teamMembers.some((m) => (m.name || m.username) === assignedTo) && (
              <option value={assignedTo} className="bg-[#111827] text-slate-100">
                {assignedTo}
              </option>
            )}
            {teamMembers.map((m) => {
              const name = m.name || m.username || 'User';
              const role = m.role ? m.role.replace('TEAM_', '') : 'Member';
              return (
                <option key={m.id || m.userId || name} value={name} className="bg-[#111827] text-slate-100">
                  {name} ({role})
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            disabled={!canManageTask}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#111827] border border-white/15 rounded-xl text-sm text-slate-100 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="pt-2 text-xs text-slate-500 space-y-1">
          <p>ID: <span className="font-mono text-slate-400">{task.id}</span></p>
          <p>Created: {new Date(task.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
        {canManageTask ? (
          <button
            onClick={handleDelete}
            className="p-2 text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-xl transition-colors"
            title="Delete task node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-[11px] text-slate-500 font-mono">Member View</div>
        )}

        {canEditTask && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Apply Changes'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
