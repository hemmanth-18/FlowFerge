import React from 'react';
import { Circle, Clock, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status, size = 'sm', showIcon = true }) => {
  const normalized = status ? status.toUpperCase() : 'TODO';

  const config = {
    TODO: {
      label: 'To Do',
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700',
      icon: Circle,
      iconColor: 'text-slate-400',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      bg: 'bg-indigo-950/60',
      text: 'text-indigo-300',
      border: 'border-indigo-800/50',
      icon: Clock,
      iconColor: 'text-indigo-400 animate-pulse',
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-800/50',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    ACTIVE: {
      label: 'Active',
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-300',
      border: 'border-cyan-800/50',
      icon: Clock,
      iconColor: 'text-cyan-400',
    },
    PAUSED: {
      label: 'Paused',
      bg: 'bg-amber-950/60',
      text: 'text-amber-300',
      border: 'border-amber-800/50',
      icon: Circle,
      iconColor: 'text-amber-400',
    },
  };

  const curr = config[normalized] || config.TODO;
  const Icon = curr.icon;

  const sizeClasses = size === 'xs' 
    ? 'text-xs px-2 py-0.5 space-x-1' 
    : size === 'md' 
    ? 'text-sm px-3 py-1 space-x-1.5' 
    : 'text-xs px-2.5 py-1 space-x-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${curr.bg} ${curr.text} ${curr.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={`w-3.5 h-3.5 ${curr.iconColor}`} />}
      <span>{curr.label}</span>
    </span>
  );
};
