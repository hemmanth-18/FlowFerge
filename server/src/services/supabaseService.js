const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let tablesAvailable = false;
let lastCheckTime = 0;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
}

const SESSIONS_FILE = path.join(__dirname, '..', '.sessions.json');
const DOCUMENTS_FILE = path.join(__dirname, '..', '.documents.json');

// In-memory store for high performance and fallback synchronization
const memoryDb = {
  users: new Map(),
  sessions: new Map(), // sessionId -> { sessionId, userId, createdAt, expiresAt }
  resetTokens: new Map(), // token -> { token, email, expiresAt }
  teams: new Map(),
  teamMembers: new Map(), // `${teamId}:${userId}` -> { id, teamId, userId, role, joinedAt }
  teamInvitations: new Map(), // invitationId -> invitation
  workflows: new Map(),
  workflowMembers: new Map(), // `${workflowId}:${userId}` -> { id, workflowId, userId, role, joinedAt }
  workflowInvitations: new Map(), // invitationId -> invitation
  workflowDocuments: new Map(), // docId -> document metadata
  tasks: new Map(),
  automations: new Map(),
  automationLogs: [],
  auditLogs: [],
  notifications: new Map(), // id -> notification
  activityLogs: [],
};

// High-performance micro-caches for read-heavy polling operations
const notificationCache = new Map(); // userId -> { timestamp, data }
const teamCache = new Map(); // userId -> { timestamp, data }
const workflowCache = new Map(); // cacheKey -> { timestamp, data }

function invalidateNotificationCache(userId) {
  if (userId) notificationCache.delete(userId);
  else notificationCache.clear();
}

function invalidateTeamCache(userId) {
  if (userId) teamCache.delete(userId);
  else teamCache.clear();
}

function invalidateWorkflowCache() {
  workflowCache.clear();
}

function loadPersistedSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s && s.sessionId && new Date(s.expiresAt) > new Date()) {
            memoryDb.sessions.set(s.sessionId, s);
          }
        }
      }
    }
  } catch (e) {}
}

function savePersistedSessions() {
  try {
    const list = Array.from(memoryDb.sessions.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}
}

function loadPersistedDocuments() {
  try {
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        for (const doc of data) {
          if (doc && doc.id) {
            memoryDb.workflowDocuments.set(doc.id, doc);
          }
        }
      }
    }
  } catch (e) {}
}

function savePersistedDocuments() {
  try {
    const list = Array.from(memoryDb.workflowDocuments.values());
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}
}

loadPersistedSessions();
loadPersistedDocuments();

let readinessPromise = null;

// Check table readiness (cached for 30 seconds when ready)
async function areTablesReady() {
  if (!supabase) return false;
  const now = Date.now();
  if (tablesAvailable && now - lastCheckTime < 30000) {
    return true;
  }
  if (readinessPromise) {
    return readinessPromise;
  }

  readinessPromise = (async () => {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      tablesAvailable = !error;
      lastCheckTime = Date.now();
      if (tablesAvailable) {
        console.log('\x1b[32m%s\x1b[0m', '✓ [Supabase] PostgreSQL schema active & ready!');
      }
    } catch (e) {
      tablesAvailable = false;
    } finally {
      readinessPromise = null;
    }
    return tablesAvailable;
  })();

  return readinessPromise;
}

areTablesReady();

