import React from 'react';
import {
  Circle,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  PauseCircle,
  AlertCircle,
} from 'lucide-react';

export const StatusBadge = ({ status, size = 'sm', showIcon = true }) => {
  const normalized = status ? status.toUpperCase().replace(/\s+/g, '_') : 'PENDING';

  const config = {
    PENDING: {
      label: 'Pending',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/25',
      icon: Clock,
      iconColor: 'text-amber-400',
    },
    TODO: {
      label: 'Pending',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/25',
      icon: Clock,
      iconColor: 'text-amber-400',
    },
    DRAFT: {
      label: 'Pending',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/25',
      icon: Clock,
      iconColor: 'text-amber-400',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      icon: Clock,
      iconColor: 'text-purple-400',
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    DONE: {
      label: 'Completed',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    FAILED: {
      label: 'Failed',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      icon: XCircle,
      iconColor: 'text-rose-400',
    },
    ERROR: {
      label: 'Failed',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      icon: XCircle,
      iconColor: 'text-rose-400',
    },
    ACTIVE: {
      label: 'Active',
      bg: 'bg-sky-500/15',
      text: 'text-sky-300',
      border: 'border-sky-500/30',
      icon: Zap,
      iconColor: 'text-sky-400',
    },
    INACTIVE: {
      label: 'Inactive',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/25',
      icon: PauseCircle,
      iconColor: 'text-slate-500',
    },
    PAUSED: {
      label: 'Inactive',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/25',
      icon: PauseCircle,
      iconColor: 'text-slate-500',
    },
    ARCHIVED: {
      label: 'Inactive',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/25',
      icon: PauseCircle,
      iconColor: 'text-slate-500',
    },
  };

  const curr = config[normalized] || config.PENDING;
  const Icon = curr.icon;

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-2 py-0.5 space-x-1'
      : size === 'md'
      ? 'text-xs px-3 py-1 space-x-1.5'
      : 'text-[11px] px-2.5 py-0.5 space-x-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-md ${curr.bg} ${curr.text} ${curr.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={`w-3 h-3 ${curr.iconColor} flex-shrink-0`} />}
      <span>{curr.label}</span>
    </span>
  );
};

export default StatusBadge;
