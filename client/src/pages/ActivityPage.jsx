import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  User,
  Zap,
  FolderGit2,
  Users,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useTeam } from '../context/TeamContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const ActivityPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { activeTeam, activeRole } = useTeam();
  usePageMeta('Team Activity Feed', 'Track live audit operations, task completions, and workflow edits.');

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async (isManual = false) => {
    if (!activeTeam) {
      setLoading(false);
      return;
    }
    try {
      if (isManual) setRefreshing(true);
      const res = await api.get(`/teams/${activeTeam.id}/activity`);
      setActivities(res.data.data || []);
    } catch (err) {
      console.error('Failed to load team activity:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeam]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const getActivityIcon = (action) => {
    if (action.includes('COMPLETED')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (action.includes('TASK')) return <Clock className="w-4 h-4 text-amber-400" />;
    if (action.includes('WORKFLOW')) return <FolderGit2 className="w-4 h-4 text-brand-400" />;
    if (action.includes('AUTOMATION')) return <Zap className="w-4 h-4 text-indigo-400" />;
    if (action.includes('MEMBER') || action.includes('INVITATION')) return <Users className="w-4 h-4 text-cyan-400" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-16">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam?.name || 'Team'} Live Activity Feed`}
        actions={
          <button
            onClick={() => fetchActivity(true)}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-xl transition-colors"
            title="Refresh Activity"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-brand-400" />
              <span>Real-Time Team Event Stream</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates for {activeTeam?.name} task completions, workflow alterations, and automation triggers.
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
            {activeRole}
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading live activity feed...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
            <Activity className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">No activity recorded yet</h3>
            <p className="text-xs text-slate-500">
              Actions taken in this team will appear in this timeline.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-dark-900 border border-slate-800 shadow-sm space-y-6">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {activities.map((act) => (
                <div key={act.id} className="relative flex items-start space-x-3.5 group">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-dark-900 border-2 border-slate-700 flex items-center justify-center group-hover:border-brand-400 transition-colors">
                    {getActivityIcon(act.action)}
                  </div>

                  <div className="flex-1 p-3 rounded-xl bg-dark-850 border border-slate-800/80 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        {act.userName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {act.timestamp?.substring(0, 19).replace('T', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {act.details || act.action}
                    </p>
                    <span className="inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-slate-750">
                      {act.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
