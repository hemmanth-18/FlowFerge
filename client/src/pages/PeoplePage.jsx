import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  AtSign,
  Loader2,
  Sparkles,
  Shield,
  Check,
  FolderGit2,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useOutletContext } from 'react-router-dom';

export const PeoplePage = () => {
  const { user: currentUser } = useAuth();
  const { setSidebarOpen } = useOutletContext() || {};
  const toast = useToast();

  usePageMeta('People Directory', 'Search for colleagues and invite collaborators to your workflows.');


  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myWorkflows, setMyWorkflows] = useState([]);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(null);

  // Profile modal state
  const [profileModalUser, setProfileModalUser] = useState(null);

  // Load initial popular people or search results
  const fetchPeople = async (searchTerm = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/users/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user's owned workflows for invitation modal
  const fetchMyWorkflows = async () => {
    try {
      const res = await api.get('/workflows?filter=owned');
      if (res.data?.success) {
        setMyWorkflows(res.data.data || []);
        if (res.data.data?.length > 0) {
          setSelectedWorkflowId(res.data.data[0].id);
        }
      }
    } catch (e) {
      // quiet
    }
  };

  useEffect(() => {
    fetchPeople('');
    fetchMyWorkflows();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPeople(query.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleOpenInvite = (target) => {
    setTargetUser(target);
    setInviteFeedback(null);
    setInviteModalOpen(true);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedWorkflowId || !targetUser) return;

    try {
      setInviting(true);
      setInviteFeedback(null);
      const res = await api.post('/invitations', {
        type: 'WORKFLOW',
        resourceId: selectedWorkflowId,
        role: inviteRole,
        recipientIdentifier: targetUser.username || targetUser.email,
      });

      if (res.data?.success) {
        setInviteFeedback({
          type: 'success',
          message: `Invited ${targetUser.name} to workflow as ${inviteRole}!`,
        });
        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteFeedback(null);
        }, 1200);
      }
    } catch (err) {
      setInviteFeedback({
        type: 'error',
        message: err.message || 'Failed to send invitation',
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar onOpenSidebar={() => setSidebarOpen && setSidebarOpen(true)} title="Find People" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-slate-800 p-6 sm:p-8 shadow-card-dark overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>FlowForge User Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Connect & Collaborate
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Find teammates and contributors by username or email address. Invite them to your private workflows with granular Manager, Member, or Viewer access roles.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-xl relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by username (e.g. @priya) or email address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-dark-800/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-inner"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Directory Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              {query.trim() ? `Search Results (${users.length})` : `Registered Users (${users.length})`}
            </h2>
          </div>

          {users.length === 0 && !loading ? (
            <div className="p-12 text-center rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No users found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No registered users matched "{query}". Verify the exact username or email address and try again.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((person) => {
                const initials = person.name
                  ? person.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : person.username?.slice(0, 2).toUpperCase() || 'U';

                return (
                  <div
                    key={person.id}
                    className="p-5 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all shadow-card-dark flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {person.avatar ? (
                            <img
                              src={person.avatar}
                              alt={person.name}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-100 truncate group-hover:text-brand-300 transition-colors">
                              {person.name}
                            </h3>
                            <p className="text-xs text-brand-400 font-mono">
                              @{person.username || person.email?.split('@')[0]}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </div>
                        {person.createdAt && (
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Joined {new Date(person.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileModalUser(person)}
                        className="flex-1 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-dark-850 hover:bg-dark-800 border border-slate-700/80 rounded-xl transition-all"
                      >
                        View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInvite(person)}
                        className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Invite Collaborator Modal */}
      {inviteModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-dark-850">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Invite {targetUser.name}</h3>
                  <p className="text-xs text-brand-400 font-mono">@{targetUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-5 space-y-4">
              {inviteFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                    inviteFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  }`}
                >
                  {inviteFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{inviteFeedback.message}</span>
                </div>
              )}

              {/* Workflow Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Target Workflow
                </label>
                {myWorkflows.length === 0 ? (
                  <p className="text-xs text-amber-400">
                    You don't have any owned workflows yet. Please create a workflow first!
                  </p>
                ) : (
                  <select
                    value={selectedWorkflowId}
                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    {myWorkflows.map((wf) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Choose Workflow Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole('MANAGER')}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      inviteRole === 'MANAGER'
                        ? 'bg-indigo-500/15 border-indigo-500 text-white'
                        : 'bg-dark-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-indigo-300">Manager</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Manage tasks</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('MEMBER')}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      inviteRole === 'MEMBER'
                        ? 'bg-brand-500/15 border-brand-500 text-white'
                        : 'bg-dark-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-brand-300">Member</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Complete tasks</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('VIEWER')}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      inviteRole === 'VIEWER'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-dark-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-300">Viewer</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Read-only</div>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !selectedWorkflowId}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand disabled:opacity-50"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
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
      )}

      {/* View Public Profile Modal */}
      {profileModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
            <button
              onClick={() => setProfileModalUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg">
                {profileModalUser.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{profileModalUser.name}</h3>
                <p className="text-xs text-brand-400 font-mono">@{profileModalUser.username}</p>
              </div>
              <div className="p-3 bg-dark-850 rounded-xl text-left text-xs space-y-1.5 text-slate-400 border border-slate-800">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-slate-200 font-medium">{profileModalUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Collaboration Status:</span>
                  <span className="text-emerald-400 font-medium">Available</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = profileModalUser;
                  setProfileModalUser(null);
                  handleOpenInvite(target);
                }}
                className="w-full mt-2 inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite to Workflow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
