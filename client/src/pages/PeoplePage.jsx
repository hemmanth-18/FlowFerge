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
    <div className="min-h-screen bg-transparent text-[#F8FAFC] flex flex-col selection:bg-purple-600 selection:text-white">
      <Navbar onOpenSidebar={() => setSidebarOpen && setSidebarOpen(true)} title="Find People" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Banner */}
        <div className="relative rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-60 h-60 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] text-xs font-semibold backdrop-blur-md">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>FlowForge User Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              Connect & Collaborate
            </h1>
            <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
              Find teammates and contributors by username or email address. Invite them to your private workflows with granular Manager, Member, or Viewer access roles.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-xl relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by username (e.g. @priya) or email address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-[#F8FAFC] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/25 transition-all shadow-inner backdrop-blur-md"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                <Loader2 className="w-4 h-4 text-[#8B5CF6] animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Directory Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#CBD5E1] uppercase tracking-wider">
              {query.trim() ? `Search Results (${users.length})` : `Registered Users (${users.length})`}
            </h2>
          </div>

          {users.length === 0 && !loading ? (
            <div className="p-16 text-center rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">No users found</h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                No registered users matched "{query}". Verify the exact username or email address and try again.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    className="p-5 rounded-3xl bg-white/[0.045] hover:bg-white/[0.07] border border-white/10 hover:border-[#8B5CF6]/40 backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {person.avatar ? (
                            <img
                              src={person.avatar}
                              alt={person.name}
                              className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-purple-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[#F8FAFC] truncate group-hover:text-[#A78BFA] transition-colors">
                              {person.name}
                            </h3>
                            <p className="text-xs text-purple-300 font-mono">
                              @{person.username || person.email?.split('@')[0]}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 backdrop-blur-sm">
                          Active
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-xs text-[#CBD5E1]">
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </div>
                        {person.createdAt && (
                          <div className="flex items-center space-x-2 text-[11px] text-[#94A3B8]">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Joined {new Date(person.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileModalUser(person)}
                        className="flex-1 px-3 py-2 text-xs font-semibold text-[#CBD5E1] hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-all backdrop-blur-sm"
                      >
                        View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInvite(person)}
                        className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-lg shadow-purple-600/25"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#080B12]/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-[#0D1220]/95 border border-white/15 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col backdrop-blur-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">Invite {targetUser.name}</h3>
                  <p className="text-xs text-[#38BDF8] font-mono">@{targetUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-5 space-y-4">
              {inviteFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                    inviteFeedback.type === 'success'
                      ? 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]'
                      : 'bg-[#FB7185]/15 border-[#FB7185]/30 text-[#FB7185]'
                  }`}
                >
                  {inviteFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-[#34D399] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#FB7185] flex-shrink-0 mt-0.5" />
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
                  <p className="text-xs text-[#FBBF24]">
                    You don't have any owned workflows yet. Please create a workflow first!
                  </p>
                ) : (
                  <select
                    value={selectedWorkflowId}
                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]/50 cursor-pointer backdrop-blur-md"
                  >
                    {myWorkflows.map((wf) => (
                      <option key={wf.id} value={wf.id} className="bg-[#0D1220] text-white">
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
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      inviteRole === 'MANAGER'
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-md'
                        : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#A78BFA]">Manager</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Manage tasks</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('MEMBER')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      inviteRole === 'MEMBER'
                        ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white shadow-md'
                        : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#38BDF8]">Member</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Complete tasks</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole('VIEWER')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      inviteRole === 'VIEWER'
                        ? 'bg-[#34D399]/20 border-[#34D399] text-white shadow-md'
                        : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#34D399]">Viewer</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Read-only</div>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !selectedWorkflowId}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-lg shadow-purple-600/25 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B12]/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0D1220]/95 border border-white/15 rounded-3xl w-full max-w-sm shadow-2xl p-6 relative backdrop-blur-2xl">
            <button
              onClick={() => setProfileModalUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-700 to-purple-500 text-white font-black text-xl flex items-center justify-center shadow-lg">
                {profileModalUser.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">{profileModalUser.name}</h3>
                <p className="text-xs text-purple-300 font-mono">@{profileModalUser.username}</p>
              </div>
              <div className="p-3.5 bg-white/[0.045] rounded-2xl text-left text-xs space-y-2 text-[#CBD5E1] border border-white/10 backdrop-blur-md">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Email:</span>
                  <span className="text-[#F8FAFC] font-medium">{profileModalUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Collaboration Status:</span>
                  <span className="text-[#34D399] font-medium">Available</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = profileModalUser;
                  setProfileModalUser(null);
                  handleOpenInvite(target);
                }}
                className="w-full mt-2 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-lg shadow-purple-600/25"
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
