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
  Copy,
  RotateCw,
  Link as LinkIcon,
  Search,
  FileUp,
  FileText,
  File,
  Lock,
  Globe,
  Download,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { ArchiveTeamModal } from '../components/ArchiveTeamModal';
import { SendTeamDocumentModal } from '../components/SendTeamDocumentModal';
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
  const [memberSearch, setMemberSearch] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isSendDocModalOpen, setIsSendDocModalOpen] = useState(false);
  const [teamDocuments, setTeamDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [resendingId, setResendingId] = useState(null);
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

      const loadedMembers = membersRes.data.data || [];
      const rawInvites = invitesRes.data.data || [];

      // Ensure no active team member ever shows up under Pending Invitations
      const activeMemberEmails = new Set(
        loadedMembers.map((m) => m.email?.trim().toLowerCase()).filter(Boolean)
      );
      const activeMemberIds = new Set(
        loadedMembers.map((m) => m.id).filter(Boolean)
      );

      const validPendingInvites = rawInvites.filter((inv) => {
        if (inv.status !== 'PENDING') return false;
        const invEmail = inv.email?.trim().toLowerCase();
        if (invEmail && activeMemberEmails.has(invEmail)) return false;
        if (inv.userId && activeMemberIds.has(inv.userId)) return false;
        return true;
      });

      setMembers(loadedMembers);
      setInvitations(validPendingInvites);
    } catch (err) {
      console.error('Failed to load team data:', err);
      toast.error('Failed to load team members: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTeam?.id, isManager]);

  const fetchTeamDocuments = useCallback(async () => {
    if (!activeTeam?.id) return;
    try {
      setLoadingDocuments(true);
      const res = await api.get(`/teams/${activeTeam.id}/documents`);
      setTeamDocuments(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load team documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  }, [activeTeam?.id]);

  useEffect(() => {
    fetchTeamMembersAndInvites();
    fetchTeamDocuments();
  }, [fetchTeamMembersAndInvites, fetchTeamDocuments]);

  const handleDownloadDoc = async (doc) => {
    try {
      const res = await api.get(`/workflows/${doc.workflowId}/documents/${doc.id}/download`);
      const url = res.data?.downloadUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.info(`Document "${doc.fileName}" is recorded in metadata.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to download document');
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Are you sure you want to remove "${doc.fileName}"?`)) return;
    try {
      await api.delete(`/workflows/${doc.workflowId}/documents/${doc.id}`);
      toast.success('Document deleted successfully');
      fetchTeamDocuments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

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

  // Resend Invitation Email (Manager & Admin)
  const handleResendInvitation = async (invitationId) => {
    try {
      setResendingId(invitationId);
      const res = await api.post(`/teams/${activeTeam.id}/invitations/${invitationId}/resend`);
      if (res.data?.emailSent) {
        toast.success(res.data.message || 'Invitation email resent successfully!');
      } else {
        toast.info(res.data?.message || 'Email delivery unconfigured or skipped on server.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to resend invitation';
      toast.error(msg);
    } finally {
      setResendingId(null);
    }
  };

  // Copy Direct Invitation Link
  const handleCopyInviteLink = async (invitationId) => {
    try {
      const link = `${window.location.origin}/invite/${invitationId}`;
      await navigator.clipboard.writeText(link);
      toast.success('Invitation link copied to clipboard!');
    } catch (err) {
      toast.error('Could not copy link to clipboard.');
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
    <div className="min-h-screen bg-transparent text-[#F8FAFC] pb-16 selection:bg-purple-600 selection:text-white">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam?.name || 'Team'} Members & Roles`}
        actions={
          <div className="flex items-center space-x-2">
            {(isManager || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsSendDocModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
                title="Send document to all or specific workflows"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>+ Send Document</span>
              </button>
            )}
            {isManager && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Invite Member</span>
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FB7185]/15 hover:bg-[#FB7185]/25 text-[#FB7185] hover:text-white border border-[#FB7185]/30 text-xs font-semibold transition-all backdrop-blur-sm"
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
          <div className="p-4 rounded-3xl bg-[#FBBF24]/10 border border-[#FBBF24]/25 backdrop-blur-xl shadow-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-[#FBBF24]" />
              <div>
                <p className="text-xs font-bold text-[#FBBF24]">
                  You have pending team invitations ({myInvitations.length})
                </p>
                <p className="text-[11px] text-[#CBD5E1]">
                  Invited to join "{myInvitations[0].teamName}" as {myInvitations[0].role?.replace('TEAM_', '')}.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => acceptInvitation(myInvitations[0].id)}
                className="px-3.5 py-1.5 rounded-xl bg-[#FBBF24] hover:bg-[#FBBF24]/90 text-black text-xs font-bold transition-all shadow-md"
              >
                Accept & Join
              </button>
              <button
                onClick={() => declineInvitation(myInvitations[0].id)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs transition-all border border-white/10"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Team Overview Card */}
        <div className="p-6 rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-inner">
              <TeamIcon icon={activeTeam?.icon} className="w-6 h-6 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC] flex items-center space-x-2">
                <span>{activeTeam?.name}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 font-mono backdrop-blur-sm">
                  {members.length} Active Members
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {activeTeam?.description || 'Team members and granular role assignments.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">Your Team Role:</span>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 backdrop-blur-sm shadow-sm">
              {activeRole}
            </span>
          </div>
        </div>

        {/* 5. Team Members Table */}
        <div className="rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">Team Members List</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#CBD5E1] font-mono border border-white/10">
                {members.length}
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* Member Search Bar with Clear action */}
              <div className="relative flex-1 sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by name, email, or role..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/10 focus:border-[#8B5CF6]/50 rounded-xl text-xs text-[#F8FAFC] placeholder-slate-400 outline-none transition-all shadow-inner backdrop-blur-md"
                />
                {memberSearch && (
                  <button
                    onClick={() => setMemberSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-400 hidden md:inline">
                {isAdmin ? 'Admin controls enabled' : 'View only permissions'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Member Name</th>
                    <th className="py-3 px-5">Team Role</th>
                    <th className="py-3 px-5 text-center">Assigned Tasks</th>
                    <th className="py-3 px-5">Joined Date</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.filter((m) => {
                    if (!memberSearch.trim()) return true;
                    const q = memberSearch.toLowerCase();
                    return (
                      (m.name && m.name.toLowerCase().includes(q)) ||
                      (m.email && m.email.toLowerCase().includes(q)) ||
                      (m.role && m.role.toLowerCase().includes(q))
                    );
                  }).map((member) => {
                    const isSelf = member.id === user?.id;
                    const isTeamAdmin = member.role === 'TEAM_ADMIN';

                    return (
                      <tr key={member.id} className="hover:bg-white/[0.035] transition-colors">
                        {/* Name & Email */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-purple-500 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm text-sm">
                              {member.name ? member.name[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-[#F8FAFC]">{member.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.08] text-[#CBD5E1] font-mono border border-white/10">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#94A3B8]">{member.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Selector or Badge */}
                        <td className="py-3.5 px-5">
                          {isAdmin && !isTeamAdmin ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[#F8FAFC] text-xs font-medium focus:outline-none focus:border-[#8B5CF6]/50 transition-all cursor-pointer backdrop-blur-md"
                            >
                              <option value="TEAM_MANAGER" className="bg-[#0D1220] text-white">TEAM_MANAGER</option>
                              <option value="TEAM_MEMBER" className="bg-[#0D1220] text-white">TEAM_MEMBER</option>
                            </select>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold backdrop-blur-sm">
                              {getRoleIcon(member.role)}
                              <span
                                className={
                                  member.role === 'TEAM_ADMIN'
                                    ? 'text-[#FBBF24]'
                                    : member.role === 'TEAM_MANAGER'
                                    ? 'text-[#A78BFA]'
                                    : 'text-[#34D399]'
                                }
                              >
                                {member.role.replace('TEAM_', '')}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Tasks Count */}
                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 font-mono font-bold text-[#F8FAFC] backdrop-blur-sm">
                            {member.tasksCount || 0}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-5 text-[#94A3B8] text-[11px]">
                          {member.joinedAt?.substring(0, 10) || 'Recently'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewProfile(member)}
                              className="px-3 py-1.5 text-[#CBD5E1] hover:text-white hover:bg-white/[0.08] rounded-xl text-xs font-medium border border-white/10 transition-colors inline-flex items-center space-x-1 backdrop-blur-sm"
                              title="View Member Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Profile</span>
                            </button>

                            {isAdmin && !isTeamAdmin && (
                              <button
                                onClick={() => handleRemoveMember(member)}
                                className="p-1.5 text-slate-400 hover:text-[#FB7185] hover:bg-white/[0.08] rounded-xl transition-colors"
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
          <div className="rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  Pending Team Invitations ({invitations.length})
                </h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="text-xs text-[#38BDF8] hover:text-[#38BDF8]/80 font-medium"
              >
                + Send Invite
              </button>
            </div>

            {invitations.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] text-xs">
                No active pending invitations for this team.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {invitations.map((inv) => {
                  const isResending = resendingId === inv.id;
                  return (
                    <div
                      key={inv.id}
                      className="p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.035] transition-colors text-xs"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-semibold text-[#F8FAFC] truncate">{inv.email}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30 font-mono">
                              {inv.role.replace('TEAM_', '')}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#94A3B8] block truncate mt-0.5">
                            Invited by {inv.inviterName} • Expires {inv.expiresAt?.substring(0, 10)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(inv.id)}
                          className="px-3 py-1.5 text-[#CBD5E1] hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1 backdrop-blur-sm"
                          title="Copy invitation link"
                        >
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="hidden xs:inline">Copy Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv.id)}
                          disabled={isResending}
                          className="px-3 py-1.5 text-[#A78BFA] hover:text-white bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1 disabled:opacity-50 backdrop-blur-sm"
                          title="Resend invitation email"
                        >
                          <RotateCw className={`w-3 h-3 text-[#A78BFA] ${isResending ? 'animate-spin' : ''}`} />
                          <span>{isResending ? 'Sending...' : 'Resend Email'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="px-3 py-1.5 text-[#FB7185] hover:text-white hover:bg-[#FB7185]/20 border border-[#FB7185]/30 rounded-xl text-xs font-medium transition-colors backdrop-blur-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Team Workflow Documents Section */}
        <div className="rounded-3xl bg-white/[0.045] border border-white/10 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Team & Workflow Documents ({teamDocuments.length})
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-mono border border-purple-500/25">
                Workflow Distribution
              </span>
            </div>

            {(isManager || isAdmin) && (
              <button
                type="button"
                onClick={() => setIsSendDocModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all self-start sm:self-auto cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>+ Send Document</span>
              </button>
            )}
          </div>

          {loadingDocuments ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : teamDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No documents distributed yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Admins and managers can upload specifications, completion reports, or policies and broadcast them to each and every workflow or specific workflows.
              </p>
              {(isManager || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setIsSendDocModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
                >
                  Send First Document
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {teamDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.035] transition-colors text-xs"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center flex-shrink-0">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-[#F8FAFC] truncate max-w-[260px] sm:max-w-md" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10 font-mono">
                          {doc.workflowName || 'Workflow'}
                        </span>
                        {/* Privacy label */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase flex items-center space-x-1 ${
                            doc.isPrivate
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          {doc.isPrivate ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>Private</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3 h-3 text-emerald-400" />
                              <span>Public</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-1">
                        <span>Uploaded by {doc.uploaderName || 'Team Member'}</span>
                        <span>•</span>
                        <span>{doc.fileSize ? `${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Attached'}</span>
                        <span>•</span>
                        <span>{doc.createdAt?.substring(0, 10)}</span>
                      </div>
                      {doc.description && (
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-1 italic">
                          "{doc.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 self-end sm:self-auto flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {(isAdmin || isManager || doc.uploadedBy === user?.id) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone: Delete / Archive Team (Owner / Admin Only) */}
        {(isOwner || isAdmin) && activeTeam && (
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#FB7185]/10 via-[#FB7185]/5 to-transparent border border-[#FB7185]/25 backdrop-blur-xl shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#FB7185] flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-[#FB7185]" />
                  <span>Danger Zone &bull; Delete Workspace Team</span>
                </h3>
                <p className="text-xs text-[#CBD5E1] mt-1">
                  Permanently archive "{activeTeam.name}". This soft-deletes the team, revoking member access and hiding team workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#FB7185]/20 hover:bg-[#FB7185] text-[#FB7185] hover:text-white border border-[#FB7185]/40 text-xs font-semibold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                Delete Team
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send Team Document to Workflows Modal */}
      {activeTeam && (
        <SendTeamDocumentModal
          isOpen={isSendDocModalOpen}
          onClose={() => setIsSendDocModalOpen(false)}
          team={activeTeam}
          onSuccess={() => fetchTeamDocuments()}
        />
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B12]/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0D1220]/95 border border-white/15 rounded-3xl w-full max-w-md shadow-2xl p-6 relative backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center space-x-2">
                <User className="w-4 h-4 text-[#8B5CF6]" />
                <span>Member Profile</span>
              </h3>
              <button
                onClick={() => setSelectedProfileUser(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-white/[0.045] border border-white/10 backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-purple-500 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {selectedProfileUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">{selectedProfileUser.name}</h4>
                  <p className="text-[#94A3B8] text-xs">{selectedProfileUser.email}</p>
                  <span className="text-[10px] font-mono text-[#A78BFA] uppercase">
                    Role in {activeTeam.name}: {selectedProfileUser.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Team Responsibilities
                </h5>
                <div className="p-3.5 rounded-2xl bg-white/[0.045] border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Assigned Tasks in {activeTeam.name}:</span>
                    <span className="font-bold text-[#F8FAFC]">{selectedProfileUser.tasksCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Joined Team:</span>
                    <span className="text-[#CBD5E1]">{selectedProfileUser.joinedAt?.substring(0, 10) || 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 text-right">
              <button
                onClick={() => setSelectedProfileUser(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[#F8FAFC] text-xs font-semibold border border-white/10 transition-all"
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
