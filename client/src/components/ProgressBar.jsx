import React from 'react';

export const ProgressBar = ({ progress = 0, size = 'md', showLabel = true, total = null, completed = null }) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  const getColor = (val) => {
    if (val === 100) return 'bg-emerald-500 shadow-emerald-500/30';
    if (val > 50) return 'bg-brand-500 shadow-brand-500/30';
    if (val > 25) return 'bg-cyan-500 shadow-cyan-500/30';
    return 'bg-slate-500';
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
          <span className="font-medium text-slate-300">
            {total !== null && completed !== null ? `${completed} / ${total} tasks completed` : 'Progress'}
          </span>
          <span className="font-semibold text-slate-200">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-dark-800 rounded-full overflow-hidden border border-slate-800/80 ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ease-out ${getColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
