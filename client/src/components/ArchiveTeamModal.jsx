import React, { useState } from 'react';
import { AlertTriangle, X, Archive, Loader2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

export const ArchiveTeamModal = ({ isOpen, onClose, team }) => {
  const { archiveTeam } = useTeam();
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !team) return null;

  const isConfirmed = confirmName.trim() === team.name;

  const handleArchive = async () => {
    if (!isConfirmed) return;
    try {
      setLoading(true);
      setError(null);
      await archiveTeam(team.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to archive team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0D1220]/95 backdrop-blur-2xl border border-rose-500/30 rounded-3xl shadow-2xl shadow-black/80 p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Warning Accent */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Archive Team "{team.name}"?
            </h3>
            <p className="text-xs text-rose-300">
              Action restricted to Team Admin
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Archiving this team will soft-delete the team container and revoke active access to all associated workflows, tasks, and automations for all members.
        </p>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 mb-4 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Workflows in team:</span>
            <span className="font-semibold text-white">{team.workflowCount || 0}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Team members:</span>
            <span className="font-semibold text-white">{team.memberCount || 1}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Deletion Policy:</span>
            <span className="font-mono text-amber-400 font-bold">status = 'ARCHIVED'</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Type <span className="font-bold text-white">"{team.name}"</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={team.name}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-rose-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={!isConfirmed || loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            <span>Archive Team</span>
          </button>
        </div>
      </div>
    </div>
  );
};
