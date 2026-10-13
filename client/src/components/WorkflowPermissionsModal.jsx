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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-dark-900 border border-slate-800 rounded-2xl shadow-card-dark overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-dark-850">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Workflow Access & Roles</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-dark-800 border border-slate-700 text-brand-300 font-medium">
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
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Status Message */}
          {message.text && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
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
          <div className="p-4 rounded-xl bg-dark-850 border border-slate-800 flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl border ${workflow?.isRestricted ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                {workflow?.isRestricted ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {workflow?.isRestricted ? 'Restricted Access Workflow' : 'All Team Members Have Access'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                  workflow?.isRestricted
                    ? 'bg-dark-800 hover:bg-dark-750 text-slate-300 border-slate-700'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
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
            <div className="p-4 rounded-xl bg-dark-850 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <UserPlus className="w-4 h-4 text-brand-400" />
                <span>Add Team Member to Workflow</span>
              </div>
              <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select team member...</option>
                    {availableTeamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role.replace('TEAM_', '')}) - {m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-44">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="WORKFLOW_MEMBER">Workflow Member</option>
                    <option value="WORKFLOW_MANAGER">Workflow Manager</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingMember || !selectedUserId}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-glow-brand transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 flex-shrink-0"
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

          {/* Pending Invitations Section (Requested by user: "also in access option i should see pending") */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Pending Invitations ({pendingInvitations.length})
                </h4>
              </div>

              <div className="divide-y divide-amber-900/30 border border-amber-800/50 rounded-xl overflow-hidden bg-amber-950/20 shadow-sm">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-950/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300 flex-shrink-0">
                        {inv.invitedUser?.name ? inv.invitedUser.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-100 truncate">
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
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-dark-800 border border-slate-700 text-slate-300">
                        Role: {inv.role}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id, inv.invitedUser?.name || 'collaborator')}
                          disabled={cancellingInviteId === inv.id}
                          title="Revoke / Cancel this pending invitation"
                          className="px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-all flex items-center space-x-1 disabled:opacity-50"
                        >
                          {cancellingInviteId === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel Invite</span>
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
              <div className="p-4 text-center rounded-xl bg-dark-850 border border-slate-800 text-xs text-slate-400">
                No explicit members assigned yet. {workflow?.isRestricted ? 'Add members above to grant access.' : 'All team members currently have access.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-dark-850">
                {workflowMembers.map((member) => {
                  const role = (member.role || 'WORKFLOW_MEMBER').toUpperCase();
                  const isSelf = member.id === user?.id;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-800/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-dark-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 flex-shrink-0">
                          {member.name ? member.name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-200 truncate">
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
                              className="px-2.5 py-1.5 bg-dark-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-500"
                            >
                              <option value="WORKFLOW_MEMBER">Workflow Member</option>
                              <option value="WORKFLOW_MANAGER">Workflow Manager</option>
                            </select>

                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              title="Remove member from workflow"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
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
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-dark-850">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-750 border border-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default WorkflowPermissionsModal;
