import React, { useState } from 'react';
import { X, UserPlus, Shield, User, Send, Check, Info } from 'lucide-react';
import { api } from '../services/api';
import { useTeam } from '../context/TeamContext';

export const InviteMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const { activeTeam } = useTeam();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('TEAM_MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !activeTeam) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/teams/${activeTeam.id}/invitations`, {
        email: email.trim(),
        role,
      });
      setEmail('');
      setRole('TEAM_MEMBER');
      onClose();
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      setError(err.message || 'Failed to send team invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Invite Member to {activeTeam.name}
              </h3>
              <p className="text-xs text-slate-400">
                Send an invitation link with assigned role permissions
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
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Invitee Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@flowforge.dev"
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Initial Team Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('TEAM_MEMBER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'TEAM_MEMBER'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-dark-850 border-slate-800 text-slate-400 hover:bg-dark-800'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Team Member</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Work on assigned tasks & participate in permitted workflows
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('TEAM_MANAGER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'TEAM_MANAGER'
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-dark-850 border-slate-800 text-slate-400 hover:bg-dark-800'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold">Team Manager</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Create workflows, assign tasks & manage automations
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-2 p-3 rounded-xl bg-dark-850 border border-slate-800 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>The invited user will receive a notification and must accept before accessing team workflows.</span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
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
              <Send className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
