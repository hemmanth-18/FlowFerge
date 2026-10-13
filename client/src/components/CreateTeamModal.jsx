import React, { useState } from 'react';
import { X, Sparkles, Building2, Layers, Check } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { TeamIcon, AVAILABLE_TEAM_ICONS } from './TeamIcon';

export const CreateTeamModal = ({ isOpen, onClose, onSuccess }) => {
  const { createTeam } = useTeam();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a team name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newTeam = await createTeam({
        name: name.trim(),
        description: description.trim(),
        icon,
      });
      setName('');
      setDescription('');
      onClose();
      if (onSuccess) onSuccess(newTeam);
    } catch (err) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <TeamIcon icon={icon} className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Create New Team</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
                  TEAM_ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                You will be the Team Admin with full control over members, workflows, and settings.
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
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Team Icon
            </label>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              {AVAILABLE_TEAM_ICONS.map(({ id, label, Icon }) => (
                <button
                  type="button"
                  key={id}
                  title={label}
                  onClick={() => setIcon(id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    icon === id
                      ? 'bg-brand-600/30 border-2 border-brand-400 scale-105 shadow-glow-brand text-brand-300'
                      : 'bg-dark-850 hover:bg-dark-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Team Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Team Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Development Team, Marketing Team"
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
              required
            />
          </div>

          {/* Team Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Team Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsible for developing, maintaining, and deploying applications..."
              className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creating Team...' : 'Create Team & Become Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
