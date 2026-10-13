import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, User, Send, Check, Info, Search, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';

export const InviteMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const { activeTeam } = useTeam();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('TEAM_MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setSearchResults([]);
      setShowDropdown(false);
      setError(null);
      return;
    }
  }, [isOpen]);

  // Debounced search when typing email or username
  useEffect(() => {
    const query = email.trim();
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setSearchResults(res.data.data);
          setShowDropdown(res.data.data.length > 0);
        }
      } catch (err) {
        console.error('Failed to search users for invite:', err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [email]);

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
      if (res.data?.emailSent) {
        toast.success(res.data.emailMessage || `Invitation email sent to ${email.trim()}!`);
      } else {
        toast.info(res.data?.emailMessage || `Invitation link created. Email delivery skipped or unconfigured.`);
      }
      setEmail('');
      setRole('TEAM_MEMBER');
      setShowDropdown(false);
      onClose();
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      setError(err.message || 'Failed to send team invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (u) => {
    setEmail(u.email);
    setShowDropdown(false);
    setSearchResults([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Invite Member to {activeTeam.name}
              </h3>
              <p className="text-xs text-slate-400">
                Send an invitation link with assigned role permissions
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
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Invitee Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Search user or enter colleague@flowforge.dev"
                className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                required
              />
              {searching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Down Search Results Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-2xl bg-[#111827] border border-white/15 divide-y divide-white/10 shadow-2xl z-50">
                <div className="p-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-white/5 border-b border-white/10">
                  Matching Registered Users ({searchResults.length})
                </div>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="w-full p-2.5 flex items-center space-x-3 text-left hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                      {(u.name || u.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {u.name || u.username}
                        </span>
                        {u.username && (
                          <span className="text-[10px] font-mono text-slate-400">
                            @{u.username}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-brand-400 font-mono truncate block">
                        {u.email}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Initial Team Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('TEAM_MEMBER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'TEAM_MEMBER'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Team Member</span>
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
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Team Manager</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Create workflows, assign tasks & manage automations
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>The invited user will receive a notification and must accept before accessing team workflows.</span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
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
