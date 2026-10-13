import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Shield, Check, Loader2, AlertCircle, Users, Clock } from 'lucide-react';
import { api } from '../services/api';

export const ShareWorkflowModal = ({ isOpen, onClose, workflow, onInvitationSent }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [role, setRole] = useState('MEMBER');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [existingMembers, setExistingMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

  // Load existing workflow members and pending invitations when opened
  useEffect(() => {
    if (isOpen && workflow?.id) {
      setError('');
      setSuccess('');
      Promise.all([
        api.get(`/workflows/${workflow.id}/members`).catch(() => ({ data: { data: [] } })),
        api.get(`/workflows/${workflow.id}/invitations`).catch(() => ({ data: { data: [] } })),
      ]).then(([membersRes, invitesRes]) => {
        setExistingMembers(membersRes.data?.data || []);
        setPendingInvites(invitesRes.data?.data || []);
      });
    }
  }, [isOpen, workflow?.id]);

  // Check if a user has a pending invitation
  const isUserPending = (userObj, queryStr) => {
    if (userObj) {
      return pendingInvites.some(
        (inv) =>
          inv.invitedUserId === userObj.id ||
          (userObj.email && inv.invitedUser?.email?.toLowerCase() === userObj.email?.toLowerCase()) ||
          (userObj.username && inv.invitedUser?.username?.toLowerCase() === userObj.username?.toLowerCase())
      );
    }
    if (queryStr) {
      const q = queryStr.trim().replace(/^@/, '').toLowerCase();
      return pendingInvites.some(
        (inv) =>
          inv.invitedUser?.email?.toLowerCase() === q ||
          inv.invitedUser?.username?.toLowerCase() === q
      );
    }
    return false;
  };

  // Check if a user is already an active collaborator
  const isUserMember = (userObj, queryStr) => {
    if (userObj) {
      return existingMembers.some(
        (m) =>
          m.id === userObj.id ||
          (userObj.email && m.email?.toLowerCase() === userObj.email?.toLowerCase()) ||
          (userObj.username && m.username?.toLowerCase() === userObj.username?.toLowerCase())
      );
    }
    if (queryStr) {
      const q = queryStr.trim().replace(/^@/, '').toLowerCase();
      return existingMembers.some(
        (m) => m.email?.toLowerCase() === q || m.username?.toLowerCase() === q
      );
    }
    return false;
  };

  const selectedOrQueriedIsPending = selectedUser
    ? isUserPending(selectedUser)
    : query.trim()
    ? isUserPending(null, query)
    : false;

  const selectedOrQueriedIsMember = selectedUser
    ? isUserMember(selectedUser)
    : query.trim()
    ? isUserMember(null, query)
    : false;

  // Debounced user search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setError('');
        const res = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
        if (res.data?.success) {
          setSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const recipientIdentifier = selectedUser ? selectedUser.username || selectedUser.email : query.trim();
    if (!recipientIdentifier) {
      setError('Please select or enter a recipient username or email.');
      return;
    }

    if (selectedOrQueriedIsPending) {
      setError('An invitation has already been sent to this user and is currently pending.');
      return;
    }

    if (selectedOrQueriedIsMember) {
      setError('This user is already an active collaborator on this workflow.');
      return;
    }

    try {
      setSending(true);
      const res = await api.post('/invitations', {
        type: 'WORKFLOW',
        resourceId: workflow.id,
        role,
        recipientIdentifier,
      });

      if (res.data?.success) {
        const inviteData = res.data.data;
        setSuccess(`Invitation sent successfully to ${selectedUser?.name || recipientIdentifier}!`);
        setPendingInvites((prev) => [...prev, inviteData]);
        setSelectedUser(null);
        setQuery('');
        if (onInvitationSent) onInvitationSent(inviteData);
        setTimeout(() => {
          setSuccess('');
          onClose();
        }, 900);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-md shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share Workflow</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{workflow?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendInvite} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start space-x-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {/* Search user */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Find Collaborator (Username or Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search @username or email address..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedUser(null);
                  setError('');
                }}
                className="w-full pl-10 pr-9 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none transition-all"
              />
              {searching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Selected User Pill */}
            {selectedUser && (
              <div className="mt-2 p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {selectedUser.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">{selectedUser.name}</span>
                    <span className="text-brand-400 ml-1.5 text-[11px]">@{selectedUser.username}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Pending or Member Alert for Selected/Typed User */}
            {selectedOrQueriedIsPending && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Invitation already pending:</strong> You cannot send another invitation to this user until they accept or the invite is cancelled.
                </span>
              </div>
            )}

            {selectedOrQueriedIsMember && (
              <div className="mt-2 p-2.5 rounded-xl bg-brand-950/40 border border-brand-800/60 text-xs text-brand-300 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>
                  <strong>Already a collaborator:</strong> This user is already a member of this workflow.
                </span>
              </div>
            )}

            {/* Search Dropdown Results */}
            {!selectedUser && searchResults.length > 0 && (
              <div className="mt-1.5 max-h-48 overflow-y-auto rounded-2xl bg-[#111827] border border-white/15 divide-y divide-white/10 shadow-2xl">
                {searchResults.map((u) => {
                  const pending = isUserPending(u);
                  const member = isUserMember(u);

                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={pending || member}
                      onClick={() => {
                        if (pending || member) return;
                        setSelectedUser(u);
                        setQuery(u.username ? `@${u.username}` : u.email);
                        setSearchResults([]);
                      }}
                      className={`w-full p-2.5 flex items-center justify-between text-left transition-colors ${
                        pending || member
                          ? 'opacity-60 cursor-not-allowed bg-white/[0.02]'
                          : 'hover:bg-white/10 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-brand-600/40 text-brand-300 font-bold text-xs flex items-center justify-center border border-brand-500/30 flex-shrink-0">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">@{u.username} • {u.email}</p>
                        </div>
                      </div>

                      <div className="ml-2 flex-shrink-0">
                        {pending ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            <span>Pending</span>
                          </span>
                        ) : member ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-[10px] font-semibold">
                            <Shield className="w-2.5 h-2.5 text-brand-400" />
                            <span>Member</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-brand-400 font-semibold hover:underline">
                            Select
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workflow Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assign Workflow Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('MANAGER')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  role === 'MANAGER'
                    ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs text-indigo-300">Manager</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">Can create/assign tasks</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('MEMBER')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  role === 'MEMBER'
                    ? 'bg-brand-500/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/30'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs text-brand-300">Member</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">Can update assigned tasks</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('VIEWER')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  role === 'VIEWER'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs text-cyan-300">Viewer</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">Read-only view</div>
              </button>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                sending ||
                selectedOrQueriedIsPending ||
                selectedOrQueriedIsMember ||
                (!selectedUser && !query.trim())
              }
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : selectedOrQueriedIsPending ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Invite Already Pending</span>
                </>
              ) : selectedOrQueriedIsMember ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-brand-300" />
                  <span>Already a Member</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
