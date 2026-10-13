import React, { useState, useEffect } from 'react';
import { X, FolderGit2, Loader2 } from 'lucide-react';

export const WorkflowModal = ({ isOpen, onClose, onSave, onSubmit, initialData = null }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setStatus(initialData.status || 'ACTIVE');
      } else {
        setName('');
        setDescription('');
        setStatus('ACTIVE');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a workflow name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const saveHandler = onSave || onSubmit;
      if (typeof saveHandler === 'function') {
        await saveHandler({
          name: name.trim(),
          description: description.trim(),
          status,
        });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-dark-900 border border-slate-800 rounded-2xl shadow-card-dark overflow-hidden relative z-50 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-100">
              {initialData ? 'Edit Workflow' : 'Create New Workflow'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="wf-name-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Workflow Name <span className="text-brand-400">*</span>
            </label>
            <input
              id="wf-name-input"
              type="text"
              autoFocus
              required
              placeholder="e.g. College Event Management"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all cursor-text"
            />
          </div>

          <div>
            <label htmlFor="wf-desc-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="wf-desc-input"
              rows={3}
              placeholder="Describe the workflow goals and overall objective..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <span>{initialData ? 'Update Workflow' : 'Create Workflow'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
