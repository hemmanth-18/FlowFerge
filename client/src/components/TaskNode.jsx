import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Calendar, User, CheckCircle, Clock, Circle, MoreVertical, Edit3 } from 'lucide-react';

const TaskNode = ({ data, selected }) => {
  const task = data?.task || {
    title: 'Untitled Task',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assignedTo: 'Unassigned',
    dueDate: '',
  };

  const onStatusChange = (e, newStatus) => {
    e.stopPropagation();
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
    if (selected) return 'border-cyan-400 ring-2 ring-cyan-400/30';
    if (task.status === 'COMPLETED') return 'border-emerald-700/60 hover:border-emerald-500';
    if (task.status === 'IN_PROGRESS') return 'border-indigo-600/60 hover:border-indigo-400';
    return 'border-slate-800 hover:border-slate-700';
  };

  const getTopBarColor = () => {
    if (task.status === 'COMPLETED') return 'bg-emerald-500/20 text-emerald-400';
    if (task.status === 'IN_PROGRESS') return 'bg-indigo-500/20 text-indigo-400';
    return 'bg-slate-800/40 text-slate-400';
  };

  return (
    <div
      className={`relative min-w-[270px] max-w-[320px] rounded-xl bg-dark-900 shadow-card-dark border transition-all duration-200 backdrop-blur-sm ${getBorderColor()}`}
    >
      {/* React Flow Top Handle (Target) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !-top-1.5 !bg-brand-500 !border-2 !border-dark-950 hover:!scale-125 transition-transform"
      />

      {/* Card Header */}
      <div className={`px-3.5 py-2.5 rounded-t-xl border-b border-slate-800/80 flex items-center justify-between ${getTopBarColor()}`}>
        <div className="flex items-center space-x-2 truncate">
          <span className="font-semibold text-sm text-slate-100 truncate">{task.title}</span>
        </div>
        <button
          onClick={onNodeEdit}
          title="Edit Task"
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
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
        </div>

        {/* Metadata Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
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
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/40">
          <button
            onClick={(e) => onStatusChange(e, 'TODO')}
            className={`px-1.5 py-1 text-[10px] font-medium rounded transition-colors flex items-center justify-center space-x-1 ${
              task.status === 'TODO'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-dark-800/60 text-slate-400 hover:bg-dark-750 hover:text-slate-200'
            }`}
          >
            <Circle className="w-2.5 h-2.5" />
            <span>Todo</span>
          </button>
          <button
            onClick={(e) => onStatusChange(e, 'IN_PROGRESS')}
            className={`px-1.5 py-1 text-[10px] font-medium rounded transition-colors flex items-center justify-center space-x-1 ${
              task.status === 'IN_PROGRESS'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'bg-dark-800/60 text-slate-400 hover:bg-dark-750 hover:text-slate-200'
            }`}
          >
            <Clock className="w-2.5 h-2.5" />
            <span>Active</span>
          </button>
          <button
            onClick={(e) => onStatusChange(e, 'COMPLETED')}
            className={`px-1.5 py-1 text-[10px] font-medium rounded transition-colors flex items-center justify-center space-x-1 ${
              task.status === 'COMPLETED'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-dark-800/60 text-slate-400 hover:bg-dark-750 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-2.5 h-2.5" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* React Flow Bottom Handle (Source) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !-bottom-1.5 !bg-brand-500 !border-2 !border-dark-950 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(TaskNode);
