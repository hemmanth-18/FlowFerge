import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Sparkles,
  Loader2,
  Play,
  CheckCircle2,
  ArrowRight,
  Filter,
  FolderGit2,
  AlertCircle,
  ChevronDown,
  User,
  Shield,
  Layers,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

export const AutomationModal = ({
  isOpen,
  onClose,
  onSave,
  onSubmit,
  initialData = null,
  workflows: initialWorkflows = [],
  selectedWorkflowId = null,
  teamMembers = [],
}) => {
  const [name, setName] = useState('');
  const [workflows, setWorkflows] = useState(initialWorkflows || []);
  const [workflowId, setWorkflowId] = useState(selectedWorkflowId || '');
  const [trigger, setTrigger] = useState('TASK_COMPLETED');
  const [conditionField, setConditionField] = useState('status');
  const [conditionOperator, setConditionOperator] = useState('equals');
  const [conditionValue, setConditionValue] = useState('COMPLETED');
  const [actionType, setActionType] = useState('ACTIVATE_NEXT_TASK');
  const [targetAssignee, setTargetAssignee] = useState('');
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingWfs, setFetchingWfs] = useState(false);

  // Sync / fetch workflows fallback
  useEffect(() => {
    if (initialWorkflows && initialWorkflows.length > 0) {
      setWorkflows(initialWorkflows);
    } else if (isOpen) {
      setFetchingWfs(true);
      api
        .get('/workflows')
        .then((res) => {
          const list = res.data?.data || [];
          setWorkflows(list);
          if (!workflowId && list.length > 0) {
            setWorkflowId(list[0].id);
          }
        })
        .catch(console.warn)
        .finally(() => setFetchingWfs(false));
    }
  }, [isOpen, initialWorkflows]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setWorkflowId(initialData.workflowId || selectedWorkflowId || (workflows[0]?.id || ''));
        setTrigger(initialData.trigger || 'TASK_COMPLETED');
        setConditionField(initialData.condition?.field || 'status');
        setConditionOperator(initialData.condition?.operator || 'equals');
        setConditionValue(initialData.condition?.value || 'COMPLETED');
        setActionType(initialData.action?.type || 'ACTIVATE_NEXT_TASK');
        setTargetAssignee(initialData.action?.params?.targetAssignee || '');
        setNewStatus(initialData.action?.params?.newStatus || 'IN_PROGRESS');
      } else {
        setName('');
        const defaultWfId = selectedWorkflowId || (workflows[0]?.id || '');
        setWorkflowId(defaultWfId);
        setTrigger('TASK_COMPLETED');
        setConditionField('status');
        setConditionOperator('equals');
        setConditionValue('COMPLETED');
        setActionType('ACTIVATE_NEXT_TASK');
        setTargetAssignee('');
        setNewStatus('IN_PROGRESS');
      }
      setError('');
    }
  }, [isOpen, initialData, selectedWorkflowId, workflows]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this automation rule');
      return;
    }

    const targetWfId = workflowId || selectedWorkflowId || workflows[0]?.id;
    if (!targetWfId) {
      setError('Please select a target workflow to attach this automation to');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const saveHandler = onSave || onSubmit;
      if (typeof saveHandler === 'function') {
        await saveHandler({
          workflowId: targetWfId,
          name: name.trim(),
          trigger,
          condition: {
            field: conditionField,
            operator: conditionOperator,
            value: conditionValue.trim(),
          },
          action: {
            type: actionType,
            params: {
              targetAssignee: targetAssignee.trim() || undefined,
              newStatus: actionType === 'CHANGE_STATUS' || actionType === 'ACTIVATE_NEXT_TASK' ? newStatus : undefined,
            },
          },
          enabled: true,
        });
      }

      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to save automation rule';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Human readable preview generator
  const getTriggerLabel = () => {
    const map = {
      TASK_COMPLETED: 'Task is marked as completed',
      TASK_STATUS_CHANGED: 'Task status changes',
      TASK_CREATED: 'New task is created',
      TASK_OVERDUE: 'Task becomes overdue',
      WORKFLOW_COMPLETED: 'Entire workflow completes',
    };
    return map[trigger] || trigger;
  };

  const getActionLabel = () => {
    if (actionType === 'ACTIVATE_NEXT_TASK') {
      return `Activate next downstream DAG task${targetAssignee ? ` & assign to ${targetAssignee}` : ''}`;
    }
    if (actionType === 'ASSIGN_TASK') {
      return `Assign task to ${targetAssignee || 'selected member'}`;
    }
    if (actionType === 'CHANGE_STATUS') {
      return `Change task status to ${newStatus}`;
    }
    return 'Send real-time in-app notification';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/90 flex flex-col max-h-[90vh] overflow-hidden relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-[#0D1220]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {initialData ? 'Edit Smart Automation' : 'Create Smart Automation'}
              </h3>
              <p className="text-xs text-slate-400">Trigger actions automatically based on task and DAG events</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Modal Scrollable Body */}
        <form id="automation-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Live Preview Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 text-xs shadow-inner">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pipeline Rule Summary</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
              <div className="flex items-start space-x-2">
                <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold text-[10px] uppercase">
                  WHEN
                </span>
                <span className="text-slate-200">{getTriggerLabel()}</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold text-[10px] uppercase">
                  IF
                </span>
                <span className="text-slate-300">
                  {conditionField} {conditionOperator} <strong className="text-white">"{conditionValue}"</strong>
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] uppercase">
                  THEN
                </span>
                <span className="text-emerald-300 font-medium">{getActionLabel()}</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Rule Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Automation Rule Name <span className="text-brand-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Activate Next Task & Assign to Hemmanth"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none text-sm transition-all"
            />
          </div>

          {/* Target Workflow Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-brand-400" />
                <span>Target Workflow</span>
                <span className="text-brand-400">*</span>
              </span>
              {workflows.length === 0 && !fetchingWfs && (
                <span className="text-[11px] text-amber-400 normal-case font-normal">
                  No workflows found
                </span>
              )}
            </label>
            {workflows.length > 0 ? (
              <div className="relative">
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-sm appearance-none pr-10 cursor-pointer transition-all"
                >
                  <option value="" disabled>
                    Select target workflow...
                  </option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id} className="bg-[#111827]">
                      {wf.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : fetchingWfs ? (
              <div className="p-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-slate-400 flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Loading available workflows...</span>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Please create at least one workflow first before creating automation rules.</span>
              </div>
            )}
          </div>

          {/* 3-Step Connected Pipeline Flow */}
          <div className="space-y-4 pt-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Event-Driven Rule Logic</span>
            </div>

            {/* Step 1: WHEN */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-brand-500/20 hover:border-brand-500/40 transition-all space-y-2.5 relative">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 text-[10px] font-bold flex items-center justify-center font-mono">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                  WHEN (Trigger Event)
                </span>
              </div>
              <div className="relative">
                <select
                  value={trigger}
                  onChange={(e) => {
                    const newTrig = e.target.value;
                    setTrigger(newTrig);
                    if (newTrig === 'TASK_COMPLETED') {
                      setConditionField('status');
                      setConditionValue('COMPLETED');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none pr-10 cursor-pointer"
                >
                  <option value="TASK_COMPLETED" className="bg-[#111827]">Task is Marked as Completed</option>
                  <option value="TASK_STATUS_CHANGED" className="bg-[#111827]">Task Status Changes</option>
                  <option value="TASK_CREATED" className="bg-[#111827]">New Task is Created</option>
                  <option value="TASK_OVERDUE" className="bg-[#111827]">Task Becomes Overdue</option>
                  <option value="WORKFLOW_COMPLETED" className="bg-[#111827]">Entire Workflow Completes</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Step 2: IF */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-cyan-500/20 hover:border-cyan-500/40 transition-all space-y-2.5 relative">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center font-mono">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  IF (Evaluation Condition)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Field */}
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Field</span>
                  <div className="relative">
                    <select
                      value={conditionField}
                      onChange={(e) => {
                        const f = e.target.value;
                        setConditionField(f);
                        if (f === 'status') setConditionValue('COMPLETED');
                        else if (f === 'priority') setConditionValue('HIGH');
                        else if (f === 'assignedTo') setConditionValue(teamMembers[0]?.name || '');
                        else setConditionValue('');
                      }}
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none appearance-none pr-8 cursor-pointer"
                    >
                      <option value="status" className="bg-[#111827]">Task Status</option>
                      <option value="priority" className="bg-[#111827]">Priority</option>
                      <option value="title" className="bg-[#111827]">Task Title</option>
                      <option value="assignedTo" className="bg-[#111827]">Assignee</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Operator */}
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Operator</span>
                  <div className="relative">
                    <select
                      value={conditionOperator}
                      onChange={(e) => setConditionOperator(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none appearance-none pr-8 cursor-pointer"
                    >
                      <option value="equals" className="bg-[#111827]">equals</option>
                      <option value="not_equals" className="bg-[#111827]">not equals</option>
                      <option value="contains" className="bg-[#111827]">contains</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Value */}
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Value</span>
                  {conditionField === 'status' ? (
                    <div className="relative">
                      <select
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-cyan-500 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none pr-8 cursor-pointer"
                      >
                        <option value="COMPLETED" className="bg-[#111827]">COMPLETED</option>
                        <option value="IN_PROGRESS" className="bg-[#111827]">IN_PROGRESS</option>
                        <option value="IN_REVIEW" className="bg-[#111827]">IN_REVIEW</option>
                        <option value="TODO" className="bg-[#111827]">TODO</option>
                        <option value="BLOCKED" className="bg-[#111827]">BLOCKED</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : conditionField === 'priority' ? (
                    <div className="relative">
                      <select
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-cyan-500 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none pr-8 cursor-pointer"
                      >
                        <option value="URGENT" className="bg-[#111827]">URGENT</option>
                        <option value="HIGH" className="bg-[#111827]">HIGH</option>
                        <option value="MEDIUM" className="bg-[#111827]">MEDIUM</option>
                        <option value="LOW" className="bg-[#111827]">LOW</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : conditionField === 'assignedTo' && teamMembers.length > 0 ? (
                    <div className="relative">
                      <select
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-cyan-500 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none pr-8 cursor-pointer"
                      >
                        <option value="" className="bg-[#111827]">Any Assignee</option>
                        {teamMembers.map((m) => {
                          const val = m.name || m.username || m.email;
                          return (
                            <option key={m.id || m.userId || val} value={val} className="bg-[#111827]">
                              {val}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Requirements"
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: THEN */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-3 relative">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center font-mono">
                  3
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  THEN (Automated Action)
                </span>
              </div>

              <div className="relative">
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-emerald-500 rounded-xl text-xs text-slate-200 focus:outline-none appearance-none pr-10 cursor-pointer"
                >
                  <option value="ACTIVATE_NEXT_TASK" className="bg-[#111827]">Activate Next Downstream Task (DAG)</option>
                  <option value="ASSIGN_TASK" className="bg-[#111827]">Assign / Reassign Task</option>
                  <option value="CHANGE_STATUS" className="bg-[#111827]">Change Task Status</option>
                  <option value="SEND_NOTIFICATION" className="bg-[#111827]">Send In-App Notification</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Target Assignee field */}
              {(actionType === 'ACTIVATE_NEXT_TASK' || actionType === 'ASSIGN_TASK') && (
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>Assign To Member {actionType === 'ASSIGN_TASK' && <span className="text-brand-400">*</span>}</span>
                  </label>
                  {teamMembers.length > 0 ? (
                    <div className="relative">
                      <select
                        value={targetAssignee}
                        onChange={(e) => setTargetAssignee(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-emerald-500 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none pr-10 cursor-pointer"
                      >
                        <option value="" className="bg-[#111827]">Leave Unassigned / Default</option>
                        {teamMembers.map((m) => {
                          const displayName = m.name || m.username || m.email;
                          const roleText = m.role ? m.role.replace('TEAM_', '') : 'Member';
                          return (
                            <option key={m.id || m.userId || displayName} value={displayName} className="bg-[#111827]">
                              {displayName} ({roleText})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Member name or email"
                      value={targetAssignee}
                      onChange={(e) => setTargetAssignee(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 focus:border-emerald-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
                    />
                  )}
                </div>
              )}

              {/* Change Status selector */}
              {actionType === 'CHANGE_STATUS' && (
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    New Task Status <span className="text-brand-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-emerald-500 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none pr-10 cursor-pointer"
                    >
                      <option value="TODO" className="bg-[#111827]">To Do (TODO)</option>
                      <option value="IN_PROGRESS" className="bg-[#111827]">In Progress</option>
                      <option value="IN_REVIEW" className="bg-[#111827]">In Review</option>
                      <option value="COMPLETED" className="bg-[#111827]">Completed</option>
                      <option value="BLOCKED" className="bg-[#111827]">Blocked</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* 3. Modal Sticky Footer (Always visible, perfectly aligned) */}
        <div className="px-6 py-4 bg-[#0A0E18]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Executes automatically in real-time</span>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="automation-form"
              disabled={loading || workflows.length === 0}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{initialData ? 'Update Rule' : 'Save Automation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationModal;
