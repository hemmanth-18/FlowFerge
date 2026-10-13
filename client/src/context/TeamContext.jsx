import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const TeamContext = createContext(null);

export const TeamProvider = ({ children }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeRole, setActiveRole] = useState('TEAM_MEMBER');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [myInvitations, setMyInvitations] = useState([]);

  // Fetch team members whenever activeTeam changes
  useEffect(() => {
    if (activeTeam?.id) {
      api.get(`/teams/${activeTeam.id}/members`)
        .then((res) => setTeamMembers(res.data.data || []))
        .catch(() => setTeamMembers([]));
    } else {
      setTeamMembers([]);
    }
  }, [activeTeam?.id]);

  // Fetch all teams for user
  const fetchTeams = useCallback(async (preferredTeamId = null) => {
    if (!user) {
      setTeams([]);
      setActiveTeam(null);
      setLoadingTeams(false);
      return;
    }

    try {
      setLoadingTeams(true);
      const res = await api.get('/teams');
      const teamList = res.data.data || [];
      setTeams(teamList);

      const savedTeamId = preferredTeamId || localStorage.getItem('flowforge_active_team_id');
      let current = null;

      if (savedTeamId) {
        current = teamList.find((t) => t.id === savedTeamId);
      }
      if (!current && teamList.length > 0) {
        current = teamList[0];
      }

      if (current) {
        setActiveTeam(current);
        const isTeamCreator = current.createdBy === user.id || current.ownerId === user.id;
        const role = isTeamCreator ? 'TEAM_ADMIN' : (current.userRole || 'TEAM_MEMBER');
        setActiveRole(role);
        localStorage.setItem('flowforge_active_team_id', current.id);
      } else {
        setActiveTeam(null);
        setActiveRole('TEAM_MEMBER');
        localStorage.removeItem('flowforge_active_team_id');
      }
    } catch (err) {
      console.error('Failed to load user teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  }, [user]);

  // Fetch pending invitations for user
  const fetchMyInvitations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/teams/invitations/my');
      setMyInvitations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchTeams();
    fetchMyInvitations();
  }, [fetchTeams, fetchMyInvitations]);

  // Switch Active Team
  const switchTeam = useCallback((teamId) => {
    const target = teams.find((t) => t.id === teamId);
    if (target) {
      setActiveTeam(target);
      const isTeamCreator = target.createdBy === user?.id || target.ownerId === user?.id;
      const role = isTeamCreator ? 'TEAM_ADMIN' : (target.userRole || 'TEAM_MEMBER');
      setActiveRole(role);
      localStorage.setItem('flowforge_active_team_id', target.id);
      // Dispatch custom event so pages can optionally listen or reload
      window.dispatchEvent(new CustomEvent('flowforge_team_switched', { detail: target }));
    }
  }, [teams, user?.id]);

  // Create Team
  const createTeam = async ({ name, description, icon }) => {
    const res = await api.post('/teams', { name, description, icon });
    const newTeam = res.data.data;
    await fetchTeams(newTeam.id);
    return newTeam;
  };

  // Update Team
  const updateTeam = async (teamId, updates) => {
    const res = await api.put(`/teams/${teamId}`, updates);
    const updated = res.data.data;
    await fetchTeams(teamId);
    return updated;
  };

  // Archive / Delete Team
  const archiveTeam = async (teamId) => {
    const targetId = teamId || activeTeam?.id;
    if (!targetId) return;
    const res = await api.delete(`/teams/${targetId}`);
    localStorage.removeItem('flowforge_active_team_id');
    await fetchTeams();
    return res.data?.data;
  };

  // Accept Invitation
  const acceptInvitation = async (invitationId) => {
    const res = await api.post(`/teams/invitations/${invitationId}/accept`);
    const newTeamId = res.data.data?.teamId;
    await fetchMyInvitations();
    await fetchTeams(newTeamId);
    return res.data;
  };

  // Decline Invitation
  const declineInvitation = async (invitationId) => {
    await api.post(`/teams/invitations/${invitationId}/decline`);
    await fetchMyInvitations();
  };

  const isOwner = Boolean(
    activeTeam && (activeTeam.createdBy === user?.id || activeTeam.ownerId === user?.id || activeRole === 'TEAM_ADMIN' || activeRole === 'OWNER')
  );
  const isAdmin = Boolean(isOwner || activeRole === 'TEAM_ADMIN' || activeRole === 'ADMIN');
  const isManager = Boolean(isAdmin || activeRole === 'TEAM_MANAGER' || activeRole === 'MANAGER');
  const isMember = Boolean(activeRole === 'TEAM_MEMBER' || activeRole === 'MEMBER');

  return (
    <TeamContext.Provider
      value={{
        teams,
        activeTeam,
        activeRole,
        teamMembers,
        isOwner,
        isAdmin,
        isManager,
        isMember,
        loadingTeams,
        myInvitations,
        switchTeam,
        createTeam,
        updateTeam,
        archiveTeam,
        deleteTeam: archiveTeam,
        acceptInvitation,
        declineInvitation,
        fetchTeams,
        fetchMyInvitations,
        refreshTeams: fetchTeams,
        refreshInvitations: fetchMyInvitations,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
