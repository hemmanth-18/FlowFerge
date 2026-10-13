import React from 'react';
import { AlertCircle, ArrowUpCircle, ArrowRightCircle } from 'lucide-react';

export const PriorityBadge = ({ priority, size = 'sm' }) => {
  const normalized = priority ? priority.toUpperCase() : 'MEDIUM';

  const config = {
    LOW: {
      label: 'Low',
      bg: 'bg-slate-500/10',
      text: 'text-slate-300',
      border: 'border-slate-500/25',
      icon: ArrowRightCircle,
      iconColor: 'text-slate-400',
    },
    MEDIUM: {
      label: 'Medium',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/25',
      icon: ArrowUpCircle,
      iconColor: 'text-amber-400',
    },
    HIGH: {
      label: 'High',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      icon: AlertCircle,
      iconColor: 'text-rose-400',
    },
  };

  const curr = config[normalized] || config.MEDIUM;
  const Icon = curr.icon;

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-2 py-0.5 space-x-1'
      : size === 'md'
      ? 'text-xs px-3 py-1 space-x-1.5'
      : 'text-[11px] px-2 py-0.5 space-x-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-md ${curr.bg} ${curr.text} ${curr.border} ${sizeClasses}`}
    >
      <Icon className={`w-3 h-3 ${curr.iconColor} flex-shrink-0`} />
      <span>{curr.label}</span>
    </span>
  );
};

export default PriorityBadge;
