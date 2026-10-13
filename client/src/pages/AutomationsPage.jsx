import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Zap,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Shield,
  Layers,
  ArrowRight,
  Activity,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AutomationModal } from '../components/AutomationModal';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { api } from '../services/api';

export const AutomationsPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const { user } = useAuth();
  const { activeTeam, activeRole, isAdmin, isManager } = useTeam();
  const toast = useToast();

  usePageMeta('Automations & Triggers', 'Trigger automatic status transitions, dependency resolutions, and task assignments.');

  const [rules, setRules] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWfId, setSelectedWfId] = useState('ALL');
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'logs'
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const fetchData = useCallback(async () => {
    if (!activeTeam) {
      setLoading(false);
      return;
    }

    // Role check: If member, they can't manage automations
    if (!isManager) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [rulesRes, wfRes, logsRes] = await Promise.all([
        api.get(`/automations?teamId=${activeTeam.id}`),
        api.get(`/workflows?teamId=${activeTeam.id}`),
        api.get(`/teams/${activeTeam.id}/audit`).catch(() => ({ data: { data: [] } })),
      ]);

      const fetchedRules = rulesRes.data.data || [];
      const fetchedWfs = wfRes.data.data || [];
      setRules(fetchedRules);
      setWorkflows(fetchedWfs);

      // Collect automation logs from workflows
      const allLogs = [];
      for (const wf of fetchedWfs.slice(0, 5)) {
        try {
          const lRes = await api.get(`/automations/workflow/${wf.id}/logs`);
          allLogs.push(...(lRes.data.data || []));
        } catch (e) {}
      }
      setLogs(allLogs);
    } catch (err) {
      console.error('Failed to load automations:', err);
      toast.error('Failed to load automations: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTeam, isManager, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleRule = async (rule) => {
    try {
      const nextState = !rule.enabled;
      await api.put(`/automations/${rule.id}`, {
        workflowId: rule.workflowId,
        enabled: nextState,
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: nextState } : r))
      );
      toast.success(`Automation rule "${rule.name}" ${nextState ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      toast.error('Failed to update rule: ' + err.message);
    }
  };

  const handleDeleteRule = async (rule) => {
    if (window.confirm(`Delete automation rule "${rule.name}"?`)) {
      try {
        await api.delete(`/automations/${rule.id}?workflowId=${rule.workflowId}`);
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
        toast.success(`Rule "${rule.name}" deleted.`);
      } catch (err) {
        toast.error('Failed to delete rule: ' + err.message);
      }
    }
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const isEdit = Boolean(editingRule);
      if (isEdit) {
        await api.put(`/automations/${editingRule.id}`, ruleData);
      } else {
        await api.post(`/automations/workflow/${ruleData.workflowId}`, ruleData);
      }
      toast.success(isEdit ? 'Automation rule updated!' : 'Automation rule created successfully!');
      fetchData();
      setEditingRule(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save automation rule');
    }
  };

  // Section 13: Team Members cannot modify automation rules
  if (!isManager) {
    return (
      <div className="min-h-screen bg-dark-950 pb-16">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} title="Automations" />
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-100">
            Restricted to Team Managers & Admins
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            You are currently logged in with the <strong className="text-emerald-400">TEAM_MEMBER</strong> role in {activeTeam?.name}. Workflow automation rules can only be created and configured by Team Managers and Team Admins.
          </p>
        </div>
      </div>
    );
  }

  const filteredRules = selectedWfId === 'ALL'
    ? rules
    : rules.filter((r) => r.workflowId === selectedWfId);

  return (
    <div className="min-h-screen bg-dark-950 pb-16">
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        title={`${activeTeam?.name || 'Team'} Automations`}
        actions={
          <button
            onClick={() => {
              setEditingRule(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Rule</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-100">
                {activeTeam?.name} Smart Automations ({rules.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automate task activations, assignments, and notifications within {activeTeam?.name} workflows.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center space-x-1 p-1 bg-dark-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'rules'
                  ? 'bg-brand-600 text-white shadow-glow-brand'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Rules ({rules.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'logs'
                  ? 'bg-brand-600 text-white shadow-glow-brand'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Execution Logs ({logs.length})
            </button>
          </div>
        </div>

        {/* Workflow Filter */}
        <div className="flex items-center space-x-3 p-3 rounded-2xl bg-dark-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Filter by Workflow:</span>
          <select
            value={selectedWfId}
            onChange={(e) => setSelectedWfId(e.target.value)}
            className="px-3 py-1.5 bg-dark-850 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Workflows ({rules.length} rules)</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading team automation engine...</p>
          </div>
        ) : activeTab === 'rules' ? (
          /* Rules List */
          filteredRules.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
              <Zap className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">No automation rules configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Set up trigger-condition-action automations to automatically progress tasks and notify team members.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5 flex-1">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className="mt-0.5 text-slate-400 hover:text-brand-400 transition-colors"
                      title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6 text-brand-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-200">{rule.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-dark-800 text-slate-400 border border-slate-700">
                          {rule.workflowName || 'Workflow'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                          WHEN: {rule.trigger}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-mono">
                          THEN: {rule.action?.type}
                        </span>
                        <span className="text-slate-500 ml-2">
                          • Executed {rule.executionCount || 0} times
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={() => handleDeleteRule(rule)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-dark-800 rounded-lg transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Execution Logs */
          logs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-dark-900 border border-slate-800 text-xs text-slate-500">
              No automation execution logs recorded yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-dark-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-dark-850 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Rule Name</th>
                    <th className="py-2.5 px-4">Trigger</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-dark-850/60 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{log.ruleName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-indigo-300">{log.trigger}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-brand-300">{log.actionType}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{log.details}</td>
                      <td className="py-3 px-4 text-slate-500 text-[10px]">{log.timestamp?.substring(11, 19)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <AutomationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveRule}
        initialData={editingRule}
        workflows={workflows}
      />
    </div>
  );
};

export default AutomationsPage;
