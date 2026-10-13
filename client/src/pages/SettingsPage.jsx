import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Database,
  ShieldCheck,
  User,
  Sparkles,
  Layers,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Building2,
  Archive,
  CheckSquare,
  Calendar,
  Edit3,
  FolderGit2,
  Share2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ArchiveTeamModal } from '../components/ArchiveTeamModal';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { TeamIcon, AVAILABLE_TEAM_ICONS } from '../components/TeamIcon';
import { api } from '../services/api';

export const SettingsPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager, updateTeam, refreshTeams } = useTeam();
  const toast = useToast();

  usePageMeta('Settings & Profile', 'Manage profile credentials, team properties, and security configuration.');

  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Active Team form state
  const [teamName, setTeamName] = useState(activeTeam?.name || '');
  const [teamDesc, setTeamDesc] = useState(activeTeam?.description || '');
  const [teamIcon, setTeamIcon] = useState(activeTeam?.icon || 'code');
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamSuccess, setTeamSuccess] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.name || '');
      setTeamDesc(activeTeam.description || '');
      setTeamIcon(activeTeam.icon || 'code');
    }
  }, [activeTeam]);

  useEffect(() => {
    const fetchProfileAndHealth = async () => {
      try {
        setLoadingProfile(true);
        const [profRes, healthRes] = await Promise.all([
          api.get('/users/me').catch(() => api.get('/teams/profile/me')),
          api.get('/health').catch(() => ({ data: null })),
        ]);
        const data = profRes.data?.data;
        setProfileData(data);
        setEditName(data?.name || user?.name || '');
        setHealthData(healthRes.data);
      } catch (err) {
        console.error('Failed to load profile/health:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfileAndHealth();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      setSavingProfile(true);
      const res = await api.put('/users/me', { name: editName.trim() });
      if (res.data?.success) {
        setProfileData((prev) => ({ ...prev, name: res.data.data.name }));
        setIsEditingName(false);
        setProfileSuccess(true);
        toast.success('Profile name updated successfully!');
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateTeamSettings = async (e) => {
    e.preventDefault();
    if (!isAdmin || !activeTeam) return;

    try {
      setSavingTeam(true);
      await updateTeam(activeTeam.id, {
        name: teamName,
        description: teamDesc,
        icon: teamIcon,
      });
      setTeamSuccess(true);
      toast.success('Team settings updated successfully!');
      setTimeout(() => setTeamSuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to update team settings: ' + err.message);
    } finally {
      setSavingTeam(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-16 selection:bg-purple-600 selection:text-white">
      <Navbar onOpenSidebar={() => setSidebarOpen && setSidebarOpen(true)} title="Settings & User Profile" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* USER PROFILE (Name, Email, Teams, Roles, Assigned Tasks) */}
        <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-5 relative overflow-hidden">
          {/* Top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">User Profile</h3>
              <p className="text-xs text-slate-400">
                Your account details, team memberships, and assigned tasks
              </p>
            </div>
          </div>

          {loadingProfile ? (
            <div className="py-8 flex items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header with Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.035] border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-brand-500/25 border border-white/20 flex-shrink-0">
                    {(profileData?.name || user?.name || profileData?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-bold text-white">
                        {profileData?.name || user?.name || 'User'}
                      </h4>
                      {profileSuccess && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-brand-400">
                      @{profileData?.username || user?.username || 'user'}
                    </p>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Joined {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {!isEditingName ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Name</span>
                    </button>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="min-w-0 flex-1 sm:w-auto px-3 py-1.5 bg-[#111827] border border-brand-500/50 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="Full Name"
                        required
                      />
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-3 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 disabled:opacity-50 shadow-md shadow-brand-500/20"
                      >
                        {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(false);
                          setEditName(profileData?.name || user?.name || '');
                        }}
                        className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 rounded-xl text-xs font-medium transition-colors border border-white/10"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Account Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Email Address
                  </span>
                  <span className="text-xs font-mono text-slate-200 mt-1 block truncate">
                    {profileData?.email || user?.email}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Workflows Owned
                  </span>
                  <span className="text-base font-bold text-brand-400 mt-0.5 block">
                    {profileData?.ownedWorkflowsCount ?? (profileData?.ownedWorkflows?.length || 0)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Shared With Me
                  </span>
                  <span className="text-base font-bold text-sky-400 mt-0.5 block">
                    {profileData?.sharedWorkflowsCount ?? (profileData?.sharedWorkflows?.length || 0)}
                  </span>
                </div>
              </div>

              {/* Security Policy Reminder */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Permission & Role Policy:</strong> FlowForge assigns user roles strictly through team ownership and workflow invitations. User roles cannot be modified via profile editing.
                </span>
              </div>

              {/* Workflows Owned Breakdown */}
              {profileData?.ownedWorkflows?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>My Owned Workflows ({profileData.ownedWorkflows.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {profileData.ownedWorkflows.map((w) => (
                      <div
                        key={w.id}
                        className="p-3 rounded-xl bg-white/[0.035] border border-white/10 flex items-center justify-between"
                      >
                        <span className="text-xs font-medium text-slate-200 truncate">{w.name}</span>
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          OWNER
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflows Shared Breakdown */}
              {profileData?.sharedWorkflows?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                    <Share2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Shared Workflows ({profileData.sharedWorkflows.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {profileData.sharedWorkflows.map((w) => (
                      <div
                        key={w.id}
                        className="p-3 rounded-xl bg-white/[0.035] border border-white/10 flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <span className="text-xs font-medium text-slate-200 block truncate">{w.name}</span>
                          {w.teamName && (
                            <span className="text-[10px] text-slate-500">{w.teamName}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {w.userRole || 'COLLABORATOR'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams & Roles Matrix */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                  My Teams & Roles ({profileData?.teams?.length || 0})
                </h4>
                {profileData?.teams?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {profileData.teams.map((t) => (
                      <div
                        key={t.teamId}
                        className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center space-x-2">
                          <TeamIcon icon={t.teamIcon} className="w-4 h-4 text-brand-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-white truncate">
                            {t.teamName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Role:{' '}
                          <span className="font-mono font-bold text-brand-400">
                            {t.role.replace('TEAM_', '')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No teams joined yet.</p>
                )}
              </div>

              {/* Total Assigned Tasks Summary */}
              <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300">
                    Total Assigned Tasks:
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  {profileData?.assignedTasksCount || 0} Tasks
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE TEAM SETTINGS & ARCHIVING (Team Admin Only) */}
        {isAdmin && activeTeam && (
          <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Top edge highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeTeam.name} Team Settings
                </h3>
                <p className="text-xs text-slate-400">
                  Manage team name, description, icon, and lifecycle
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateTeamSettings} className="space-y-4 max-w-lg">
              {/* Icon */}
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
                      onClick={() => setTeamIcon(id)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        teamIcon === id
                          ? 'bg-brand-500/25 border-2 border-brand-400 scale-105 text-brand-300 shadow-md shadow-brand-500/20'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/15 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Team Description
                </label>
                <textarea
                  rows={3}
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#111827] border border-white/15 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-xs resize-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
                >
                  {savingTeam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Team Details</span>
                </button>
                {teamSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </span>
                )}
              </div>
            </form>

            {/* Team Archive / Danger Zone */}
            <div className="pt-5 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Danger Zone
              </h4>
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-white">Archive {activeTeam.name}</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Soft-delete this team, revoking active access for all members.
                  </p>
                </div>
                <button
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Team</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Database & System Telemetry */}
        <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-4 relative overflow-hidden">
          {/* Top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Primary Database Engine</h3>
              <p className="text-xs text-slate-400">Supabase PostgreSQL & Auth persistence</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Engine Mode</span>
              <span className="font-mono text-emerald-400 font-bold flex items-center space-x-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{healthData?.database || 'Supabase PostgreSQL'}</span>
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">API & Auth Platform</span>
              <span className="font-mono text-slate-200 font-bold mt-1 block">
                {healthData?.auth || 'Supabase Auth'} • {healthData?.status || 'ok'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Modal */}
      {activeTeam && (
        <ArchiveTeamModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          team={activeTeam}
        />
      )}
    </div>
  );
};

export default SettingsPage;
