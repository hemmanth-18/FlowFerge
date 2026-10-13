import React from 'react';
import { AlertCircle, ArrowUpCircle, ArrowRightCircle } from 'lucide-react';

export const PriorityBadge = ({ priority, size = 'sm' }) => {
  const normalized = priority ? priority.toUpperCase() : 'MEDIUM';

  const config = {
    LOW: {
      label: 'Low',
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700',
      icon: ArrowRightCircle,
    },
    MEDIUM: {
      label: 'Medium',
      bg: 'bg-amber-950/50',
      text: 'text-amber-300',
      border: 'border-amber-800/40',
      icon: ArrowUpCircle,
    },
    HIGH: {
      label: 'High',
      bg: 'bg-rose-950/60',
      text: 'text-rose-300',
      border: 'border-rose-800/50',
      icon: AlertCircle,
    },
  };

  const curr = config[normalized] || config.MEDIUM;
  const Icon = curr.icon;

  const sizeClasses = size === 'xs' 
    ? 'text-xs px-2 py-0.5 space-x-1' 
    : 'text-xs px-2 py-0.5 space-x-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${curr.bg} ${curr.text} ${curr.border} ${sizeClasses}`}
    >
      <Icon className="w-3 h-3" />
      <span>{curr.label}</span>
    </span>
  );
};
