import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Database,
  Search,
  FolderGit2,
  CheckSquare,
  Users,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { NotificationsDropdown } from './NotificationsDropdown';
import { TeamIcon } from './TeamIcon';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { api } from '../services/api';

export const Navbar = ({ onOpenSidebar, title, actions = null }) => {
  const { user } = useAuth();
  const { activeTeam, activeRole } = useTeam();
  const navigate = useNavigate();

  const [dbStatus, setDbStatus] = useState({ connected: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data) {
          setDbStatus({ connected: res.data.connected ?? true });
        }
      } catch (e) {}
    };
    checkHealth();
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Section 29: Scoped Search
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (!q.trim() || !activeTeam) {
      setSearchResults(null);
      return;
    }

    try {
      setSearching(true);
      setIsSearchOpen(true);
      const res = await api.get(`/teams/${activeTeam.id}/search?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(res.data.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setIsSearchOpen(false);
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-dark-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-100 hover:bg-dark-800 rounded-xl lg:hidden transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title & Breadcrumbs */}
        <div className="flex items-center space-x-2 min-w-0">
          <TeamIcon icon={activeTeam?.icon} className="w-5 h-5 text-brand-400 hidden sm:inline-block flex-shrink-0" />
          <h1 className="text-sm sm:text-lg font-bold text-slate-100 tracking-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm">
            {title || 'Dashboard'}
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase hidden md:inline-block border bg-brand-500/10 text-brand-300 border-brand-500/30 flex-shrink-0">
            {activeRole}
          </span>
        </div>
      </div>

      {/* 29. ACCESS-CONTROLLED SCOPED SEARCH BAR */}
      <div className="hidden lg:block relative w-72" ref={searchRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeTeam?.name || 'team'}...`}
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
            className="w-full pl-9 pr-8 py-1.5 bg-dark-850 border border-slate-800 focus:border-brand-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs divide-y divide-slate-800/80 animate-in fade-in zoom-in-95">
            {searching ? (
              <div className="p-4 flex items-center justify-center space-x-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Searching {activeTeam?.name}...</span>
              </div>
            ) : searchResults.workflows.length === 0 &&
              searchResults.tasks.length === 0 &&
              searchResults.members.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                No matching accessible resources in {activeTeam?.name}.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto p-2 space-y-3">
                {/* Workflows */}
                {searchResults.workflows.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Workflows ({searchResults.workflows.length})
                    </div>
                    {searchResults.workflows.map((wf) => (
                      <Link
                        key={wf.id}
                        to={`/workflows/${wf.id}`}
                        onClick={clearSearch}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-850 text-slate-200 transition-colors"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FolderGit2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                          <span className="truncate">{wf.name}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Tasks */}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Tasks ({searchResults.tasks.length})
                    </div>
                    {searchResults.tasks.map((task) => (
                      <Link
                        key={task.id}
                        to="/tasks"
                        onClick={clearSearch}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-850 text-slate-200 transition-colors"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{task.title}</span>
                          <span className="text-[10px] text-slate-500">({task.workflowName})</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">{task.status}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Members */}
                {searchResults.members.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Team Members ({searchResults.members.length})
                    </div>
                    {searchResults.members.map((m) => (
                      <Link
                        key={m.id}
                        to="/team"
                        onClick={clearSearch}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-850 text-slate-200 transition-colors"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Users className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-500">({m.email})</span>
                        </div>
                        <span className="text-[9px] font-mono text-brand-400">{m.role.replace('TEAM_', '')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center space-x-3">
        {/* Supabase Status Indicator */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1 bg-dark-850 border border-slate-800 rounded-full text-xs">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 font-medium">Supabase:</span>
          <span className="flex items-center space-x-1">
            <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-mono text-[11px] text-slate-300">
              PostgreSQL
            </span>
          </span>
        </div>

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* Custom Actions */}
        {actions}
      </div>
    </header>
  );
};