const SupabaseService = {
  client: supabase,

  async checkConnection() {
    if (!supabase) return { connected: false, tablesReady: false };
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        tablesAvailable = false;
        return { connected: true, tablesReady: false, error: error.message };
      }
      tablesAvailable = true;
      return { connected: true, tablesReady: true };
    } catch (err) {
      tablesAvailable = false;
      return { connected: false, tablesReady: false, error: err.message };
    }
  },

  // ====================================================
  // 1. USERS & AUTHENTICATION
  // ====================================================
  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },

  async getUserById(userId) {
    if (!userId) return null;
    let user = memoryDb.users.get(userId);
    if (!user && (await areTablesReady())) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (data && !error) {
          user = {
            id: data.id,
            name: data.name,
            username: data.username || data.email?.split('@')[0],
            email: data.email,
            role: data.role || 'MEMBER',
            avatar: data.avatar,
            passwordHash: data.password_hash || null,
            createdAt: data.created_at,
            lastLogin: data.last_login,
          };
          memoryDb.users.set(userId, user);
        }
      } catch (e) {}
    }
    return user || null;
  },

  async getUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    for (const u of memoryDb.users.values()) {
      if (u.email && u.email.toLowerCase() === normalized) return u;
    }
    if (await areTablesReady()) {
      try {
        const { data, error } = await supabase.from('users').select('*').ilike('email', normalized).single();
        if (data && !error) {
          const user = {
            id: data.id,
            name: data.name,
            username: data.username || data.email?.split('@')[0],
            email: data.email,
            role: data.role || 'MEMBER',
            avatar: data.avatar,
            passwordHash: data.password_hash || null,
            createdAt: data.created_at,
            lastLogin: data.last_login,
          };
          memoryDb.users.set(user.id, user);
          return user;
        }
      } catch (e) {}
    }
    return null;
  },

  async getUserByUsername(username) {
    if (!username) return null;
    const normalized = username.trim().toLowerCase();
    for (const u of memoryDb.users.values()) {
      if (u.username && u.username.toLowerCase() === normalized) return u;
    }
    if (await areTablesReady()) {
      try {
        const { data, error } = await supabase.from('users').select('*').ilike('username', normalized).single();
        if (data && !error) {
          const user = {
            id: data.id,
            name: data.name,
            username: data.username || data.email?.split('@')[0],
            email: data.email,
            role: data.role || 'MEMBER',
            avatar: data.avatar,
            passwordHash: data.password_hash || null,
            createdAt: data.created_at,
            lastLogin: data.last_login,
          };
          memoryDb.users.set(user.id, user);
          return user;
        }
      } catch (e) {}
    }
    return null;
  },

  async searchUsers(query = '', currentUserId = null, limit = 20) {
    const clean = (query || '').trim().toLowerCase().replace(/^@/, '');
    const results = new Map();

    // 1. Search memoryDb first
    for (const u of memoryDb.users.values()) {
      if (currentUserId && u.id === currentUserId) continue;
      if (!clean) {
        results.set(u.id, this.sanitizeUser(u));
      } else {
        const emailMatch = u.email && u.email.toLowerCase().includes(clean);
        const nameMatch = u.name && u.name.toLowerCase().includes(clean);
        const usernameMatch = u.username && u.username.toLowerCase().includes(clean);
        if (emailMatch || nameMatch || usernameMatch) {
          results.set(u.id, this.sanitizeUser(u));
        }
      }
      if (results.size >= limit) break;
    }

    // 2. Query Supabase users table
    if (await areTablesReady()) {
      try {
        let sbQuery = supabase.from('users').select('id, name, username, email, avatar, role, created_at, last_login');
        if (clean) {
          sbQuery = sbQuery.or(`email.ilike.%${clean}%,name.ilike.%${clean}%,username.ilike.%${clean}%`);
        }
        if (currentUserId) {
          sbQuery = sbQuery.neq('id', currentUserId);
        }
        sbQuery = sbQuery.limit(limit);

        const { data, error } = await sbQuery;
        if (data && !error) {
          for (const row of data) {
            if (!results.has(row.id)) {
              const mapped = {
                id: row.id,
                name: row.name,
                username: row.username || row.email?.split('@')[0],
                email: row.email,
                avatar: row.avatar,
                role: row.role || 'MEMBER',
                createdAt: row.created_at,
                lastLogin: row.last_login,
              };
              results.set(row.id, mapped);
              if (!memoryDb.users.has(row.id)) {
                memoryDb.users.set(row.id, mapped);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Supabase searchUsers error]:', err.message);
      }
    }

    return Array.from(results.values()).slice(0, limit);
  },

  async getOrCreateUser(userId, userData = {}) {
    let existing = await this.getUserById(userId);
    const now = new Date().toISOString();
    if (existing) {
      if (userData.passwordHash) existing.passwordHash = userData.passwordHash;
      if (userData.name) existing.name = userData.name;
      if (userData.username) existing.username = userData.username;
      return existing;
    }

    const salt = await bcrypt.genSalt(10);
    const defaultHash = userData.passwordHash || (await bcrypt.hash('Password123!', salt));

    const newUser = {
      id: userId,
      email: userData.email || `${userId}@flowforge.local`,
      username: userData.username || userId.replace('user_', ''),
      name: userData.name || 'FlowForge User',
      role: userData.role || 'MEMBER',
      avatar: userData.avatar || null,
      passwordHash: defaultHash,
      createdAt: now,
      lastLogin: now,
    };

    memoryDb.users.set(userId, newUser);

    if (await areTablesReady()) {
      try {
        await supabase.from('users').upsert({
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          name: newUser.name,
          role: newUser.role,
          avatar: newUser.avatar,
          password_hash: newUser.passwordHash,
          created_at: now,
          last_login: now,
        }, { onConflict: 'id' });
      } catch (e) {}
    }

    return newUser;
  },

  async registerUser({ name, username, email, password }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const existingEmail = await this.getUserByEmail(cleanEmail);
    if (existingEmail) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    const existingUsername = await this.getUserByUsername(cleanUsername);
    if (existingUsername) {
      throw new Error(`Username "@${cleanUsername}" is already taken. Please choose another.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `user_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();

    const user = {
      id: userId,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      role: 'MEMBER',
      avatar: null,
      passwordHash,
      createdAt: now,
      lastLogin: now,
    };

    memoryDb.users.set(userId, user);

    if (await areTablesReady()) {
      try {
        await supabase.from('users').insert([{
          id: userId,
          email: cleanEmail,
          username: cleanUsername,
          name: name.trim(),
          role: 'MEMBER',
          password_hash: passwordHash,
          created_at: now,
          last_login: now,
        }]);
      } catch (e) {}
    }

    return this.sanitizeUser(user);
  },

  async loginUser({ identifier, password }) {
    const cleanIdentifier = identifier.trim().toLowerCase();
    let user = null;

    if (cleanIdentifier.includes('@')) {
      user = await this.getUserByEmail(cleanIdentifier);
    } else {
      user = await this.getUserByUsername(cleanIdentifier);
    }

    // If local user found and has passwordHash, verify bcrypt hash
    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (isMatch) {
        user.lastLogin = new Date().toISOString();
        return this.sanitizeUser(user);
      }
    }

    // Fallback: Check Supabase Auth if identifier is an email
    if (supabase && cleanIdentifier.includes('@')) {
      try {
        const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
          email: cleanIdentifier,
          password,
        });
        if (!sbErr && sbData?.user) {
          const sbUser = sbData.user;
          user = (await this.getUserById(sbUser.id)) || (await this.getUserByEmail(sbUser.email));
          if (!user) {
            user = await this.getOrCreateUser(sbUser.id, {
              email: sbUser.email,
              name: sbUser.user_metadata?.name || sbUser.email.split('@')[0],
              username: sbUser.user_metadata?.username,
            });
          }
          user.lastLogin = new Date().toISOString();
          return this.sanitizeUser(user);
        }
      } catch (e) {}
    }

    throw new Error('Invalid email/username or password.');
  },

  async createSession(userId) {
    const sessionId = `sess_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const session = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt,
    };

    memoryDb.sessions.set(sessionId, session);
    savePersistedSessions();
    return session;
  },

  async getSession(sessionId) {
    if (!sessionId) return null;
    let session = memoryDb.sessions.get(sessionId);
    if (!session) {
      loadPersistedSessions();
      session = memoryDb.sessions.get(sessionId);
    }
    if (!session) {
      // If sessionId is a known user id, permit session
      const u = memoryDb.users.get(sessionId) || (await this.getUserById(sessionId));
      if (u) return { sessionId, userId: u.id };
      return null;
    }
    if (new Date(session.expiresAt) < new Date()) {
      memoryDb.sessions.delete(sessionId);
      savePersistedSessions();
      return null;
    }
    return session;
  },

  async deleteSession(sessionId) {
    if (sessionId) memoryDb.sessions.delete(sessionId);
    savePersistedSessions();
    return true;
  },

  storeSession(sessionId, session) {
    if (sessionId && session) {
      memoryDb.sessions.set(sessionId, session);
      savePersistedSessions();
    }
  },

  async createPasswordResetToken(email) {
    const user = await this.getUserByEmail(email);
    const token = `rst_${uuidv4().replace(/-/g, '')}`;
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    if (user) {
      memoryDb.resetTokens.set(token, { token, email: user.email, expiresAt });
    }
    return { success: true, token };
  },

  async resetPassword(token, newPassword) {
    const record = memoryDb.resetTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      throw new Error('Password reset token is invalid or has expired.');
    }

    const user = await this.getUserByEmail(record.email);
    if (!user) throw new Error('User not found.');

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    memoryDb.resetTokens.delete(token);
    return true;
  },

  async searchUsers(query = '', currentUserId = null, limit = 20) {
    const q = (query || '').trim().toLowerCase();
    const results = [];

    for (const u of memoryDb.users.values()) {
      if (currentUserId && u.id === currentUserId) continue;
      const matchName = u.name && u.name.toLowerCase().includes(q);
      const matchEmail = u.email && u.email.toLowerCase().includes(q);
      const matchUsername = u.username && u.username.toLowerCase().includes(q);

      if (!q || matchName || matchEmail || matchUsername) {
        results.push({
          id: u.id,
          name: u.name,
          username: u.username || u.email?.split('@')[0],
          email: u.email,
          avatar: u.avatar,
          createdAt: u.createdAt,
        });
      }
      if (results.length >= limit) break;
    }

    if (results.length === 0 && (await areTablesReady())) {
      try {
        let dbQuery = supabase.from('users').select('id, name, username, email, avatar, created_at').limit(limit);
        if (q) {
          dbQuery = dbQuery.or(`name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`);
        }
        const { data } = await dbQuery;
        if (data) {
          return data.filter(u => u.id !== currentUserId);
        }
      } catch (e) {}
    }

    return results;
  },

  async getAllUsers() {
    return Array.from(memoryDb.users.values()).map(u => this.sanitizeUser(u));
  },

  async getUserProfile(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const teams = await this.getUserTeams(userId);
    const assignedTasks = await this.getMyTasks(userId);

    return {
      ...this.sanitizeUser(user),
      teams: teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        teamIcon: t.icon,
        role: t.userRole,
      })),
      assignedTasksCount: assignedTasks.length,
      assignedTasks: assignedTasks.slice(0, 10),
    };
  },

  async updateUserProfile(userId, updates = {}) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    if (updates.name && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.avatar !== undefined) {
      user.avatar = updates.avatar;
    }

    if (await areTablesReady()) {
      try {
        await supabase
          .from('users')
          .update({ name: user.name, avatar: user.avatar })
          .eq('id', userId);
      } catch (e) {}
    }

    return this.sanitizeUser(user);
  },

  // ====================================================
  // 2. TEAMS & MEMBERSHIP
  // ====================================================
  async createTeam(creatorUserId, { name, description = '', icon = '💻' }) {
    if (!name || !name.trim()) throw new Error('Team name is required');

    const teamId = `team_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    const team = {
      id: teamId,
      name: name.trim(),
      description: description.trim(),
      icon,
      createdBy: creatorUserId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    memoryDb.teams.set(teamId, team);

    // Creator is TEAM_ADMIN
    const memId = `tm_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    memoryDb.teamMembers.set(`${teamId}:${creatorUserId}`, {
      id: memId,
      teamId,
      userId: creatorUserId,
      role: 'TEAM_ADMIN',
      joinedAt: now,
    });

    if (await areTablesReady()) {
      try {
        await supabase.from('teams').insert([{
          id: teamId,
          name: team.name,
          description: team.description,
          icon: team.icon,
          created_by: creatorUserId,
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        }]);
        await supabase.from('team_members').insert([{
          id: memId,
          team_id: teamId,
          user_id: creatorUserId,
          role: 'TEAM_ADMIN',
          joined_at: now,
        }]);
      } catch (e) {}
    }

    await this.logTeamActivity(teamId, {
      action: 'CREATED_TEAM',
      details: `Team "${team.name}" created`,
      userId: creatorUserId,
    });

    return { ...team, userRole: 'TEAM_ADMIN' };
  },

  async getTeamById(teamId) {
    if (!teamId) return null;
    let t = memoryDb.teams.get(teamId);
    if (!t && (await areTablesReady())) {
      try {
        const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();
        if (data) {
          t = {
            id: data.id,
            name: data.name,
            description: data.description,
            icon: data.icon,
            createdBy: data.created_by,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          memoryDb.teams.set(teamId, t);
        }
      } catch (e) {}
    }
    return t || null;
  },

  async getUserTeams(userId) {
    const now = Date.now();
    const cached = teamCache.get(userId);
    if (cached && now - cached.timestamp < 4000) {
      return cached.data;
    }

    const teamMap = new Map();

    if (await areTablesReady()) {
      try {
        // Query both memberships and teams created by the user
        const [memberRes, createdRes] = await Promise.all([
          supabase.from('team_members').select('team_id, role').eq('user_id', userId),
          supabase.from('teams').select('*').eq('created_by', userId).neq('status', 'ARCHIVED'),
        ]);

        const memberRows = memberRes.data || [];
        const createdTeams = createdRes.data || [];

        // Pre-populate created teams with TEAM_ADMIN role
        for (const ct of createdTeams) {
          const mapped = {
            id: ct.id,
            name: ct.name,
            description: ct.description,
            icon: ct.icon,
            createdBy: ct.created_by,
            status: ct.status,
            createdAt: ct.created_at,
            updatedAt: ct.updated_at,
            userRole: 'TEAM_ADMIN',
          };
          memoryDb.teams.set(mapped.id, mapped);
          teamMap.set(mapped.id, mapped);
        }

        if (memberRows && memberRows.length > 0) {
          const teamIds = memberRows.map((m) => m.team_id).filter((id) => !teamMap.has(id));
          const roleMap = new Map(memberRows.map((m) => [m.team_id, m.role]));

          if (teamIds.length > 0) {
            const { data: teamRecords } = await supabase
              .from('teams')
              .select('*')
              .in('id', teamIds)
              .neq('status', 'ARCHIVED');

            if (teamRecords) {
              for (const row of teamRecords) {
                const isCreator = row.created_by === userId;
                const mapped = {
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  icon: row.icon,
                  createdBy: row.created_by,
                  status: row.status,
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
                  userRole: isCreator ? 'TEAM_ADMIN' : (roleMap.get(row.id) || 'TEAM_MEMBER'),
                };
                memoryDb.teams.set(mapped.id, mapped);
                teamMap.set(mapped.id, mapped);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching Supabase user teams:', e.message);
      }
    }

    // Also scan memoryDb
    for (const [teamId, t] of memoryDb.teams.entries()) {
      if (t.status !== 'ARCHIVED' && (t.createdBy === userId || !t.createdBy)) {
        if (!teamMap.has(teamId)) {
          teamMap.set(teamId, { ...t, userRole: 'TEAM_ADMIN' });
        }
      }
    }

    for (const [key, mem] of memoryDb.teamMembers.entries()) {
      if (mem.userId === userId) {
        let t = memoryDb.teams.get(mem.teamId);
        if (t && t.status !== 'ARCHIVED' && !teamMap.has(t.id)) {
          const isCreator = t.createdBy === userId;
          teamMap.set(t.id, { ...t, userRole: isCreator ? 'TEAM_ADMIN' : mem.role });
        }
      }
    }

    const result = Array.from(teamMap.values());
    teamCache.set(userId, { timestamp: now, data: result });
    return result;
  },

  async updateTeam(teamId, updates, userId) {
    const team = await this.getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    if (updates.name) team.name = updates.name.trim();
    if (updates.description !== undefined) team.description = updates.description.trim();
    if (updates.icon) team.icon = updates.icon;
    team.updatedAt = new Date().toISOString();

    if (await areTablesReady()) {
      try {
        await supabase.from('teams').update({
          name: team.name,
          description: team.description,
          icon: team.icon,
          updated_at: team.updatedAt,
        }).eq('id', teamId);
      } catch (e) {}
    }

    await this.logTeamActivity(teamId, {
      action: 'UPDATED_TEAM_SETTINGS',
      details: `Updated team profile`,
      userId,
    });

    return team;
  },

  async archiveTeam(teamId, userId) {
    const team = await this.getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    const role = await this.getTeamMemberRole(teamId, userId);
    const isOwner = team.createdBy === userId || team.ownerId === userId || role === 'TEAM_ADMIN';
    if (!isOwner) {
      throw new Error('Forbidden: Only the team owner or admin can delete this team.');
    }

    team.status = 'ARCHIVED';
    team.updatedAt = new Date().toISOString();
    memoryDb.teams.set(teamId, team);

    if (await areTablesReady()) {
      try {
        await supabase.from('teams').update({ status: 'ARCHIVED', updated_at: team.updatedAt }).eq('id', teamId);
      } catch (e) {}
    }

    // Completely clear team caches
    teamCache.clear();
    invalidateTeamCache(userId);
    invalidateTeamCache(team.createdBy);

    await this.logTeamActivity(teamId, {
      action: 'ARCHIVED_TEAM',
      details: `Team "${team.name}" archived/deleted`,
      userId,
    });

    return team;
  },

  async getTeamMembers(teamId) {
    if (!teamId) return [];
    const memberMap = new Map();

    // 1. Load from memoryDb
    for (const [key, mem] of memoryDb.teamMembers.entries()) {
      if (mem.teamId === teamId) {
        memberMap.set(mem.userId, { userId: mem.userId, role: mem.role, joinedAt: mem.joinedAt });
      }
    }

    // 2. Load from Supabase team_members table
    if (await areTablesReady()) {
      try {
        const { data: dbMembers } = await supabase
          .from('team_members')
          .select('user_id, role, joined_at')
          .eq('team_id', teamId);

        if (dbMembers) {
          for (const row of dbMembers) {
            memberMap.set(row.user_id, {
              userId: row.user_id,
              role: row.role,
              joinedAt: row.joined_at,
            });
            memoryDb.teamMembers.set(`${teamId}:${row.user_id}`, {
              teamId,
              userId: row.user_id,
              role: row.role,
              joinedAt: row.joined_at,
            });
          }
        }
      } catch (e) {}
    }

    // 3. Ensure team creator / owner is always present as TEAM_ADMIN
    const team = await this.getTeamById(teamId);
    if (team?.createdBy) {
      memberMap.set(team.createdBy, {
        userId: team.createdBy,
        role: 'TEAM_ADMIN',
        joinedAt: team.createdAt || new Date().toISOString(),
      });
      memoryDb.teamMembers.set(`${teamId}:${team.createdBy}`, {
        teamId,
        userId: team.createdBy,
        role: 'TEAM_ADMIN',
        joinedAt: team.createdAt || new Date().toISOString(),
      });
    }

    // 4. Resolve user records
    const members = [];
    for (const m of memberMap.values()) {
      const u = await this.getUserById(m.userId);
      if (u) {
        members.push({
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username,
          avatar: u.avatar,
          role: m.role,
          joinedAt: m.joinedAt,
        });
      }
    }
    return members;
  },

  async addTeamMember(teamId, userId, role = 'TEAM_MEMBER') {
    const memId = `tm_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();
    const mem = {
      id: memId,
      teamId,
      userId,
      role,
      joinedAt: now,
    };
    memoryDb.teamMembers.set(`${teamId}:${userId}`, mem);
    if (await areTablesReady()) {
      try {
        await supabase.from('team_members').insert([{
          id: memId,
          team_id: teamId,
          user_id: userId,
          role,
          joined_at: now,
        }]);
      } catch (e) {}
    }
    return mem;
  },

  async getTeamMemberRole(teamId, userId) {
    if (!teamId || !userId) return null;

    // 1. Check if user is the team creator / owner FIRST
    const team = await this.getTeamById(teamId);
    if (team && (team.createdBy === userId || team.ownerId === userId)) {
      memoryDb.teamMembers.set(`${teamId}:${userId}`, {
        id: `tm_${teamId}_${userId}`,
        teamId,
        userId,
        role: 'TEAM_ADMIN',
        joinedAt: team.createdAt || new Date().toISOString(),
      });
      return 'TEAM_ADMIN';
    }

    // 2. Check in-memory DB
    const mem = memoryDb.teamMembers.get(`${teamId}:${userId}`);
    if (mem?.role) return mem.role;

    // 3. Query Supabase team_members table
    if (await areTablesReady()) {
      try {
        const { data: dbMem } = await supabase
          .from('team_members')
          .select('role')
          .match({ team_id: teamId, user_id: userId })
          .maybeSingle();

        if (dbMem?.role) {
          memoryDb.teamMembers.set(`${teamId}:${userId}`, {
            id: `tm_${teamId}_${userId}`,
            teamId,
            userId,
            role: dbMem.role,
            joinedAt: new Date().toISOString(),
          });
          return dbMem.role;
        }
      } catch (e) {}
    }

    return null;
  },

  async updateTeamMemberRole(teamId, targetUserId, newRole, executorUserId) {
    const mem = memoryDb.teamMembers.get(`${teamId}:${targetUserId}`);
    if (!mem) throw new Error('Member not found in team');

    mem.role = newRole;

    if (await areTablesReady()) {
      try {
        await supabase.from('team_members').update({ role: newRole }).match({ team_id: teamId, user_id: targetUserId });
      } catch (e) {}
    }

    await this.createNotification(targetUserId, {
      title: 'Team Role Updated',
      message: `Your role in team was updated to ${newRole.replace('TEAM_', '')}.`,
      type: 'ROLE_CHANGE',
      link: '/team',
    });

    return { success: true, role: newRole };
  },

  async removeTeamMember(teamId, targetUserId, executorUserId) {
    memoryDb.teamMembers.delete(`${teamId}:${targetUserId}`);

    if (await areTablesReady()) {
      try {
        await supabase.from('team_members').delete().match({ team_id: teamId, user_id: targetUserId });
      } catch (e) {}
    }

    return true;
  },

  async createTeamInvitation(teamId, { email, role = 'TEAM_MEMBER' }, inviterUserId) {
    const team = await this.getTeamById(teamId);
    if (!team) throw new Error('Team not found');

    const cleanEmail = email.trim().toLowerCase();
    const invId = `tinv_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    const inv = {
      id: invId,
      teamId,
      teamName: team.name,
      email: cleanEmail,
      role,
      invitedBy: inviterUserId,
      status: 'PENDING',
      createdAt: now,
      expiresAt,
    };

    memoryDb.teamInvitations.set(invId, inv);

    if (await areTablesReady()) {
      try {
        await supabase.from('team_invitations').insert([{
          id: invId,
          team_id: teamId,
          team_name: team.name,
          email: cleanEmail,
          role,
          invited_by: inviterUserId,
          status: 'PENDING',
          created_at: now,
          expires_at: expiresAt,
        }]);
      } catch (err) {
        console.error('[Supabase createTeamInvitation Error]:', err.message);
      }
    }

    const registeredUser = await this.getUserByEmail(cleanEmail);
    if (registeredUser) {
      await this.createNotification(registeredUser.id, {
        title: `Team Invitation: ${team.name}`,
        message: `You were invited to join "${team.name}" as ${role.replace('TEAM_', '')}.`,
        type: 'TEAM_INVITE',
        link: '/team',
        data: { invitationId: invId, teamId },
      });
    }

    return inv;
  },

  async getTeamInvitations(teamId) {
    const list = [];
    const seen = new Set();
    for (const inv of memoryDb.teamInvitations.values()) {
      if (inv.teamId === teamId && inv.status === 'PENDING') {
        seen.add(inv.id);
        list.push(inv);
      }
    }

    if (await areTablesReady()) {
      try {
        const { data: dbInvs } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_id', teamId)
          .eq('status', 'PENDING');
        if (dbInvs) {
          for (const row of dbInvs) {
            if (!seen.has(row.id)) {
              const item = {
                id: row.id,
                teamId: row.team_id,
                teamName: row.team_name,
                email: row.email,
                role: row.role,
                invitedBy: row.invited_by,
                status: row.status,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
              };
              memoryDb.teamInvitations.set(row.id, item);
              list.push(item);
            }
          }
        }
      } catch (e) {}
    }

    return list;
  },

  async getMyInvitations(userEmail) {
    if (!userEmail) return [];
    const cleanEmail = userEmail.trim().toLowerCase();
    const list = [];
    const seen = new Set();

    for (const inv of memoryDb.teamInvitations.values()) {
      if (inv.email?.toLowerCase() === cleanEmail && inv.status === 'PENDING') {
        seen.add(inv.id);
        list.push(inv);
      }
    }

    if (await areTablesReady()) {
      try {
        const { data: dbInvs } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('email', cleanEmail)
          .eq('status', 'PENDING');
        if (dbInvs) {
          for (const row of dbInvs) {
            if (!seen.has(row.id)) {
              const item = {
                id: row.id,
                teamId: row.team_id,
                teamName: row.team_name,
                email: row.email,
                role: row.role,
                invitedBy: row.invited_by,
                status: row.status,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
              };
              memoryDb.teamInvitations.set(row.id, item);
              list.push(item);
            }
          }
        }
      } catch (e) {}
    }

    return list;
  },

  async acceptTeamInvitation(invitationId, userId) {
    let inv = memoryDb.teamInvitations.get(invitationId);
    if (!inv && (await areTablesReady())) {
      try {
        const { data: dbInv } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('id', invitationId)
          .maybeSingle();
        if (dbInv) {
          inv = {
            id: dbInv.id,
            teamId: dbInv.team_id,
            teamName: dbInv.team_name,
            email: dbInv.email,
            role: dbInv.role,
            invitedBy: dbInv.invited_by,
            status: dbInv.status,
            createdAt: dbInv.created_at,
            expiresAt: dbInv.expires_at,
          };
          memoryDb.teamInvitations.set(inv.id, inv);
        }
      } catch (e) {}
    }

    if (!inv) throw new Error('Invitation not found or invalid link');

    if (inv.status === 'ACCEPTED') {
      return { success: true, teamId: inv.teamId, alreadyAccepted: true, message: 'You have already accepted this invitation.' };
    }

    if (inv.status !== 'PENDING') {
      throw new Error(`This invitation is no longer active (${inv.status}).`);
    }

    // Check expiration
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      inv.status = 'EXPIRED';
      if (await areTablesReady()) {
        try {
          await supabase.from('team_invitations').update({ status: 'EXPIRED' }).eq('id', invitationId);
        } catch (e) {}
      }
      throw new Error('This team invitation has expired. Please ask the team manager for a new invite.');
    }

    // Check if user is already a member
    const existingRole = await this.getTeamMemberRole(inv.teamId, userId);
    if (existingRole) {
      inv.status = 'ACCEPTED';
      if (await areTablesReady()) {
        try {
          await supabase.from('team_invitations').update({ status: 'ACCEPTED' }).eq('id', invitationId);
        } catch (e) {}
      }
      return { success: true, teamId: inv.teamId, alreadyMember: true, role: existingRole };
    }

    inv.status = 'ACCEPTED';
    const now = new Date().toISOString();
    const memId = `tm_${uuidv4().replace(/-/g, '').substring(0, 8)}`;

    memoryDb.teamMembers.set(`${inv.teamId}:${userId}`, {
      id: memId,
      teamId: inv.teamId,
      userId,
      role: inv.role,
      joinedAt: now,
    });

    if (await areTablesReady()) {
      try {
        await supabase.from('team_invitations').update({ status: 'ACCEPTED' }).eq('id', invitationId);
      } catch (e) {}
      try {
        await supabase.from('team_members').upsert([{
          id: memId,
          team_id: inv.teamId,
          user_id: userId,
          role: inv.role,
          joined_at: now,
        }], { onConflict: 'team_id,user_id' });
      } catch (e) {}
    }

    invalidateTeamCache(userId);

    await this.logTeamActivity(inv.teamId, {
      action: 'JOINED_TEAM',
      details: `User joined team via invitation`,
      userId,
    });

    // Notify inviter
    const recipient = await this.getUserById(userId);
    if (inv.invitedBy) {
      await this.createNotification(inv.invitedBy, {
        title: 'Team Invitation Accepted',
        message: `${recipient?.name || 'A new member'} accepted your invitation to "${inv.teamName}".`,
        type: 'INVITATION_ACCEPTED',
        link: '/team',
        data: { teamId: inv.teamId },
      });
    }

    return { success: true, teamId: inv.teamId, role: inv.role };
  },

  async declineTeamInvitation(invitationId, userId) {
    let inv = memoryDb.teamInvitations.get(invitationId);
    if (inv) inv.status = 'REJECTED';
    if (await areTablesReady()) {
      try {
        await supabase.from('team_invitations').update({ status: 'REJECTED' }).eq('id', invitationId);
      } catch (e) {}
    }
    return true;
  },

  async cancelTeamInvitation(teamId, invitationId, executorUserId) {
    let inv = memoryDb.teamInvitations.get(invitationId);
    if (inv) inv.status = 'CANCELLED';
    if (await areTablesReady()) {
      try {
        await supabase.from('team_invitations').update({ status: 'CANCELLED' }).eq('id', invitationId);
      } catch (e) {}
    }
    return true;
  },

  async getTeamDashboard(teamId, userId) {
    const team = await this.getTeamById(teamId);

    // 1. Collect workflows (from memoryDb + Supabase)
    const workflowMap = new Map();
    for (const wf of memoryDb.workflows.values()) {
      if (wf.teamId === teamId && wf.status !== 'ARCHIVED') {
        workflowMap.set(wf.id, wf);
      }
    }
    if (await areTablesReady()) {
      try {
        const { data: dbWfs } = await supabase
          .from('workflows')
          .select('*')
          .eq('team_id', teamId)
          .neq('status', 'ARCHIVED');
        if (dbWfs) {
          for (const d of dbWfs) {
            const mapped = {
              id: d.id,
              name: d.name,
              description: d.description,
              teamId: d.team_id,
              status: d.status,
              isRestricted: d.is_restricted || false,
              ownerId: d.owner_id || d.created_by,
              createdBy: d.created_by,
              nodes: d.nodes || [],
              dependencies: d.dependencies || [],
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            };
            workflowMap.set(mapped.id, mapped);
            memoryDb.workflows.set(mapped.id, mapped);
          }
        }
      } catch (e) {}
    }
    const workflows = Array.from(workflowMap.values());

    // 2. Collect tasks (from memoryDb + Supabase)
    const taskMap = new Map();
    for (const t of memoryDb.tasks.values()) {
      if (t.teamId === teamId) taskMap.set(t.id, t);
    }
    if (await areTablesReady()) {
      try {
        const { data: dbTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('team_id', teamId);
        if (dbTasks) {
          for (const t of dbTasks) {
            const mapped = {
              id: t.id,
              title: t.title,
              description: t.description,
              workflowId: t.workflow_id,
              teamId: t.team_id,
              status: t.status,
              priority: t.priority,
              assignedTo: t.assigned_to,
              dueDate: t.due_date,
              createdAt: t.created_at,
              updatedAt: t.updated_at,
            };
            taskMap.set(mapped.id, mapped);
            memoryDb.tasks.set(mapped.id, mapped);
          }
        }
      } catch (e) {}
    }
    const tasks = Array.from(taskMap.values());

    const members = await this.getTeamMembers(teamId);
    const recentActivity = await this.getTeamActivity(teamId, 10);

    const enrichedWorkflows = workflows.map((wf) => ({
      ...wf,
      ...this.calculateWorkflowMetrics(wf),
    }));
    const activeWorkflowsList = enrichedWorkflows.filter((w) => w.status === 'ACTIVE');

    return {
      team,
      stats: {
        activeWorkflows: activeWorkflowsList.length,
        totalWorkflows: enrichedWorkflows.length,
        pendingTasks: tasks.filter((t) => t.status !== 'COMPLETED').length,
        completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
        memberCount: members.length,
      },
      workflows: enrichedWorkflows,
      activeWorkflows: activeWorkflowsList,
      recentTasks: tasks.slice(0, 5),
      recentActivity,
      members,
    };
  },

  // ====================================================
  // 3. WORKFLOWS & OWNERSHIP (OWNER, MANAGER, MEMBER, VIEWER)
  // ====================================================
  async createWorkflow(creatorUserId, { name, description = '', teamId = null, status = 'ACTIVE', isRestricted = false, nodes = [], dependencies = [] }) {
    if (!name || !name.trim()) throw new Error('Workflow name is required');

    const wfId = `wf_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    const workflow = {
      id: wfId,
      name: name.trim(),
      description: description.trim(),
      teamId: teamId || null,
      status,
      isRestricted,
      ownerId: creatorUserId,
      createdBy: creatorUserId,
      nodes: nodes || [],
      dependencies: dependencies || [],
      createdAt: now,
      updatedAt: now,
    };

    memoryDb.workflows.set(wfId, workflow);

    // Creator is OWNER
    const memId = `wfm_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    memoryDb.workflowMembers.set(`${wfId}:${creatorUserId}`, {
      id: memId,
      workflowId: wfId,
      userId: creatorUserId,
      role: 'OWNER',
      joinedAt: now,
    });

    if (await areTablesReady()) {
      try {
        await supabase.from('workflows').insert([{
          id: wfId,
          name: workflow.name,
          description: workflow.description,
          team_id: workflow.teamId,
          status: workflow.status,
          created_by: creatorUserId,
          owner_id: creatorUserId,
          nodes: workflow.nodes,
          dependencies: workflow.dependencies,
          created_at: now,
          updated_at: now,
        }]);
        await supabase.from('workflow_members').insert([{
          id: memId,
          workflow_id: wfId,
          user_id: creatorUserId,
          role: 'OWNER',
          joined_at: now,
        }]);
      } catch (e) {}
    }

    if (teamId) {
      await this.logTeamActivity(teamId, {
        action: 'CREATED_WORKFLOW',
        details: `Created workflow "${workflow.name}"`,
        userId: creatorUserId,
        workflowId: wfId,
      });
    }

    invalidateWorkflowCache();
    return { ...workflow, userRole: 'OWNER' };
  },

  async getWorkflowById(workflowId) {
    if (!workflowId) return null;
    let wf = memoryDb.workflows.get(workflowId);
    if (!wf && (await areTablesReady())) {
      try {
        const { data } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
        if (data) {
          wf = {
            id: data.id,
            name: data.name,
            description: data.description,
            teamId: data.team_id,
            status: data.status,
            ownerId: data.owner_id || data.created_by,
            createdBy: data.created_by,
            nodes: data.nodes || [],
            dependencies: data.dependencies || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          memoryDb.workflows.set(workflowId, wf);
        }
      } catch (e) {}
    }
    return wf || null;
  },

  async getWorkflowMemberRole(workflowId, userId) {
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) return null;

    if (wf.ownerId === userId || wf.createdBy === userId) return 'OWNER';

    const mem = memoryDb.workflowMembers.get(`${workflowId}:${userId}`);
    if (mem) return mem.role;

    if (await areTablesReady()) {
      try {
        const { data: dbMem } = await supabase
          .from('workflow_members')
          .select('role')
          .match({ workflow_id: workflowId, user_id: userId })
          .maybeSingle();
        if (dbMem) {
          memoryDb.workflowMembers.set(`${workflowId}:${userId}`, {
            workflowId,
            userId,
            role: dbMem.role,
          });
          return dbMem.role;
        }
      } catch (e) {}
    }

    if (wf.teamId) {
      const teamRole = await this.getTeamMemberRole(wf.teamId, userId);
      if (teamRole === 'TEAM_ADMIN') return 'OWNER';
      if (teamRole === 'TEAM_MANAGER') return 'MANAGER';
      if (teamRole === 'TEAM_MEMBER') return 'MEMBER';
    }

    return null;
  },

  calculateWorkflowMetrics(wf) {
    if (!wf) return { totalTasks: 0, completedTasks: 0, progress: 0 };

    // 1. Gather all tasks linked to this workflow from memoryDb.tasks
    const dbTasks = [];
    for (const t of memoryDb.tasks.values()) {
      if (t.workflowId === wf.id) dbTasks.push(t);
    }

    // 2. Also inspect wf.nodes from the canvas
    const nodeTasks = [];
    let parsedNodes = wf.nodes;
    if (typeof parsedNodes === 'string') {
      try { parsedNodes = JSON.parse(parsedNodes); } catch (e) { parsedNodes = []; }
    }

    if (Array.isArray(parsedNodes)) {
      for (const n of parsedNodes) {
        if (!n) continue;
        const taskData = n.data?.task || n.data || n;
        if (taskData) {
          nodeTasks.push({
            id: n.id || taskData.id,
            status: (taskData.status || n.status || 'TODO').toUpperCase(),
          });
        }
      }
    }

    // Combine tasks (preferring status from either source)
    const taskMap = new Map();
    for (const t of dbTasks) {
      taskMap.set(t.id, (t.status || 'TODO').toUpperCase());
    }
    for (const nt of nodeTasks) {
      if (!taskMap.has(nt.id) || nt.status === 'COMPLETED') {
        taskMap.set(nt.id, nt.status);
      }
    }

    const totalTasks = taskMap.size;
    let completedTasks = 0;
    for (const status of taskMap.values()) {
      if (status === 'COMPLETED') completedTasks++;
    }

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, progress };
  },

  async getWorkflowsForUser(userId, { filter = 'all', teamId = null } = {}) {
    const cacheKey = `${userId}:${filter}:${teamId || 'none'}`;
    const now = Date.now();
    const cached = workflowCache.get(cacheKey);
    if (cached && now - cached.timestamp < 3000) {
      return cached.data;
    }

    if (await areTablesReady()) {
      try {
        let query = supabase.from('workflows').select('*').neq('status', 'ARCHIVED');
        if (teamId) {
          query = query.eq('team_id', teamId);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          for (const row of data) {
            let parsedNodes = row.nodes || [];
            if (typeof parsedNodes === 'string') {
              try { parsedNodes = JSON.parse(parsedNodes); } catch (e) { parsedNodes = []; }
            }
            let parsedDeps = row.dependencies || [];
            if (typeof parsedDeps === 'string') {
              try { parsedDeps = JSON.parse(parsedDeps); } catch (e) { parsedDeps = []; }
            }

            const wf = {
              id: row.id,
              name: row.name,
              description: row.description,
              teamId: row.team_id,
              status: row.status,
              isRestricted: row.is_restricted || false,
              ownerId: row.owner_id || row.created_by,
              createdBy: row.created_by,
              nodes: parsedNodes,
              dependencies: parsedDeps,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
            memoryDb.workflows.set(wf.id, wf);
          }
        }
      } catch (e) {}

      // Synchronize tasks from Supabase
      try {
        const { data: dbTasks } = await supabase.from('tasks').select('*');
        if (dbTasks) {
          for (const t of dbTasks) {
            memoryDb.tasks.set(t.id, {
              id: t.id,
              workflowId: t.workflow_id,
              teamId: t.team_id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              assignedTo: t.assigned_to,
              dueDate: t.due_date,
              position: t.position,
              createdAt: t.created_at,
              updatedAt: t.updated_at,
            });
          }
        }
      } catch (e) {}
    }

    const results = [];

    for (const wf of memoryDb.workflows.values()) {
      if (wf.status === 'ARCHIVED') continue;

      const isOwner = wf.ownerId === userId || wf.createdBy === userId;
      const memRole = memoryDb.workflowMembers.get(`${wf.id}:${userId}`)?.role;

      let hasTeamAccess = false;
      if (wf.teamId) {
        const tr = await this.getTeamMemberRole(wf.teamId, userId);
        if (tr) hasTeamAccess = true;
      }

      if (!isOwner && !memRole && !hasTeamAccess) continue;

      if (teamId && wf.teamId !== teamId) continue;

      const role = await this.getWorkflowMemberRole(wf.id, userId);

      if (filter === 'owned' && !isOwner) continue;
      if (filter === 'shared' && isOwner) continue;

      const metrics = this.calculateWorkflowMetrics(wf);

      let teamName = null;
      let teamIcon = null;
      if (wf.teamId) {
        const team = memoryDb.teams.get(wf.teamId);
        teamName = team?.name || null;
        teamIcon = team?.icon || null;
      }

      results.push({
        ...wf,
        ...metrics,
        teamName,
        teamIcon,
        userRole: role || 'VIEWER',
      });
    }

    workflowCache.set(cacheKey, { timestamp: now, data: results });
    return results;
  },

  async getWorkflowsByTeam(teamId, userId) {
    return this.getWorkflowsForUser(userId, { teamId });
  },

  async updateWorkflow(arg1, arg2, arg3) {
    let workflowId, updates, userId;
    if (typeof arg2 === 'string') {
      userId = arg1;
      workflowId = arg2;
      updates = arg3 || {};
    } else {
      workflowId = arg1;
      updates = arg2 || {};
      userId = arg3;
    }

    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('Workflow not found');

    if (updates.name) wf.name = updates.name.trim();
    if (updates.description !== undefined) wf.description = updates.description.trim();
    if (updates.status) wf.status = updates.status;
    if (updates.nodes) wf.nodes = updates.nodes;
    if (updates.dependencies) wf.dependencies = updates.dependencies;
    wf.updatedAt = new Date().toISOString();

    if (await areTablesReady()) {
      try {
        await supabase.from('workflows').update({
          name: wf.name,
          description: wf.description,
          status: wf.status,
          nodes: wf.nodes,
          dependencies: wf.dependencies,
          updated_at: wf.updatedAt,
        }).eq('id', workflowId);
      } catch (e) {}
    }

    invalidateWorkflowCache();
    return wf;
  },

  async deleteWorkflow(workflowId, userId) {
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('Workflow not found');

    wf.status = 'ARCHIVED';

    if (await areTablesReady()) {
      try {
        await supabase.from('workflows').update({ status: 'ARCHIVED' }).eq('id', workflowId);
      } catch (e) {}
    }

    invalidateWorkflowCache();
    return true;
  },

  async duplicateWorkflow(workflowId, userId) {
    const original = await this.getWorkflowById(workflowId);
    if (!original) throw new Error('Original workflow not found');

    const duplicated = await this.createWorkflow(userId, {
      name: `${original.name} (Copy)`,
      description: original.description,
      teamId: original.teamId,
      nodes: original.nodes,
      dependencies: original.dependencies,
    });

    const tasks = await this.getTasksByWorkflow(workflowId);
    for (const t of tasks) {
      await this.createTask(userId, {
        workflowId: duplicated.id,
        teamId: duplicated.teamId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: 'TODO',
      });
    }

    return duplicated;
  },

  async getWorkflowMembers(workflowId) {
    if (!workflowId) return [];
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) return [];

    const memberMap = new Map();

    // 1. In-memory workflow members
    for (const [key, mem] of memoryDb.workflowMembers.entries()) {
      if (mem.workflowId === workflowId) {
        memberMap.set(mem.userId, { userId: mem.userId, role: mem.role, joinedAt: mem.joinedAt });
      }
    }

    // 2. Supabase workflow_members
    if (await areTablesReady()) {
      try {
        const { data: dbMembers } = await supabase
          .from('workflow_members')
          .select('user_id, role, joined_at')
          .eq('workflow_id', workflowId);

        if (dbMembers) {
          for (const row of dbMembers) {
            memberMap.set(row.user_id, {
              userId: row.user_id,
              role: row.role,
              joinedAt: row.joined_at,
            });
            memoryDb.workflowMembers.set(`${workflowId}:${row.user_id}`, {
              workflowId,
              userId: row.user_id,
              role: row.role,
              joinedAt: row.joined_at,
            });
          }
        }
      } catch (e) {}
    }

    // 3. Ensure workflow owner / creator is present as OWNER
    const ownerId = wf.ownerId || wf.createdBy;
    if (ownerId && !memberMap.has(ownerId)) {
      memberMap.set(ownerId, {
        userId: ownerId,
        role: 'OWNER',
        joinedAt: wf.createdAt || new Date().toISOString(),
      });
      memoryDb.workflowMembers.set(`${workflowId}:${ownerId}`, {
        workflowId,
        userId: ownerId,
        role: 'OWNER',
        joinedAt: wf.createdAt || new Date().toISOString(),
      });
    }

    // 4. Resolve full user details
    const members = [];
    for (const m of memberMap.values()) {
      const u = await this.getUserById(m.userId);
      if (u) {
        members.push({
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username,
          avatar: u.avatar,
          role: m.role,
          joinedAt: m.joinedAt,
        });
      }
    }
    return members;
  },

  async getWorkflowInvitations(workflowId) {
    const list = [];
    for (const inv of memoryDb.workflowInvitations.values()) {
      if (inv.workflowId === workflowId && inv.status === 'PENDING') {
        const u = await this.getUserById(inv.invitedUserId);
        const inviter = await this.getUserById(inv.invitedBy);
        list.push({
          ...inv,
          invitedUser: u ? this.sanitizeUser(u) : inv.invitedUser,
          inviterName: inviter?.name || 'Workflow Owner',
        });
      }
    }
    return list;
  },

  async updateWorkflowMemberRole(workflowId, targetUserId, newRole, executorUserId) {
    let mem = memoryDb.workflowMembers.get(`${workflowId}:${targetUserId}`);
    const now = new Date().toISOString();
    if (!mem) {
      mem = { workflowId, userId: targetUserId, role: newRole, joinedAt: now };
      memoryDb.workflowMembers.set(`${workflowId}:${targetUserId}`, mem);
    } else {
      mem.role = newRole;
    }

    if (await areTablesReady()) {
      try {
        await supabase
          .from('workflow_members')
          .upsert([{
            workflow_id: workflowId,
            user_id: targetUserId,
            role: newRole,
            joined_at: mem.joinedAt || now,
          }], { onConflict: 'workflow_id,user_id' });
      } catch (e) {}
    }

    await this.createNotification(targetUserId, {
      title: 'Workflow Role Updated',
      message: `Your role was updated to ${newRole.replace('WORKFLOW_', '')} in workflow.`,
      type: 'ROLE_CHANGE',
      link: `/workflows/${workflowId}`,
    });

    return { success: true, role: newRole };
  },

  async removeWorkflowMember(workflowId, targetUserId, executorUserId) {
    memoryDb.workflowMembers.delete(`${workflowId}:${targetUserId}`);
    if (await areTablesReady()) {
      try {
        await supabase
          .from('workflow_members')
          .delete()
          .match({ workflow_id: workflowId, user_id: targetUserId });
      } catch (e) {}
    }
    return true;
  },

  async addWorkflowMember(workflowId, userId, role = 'MEMBER') {
    const memId = `wm_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();
    const mem = {
      id: memId,
      workflowId,
      userId,
      role,
      joinedAt: now,
    };
    memoryDb.workflowMembers.set(`${workflowId}:${userId}`, mem);
    if (await areTablesReady()) {
      try {
        await supabase.from('workflow_members').upsert([{
          id: memId,
          workflow_id: workflowId,
          user_id: userId,
          role,
          joined_at: now,
        }], { onConflict: 'workflow_id,user_id' });
      } catch (e) {}
    }

    await this.createNotification(userId, {
      title: 'Added to Workflow',
      message: `You were granted ${role.replace('WORKFLOW_', '')} access to a workflow.`,
      type: 'INVITATION_ACCEPTED',
      link: `/workflows/${workflowId}`,
    });

    return mem;
  },

  async isUserWorkflowMember(workflowId, userId) {
    if (!workflowId || !userId) return false;
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) return false;
    if (wf.ownerId === userId) return true;
    const mem = memoryDb.workflowMembers.get(`${workflowId}:${userId}`);
    if (mem) return true;
    if (wf.teamId) {
      const teamRole = await this.getTeamMemberRole(wf.teamId, userId);
      if (teamRole && !wf.isRestricted) return true;
    }
    return false;
  },


  // ====================================================
  // 4. WORKFLOW INVITATIONS & COLLABORATION
  // ====================================================
  async createUniversalInvitation(inviterUserId, { workflowId, targetIdentifier, role = 'MEMBER' }) {
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('Workflow not found');

    const clean = targetIdentifier.trim().replace(/^@/, '');
    let targetUser = clean.includes('@')
      ? await this.getUserByEmail(clean)
      : await this.getUserByUsername(clean);

    if (!targetUser) {
      targetUser = await this.getUserById(clean);
    }

    if (!targetUser) {
      throw new Error(`User "${targetIdentifier}" not found. Please verify the username or email.`);
    }

    if (targetUser.id === inviterUserId) {
      throw new Error('You cannot invite yourself to a workflow.');
    }

    const currentRole = await this.getWorkflowMemberRole(workflowId, targetUser.id);
    if (currentRole) {
      throw new Error(`User @${targetUser.username} is already a collaborator (${currentRole}) on this workflow.`);
    }

    // Check if an invitation is already pending for this user on this workflow
    for (const existingInv of memoryDb.workflowInvitations.values()) {
      if (
        existingInv.workflowId === workflowId &&
        existingInv.invitedUserId === targetUser.id &&
        existingInv.status === 'PENDING'
      ) {
        throw new Error(`An invitation has already been sent to @${targetUser.username} and is currently pending.`);
      }
    }

    const invId = `winv_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    const invitation = {
      id: invId,
      workflowId,
      workflowName: wf.name,
      invitedUserId: targetUser.id,
      invitedUser: this.sanitizeUser(targetUser),
      invitedBy: inviterUserId,
      role,
      status: 'PENDING',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    memoryDb.workflowInvitations.set(invId, invitation);

    if (await areTablesReady()) {
      try {
        await supabase.from('workflow_invitations').upsert([{
          id: invId,
          workflow_id: workflowId,
          workflow_name: wf.name,
          invited_user_id: targetUser.id,
          invited_by: inviterUserId,
          role,
          status: 'PENDING',
          created_at: now,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        }]);
      } catch (err) {
        console.warn('Failed to persist workflow_invitation to Supabase:', err.message);
      }
    }

    const inviter = await this.getUserById(inviterUserId);
    await this.createNotification(targetUser.id, {
      title: `Workflow Invitation: ${wf.name}`,
      message: `${inviter?.name || 'A user'} invited you to collaborate on "${wf.name}" as ${role}.`,
      type: 'WORKFLOW_INVITE',
      link: `/workflows/${workflowId}`,
      data: { invitationId: invId, workflowId, role },
    });

    return invitation;
  },

  async getReceivedInvitations(userId) {
    const list = [];
    const seen = new Set();
    for (const inv of memoryDb.workflowInvitations.values()) {
      if (inv.invitedUserId === userId && inv.status === 'PENDING') {
        const inviter = await this.getUserById(inv.invitedBy);
        seen.add(inv.id);
        list.push({ ...inv, inviterName: inviter?.name || 'Collaborator' });
      }
    }

    if (await areTablesReady()) {
      try {
        const { data: dbInvs } = await supabase
          .from('workflow_invitations')
          .select('*')
          .eq('invited_user_id', userId)
          .eq('status', 'PENDING');
        if (dbInvs) {
          for (const row of dbInvs) {
            if (!seen.has(row.id)) {
              const inviter = await this.getUserById(row.invited_by);
              const item = {
                id: row.id,
                workflowId: row.workflow_id,
                workflowName: row.workflow_name,
                invitedUserId: row.invited_user_id,
                role: row.role,
                status: row.status,
                invitedBy: row.invited_by,
                inviterName: inviter?.name || 'Collaborator',
                createdAt: row.created_at,
                expiresAt: row.expires_at,
              };
              memoryDb.workflowInvitations.set(row.id, item);
              list.push(item);
            }
          }
        }
      } catch (e) {}
    }

    return list;
  },

  async getSentInvitations(userId) {
    const list = [];
    for (const inv of memoryDb.workflowInvitations.values()) {
      if (inv.invitedBy === userId) list.push(inv);
    }
    return list;
  },

  async acceptWorkflowInvitation(invitationId, userId) {
    let inv = memoryDb.workflowInvitations.get(invitationId);
    if (!inv && (await areTablesReady())) {
      try {
        const { data: dbInv } = await supabase
          .from('workflow_invitations')
          .select('*')
          .eq('id', invitationId)
          .maybeSingle();
        if (dbInv) {
          inv = {
            id: dbInv.id,
            workflowId: dbInv.workflow_id,
            workflowName: dbInv.workflow_name,
            invitedUserId: dbInv.invited_user_id,
            role: dbInv.role,
            status: dbInv.status,
            invitedBy: dbInv.invited_by,
            createdAt: dbInv.created_at,
            expiresAt: dbInv.expires_at,
          };
          memoryDb.workflowInvitations.set(inv.id, inv);
        }
      } catch (e) {}
    }

    if (!inv) throw new Error('Invitation not found or invalid link.');

    if (inv.status === 'ACCEPTED') {
      return { success: true, workflowId: inv.workflowId, role: inv.role, alreadyAccepted: true, message: 'You have already accepted this invitation.' };
    }

    if (inv.status !== 'PENDING') {
      throw new Error(`This invitation is no longer active (${inv.status}).`);
    }

    // Check expiration
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      inv.status = 'EXPIRED';
      if (await areTablesReady()) {
        try {
          await supabase.from('workflow_invitations').update({ status: 'EXPIRED' }).eq('id', invitationId);
        } catch (e) {}
      }
      throw new Error('This workflow invitation has expired. Please ask the workflow owner for a new invitation.');
    }

    // Check if user is already a workflow collaborator
    const existingRole = await this.getWorkflowMemberRole(inv.workflowId, userId);
    if (existingRole) {
      inv.status = 'ACCEPTED';
      if (await areTablesReady()) {
        try {
          await supabase.from('workflow_invitations').update({ status: 'ACCEPTED' }).eq('id', invitationId);
        } catch (e) {}
      }
      return { success: true, workflowId: inv.workflowId, role: existingRole, alreadyMember: true };
    }

    inv.status = 'ACCEPTED';
    const now = new Date().toISOString();
    const memId = `wfm_${uuidv4().replace(/-/g, '').substring(0, 8)}`;

    memoryDb.workflowMembers.set(`${inv.workflowId}:${userId}`, {
      id: memId,
      workflowId: inv.workflowId,
      userId,
      role: inv.role,
      joinedAt: now,
    });

    if (await areTablesReady()) {
      try {
        await supabase
          .from('workflow_invitations')
          .update({ status: 'ACCEPTED' })
          .eq('id', invitationId);
      } catch (e) {}
      try {
        await supabase
          .from('workflow_members')
          .upsert([{
            id: memId,
            workflow_id: inv.workflowId,
            user_id: userId,
            role: inv.role,
            joined_at: now,
          }], { onConflict: 'workflow_id,user_id' });
      } catch (e) {}
    }

    // Notify inviter
    const recipient = await this.getUserById(userId);
    if (inv.invitedBy) {
      await this.createNotification(inv.invitedBy, {
        title: 'Invitation Accepted',
        message: `${recipient?.name || 'A user'} accepted your invitation to "${inv.workflowName}".`,
        type: 'INVITATION_ACCEPTED',
        link: `/workflows/${inv.workflowId}`,
      });
    }

    return { success: true, workflowId: inv.workflowId, role: inv.role };
  },

  async declineWorkflowInvitation(invitationId, userId) {
    let inv = memoryDb.workflowInvitations.get(invitationId);
    if (!inv && (await areTablesReady())) {
      try {
        const { data: dbInv } = await supabase
          .from('workflow_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();
        if (dbInv) {
          inv = {
            id: dbInv.id,
            workflowId: dbInv.workflow_id,
            workflowName: dbInv.workflow_name,
            invitedUserId: dbInv.invited_user_id,
            role: dbInv.role,
            status: dbInv.status,
            invitedBy: dbInv.invited_by,
          };
          memoryDb.workflowInvitations.set(inv.id, inv);
        }
      } catch (e) {}
    }

    if (!inv || inv.invitedUserId !== userId) throw new Error('Invitation not found');

    inv.status = 'DECLINED';

    if (await areTablesReady()) {
      try {
        await supabase
          .from('workflow_invitations')
          .update({ status: 'DECLINED' })
          .eq('id', invitationId);
      } catch (e) {}
    }

    const recipient = await this.getUserById(userId);
    await this.createNotification(inv.invitedBy, {
      title: 'Invitation Declined',
      message: `${recipient?.name || 'A user'} declined your invitation to "${inv.workflowName}".`,
      type: 'INVITATION_DECLINED',
    });

    return true;
  },

  async cancelWorkflowInvitation(invitationId, userId) {
    const inv = memoryDb.workflowInvitations.get(invitationId);
    if (!inv) throw new Error('Invitation not found');
    const isInviter = inv.invitedBy === userId;
    const wf = await this.getWorkflowById(inv.workflowId);
    const isOwner = wf && (wf.ownerId === userId || wf.createdBy === userId);
    const memRole = await this.getWorkflowMemberRole(inv.workflowId, userId);
    const isManager = memRole === 'MANAGER' || memRole === 'OWNER';

    if (!isInviter && !isOwner && !isManager) {
      throw new Error('Not authorized to cancel this invitation');
    }

    inv.status = 'CANCELLED';
    return true;
  },

  // ====================================================
  // 5. TASKS
  // ====================================================
  async createTask(creatorUserId, { workflowId, teamId, title, description = '', priority = 'MEDIUM', status = 'TODO', assignedTo = null, dueDate = null, position = { x: 100, y: 100 } }) {
    if (!title || !title.trim()) throw new Error('Task title is required');

    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('Workflow not found');

    const taskId = `task_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    const task = {
      id: taskId,
      workflowId,
      teamId: teamId || wf.teamId || null,
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      position: position || { x: 100, y: 100 },
      createdAt: now,
      updatedAt: now,
    };

    memoryDb.tasks.set(taskId, task);

    if (await areTablesReady()) {
      try {
        await supabase.from('tasks').insert([{
          id: taskId,
          workflow_id: workflowId,
          team_id: task.teamId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assigned_to: task.assignedTo,
          due_date: task.dueDate,
          position: task.position,
          created_at: now,
          updated_at: now,
        }]);
      } catch (e) {}
    }

    // Automatically synchronize workflow nodes with newly created task
    try {
      const currentNodes = Array.isArray(wf.nodes) ? [...wf.nodes] : [];
      if (!currentNodes.some((n) => n.id === taskId)) {
        currentNodes.push({
          id: taskId,
          type: 'taskNode',
          position: task.position || { x: 220 + (currentNodes.length % 3) * 280, y: 80 + Math.floor(currentNodes.length / 3) * 180 },
          data: { task },
        });
        wf.nodes = currentNodes;
        memoryDb.workflows.set(workflowId, wf);
        await this.saveGraphState(workflowId, { nodes: currentNodes, dependencies: wf.dependencies || [] }, creatorUserId);
      }
    } catch (syncErr) {
      console.warn('[createTask] graph sync warning:', syncErr.message);
    }

    if (assignedTo && assignedTo !== creatorUserId) {
      await this.createNotification(assignedTo, {
        title: 'New Task Assigned',
        message: `You were assigned "${task.title}" in ${wf.name}.`,
        type: 'TASK_ASSIGNED',
        link: '/tasks',
      });
    }

    return task;
  },

  async getTaskById(taskId) {
    if (!taskId) return null;
    let t = memoryDb.tasks.get(taskId);
    if (!t && (await areTablesReady())) {
      try {
        const { data } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (data) {
          t = {
            id: data.id,
            workflowId: data.workflow_id,
            teamId: data.team_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            status: data.status,
            assignedTo: data.assigned_to,
            dueDate: data.due_date,
            position: data.position,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          memoryDb.tasks.set(taskId, t);
        }
      } catch (e) {}
    }
    return t || null;
  },

  async getTasksByWorkflow(workflowId) {
    const list = [];
    if (await areTablesReady()) {
      try {
        const { data } = await supabase.from('tasks').select('*').eq('workflow_id', workflowId);
        if (data && data.length > 0) {
          for (const row of data) {
            const t = {
              id: row.id,
              workflowId: row.workflow_id,
              teamId: row.team_id,
              title: row.title,
              description: row.description,
              priority: row.priority,
              status: row.status,
              assignedTo: row.assigned_to,
              dueDate: row.due_date,
              position: row.position,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
            memoryDb.tasks.set(t.id, t);
          }
        }
      } catch (e) {}
    }
    for (const t of memoryDb.tasks.values()) {
      if (t.workflowId === workflowId && !list.some((x) => x.id === t.id)) list.push(t);
    }
    return list;
  },

  async getTeamTasks(teamId, filters = {}) {
    if (await areTablesReady()) {
      try {
        const { data } = await supabase.from('tasks').select('*').eq('team_id', teamId);
        if (data && data.length > 0) {
          for (const row of data) {
            const t = {
              id: row.id,
              workflowId: row.workflow_id,
              teamId: row.team_id,
              title: row.title,
              description: row.description,
              priority: row.priority,
              status: row.status,
              assignedTo: row.assigned_to,
              dueDate: row.due_date,
              position: row.position,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
            memoryDb.tasks.set(t.id, t);
          }
        }
      } catch (e) {}
    }
    const list = [];
    for (const t of memoryDb.tasks.values()) {
      if (t.teamId === teamId && !list.some((x) => x.id === t.id)) list.push(t);
    }
    return list;
  },

  async getMyTasks(userId, teamId = null) {
    const user = await this.getUserById(userId);
    const identifiers = new Set([
      userId,
      user?.name,
      user?.username,
      user?.email,
      user?.username ? `@${user.username}` : null,
    ].filter(Boolean));

    if (await areTablesReady()) {
      try {
        let query = supabase.from('tasks').select('*');
        if (teamId) query = query.eq('team_id', teamId);
        const { data } = await query;
        if (data && data.length > 0) {
          for (const row of data) {
            const t = {
              id: row.id,
              workflowId: row.workflow_id,
              teamId: row.team_id,
              title: row.title,
              description: row.description,
              priority: row.priority,
              status: row.status,
              assignedTo: row.assigned_to,
              dueDate: row.due_date,
              position: row.position,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
            memoryDb.tasks.set(t.id, t);
          }
        }
      } catch (e) {}
    }

    const list = [];
    for (const t of memoryDb.tasks.values()) {
      const isAssigned = identifiers.has(t.assignedTo);
      if (isAssigned) {
        if (!teamId || t.teamId === teamId) {
          if (!list.some((x) => x.id === t.id)) list.push(t);
        }
      }
    }
    return list;
  },

  async updateTask(arg1, arg2, arg3) {
    let taskId, updates, userId;
    if (typeof arg2 === 'string') {
      userId = arg1;
      taskId = arg2;
      updates = arg3 || {};
    } else {
      taskId = arg1;
      updates = arg2 || {};
      userId = arg3;
    }

    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    if (updates.title) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description.trim();
    if (updates.status) task.status = updates.status;
    if (updates.priority) task.priority = updates.priority;
    if (updates.assignedTo !== undefined) task.assignedTo = updates.assignedTo;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.position) task.position = updates.position;
    task.updatedAt = new Date().toISOString();

    if (await areTablesReady()) {
      try {
        await supabase.from('tasks').update({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigned_to: task.assignedTo,
          due_date: task.dueDate,
          position: task.position,
          updated_at: task.updatedAt,
        }).eq('id', taskId);
      } catch (e) {}
    }

    // Keep wf.nodes synchronized with task updates
    if (task.workflowId) {
      try {
        const wf = await this.getWorkflowById(task.workflowId);
        if (wf && Array.isArray(wf.nodes)) {
          let updated = false;
          const updatedNodes = wf.nodes.map((n) => {
            if (n.id === taskId) {
              updated = true;
              return {
                ...n,
                position: task.position || n.position,
                data: {
                  ...n.data,
                  task,
                },
              };
            }
            return n;
          });
          if (updated) {
            wf.nodes = updatedNodes;
            memoryDb.workflows.set(task.workflowId, wf);
            await this.saveGraphState(task.workflowId, { nodes: updatedNodes, dependencies: wf.dependencies || [] }, userId);
          }
        }
      } catch (e) {}
    }

    return task;
  },

  async deleteTask(taskId, userId) {
    const task = await this.getTaskById(taskId);
    if (task && task.workflowId) {
      try {
        const wf = await this.getWorkflowById(task.workflowId);
        if (wf && Array.isArray(wf.nodes)) {
          const updatedNodes = wf.nodes.filter((n) => n.id !== taskId);
          const updatedEdges = Array.isArray(wf.dependencies)
            ? wf.dependencies.filter((e) => e.source !== taskId && e.target !== taskId)
            : [];
          wf.nodes = updatedNodes;
          wf.dependencies = updatedEdges;
          memoryDb.workflows.set(task.workflowId, wf);
          await this.saveGraphState(task.workflowId, { nodes: updatedNodes, dependencies: updatedEdges }, userId);
        }
      } catch (e) {}
    }
    memoryDb.tasks.delete(taskId);
    if (await areTablesReady()) {
      try {
        await supabase.from('tasks').delete().eq('id', taskId);
      } catch (e) {}
    }
    return true;
  },

  // ====================================================
  // 6. NOTIFICATIONS
  // ====================================================
  async createNotification(userId, { title, message, type = 'INFO', link = null, data = {} }) {
    if (!userId) return null;
    const notifId = `notif_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    const notif = {
      id: notifId,
      userId,
      title,
      message,
      type,
      link,
      data,
      read: false,
      createdAt: now,
    };

    memoryDb.notifications.set(notifId, notif);

    if (await areTablesReady()) {
      try {
        await supabase.from('notifications').insert([{
          id: notifId,
          user_id: userId,
          title,
          message,
          type,
          link,
          data,
          read: false,
          created_at: now,
        }]);
      } catch (e) {}
    }

    invalidateNotificationCache(userId);
    return notif;
  },

  async getUserNotifications(userId) {
    const now = Date.now();
    const cached = notificationCache.get(userId);
    if (cached && now - cached.timestamp < 6000) {
      return cached.data;
    }

    if (await areTablesReady()) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          for (const row of data) {
            let parsedData = row.data;
            if (typeof parsedData === 'string') {
              try { parsedData = JSON.parse(parsedData); } catch (e) {}
            }
            let effectiveLink = row.link;
            if ((!effectiveLink || effectiveLink === '/notifications') && parsedData?.workflowId) {
              effectiveLink = `/workflows/${parsedData.workflowId}`;
            }
            const mapped = {
              id: row.id,
              userId: row.user_id,
              title: row.title,
              message: row.message,
              type: row.type,
              link: effectiveLink,
              data: parsedData,
              read: !!row.read,
              createdAt: row.created_at,
            };
            memoryDb.notifications.set(row.id, mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch notifications from Supabase:', err.message);
      }
    }

    const list = [];
    for (const n of memoryDb.notifications.values()) {
      if (n.userId === userId) list.push(n);
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    notificationCache.set(userId, { timestamp: now, data: list });
    return list;
  },

  async markNotificationRead(notificationId, userId) {
    invalidateNotificationCache(userId);
    const n = memoryDb.notifications.get(notificationId);
    if (n && n.userId === userId) {
      n.read = true;
    }
    if (await areTablesReady()) {
      try {
        await supabase.from('notifications').update({ read: true }).match({ id: notificationId, user_id: userId });
      } catch (e) {}
    }
    return true;
  },

  async markAllNotificationsRead(userId) {
    invalidateNotificationCache(userId);
    for (const n of memoryDb.notifications.values()) {
      if (n.userId === userId) n.read = true;
    }
    if (await areTablesReady()) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      } catch (e) {}
    }
    return true;
  },

  async deleteNotification(notificationId, userId) {
    invalidateNotificationCache(userId);
    memoryDb.notifications.delete(notificationId);
    if (await areTablesReady()) {
      try {
        await supabase.from('notifications').delete().match({ id: notificationId, user_id: userId });
      } catch (e) {}
    }
    return true;
  },

  // ====================================================
  // 7. AUTOMATIONS & AUDIT LOGS
  // ====================================================
  async createAutomation(workflowId, { name, enabled = true, trigger = 'TASK_COMPLETED', condition = {}, action = {} }, userId) {
    const id = `auto_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    const wf = await this.getWorkflowById(workflowId);
    const teamId = wf?.teamId || null;

    const auto = {
      id,
      workflowId,
      teamId,
      name,
      enabled: enabled !== undefined ? enabled : true,
      trigger,
      condition,
      action,
      executionCount: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    memoryDb.automations.set(id, auto);

    if (await areTablesReady()) {
      try {
        await supabase.from('automations').insert([{
          id,
          workflow_id: workflowId,
          team_id: teamId,
          name,
          enabled: auto.enabled,
          trigger,
          condition,
          action,
          execution_count: 0,
          created_by: userId,
          created_at: now,
          updated_at: now,
        }]);
      } catch (err) {
        console.warn('Failed to insert automation into Supabase:', err.message);
      }
    }

    return auto;
  },

  async getAutomationById(automationId) {
    if (!automationId) return null;
    let auto = memoryDb.automations.get(automationId);
    if (!auto && (await areTablesReady())) {
      try {
        const { data } = await supabase.from('automations').select('*').eq('id', automationId).maybeSingle();
        if (data) {
          auto = {
            id: data.id,
            workflowId: data.workflow_id,
            teamId: data.team_id,
            name: data.name,
            enabled: data.enabled,
            trigger: data.trigger,
            condition: data.condition,
            action: data.action,
            executionCount: data.execution_count || 0,
            lastExecutedAt: data.last_executed_at,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          memoryDb.automations.set(auto.id, auto);
        }
      } catch (e) {}
    }
    return auto || null;
  },

  async getAutomationsByWorkflow(workflowId) {
    if (!workflowId) return [];

    if (await areTablesReady()) {
      try {
        const { data } = await supabase.from('automations').select('*').eq('workflow_id', workflowId);
        if (data) {
          for (const row of data) {
            memoryDb.automations.set(row.id, {
              id: row.id,
              workflowId: row.workflow_id,
              teamId: row.team_id,
              name: row.name,
              enabled: row.enabled,
              trigger: row.trigger,
              condition: row.condition,
              action: row.action,
              executionCount: row.execution_count || 0,
              lastExecutedAt: row.last_executed_at,
              createdBy: row.created_by,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            });
          }
        }
      } catch (e) {}
    }

    const list = [];
    for (const a of memoryDb.automations.values()) {
      if (a.workflowId === workflowId) list.push(a);
    }
    return list;
  },

  async getTeamAutomations(teamId) {
    if (!teamId) return [];
    if (await areTablesReady()) {
      try {
        const { data } = await supabase.from('automations').select('*').eq('team_id', teamId);
        if (data) {
          for (const row of data) {
            memoryDb.automations.set(row.id, {
              id: row.id,
              workflowId: row.workflow_id,
              teamId: row.team_id,
              name: row.name,
              enabled: row.enabled,
              trigger: row.trigger,
              condition: row.condition,
              action: row.action,
              executionCount: row.execution_count || 0,
              lastExecutedAt: row.last_executed_at,
              createdBy: row.created_by,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            });
          }
        }
      } catch (e) {}
    }
    return Array.from(memoryDb.automations.values()).filter(a => a.teamId === teamId);
  },

  async updateAutomation(automationId, updates, userId) {
    let auto = await this.getAutomationById(automationId);
    if (!auto) throw new Error('Automation not found');
    const now = new Date().toISOString();
    Object.assign(auto, updates, { updatedAt: now });

    if (await areTablesReady()) {
      try {
        const dbUpdates = {
          updated_at: now,
        };
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
        if (updates.trigger !== undefined) dbUpdates.trigger = updates.trigger;
        if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
        if (updates.action !== undefined) dbUpdates.action = updates.action;
        if (updates.executionCount !== undefined) dbUpdates.execution_count = updates.executionCount;
        if (updates.lastExecutedAt !== undefined) dbUpdates.last_executed_at = updates.lastExecutedAt;

        await supabase.from('automations').update(dbUpdates).eq('id', automationId);
      } catch (e) {}
    }

    return auto;
  },

  async deleteAutomation(automationId, userId) {
    memoryDb.automations.delete(automationId);
    if (await areTablesReady()) {
      try {
        await supabase.from('automations').delete().eq('id', automationId);
      } catch (e) {}
    }
    return true;
  },

  async logAutomationExecution(workflowId, details) {
    const id = `autolog_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();
    const wf = await this.getWorkflowById(workflowId);
    const entry = {
      id,
      workflowId,
      teamId: wf?.teamId || null,
      ...details,
      timestamp: now,
    };
    memoryDb.automationLogs.unshift(entry);

    if (await areTablesReady()) {
      try {
        await supabase.from('automation_logs').insert([{
          id,
          workflow_id: workflowId,
          team_id: wf?.teamId || null,
          rule_name: details.ruleName || null,
          trigger: details.trigger || null,
          action_type: details.actionType || null,
          status: details.status || 'SUCCESS',
          details: details.details || null,
          timestamp: now,
        }]);
      } catch (e) {}
    }

    return entry;
  },

  async getAutomationLogs(workflowId, limit = 50) {
    if (await areTablesReady() && workflowId) {
      try {
        const { data } = await supabase
          .from('automation_logs')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('timestamp', { ascending: false })
          .limit(limit);
        if (data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            workflowId: d.workflow_id,
            teamId: d.team_id,
            ruleName: d.rule_name,
            trigger: d.trigger,
            actionType: d.action_type,
            status: d.status,
            details: d.details,
            timestamp: d.timestamp,
          }));
        }
      } catch (e) {}
    }
    return memoryDb.automationLogs.filter(l => l.workflowId === workflowId).slice(0, limit);
  },

  async logTeamActivity(teamId, { action, details, userId, userName, workflowId, taskId }) {
    const entry = {
      id: `act_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
      teamId,
      action,
      details,
      userId,
      userName: userName || (userId ? (await this.getUserById(userId))?.name : 'System'),
      workflowId,
      taskId,
      timestamp: new Date().toISOString(),
    };
    memoryDb.activityLogs.unshift(entry);
    return entry;
  },

  async getTeamActivity(teamId, limit = 50) {
    return memoryDb.activityLogs.filter(a => a.teamId === teamId).slice(0, limit);
  },

  async getUserActivity(userId, limit = 50) {
    return memoryDb.activityLogs.filter(a => a.userId === userId).slice(0, limit);
  },

  async logAudit({ userId, userName, action, resourceType, resourceId, targetUserId, result = 'SUCCESS', reason = '', teamId = null, workflowId = null }) {
    const entry = {
      id: `audit_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
      userId,
      userName,
      action,
      resourceType,
      resourceId,
      targetUserId,
      result,
      reason,
      teamId,
      workflowId,
      timestamp: new Date().toISOString(),
    };
    memoryDb.auditLogs.unshift(entry);
    return entry;
  },

  async getTeamAuditLogs(teamId, limit = 50) {
    return memoryDb.auditLogs.filter(l => l.teamId === teamId).slice(0, limit);
  },

  async saveGraphState(workflowId, { nodes, dependencies }, userId) {
    return this.updateWorkflow(workflowId, { nodes, dependencies }, userId);
  },

  getTeamTemplates(teamId) {
    return [
      {
        id: 'tpl_software',
        name: 'Software Release Sprint',
        description: 'Standard agile development sprint with feature dev, QA testing, and production deployment',
        category: 'Engineering',
      },
      {
        id: 'tpl_marketing',
        name: 'Marketing Campaign Launch',
        description: 'Content review, creative design, social rollout, and performance analytics',
        category: 'Marketing',
      },
    ];
  },

  async instantiateTemplate(teamId, templateId, userId) {
    const wf = await this.createWorkflow(userId, {
      name: 'Software Project Workflow',
      description: 'Sprint planning and release management',
      teamId,
    });
    return wf;
  },

  async searchTeamResources(teamId, userId, q) {
    const role = await this.getTeamMemberRole(teamId, userId);
    if (!role) {
      throw new Error('Access denied: You are not a member of this team');
    }
    const workflows = (await this.getWorkflowsByTeam(teamId, userId)).filter(w => w.name.toLowerCase().includes(q.toLowerCase()));
    const tasks = (await this.getTeamTasks(teamId)).filter(t => t.title.toLowerCase().includes(q.toLowerCase()));
    return { workflows, tasks };
  },

  async createAuditLog(teamId, userId, action, details = {}, result = 'SUCCESS') {
    return this.logAudit({
      teamId,
      userId,
      action,
      reason: typeof details === 'string' ? details : JSON.stringify(details),
      result,
    });
  },

  async seedDefaultData() {
    const salt = await bcrypt.genSalt(10);
    const standardPasswordHash = await bcrypt.hash('Password123!', salt);

    const accountsToEnsure = [
      { id: 'user_hemmanth', name: 'Hemmanth', username: 'hemmanth', email: 'hemmanth@example.com' },
      { id: 'user_priya', name: 'Priya', username: 'priya', email: 'priya@example.com' },
      { id: 'user_ravi', name: 'Ravi', username: 'ravi', email: 'ravi@example.com' },
      { id: 'user_kumar', name: 'Kumar', username: 'kumar', email: 'kumar@example.com' },
      { id: 'user_arun', name: 'Arun', username: 'arun', email: 'arun@flowforge.dev' },
    ];

    for (const acc of accountsToEnsure) {
      await this.getOrCreateUser(acc.id, {
        name: acc.name,
        username: acc.username,
        email: acc.email,
        passwordHash: standardPasswordHash,
      });
    }

    // Default Team
    const teams = await this.getUserTeams('user_hemmanth');
    if (teams.length === 0) {
      const defaultTeam = await this.createTeam('user_hemmanth', {
        name: 'GDG On Campus CIT',
        description: 'Google Developer Groups student team and hackathons',
        icon: '🚀',
      });

      // Add Priya as Team Manager
      memoryDb.teamMembers.set(`${defaultTeam.id}:user_priya`, {
        id: `tm_${uuidv4().substring(0, 8)}`,
        teamId: defaultTeam.id,
        userId: 'user_priya',
        role: 'TEAM_MANAGER',
        joinedAt: new Date().toISOString(),
      });

      // Add Ravi as Team Member
      memoryDb.teamMembers.set(`${defaultTeam.id}:user_ravi`, {
        id: `tm_${uuidv4().substring(0, 8)}`,
        teamId: defaultTeam.id,
        userId: 'user_ravi',
        role: 'TEAM_MEMBER',
        joinedAt: new Date().toISOString(),
      });

      // Create Initial Workflow
      const hackathonWf = await this.createWorkflow('user_hemmanth', {
        name: 'GDG On Campus CIT Hackathon',
        description: 'Annual flagship college hackathon workflow',
        teamId: defaultTeam.id,
      });

      await this.createTask('user_hemmanth', {
        workflowId: hackathonWf.id,
        teamId: defaultTeam.id,
        title: 'Participant Management',
        description: 'Review applicant teams and issue confirmation badges',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assignedTo: 'user_priya',
      });

      await this.createTask('user_hemmanth', {
        workflowId: hackathonWf.id,
        teamId: defaultTeam.id,
        title: 'Venue Preparation & Mentors',
        description: 'Confirm lab allocations, power strips, and catering',
        priority: 'MEDIUM',
        status: 'TODO',
        assignedTo: 'user_ravi',
      });
    }
  },

  async seedMultiTeamScenario() {
    await this.seedDefaultData();

    // 1. Dev Team
    const devTeam = await this.createTeam('user_arun', {
      name: 'Development Team',
      description: 'Core software engineering and infrastructure team',
      icon: '💻',
    });

    // 2. Marketing Team
    const mktTeam = await this.createTeam('user_arun', {
      name: 'Marketing Team',
      description: 'Growth and digital campaigns',
      icon: '📢',
    });

    // 3. Event Team
    const eventTeam = await this.createTeam('user_ravi', {
      name: 'Event Operations',
      description: 'Logistics and summit management',
      icon: '🎪',
    });

    // Add Ravi to Dev Team as TEAM_MEMBER
    await this.addTeamMember(devTeam.id, 'user_ravi', 'TEAM_MEMBER');
    // Add Ravi to Event Team as TEAM_MANAGER
    await this.addTeamMember(eventTeam.id, 'user_ravi', 'TEAM_MANAGER');

    // Create Workflows in Dev Team
    const webWf = await this.createWorkflow('user_arun', {
      name: 'Website Development',
      description: 'Full-stack platform web portal',
      teamId: devTeam.id,
    });

    const mobileWf = await this.createWorkflow('user_arun', {
      name: 'Mobile App',
      description: 'React Native companion app',
      teamId: devTeam.id,
      isRestricted: true,
    });

    // Workflow collaborator permissions
    await this.addWorkflowMember(webWf.id, 'user_ravi', 'MEMBER');
    await this.addWorkflowMember(mobileWf.id, 'user_ravi', 'MEMBER');

    // Tasks for webWf
    const t1 = await this.createTask('user_arun', {
      workflowId: webWf.id,
      teamId: devTeam.id,
      title: 'Development: Team Workspace',
      description: 'Implement collaborative team workspace features',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedTo: 'user_ravi',
    });

    const t2 = await this.createTask('user_arun', {
      workflowId: webWf.id,
      teamId: devTeam.id,
      title: 'Integration & Testing',
      description: 'End-to-end integration test execution',
      priority: 'MEDIUM',
      status: 'TODO',
      dependencies: [t1.id],
      assignedTo: 'user_arun',
    });

    // Connect dependencies in workflow object
    await this.updateWorkflow('user_arun', webWf.id, {
      dependencies: { [t2.id]: [t1.id] },
    });

    // Log initial audit log
    await this.createAuditLog(devTeam.id, 'user_arun', 'TEAM_INITIALIZED', { name: devTeam.name });

    return { devTeam, mktTeam, eventTeam };
  },

  async getInvitationById(id) {
    if (!id) return null;

    // 1. Check Team Invitations
    let teamInv = memoryDb.teamInvitations.get(id);
    if (!teamInv && (await areTablesReady())) {
      try {
        const { data: dbInv } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (dbInv) {
          teamInv = {
            id: dbInv.id,
            teamId: dbInv.team_id,
            teamName: dbInv.team_name,
            email: dbInv.email,
            role: dbInv.role,
            invitedBy: dbInv.invited_by,
            status: dbInv.status,
            createdAt: dbInv.created_at,
            expiresAt: dbInv.expires_at,
          };
          memoryDb.teamInvitations.set(teamInv.id, teamInv);
        }
      } catch (e) {}
    }

    if (teamInv) {
      const inviter = await this.getUserById(teamInv.invitedBy);
      const isExpired = Boolean(teamInv.expiresAt && new Date(teamInv.expiresAt) < new Date());
      return {
        id: teamInv.id,
        type: 'TEAM',
        resourceId: teamInv.teamId,
        resourceName: teamInv.teamName,
        role: teamInv.role,
        status: isExpired && teamInv.status === 'PENDING' ? 'EXPIRED' : teamInv.status,
        isExpired,
        inviterName: inviter?.name || 'Workspace Administrator',
        email: teamInv.email,
        createdAt: teamInv.createdAt,
        expiresAt: teamInv.expiresAt,
      };
    }

    // 2. Check Workflow Invitations
    let wfInv = memoryDb.workflowInvitations.get(id);
    if (!wfInv && (await areTablesReady())) {
      try {
        const { data: dbInv } = await supabase
          .from('workflow_invitations')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (dbInv) {
          wfInv = {
            id: dbInv.id,
            workflowId: dbInv.workflow_id,
            workflowName: dbInv.workflow_name,
            invitedUserId: dbInv.invited_user_id,
            role: dbInv.role,
            status: dbInv.status,
            invitedBy: dbInv.invited_by,
            createdAt: dbInv.created_at,
            expiresAt: dbInv.expires_at,
          };
          memoryDb.workflowInvitations.set(wfInv.id, wfInv);
        }
      } catch (e) {}
    }

    if (wfInv) {
      const inviter = await this.getUserById(wfInv.invitedBy);
      const isExpired = Boolean(wfInv.expiresAt && new Date(wfInv.expiresAt) < new Date());
      return {
        id: wfInv.id,
        type: 'WORKFLOW',
        resourceId: wfInv.workflowId,
        resourceName: wfInv.workflowName,
        role: wfInv.role,
        status: isExpired && wfInv.status === 'PENDING' ? 'EXPIRED' : wfInv.status,
        isExpired,
        inviterName: inviter?.name || 'Workflow Owner',
        invitedUserId: wfInv.invitedUserId,
        createdAt: wfInv.createdAt,
        expiresAt: wfInv.expiresAt,
      };
    }

    return null;
  },

  // Document management methods
  async saveWorkflowDocument({ workflowId, file, uploadedBy, description }) {
    if (!workflowId) throw new Error('Workflow ID is required');
    if (!file) throw new Error('File is required');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      throw new Error(`Unsupported file type (${ext}). Only PDF, DOC, and DOCX files are allowed.`);
    }

    const docId = `doc_${uuidv4().replace(/-/g, '').substring(0, 10)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${workflowId}/${docId}/${safeName}`;
    const now = new Date().toISOString();

    // Upload to Supabase Storage bucket 'workflow-documents'
    if (supabase) {
      try {
        await supabase.storage
          .from('workflow-documents')
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype || 'application/octet-stream',
            upsert: true,
          });
      } catch (err) {
        console.warn('Supabase storage upload notice:', err.message);
      }
    }

    const uploader = await this.getUserById(uploadedBy);

    const doc = {
      id: docId,
      workflowId,
      fileName: file.originalname,
      storagePath,
      fileType: ext.replace('.', '').toUpperCase(),
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy,
      uploaderName: uploader?.name || 'Team Member',
      description: description || '',
      createdAt: now,
    };

    memoryDb.workflowDocuments.set(docId, doc);
    savePersistedDocuments();

    // Log activity
    await this.logTeamActivity(null, {
      action: 'DOCUMENT_UPLOADED',
      details: `Document "${file.originalname}" attached to workflow`,
      userId: uploadedBy,
      workflowId,
    });

    return doc;
  },

  async getWorkflowDocuments(workflowId) {
    const list = [];
    for (const doc of memoryDb.workflowDocuments.values()) {
      if (doc.workflowId === workflowId) {
        list.push(doc);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getDocumentDownloadUrl(docId, userId) {
    const doc = memoryDb.workflowDocuments.get(docId);
    if (!doc) throw new Error('Document not found');

    const role = await this.getWorkflowMemberRole(doc.workflowId, userId);
    if (!role) throw new Error('Access denied: You are not authorized to view documents for this workflow.');

    // Generate signed URL if Supabase storage is active
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('workflow-documents')
          .createSignedUrl(doc.storagePath, 3600); // 1 hour expiration
        if (!error && data?.signedUrl) {
          return { url: data.signedUrl, doc };
        }
      } catch (e) {}
    }

    return { url: null, doc };
  },

  async deleteWorkflowDocument(docId, userId) {
    const doc = memoryDb.workflowDocuments.get(docId);
    if (!doc) throw new Error('Document not found');

    const role = await this.getWorkflowMemberRole(doc.workflowId, userId);
    const isOwnerOrManager = role === 'OWNER' || role === 'MANAGER';
    const isUploader = doc.uploadedBy === userId;

    if (!isOwnerOrManager && !isUploader) {
      throw new Error('Access denied: Only workflow managers or the uploader can delete this document.');
    }

    if (supabase) {
      try {
        await supabase.storage.from('workflow-documents').remove([doc.storagePath]);
      } catch (e) {}
    }

    memoryDb.workflowDocuments.delete(docId);
    savePersistedDocuments();

    return true;
  },

  async updateWorkflowStatus(workflowId, { status, completionDescription, file }, userId) {
    const wf = await this.getWorkflowById(workflowId);
    if (!wf) throw new Error('Workflow not found');

    const normalizedStatus = (status || '').toUpperCase();
    const validStatuses = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'ARCHIVED'];
    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(`Invalid status: ${status}. Valid options are In Progress, Completed, Paused, Active, Archived.`);
    }

    // Rule 11: Mandatory Requirements when marking a workflow COMPLETED
    if (normalizedStatus === 'COMPLETED') {
      const words = (completionDescription || '').trim().split(/\s+/).filter(Boolean);
      if (words.length < 25) {
        throw new Error(`A completion description of at least 25 words is required to mark a workflow Completed (current word count: ${words.length}).`);
      }
      if (!file) {
        throw new Error('At least one PDF or Word document (.pdf, .doc, .docx) attachment is mandatory to mark a workflow Completed.');
      }
      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.pdf', '.doc', '.docx'].includes(ext)) {
        throw new Error('The completion attachment must be a PDF or Word document (.pdf, .doc, .docx).');
      }
    }

    // Optional upload for IN_PROGRESS or any other status
    let uploadedDoc = null;
    if (file) {
      uploadedDoc = await this.saveWorkflowDocument({
        workflowId,
        file,
        uploadedBy: userId,
        description: completionDescription || `Status changed to ${normalizedStatus}`,
      });
    }

    // Map IN_PROGRESS to ACTIVE for Supabase table check constraint ('ACTIVE', 'COMPLETED', 'ARCHIVED', 'PAUSED')
    const dbStatus = normalizedStatus === 'IN_PROGRESS' ? 'ACTIVE' : normalizedStatus;

    wf.status = normalizedStatus;
    if (completionDescription) wf.completionDescription = completionDescription;
    wf.updatedAt = new Date().toISOString();

    if (await areTablesReady()) {
      try {
        await supabase.from('workflows').update({
          status: dbStatus,
          updated_at: wf.updatedAt,
        }).eq('id', workflowId);
      } catch (err) {
        console.error('[Supabase updateWorkflowStatus Error]:', err.message);
      }
    }

    invalidateWorkflowCache();

    // Log activity
    await this.logTeamActivity(wf.teamId, {
      action: 'WORKFLOW_STATUS_CHANGED',
      details: `Workflow "${wf.name}" status updated to ${normalizedStatus}${uploadedDoc ? ` with document "${uploadedDoc.fileName}"` : ''}`,
      userId,
      workflowId,
    });

    return {
      workflow: wf,
      document: uploadedDoc,
      status: normalizedStatus,
    };
  },
};

module.exports = SupabaseService;


