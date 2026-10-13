import React, { useState, useEffect } from 'react';
import { X, Zap, Sparkles, Loader2, Play, CheckCircle2 } from 'lucide-react';

export const AutomationModal = ({
  isOpen,
  onClose,
  onSave,
  onSubmit,
  initialData = null,
  workflows = [],
  selectedWorkflowId = null,
  teamMembers = [],
}) => {
  const [name, setName] = useState('');
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

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setWorkflowId(initialData.workflowId || selectedWorkflowId || (workflows[0]?.id || ''));
        setTrigger(initialData.trigger || 'TASK_COMPLETED');
        setConditionField(initialData.condition?.field || 'status');
        setConditionOperator(initialData.condition?.operator || 'equals');
        setConditionValue(initialData.condition?.value || '');
        setActionType(initialData.action?.type || 'ACTIVATE_NEXT_TASK');
        setTargetAssignee(initialData.action?.params?.targetAssignee || '');
        setNewStatus(initialData.action?.params?.newStatus || 'IN_PROGRESS');
      } else {
        setName('');
        setWorkflowId(selectedWorkflowId || (workflows[0]?.id || ''));
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
      setError('Please select a target workflow');
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
  const getSummary = () => {
    const triggerLabels = {
      TASK_COMPLETED: 'Task is completed',
      TASK_STATUS_CHANGED: 'Task status changes',
      TASK_CREATED: 'New task is created',
      TASK_OVERDUE: 'Task becomes overdue',
      WORKFLOW_COMPLETED: 'Entire workflow completes',
    };
    const triggerText = triggerLabels[trigger] || trigger;

    let condText = '';
    if (conditionValue) {
      condText = `IF ${conditionField} ${conditionOperator} "${conditionValue}"`;
    }

    let actionText = '';
    if (actionType === 'ACTIVATE_NEXT_TASK') {
      actionText = `THEN Activate next downstream task in DAG${targetAssignee ? ` & assign to ${targetAssignee}` : ''}`;
    } else if (actionType === 'ASSIGN_TASK') {
      actionText = `THEN Assign task to ${targetAssignee || 'selected member'}`;
    } else if (actionType === 'CHANGE_STATUS') {
      actionText = `THEN Change task status to ${newStatus}`;
    } else {
      actionText = `THEN Send in-app notification`;
    }

    return `WHEN ${triggerText} ${condText ? `${condText} ` : ''}${actionText}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden relative z-50 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialData ? 'Edit Automation Rule' : 'Create Smart Automation'}
              </h3>
              <p className="text-xs text-slate-400">Trigger actions automatically based on task and DAG events</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Summary Card */}
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs">
          <span className="font-mono text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center space-x-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Rule Summary</span>
          </span>
          <p className="text-slate-200 font-medium leading-relaxed font-mono text-[11px]">
            {getSummary()}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Automation Rule Name <span className="text-brand-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Activate Next Task & Assign to QA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none text-sm transition-all"
            />
          </div>

          {workflows.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Workflow <span className="text-brand-400">*</span>
              </label>
              <select
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 focus:outline-none text-sm"
              >
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id} className="bg-[#111827]">
                    {wf.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section: WHEN (Trigger) */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-400">
              <span>1. WHEN (Trigger Event)</span>
            </div>
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
              className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-200 focus:border-brand-500"
            >
              <option value="TASK_COMPLETED" className="bg-[#111827]">Task is Marked as Completed</option>
              <option value="TASK_STATUS_CHANGED" className="bg-[#111827]">Task Status Changes</option>
              <option value="TASK_CREATED" className="bg-[#111827]">New Task is Created</option>
              <option value="TASK_OVERDUE" className="bg-[#111827]">Task Becomes Overdue</option>
              <option value="WORKFLOW_COMPLETED" className="bg-[#111827]">Entire Workflow Completes</option>
            </select>
          </div>

          {/* Section: IF (Condition) */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <span>2. IF (Evaluation Condition)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
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
                className="px-2.5 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-200 focus:border-brand-500"
              >
                <option value="status" className="bg-[#111827]">Task Status</option>
                <option value="priority" className="bg-[#111827]">Priority</option>
                <option value="title" className="bg-[#111827]">Task Title</option>
                <option value="assignedTo" className="bg-[#111827]">Assignee</option>
              </select>

              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
                className="px-2.5 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-200 focus:border-brand-500"
              >
                <option value="equals" className="bg-[#111827]">equals</option>
                <option value="not_equals" className="bg-[#111827]">not equals</option>
                <option value="contains" className="bg-[#111827]">contains</option>
              </select>

              {conditionField === 'status' ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-100 focus:border-brand-500"
                >
                  <option value="COMPLETED" className="bg-[#111827]">COMPLETED</option>
                  <option value="IN_PROGRESS" className="bg-[#111827]">IN_PROGRESS</option>
                  <option value="IN_REVIEW" className="bg-[#111827]">IN_REVIEW</option>
                  <option value="TODO" className="bg-[#111827]">TODO</option>
                  <option value="BLOCKED" className="bg-[#111827]">BLOCKED</option>
                </select>
              ) : conditionField === 'priority' ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-100 focus:border-brand-500"
                >
                  <option value="URGENT" className="bg-[#111827]">URGENT</option>
                  <option value="HIGH" className="bg-[#111827]">HIGH</option>
                  <option value="MEDIUM" className="bg-[#111827]">MEDIUM</option>
                  <option value="LOW" className="bg-[#111827]">LOW</option>
                </select>
              ) : conditionField === 'assignedTo' && teamMembers.length > 0 ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-100 focus:border-brand-500"
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
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Requirements"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-white/[0.045] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500"
                />
              )}
            </div>
          </div>

          {/* Section: THEN (Action) */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span>3. THEN (Automated Action)</span>
            </div>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-200 focus:border-brand-500"
            >
              <option value="ACTIVATE_NEXT_TASK" className="bg-[#111827]">Activate Next Downstream Task (DAG)</option>
              <option value="ASSIGN_TASK" className="bg-[#111827]">Assign / Reassign Task</option>
              <option value="CHANGE_STATUS" className="bg-[#111827]">Change Task Status</option>
              <option value="SEND_NOTIFICATION" className="bg-[#111827]">Send In-App Notification</option>
            </select>

            {/* Target Assignee field */}
            {(actionType === 'ACTIVATE_NEXT_TASK' || actionType === 'ASSIGN_TASK') && (
              <div className="pt-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Assign To Member {actionType === 'ASSIGN_TASK' && <span className="text-brand-400">*</span>}
                </label>
                {teamMembers.length > 0 ? (
                  <select
                    value={targetAssignee}
                    onChange={(e) => setTargetAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
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
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Member name or email"
                    value={targetAssignee}
                    onChange={(e) => setTargetAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.045] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500"
                  />
                )}
              </div>
            )}

            {/* Change Status selector */}
            {actionType === 'CHANGE_STATUS' && (
              <div className="pt-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  New Task Status <span className="text-brand-400">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODO" className="bg-[#111827]">To Do (TODO)</option>
                  <option value="IN_PROGRESS" className="bg-[#111827]">In Progress</option>
                  <option value="IN_REVIEW" className="bg-[#111827]">In Review</option>
                  <option value="COMPLETED" className="bg-[#111827]">Completed</option>
                  <option value="BLOCKED" className="bg-[#111827]">Blocked</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <span>{initialData ? 'Update Rule' : 'Save Automation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
