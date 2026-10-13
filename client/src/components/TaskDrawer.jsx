import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CheckCircle2, Clock, Circle, Trash2, Save, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

export const TaskDrawer = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'TODO');
      setPriority(task.priority || 'MEDIUM');
      setDueDate(task.dueDate || '');
      setAssignedTo(task.assignedTo || '');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = async () => {
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
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      await onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-dark-900 border-l border-slate-800 shadow-2xl z-30 flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-dark-850">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Node Details
          </span>
          <h4 className="text-sm font-semibold text-slate-200 truncate max-w-[220px]">
            {task.title}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Assigned To</label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 text-xs text-slate-500 space-y-1">
          <p>ID: <span className="font-mono text-slate-400">{task.id}</span></p>
          <p>Created: {new Date(task.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-dark-850 flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
          title="Delete task node"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-glow-brand transition-all disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Apply Changes'}</span>
        </button>
      </div>
    </div>
  );
};
