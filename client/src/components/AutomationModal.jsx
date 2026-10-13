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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-dark-900 border border-slate-800 rounded-2xl shadow-card-dark overflow-hidden relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-dark-850">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {initialData ? 'Edit Automation Rule' : 'Create Smart Automation'}
              </h3>
              <p className="text-xs text-slate-400">Trigger actions automatically based on task and DAG events</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Summary Card */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 to-brand-950/30 border border-amber-500/30 text-xs">
          <span className="font-mono text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-1">
            ⚡ Rule Summary
          </span>
          <p className="text-slate-200 font-medium leading-relaxed font-mono text-[11px]">
            {getSummary()}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg">
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
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
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
                className="w-full px-3.5 py-2.5 bg-dark-800 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-sm"
              >
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section: WHEN (Trigger) */}
          <div className="p-3.5 rounded-xl bg-dark-850 border border-slate-800 space-y-2">
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
              className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-brand-500"
            >
              <option value="TASK_COMPLETED">Task is Marked as Completed</option>
              <option value="TASK_STATUS_CHANGED">Task Status Changes</option>
              <option value="TASK_CREATED">New Task is Created</option>
              <option value="TASK_OVERDUE">Task Becomes Overdue</option>
              <option value="WORKFLOW_COMPLETED">Entire Workflow Completes</option>
            </select>
          </div>

          {/* Section: IF (Condition) */}
          <div className="p-3.5 rounded-xl bg-dark-850 border border-slate-800 space-y-2">
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
                className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-brand-500"
              >
                <option value="status">Task Status</option>
                <option value="priority">Priority</option>
                <option value="title">Task Title</option>
                <option value="assignedTo">Assignee</option>
              </select>

              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
                className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-brand-500"
              >
                <option value="equals">equals</option>
                <option value="not_equals">not equals</option>
                <option value="contains">contains</option>
              </select>

              {conditionField === 'status' ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-brand-500"
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="TODO">TODO</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              ) : conditionField === 'priority' ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-brand-500"
                >
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              ) : conditionField === 'assignedTo' && teamMembers.length > 0 ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-brand-500"
                >
                  <option value="">Any Assignee</option>
                  {teamMembers.map((m) => {
                    const val = m.name || m.username || m.email;
                    return (
                      <option key={m.id || m.userId || val} value={val}>
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
                  className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500"
                />
              )}
            </div>
          </div>

          {/* Section: THEN (Action) */}
          <div className="p-3.5 rounded-xl bg-dark-850 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span>3. THEN (Automated Action)</span>
            </div>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-brand-500"
            >
              <option value="ACTIVATE_NEXT_TASK">Activate Next Downstream Task (DAG)</option>
              <option value="ASSIGN_TASK">Assign / Reassign Task</option>
              <option value="CHANGE_STATUS">Change Task Status</option>
              <option value="SEND_NOTIFICATION">Send In-App Notification</option>
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
                    className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Leave Unassigned / Default</option>
                    {teamMembers.map((m) => {
                      const displayName = m.name || m.username || m.email;
                      const roleText = m.role ? m.role.replace('TEAM_', '') : 'Member';
                      return (
                        <option key={m.id || m.userId || displayName} value={displayName}>
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
                    className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500"
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
                  className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="TODO">To Do (TODO)</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand disabled:opacity-50"
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
