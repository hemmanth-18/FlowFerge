import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Shield,
  Crown,
  User,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Info,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';

export const WorkflowPermissionsModal = ({
  isOpen,
  onClose,
  workflowId,
  workflowName,
  currentUserRole = 'TEAM_MEMBER',
}) => {
  const { user } = useAuth();
  const { activeTeam, isAdmin, isManager } = useTeam();

  const [workflow, setWorkflow] = useState(null);
  const [workflowMembers, setWorkflowMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRestriction, setSavingRestriction] = useState(false);
  const [cancellingInviteId, setCancellingInviteId] = useState(null);

  // Add member form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('WORKFLOW_MEMBER');
  const [addingMember, setAddingMember] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const canManage = isAdmin || isManager || currentUserRole === 'WORKFLOW_MANAGER';

  const loadData = async () => {
    if (!workflowId) return;
    try {
      setLoading(true);
      const wfRes = await api.get(`/workflows/${workflowId}`);
      const wfData = wfRes.data.data || null;
      setWorkflow(wfData);

      const targetTeamId = wfData?.teamId || activeTeam?.id;

      const [wfMembersRes, teamMembersRes, wfInvitesRes] = await Promise.all([
        api.get(`/workflows/${workflowId}/members`).catch(() => ({ data: { data: [] } })),
        targetTeamId
          ? api.get(`/teams/${targetTeamId}/members`).catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        api.get(`/workflows/${workflowId}/invitations`).catch(() => ({ data: { data: [] } })),
      ]);

      setWorkflowMembers(wfMembersRes.data.data || []);
      setTeamMembers(teamMembersRes.data.data || []);
      setPendingInvitations(wfInvitesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load workflow permissions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workflowId) {
      setMessage({ type: '', text: '' });
      loadData();
    }
  }, [isOpen, workflowId, activeTeam]);

  if (!isOpen) return null;

  // Toggle workflow restricted mode (Section 8)
  const handleToggleRestriction = async () => {
    if (!canManage || !workflow) return;
    try {
      setSavingRestriction(true);
      const newStatus = !workflow.isRestricted;
      await api.put(`/workflows/${workflowId}`, { isRestricted: newStatus });
      setWorkflow((prev) => ({ ...prev, isRestricted: newStatus }));
      setMessage({
        type: 'success',
        text: newStatus
          ? 'Workflow is now RESTRICTED to selected members only.'
          : 'Workflow is now OPEN to all team members.',
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update workflow access',
      });
    } finally {
      setSavingRestriction(false);
    }
  };

  // Add existing team member to this workflow with workflow role (Section 9)
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setAddingMember(true);
      setMessage({ type: '', text: '' });

      await api.post(`/workflows/${workflowId}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });

      setMessage({
        type: 'success',
        text: `Member added to workflow as ${selectedRole.replace('WORKFLOW_', '')}!`,
      });
      setSelectedUserId('');
      setSelectedRole('WORKFLOW_MEMBER');
      loadData();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to add member to workflow',
      });
    } finally {
      setAddingMember(false);
    }
  };

  // Update workflow role
  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await api.put(`/workflows/${workflowId}/members/${targetUserId}/role`, {
        role: newRole,
      });
      setWorkflowMembers((prev) =>
        prev.map((m) => (m.id === targetUserId ? { ...m, role: newRole } : m))
      );
      setMessage({
        type: 'success',
        text: `Updated role to ${newRole.replace('WORKFLOW_', '')}!`,
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to change role',
      });
    }
  };

  // Remove member from workflow
  const handleRemoveMember = async (targetUserId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this workflow's access list?`)) return;

    try {
      await api.delete(`/workflows/${workflowId}/members/${targetUserId}`);
      setWorkflowMembers((prev) => prev.filter((m) => m.id !== targetUserId));
      setMessage({
        type: 'success',
        text: `${memberName} has been removed from this workflow.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to remove member',
      });
    }
  };

  // Cancel / Revoke pending invitation
  const handleCancelInvite = async (invitationId, recipientName) => {
    if (!window.confirm(`Cancel pending invitation for ${recipientName}?`)) return;
    try {
      setCancellingInviteId(invitationId);
      await api.post(`/invitations/${invitationId}/cancel`);
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setMessage({
        type: 'success',
        text: `Invitation for ${recipientName} has been cancelled.`,
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to cancel invitation',
      });
    } finally {
      setCancellingInviteId(null);
    }
  };

  // Available team members who are not yet added to workflow and not pending
  const availableTeamMembers = teamMembers.filter(
    (tm) =>
      !workflowMembers.some((wm) => wm.id === tm.id) &&
      !pendingInvitations.some(
        (pi) => pi.invitedUserId === tm.id || (tm.email && pi.invitedUser?.email === tm.email)
      )
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B12]/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top edge specular highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Workflow Access & Roles</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-brand-300 font-medium">
                  {workflowName}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Team: <strong className="text-slate-300">{activeTeam?.name}</strong> • Granular access for team members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Status Message */}
          {message.text && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Section 8: Access Restriction Toggle Card */}
          <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className={`p-2.5 rounded-xl border shadow-inner ${workflow?.isRestricted ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                {workflow?.isRestricted ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {workflow?.isRestricted ? 'Restricted Access Workflow' : 'All Team Members Have Access'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-md leading-relaxed">
                  {workflow?.isRestricted
                    ? 'Only Team Admins, Managers, and members explicitly added below can view and work on this workflow.'
                    : 'All members of ' + (activeTeam?.name || 'the team') + ' can view this workflow by default.'}
                </p>
              </div>
            </div>

            {canManage && (
              <button
                onClick={handleToggleRestriction}
                disabled={savingRestriction}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 flex-shrink-0 ${
                  workflow?.isRestricted
                    ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border-white/15'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                }`}
              >
                {savingRestriction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : workflow?.isRestricted ? (
                  'Make Open'
                ) : (
                  'Restrict to Selected'
                )}
              </button>
            )}
          </div>

          {/* Section 9: Add Team Member to Workflow Form */}
          {canManage && (
            <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                <UserPlus className="w-4 h-4 text-brand-400" />
                <span>Add Team Member to Workflow</span>
              </div>
              <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/15 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="" className="bg-[#111827] text-slate-400">Select team member...</option>
                    {availableTeamMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#111827] text-slate-100">
                        {m.name} ({m.role.replace('TEAM_', '')}) - {m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-44">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/15 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="WORKFLOW_MEMBER" className="bg-[#111827] text-slate-100">Workflow Member</option>
                    <option value="WORKFLOW_MANAGER" className="bg-[#111827] text-slate-100">Workflow Manager</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingMember || !selectedUserId}
                  className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 flex-shrink-0"
                >
                  {addingMember ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Add Member</span>
                    </>
                  )}
                </button>
              </form>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span>
                  <strong>Workflow Managers</strong> can assign tasks and build DAG nodes. <strong>Workflow Members</strong> execute assigned tasks.
                </span>
              </div>
            </div>
          )}

          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Pending Invitations ({pendingInvitations.length})
                </h4>
              </div>

              <div className="divide-y divide-white/5 border border-amber-500/20 rounded-2xl overflow-hidden bg-amber-500/5 shadow-sm">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300 flex-shrink-0 shadow-inner">
                        {inv.invitedUser?.name ? inv.invitedUser.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">
                            {inv.invitedUser?.name || 'Collaborator'}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            <Clock className="w-2.5 h-2.5 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          @{inv.invitedUser?.username || 'user'} • {inv.invitedUser?.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/10 text-slate-300">
                        Role: {inv.role}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id, inv.invitedUser?.name || 'collaborator')}
                          disabled={cancellingInviteId === inv.id}
                          title="Revoke / Cancel this pending invitation"
                          className="px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center space-x-1 disabled:opacity-50"
                        >
                          {cancellingInviteId === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Workflow Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Workflow Members ({workflowMembers.length})
              </h4>
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center space-y-2 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 text-brand-400 animate-spin mr-2" />
                <span>Loading workflow members...</span>
              </div>
            ) : workflowMembers.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-white/[0.025] border border-white/10 text-xs text-slate-400">
                No explicit members assigned yet. {workflow?.isRestricted ? 'Add members above to grant access.' : 'All team members currently have access.'}
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-white/[0.025]">
                {workflowMembers.map((member) => {
                  const role = (member.role || 'WORKFLOW_MEMBER').toUpperCase();
                  const isSelf = member.id === user?.id;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-bold text-slate-200 flex-shrink-0">
                          {member.name ? member.name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white truncate">
                              {member.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {member.email || member.id}
                          </span>
                        </div>
                      </div>

                      {/* Role selection & Actions */}
                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {role === 'OWNER' ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono inline-flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>OWNER</span>
                          </span>
                        ) : canManage && !isSelf ? (
                          <>
                            <select
                              value={role === 'MANAGER' || role === 'WORKFLOW_MANAGER' ? 'WORKFLOW_MANAGER' : 'WORKFLOW_MEMBER'}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              className="px-3 py-1.5 bg-[#111827] border border-white/15 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
                            >
                              <option value="WORKFLOW_MEMBER" className="bg-[#111827] text-slate-100">Workflow Member</option>
                              <option value="WORKFLOW_MANAGER" className="bg-[#111827] text-slate-100">Workflow Manager</option>
                            </select>

                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              title="Remove member from workflow"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono inline-flex items-center space-x-1.5 ${
                              role === 'WORKFLOW_MANAGER' || role === 'MANAGER'
                                ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            {role === 'WORKFLOW_MANAGER' || role === 'MANAGER' ? (
                              <Shield className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>{role.replace('WORKFLOW_', '')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default WorkflowPermissionsModal;
