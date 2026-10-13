import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Loader2,
  Lock,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useTeam } from '../context/TeamContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const AuditLogsPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { activeTeam, activeRole, isAdmin, isManager } = useTeam();
  usePageMeta('Security Audit Trail', 'Immutable security audit logs, permission enforcements, and RBAC authorization trail.');

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL'); // 'ALL' | 'SUCCESS' | 'DENIED'

  const fetchAuditLogs = useCallback(async () => {
    if (!activeTeam || !isManager) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/teams/${activeTeam.id}/audit`);
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTeam, isManager]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Section 16: Team Members should not have access to sensitive audit logs
  if (!isManager) {
    return (
      <div className="min-h-screen bg-transparent pb-16 selection:bg-purple-600 selection:text-white">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} title="Security Audit Logs" />
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">
            Access Restricted: Security Audit Logs
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Team Members do not have permission to view sensitive security audit trails and authorization denial records. Please contact a Team Admin if you require audit verification.
          </p>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceType?.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceId?.toLowerCase().includes(search.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(search.toLowerCase()));

    const matchesResult = resultFilter === 'ALL' || log.result === resultFilter;
    return matchesSearch && matchesResult;
  });

  const deniedCount = logs.filter((l) => l.result === 'DENIED').length;

  return (
    <div className="min-h-screen bg-transparent pb-16 selection:bg-purple-600 selection:text-white">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam?.name || 'Team'} Security Audit Logs`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner */}
        <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          {/* Top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {activeTeam?.name} Security & Anti-IDOR Audit Trail
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Immutable audit log tracking all role modifications, access validations, and IDOR boundary enforcement.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Audits</span>
              <span className="font-mono text-base font-bold text-white">{logs.length}</span>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-400 block">Denials</span>
              <span className="font-mono text-base font-bold text-rose-400">{deniedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by user, action, resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#111827] border border-white/15 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {['ALL', 'SUCCESS', 'DENIED'].map((res) => (
              <button
                key={res}
                onClick={() => setResultFilter(res)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  resultFilter === res
                    ? res === 'DENIED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/10'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 overflow-hidden shadow-2xl relative">
          {/* Top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading audit trail from Supabase...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No audit records matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
                <thead className="bg-white/[0.02] border-b border-white/10 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Details / Reason</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            log.result === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {log.result === 'SUCCESS' ? (
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                          )}
                          <span>{log.result}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-white">
                        {log.userName || log.userId}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-brand-300">
                        {log.action}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.resourceType || 'RESOURCE'}: {log.resourceId}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.reason || log.details || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">
                        {log.timestamp?.substring(0, 19).replace('T', ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
