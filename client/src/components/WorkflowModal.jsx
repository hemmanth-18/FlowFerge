import React, { useState, useEffect } from 'react';
import { X, FolderGit2, Loader2, Users, ChevronDown, AlertCircle } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

export const WorkflowModal = ({ isOpen, onClose, onSave, onSubmit, initialData = null }) => {
  const { activeTeam, teams } = useTeam();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [teamId, setTeamId] = useState(initialData?.teamId || activeTeam?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setStatus(initialData.status || 'ACTIVE');
        setTeamId(initialData.teamId || activeTeam?.id || (teams[0]?.id || ''));
      } else {
        setName('');
        setDescription('');
        setStatus('ACTIVE');
        setTeamId(activeTeam?.id || (teams[0]?.id || ''));
      }
      setError('');
    }
  }, [isOpen, initialData, activeTeam?.id, teams]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a workflow name');
      return;
    }

    const selectedTeamId = teamId || activeTeam?.id || (teams[0]?.id || null);

    try {
      setLoading(true);
      setError('');
      const saveHandler = onSave || onSubmit;
      if (typeof saveHandler === 'function') {
        await saveHandler({
          name: name.trim(),
          description: description.trim(),
          status,
          teamId: selectedTeamId,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden relative z-50 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialData ? 'Edit Workflow' : 'Create New Team Workflow'}
              </h3>
              <p className="text-xs text-slate-400">
                Workflows belong to the team and are shared among authorized members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Name */}
          <div>
            <label htmlFor="wf-name-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Workflow Name <span className="text-brand-400">*</span>
            </label>
            <input
              id="wf-name-input"
              type="text"
              autoFocus
              required
              placeholder="e.g. Network Monitoring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all cursor-text"
            />
          </div>

          {/* Team Association */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-brand-400" />
                <span>Assigned Team</span>
                <span className="text-brand-400">*</span>
              </span>
            </label>
            {teams && teams.length > 0 ? (
              <div className="relative">
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all appearance-none pr-10 cursor-pointer"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#111827] text-white">
                      {t.name} {t.id === activeTeam?.id ? '(Active Team)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>You do not belong to any team. Workflows must be associated with a team.</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              All authorized members of this team will be able to view and collaborate on this workflow.
            </p>
          </div>

          {/* Description */}
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
              className="w-full px-3.5 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all resize-none"
            />
          </div>

          {/* Lifecycle Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Initial Lifecycle Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all appearance-none pr-10 cursor-pointer"
              >
                <option value="ACTIVE" className="bg-[#111827] text-white">ACTIVE</option>
                <option value="PAUSED" className="bg-[#111827] text-white">PAUSED</option>
                <option value="COMPLETED" className="bg-[#111827] text-white">COMPLETED</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (teams && teams.length === 0)}
              className="inline-flex items-center px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
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

export default WorkflowModal;
