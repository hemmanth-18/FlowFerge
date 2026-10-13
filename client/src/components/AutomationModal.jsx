import React, { useState, useEffect } from 'react';
import { X, Zap, Sparkles, Loader2, Play, CheckCircle2 } from 'lucide-react';

export const AutomationModal = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  workflows = [],
  selectedWorkflowId = null,
}) => {
  const [name, setName] = useState('');
  const [workflowId, setWorkflowId] = useState(selectedWorkflowId || '');
  const [trigger, setTrigger] = useState('TASK_COMPLETED');
  const [conditionField, setConditionField] = useState('title');
  const [conditionOperator, setConditionOperator] = useState('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [actionType, setActionType] = useState('ACTIVATE_NEXT_TASK');
  const [targetAssignee, setTargetAssignee] = useState('');
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setWorkflowId(initialData.workflowId || selectedWorkflowId || '');
        setTrigger(initialData.trigger || 'TASK_COMPLETED');
        setConditionField(initialData.condition?.field || 'title');
        setConditionOperator(initialData.condition?.operator || 'equals');
        setConditionValue(initialData.condition?.value || '');
        setActionType(initialData.action?.type || 'ACTIVATE_NEXT_TASK');
        setTargetAssignee(initialData.action?.params?.targetAssignee || '');
        setNewStatus(initialData.action?.params?.newStatus || 'IN_PROGRESS');
      } else {
        setName('');
        setWorkflowId(selectedWorkflowId || (workflows[0]?.id || ''));
        setTrigger('TASK_COMPLETED');
        setConditionField('title');
        setConditionOperator('equals');
        setConditionValue('');
        setActionType('ACTIVATE_NEXT_TASK');
        setTargetAssignee('Ravi (Member)');
        setNewStatus('IN_PROGRESS');
      }
      setError('');
    }
  }, [isOpen, initialData, selectedWorkflowId]);

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
      setError(err.response?.data?.error || err.message || 'Failed to save automation rule');
    } finally {
      setLoading(false);
    }
  };

  // Human readable preview generator
  const getSummary = () => {
    const triggerText = trigger.replace(/_/g, ' ').toLowerCase();
    const condText = conditionValue ? `IF ${conditionField} ${conditionOperator} "${conditionValue}"` : '';
    let actionText = '';

    if (actionType === 'ACTIVATE_NEXT_TASK') {
      actionText = `THEN Activate Next Task in graph${targetAssignee ? ` & assign to ${targetAssignee}` : ''}`;
    } else if (actionType === 'ASSIGN_TASK') {
      actionText = `THEN Assign Task to ${targetAssignee || 'User'}`;
    } else if (actionType === 'CHANGE_STATUS') {
      actionText = `THEN Change Status to ${newStatus}`;
    } else {
      actionText = `THEN Send Notification`;
    }

    return `WHEN Task is ${triggerText} ${condText} ${actionText}`;
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
              placeholder="e.g. Activate Testing & Assign to QA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
            />
          </div>

          {!selectedWorkflowId && workflows.length > 0 && (
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
              onChange={(e) => setTrigger(e.target.value)}
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
                onChange={(e) => setConditionField(e.target.value)}
                className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-200"
              >
                <option value="title">Task Title</option>
                <option value="status">Task Status</option>
                <option value="priority">Priority</option>
                <option value="assignedTo">Assignee</option>
              </select>

              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
                className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-200"
              >
                <option value="equals">equals</option>
                <option value="not_equals">not equals</option>
                <option value="contains">contains</option>
              </select>

              <input
                type="text"
                placeholder="e.g. Requirements"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                className="px-2.5 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500"
              />
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
                  Assign To Member
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ravi (Member) or Kumar (Member)"
                  value={targetAssignee}
                  onChange={(e) => setTargetAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500"
                />
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
