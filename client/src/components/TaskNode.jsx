import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Calendar, User, CheckCircle, Clock, Circle, Edit3, Paperclip, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';

const TaskNode = ({ data, selected }) => {
  const { user } = useAuth();
  const { isAdmin, isManager } = useTeam();

  const task = data?.task || {
    title: 'Untitled Task',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assignedTo: 'Unassigned',
    dueDate: '',
  };

  const rawAssignee = task.assignedTo || '';
  const isAssignedToMe = Boolean(
    user && rawAssignee && (
      rawAssignee === user.name ||
      rawAssignee === user.username ||
      rawAssignee === user.id ||
      rawAssignee === user.email ||
      rawAssignee === `@${user.username}` ||
      (user.name && rawAssignee.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
      (user.username && rawAssignee.toLowerCase().trim() === user.username.toLowerCase().trim())
    )
  );
  const canModifyTask = isAdmin || isManager || isAssignedToMe;

  const onStatusChange = (e, newStatus) => {
    e.stopPropagation();
    if (!canModifyTask) return;
    if (data?.onUpdateTaskStatus) {
      data.onUpdateTaskStatus(task.id, newStatus);
    }
  };

  const onNodeEdit = (e) => {
    e.stopPropagation();
    if (data?.onEditTask) {
      data.onEditTask(task);
    }
  };

  // Determine border color based on status and selection
  const getBorderColor = () => {
    if (selected) return 'border-brand-400 ring-2 ring-brand-400/40 shadow-xl shadow-brand-500/25';
    if (task.status === 'COMPLETED') return 'border-emerald-500/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-500/5';
    if (task.status === 'IN_PROGRESS') return 'border-brand-500/45 hover:border-brand-400/70 shadow-lg shadow-brand-500/10';
    return 'border-white/10 hover:border-white/20';
  };

  const getTopBarColor = () => {
    if (task.status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20';
    if (task.status === 'IN_PROGRESS') return 'bg-brand-500/10 text-brand-300 border-b border-brand-500/20';
    return 'bg-white/[0.03] text-slate-300 border-b border-white/10';
  };

  return (
    <div
      className={`relative min-w-[270px] max-w-[320px] rounded-2xl bg-[#0D1220]/95 shadow-2xl border transition-all duration-200 backdrop-blur-2xl ${getBorderColor()}`}
    >
      {/* 4 Connection Handles (Left, Right, Top, Bottom) for full horizontal and vertical pipeline drawing */}
      {/* 1. Left Handle: Input / Target (for horizontal Left-to-Right pipelines) */}
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        title="Input: Connect previous task here"
        className="!w-3.5 !h-3.5 !-left-2 !top-1/2 !-translate-y-1/2 !bg-[#8B5CF6] !border-2 !border-[#0D1220] !shadow-[0_0_10px_#8b5cf6] hover:!scale-130 hover:!bg-[#A78BFA] transition-all !cursor-crosshair !z-20"
      />

      {/* 2. Top Handle: Input / Target (for vertical Top-to-Bottom pipelines) */}
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        title="Input: Connect previous task here"
        className="!w-3.5 !h-3.5 !-top-2 !left-1/2 !-translate-x-1/2 !bg-[#8B5CF6] !border-2 !border-[#0D1220] !shadow-[0_0_10px_#8b5cf6] hover:!scale-130 hover:!bg-[#A78BFA] transition-all !cursor-crosshair !z-20"
      />

      {/* 3. Right Handle: Output / Source (for horizontal Left-to-Right pipelines) */}
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        title="Output: Drag arrow to connect next task"
        className="!w-3.5 !h-3.5 !-right-2 !top-1/2 !-translate-y-1/2 !bg-[#8B5CF6] !border-2 !border-[#0D1220] !shadow-[0_0_10px_#8b5cf6] hover:!scale-130 hover:!bg-[#A78BFA] transition-all !cursor-crosshair !z-20"
      />

      {/* 4. Bottom Handle: Output / Source (for vertical Top-to-Bottom pipelines) */}
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        title="Output: Drag arrow to connect next task"
        className="!w-3.5 !h-3.5 !-bottom-2 !left-1/2 !-translate-x-1/2 !bg-[#8B5CF6] !border-2 !border-[#0D1220] !shadow-[0_0_10px_#8b5cf6] hover:!scale-130 hover:!bg-[#A78BFA] transition-all !cursor-crosshair !z-20"
      />

      {/* Inner Card Container with rounded corners */}
      <div className="rounded-2xl overflow-hidden">
        {/* Card Header */}
        <div className={`px-3.5 py-2.5 flex items-center justify-between ${getTopBarColor()}`}>
          <div className="flex items-center space-x-2 truncate">
            <span className="font-semibold text-sm text-white truncate">{task.title}</span>
          </div>
          <button
            onClick={onNodeEdit}
            title="Edit Task"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-3.5 space-y-3">
          {task.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <StatusBadge status={task.status} size="xs" />
            <PriorityBadge priority={task.priority} size="xs" />
            {(task.documentName || task.documentId) && (
              <span className="inline-flex items-center space-x-1 text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                <Paperclip className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{task.documentName || 'Deliverable'}</span>
              </span>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
            <div className="flex items-center space-x-1 truncate max-w-[130px]">
              <User className="w-3 h-3 text-slate-500" />
              <span className="truncate">{task.assignedTo || 'Unassigned'}</span>
            </div>

            {task.dueDate && (
              <div className="flex items-center space-x-1 text-slate-400">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{task.dueDate}</span>
              </div>
            )}
          </div>

          {/* Quick Status Control Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/5">
            <button
              onClick={(e) => onStatusChange(e, 'TODO')}
              disabled={!canModifyTask}
              title={canModifyTask ? 'Set to Todo' : `View-Only: Assigned to ${task.assignedTo || 'another member'}`}
              className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                !canModifyTask ? 'opacity-40 cursor-not-allowed ' : ''
              }${
                task.status === 'TODO'
                  ? 'bg-white/[0.12] text-white border border-white/20'
                  : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 border border-white/5'
              }`}
            >
              <Circle className="w-2.5 h-2.5" />
              <span>Todo</span>
            </button>
            <button
              onClick={(e) => onStatusChange(e, 'IN_PROGRESS')}
              disabled={!canModifyTask}
              title={canModifyTask ? 'Set to In Progress' : `View-Only: Assigned to ${task.assignedTo || 'another member'}`}
              className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                !canModifyTask ? 'opacity-40 cursor-not-allowed ' : ''
              }${
                task.status === 'IN_PROGRESS'
                  ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40 shadow-sm'
                  : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 border border-white/5'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Active</span>
            </button>
            <button
              onClick={(e) => onStatusChange(e, 'COMPLETED')}
              disabled={!canModifyTask}
              title={canModifyTask ? 'Mark Completed' : `View-Only: Assigned to ${task.assignedTo || 'another member'}`}
              className={`px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                !canModifyTask ? 'opacity-40 cursor-not-allowed ' : ''
              }${
                task.status === 'COMPLETED'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 border border-white/5'
              }`}
            >
              <CheckCircle className="w-2.5 h-2.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TaskNode);
