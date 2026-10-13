import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  ListTodo,
  Settings,
  LogOut,
  Sparkles,
  Zap,
  Layers,
  ChevronRight,
  ChevronDown,
  Users,
  Shield,
  Lock,
  Activity,
  Plus,
  Bell,
  Check,
  Building2,
  Mail,
  User,
  Share2,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { CreateTeamModal } from './CreateTeamModal';
import { TeamIcon } from './TeamIcon';
import { api } from '../services/api';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const {
    teams,
    activeTeam,
    activeRole,
    isAdmin,
    isManager,
    switchTeam,
    myInvitations,
    acceptInvitation,
    declineInvitation,
  } = useTeam();

  const navigate = useNavigate();
  const location = useLocation();
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const dropdownRef = useRef(null);

  // Close team dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    if (isOpen) {
      onClose?.();
    }
  }, [location.pathname, location.search]);

  // Poll unread notification count
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data?.success) {
          const unread = (res.data.data || []).filter((n) => !n.read).length;
          setUnreadNotifsCount(unread);
        }
      } catch (e) {}
    };
    checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  // Section 15: Sidebar Navigation Hierarchy
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Workflows', path: '/workflows?filter=owned', icon: FolderGit2 },
    { label: 'Shared With Me', path: '/workflows?filter=shared', icon: Share2 },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Automations', path: '/automations', icon: Sparkles },
    { label: 'Teams', path: '/team', icon: Building2 },
    { label: 'People', path: '/people', icon: Users },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : null,
    },
    { label: 'Activity', path: '/activity', icon: Activity },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Audit Logs', path: '/audit', icon: Lock });
  }

  navItems.push({ label: 'Settings', path: '/settings', icon: Settings });

  const handleSignOut = async () => {
    await signOut();
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'TEAM_ADMIN') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (role === 'TEAM_MANAGER') return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0D1220]/80 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
          <NavLink to="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-black tracking-tight text-white group-hover:text-purple-300 transition-colors uppercase">
                  FlowForge
                </span>
              </div>
              <span className="block text-[9px] font-mono tracking-widest text-[#94A3B8] uppercase">
                Workflow Platform
              </span>
            </div>
          </NavLink>
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-white hover:bg-white/10 rounded-xl lg:hidden transition-colors"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WORKSPACE / TEAM SWITCHER */}
        <div className="p-3 border-b border-white/10 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.045] hover:bg-white/[0.08] border border-white/10 transition-all text-left group"
          >
            <div className="flex items-center space-x-2.5 truncate">
              <TeamIcon icon={activeTeam?.icon} className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div className="truncate">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-xs font-bold text-[#F8FAFC] truncate group-hover:text-purple-300 transition-colors">
                    {activeTeam?.name || 'Workspace'}
                  </span>
                </div>
                <span
                  className={`inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeColor(
                    activeRole
                  )}`}
                >
                  {activeRole?.replace('TEAM_', '') || 'MEMBER'}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#94A3B8] transition-transform ${
                teamDropdownOpen ? 'rotate-180 text-purple-400' : ''
              }`}
            />
          </button>

          {/* Team Switcher Menu */}
          {teamDropdownOpen && (
            <div className="absolute top-full left-3 right-3 mt-1.5 bg-[#0D1220]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-white/10">
                Switch Team ({teams.length})
              </div>

              <div className="max-h-56 overflow-y-auto py-1">
                {teams.map((t) => {
                  const isCurrent = t.id === activeTeam?.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        switchTeam(t.id);
                        setTeamDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                        isCurrent
                          ? 'bg-purple-500/15 text-purple-300 font-semibold'
                          : 'text-[#CBD5E1] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <TeamIcon icon={t.icon} className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div className="text-left truncate">
                          <p className="truncate text-xs">{t.name}</p>
                          <span className="text-[9px] text-[#94A3B8] font-mono">
                            {t.userRole?.replace('TEAM_', '')}
                          </span>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Create Team Trigger */}
              <div className="p-2 border-t border-white/10 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => {
                    setTeamDropdownOpen(false);
                    setCreateTeamModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Team</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pending Team Invitations Alert Card */}
        {myInvitations.length > 0 && (
          <div className="p-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                <Mail className="w-3.5 h-3.5" />
                <span>{myInvitations.length} Team Invitation</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-snug">
                You were invited to join "{myInvitations[0].teamName}".
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => acceptInvitation(myInvitations[0].id)}
                  className="flex-1 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-[11px] transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineInvitation(myInvitations[0].id)}
                  className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#CBD5E1] text-[11px] transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 15 NAVIGATION ITEMS */}
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Support query param active state (e.g. /workflows?filter=owned)
            const currentFull = `${location.pathname}${location.search}`;
            const isActive =
              item.path.includes('?')
                ? currentFull === item.path
                : location.pathname === item.path && !location.search.includes('filter=');

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-purple-600/15 text-[#F8FAFC] border border-purple-500/35 shadow-sm'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    className={`w-4 h-4 transition-colors flex-shrink-0 ${
                      isActive ? 'text-purple-400' : 'text-[#94A3B8] group-hover:text-purple-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {item.badge && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse leading-none shadow-sm shadow-purple-500/40">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* USER PROFILE & LOGOUT */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/15 transition-all">
            <NavLink
              to="/settings"
              onClick={onClose}
              className="flex items-center space-x-2.5 truncate flex-1 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8B5CF6] to-[#38BDF8] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                  {user?.name || 'FlowForge User'}
                </p>
                <span className="text-[10px] text-purple-400 font-mono truncate block">
                  @{user?.username || user?.email?.split('@')[0]}
                </span>
              </div>
            </NavLink>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-[#94A3B8] hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
      />
    </>
  );
};
