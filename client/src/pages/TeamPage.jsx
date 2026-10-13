import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users,
  Shield,
  Crown,
  User,
  Plus,
  Mail,
  Loader2,
  CheckCircle2,
  X,
  UserPlus,
  Trash2,
  Check,
  Building2,
  Clock,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { ArchiveTeamModal } from '../components/ArchiveTeamModal';
import { TeamIcon } from '../components/TeamIcon';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const TeamPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager, isOwner, myInvitations, acceptInvitation, declineInvitation } = useTeam();
  const toast = useToast();

  usePageMeta('Team & Members', 'Manage workspace members, role assignments, and pending invitations.');

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userProfileData, setUserProfileData] = useState(null);

  const fetchTeamMembersAndInvites = useCallback(async () => {
    if (!activeTeam) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [membersRes, invitesRes] = await Promise.all([
        api.get(`/teams/${activeTeam.id}/members`),
        isManager ? api.get(`/teams/${activeTeam.id}/invitations`).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
      ]);

      setMembers(membersRes.data.data || []);
      setInvitations(invitesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load team data:', err);
      toast.error('Failed to load team members: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTeam?.id, isManager]);

  useEffect(() => {
    fetchTeamMembersAndInvites();
  }, [fetchTeamMembersAndInvites]);

  // Role Change (Team Admin Only)
  const handleRoleChange = async (targetUserId, newRole) => {
    if (!isAdmin) {
      toast.error('Only Team Admins can change member roles.');
      return;
    }
    try {
      await api.put(`/teams/${activeTeam.id}/members/${targetUserId}/role`, { role: newRole });
      toast.success('Member role updated successfully!');
      fetchTeamMembersAndInvites();
    } catch (err) {
      toast.error(err.message || 'Failed to update member role');
    }
  };

  // Remove Member (Team Admin Only)
  const handleRemoveMember = async (targetUser) => {
    if (!isAdmin) {
      toast.error('Only Team Admins can remove members.');
      return;
    }
    if (targetUser.role === 'TEAM_ADMIN') {
      toast.error('Cannot remove the Team Admin from their own team.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${targetUser.name} from ${activeTeam.name}?`)) {
      try {
        await api.delete(`/teams/${activeTeam.id}/members/${targetUser.id}`);
        toast.success(`Removed ${targetUser.name} from team.`);
        fetchTeamMembersAndInvites();
      } catch (err) {
        toast.error(err.message || 'Failed to remove member');
      }
    }
  };

  // Cancel Invitation (Manager & Admin)
  const handleCancelInvitation = async (invitationId) => {
    try {
      await api.delete(`/teams/${activeTeam.id}/invitations/${invitationId}`);
      toast.success('Invitation canceled.');
      fetchTeamMembersAndInvites();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel invitation');
    }
  };

  // View Member Profile Modal
  const handleViewProfile = async (targetUser) => {
    setSelectedProfileUser(targetUser);
    setProfileLoading(true);
    try {
      const res = await api.get(`/teams/profile/me?userId=${targetUser.id}`);
      setUserProfileData(res.data.data);
    } catch (err) {
      setUserProfileData(targetUser);
    } finally {
      setProfileLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'TEAM_ADMIN') return <Crown className="w-4 h-4 text-amber-400" />;
    if (role === 'TEAM_MANAGER') return <Shield className="w-4 h-4 text-indigo-400" />;
    return <User className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-16">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam?.name || 'Team'} Members & Roles`}
        actions={
          <div className="flex items-center space-x-2">
            {isManager && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Invite Member</span>
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all hover:bg-rose-600 hover:text-white"
                title="Delete or Archive this workspace team"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Team</span>
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner for user's pending invitations if any */}
        {myInvitations.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-amber-300">
                  You have pending team invitations ({myInvitations.length})
                </p>
                <p className="text-[11px] text-amber-200/70">
                  Invited to join "{myInvitations[0].teamName}" as {myInvitations[0].role?.replace('TEAM_', '')}.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => acceptInvitation(myInvitations[0].id)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-dark-950 text-xs font-bold transition-colors"
              >
                Accept & Join
              </button>
              <button
                onClick={() => declineInvitation(myInvitations[0].id)}
                className="px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 text-xs transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Team Overview Card */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-dark-850 border border-slate-800 flex items-center justify-center">
              <TeamIcon icon={activeTeam?.icon} className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>{activeTeam?.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono">
                  {members.length} Active Members
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTeam?.description || 'Team members and granular role assignments.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">Your Team Role:</span>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {activeRole}
            </span>
          </div>
        </div>

        {/* 5. Team Members Table */}
        <div className="rounded-2xl bg-dark-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Users className="w-4 h-4 text-brand-400" />
              <span>Team Members List</span>
            </h3>
            <span className="text-xs text-slate-400">
              {isAdmin ? 'Admin controls enabled' : 'View only permissions'}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading members from Supabase...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-dark-850 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Team Role</th>
                    <th className="py-3 px-4 text-center">Assigned Tasks</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {members.map((member) => {
                    const isSelf = member.id === user?.id;
                    const isTeamAdmin = member.role === 'TEAM_ADMIN';

                    return (
                      <tr key={member.id} className="hover:bg-dark-850/60 transition-colors">
                        {/* Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-300 font-bold flex items-center justify-center flex-shrink-0">
                              {member.name ? member.name[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-slate-100">{member.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">{member.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Selector or Badge */}
                        <td className="py-3.5 px-4">
                          {isAdmin && !isTeamAdmin ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-dark-800 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:border-brand-500"
                            >
                              <option value="TEAM_MANAGER">TEAM_MANAGER</option>
                              <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                            </select>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-slate-700/80 text-xs font-semibold">
                              {getRoleIcon(member.role)}
                              <span
                                className={
                                  member.role === 'TEAM_ADMIN'
                                    ? 'text-amber-400'
                                    : member.role === 'TEAM_MANAGER'
                                    ? 'text-indigo-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {member.role.replace('TEAM_', '')}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Tasks Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-dark-800 border border-slate-700 font-mono font-bold text-slate-200">
                            {member.tasksCount || 0}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {member.joinedAt?.substring(0, 10) || 'Recently'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewProfile(member)}
                              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg text-xs font-medium border border-slate-800 transition-colors inline-flex items-center space-x-1"
                              title="View Member Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Profile</span>
                            </button>

                            {isAdmin && !isTeamAdmin && (
                              <button
                                onClick={() => handleRemoveMember(member)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-dark-800 rounded-lg transition-colors"
                                title="Remove Member from Team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 6. Pending Invitations Section (Managers & Admins) */}
        {isManager && (
          <div className="rounded-2xl bg-dark-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Pending Team Invitations ({invitations.length})
                </h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium"
              >
                + Send Invite
              </button>
            </div>

            {invitations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No active pending invitations for this team.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 px-4 flex items-center justify-between hover:bg-dark-850/60 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-200">{inv.email}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                            {inv.role.replace('TEAM_', '')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Invited by {inv.inviterName} • Expires {inv.expiresAt?.substring(0, 10)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelInvitation(inv.id)}
                      className="px-2.5 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancel Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Danger Zone: Delete / Archive Team (Owner / Admin Only) */}
        {(isOwner || isAdmin) && activeTeam && (
          <div className="p-6 rounded-2xl bg-dark-900 border border-rose-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-rose-400 flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Danger Zone &bull; Delete Workspace Team</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Permanently archive "{activeTeam.name}". This soft-deletes the team, revoking member access and hiding team workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-semibold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                Delete Team
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => fetchTeamMembersAndInvites()}
      />

      {/* Archive / Delete Team Modal */}
      {isArchiveModalOpen && activeTeam && (
        <ArchiveTeamModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          team={activeTeam}
        />
      )}

      {/* Member Profile Modal (Section 24) */}
      {selectedProfileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <User className="w-4 h-4 text-brand-400" />
                <span>Member Profile</span>
              </h3>
              <button
                onClick={() => setSelectedProfileUser(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-dark-850 border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-300 font-bold text-lg flex items-center justify-center">
                  {selectedProfileUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{selectedProfileUser.name}</h4>
                  <p className="text-slate-400 text-xs">{selectedProfileUser.email}</p>
                  <span className="text-[10px] font-mono text-brand-400 uppercase">
                    Role in {activeTeam.name}: {selectedProfileUser.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                  Team Responsibilities
                </h5>
                <div className="p-3 rounded-xl bg-dark-850 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Tasks in {activeTeam.name}:</span>
                    <span className="font-bold text-slate-200">{selectedProfileUser.tasksCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Joined Team:</span>
                    <span className="text-slate-200">{selectedProfileUser.joinedAt?.substring(0, 10) || 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedProfileUser(null)}
                className="px-4 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
