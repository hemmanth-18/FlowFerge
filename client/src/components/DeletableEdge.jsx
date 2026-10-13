import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import { X, Trash2 } from 'lucide-react';

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (data?.onDeleteEdge) {
      data.onDeleteEdge(id);
    }
  };

  const currentMarker = selected
    ? typeof markerEnd === 'object'
      ? { ...markerEnd, color: '#06b6d4' }
      : markerEnd
    : markerEnd;

  return (
    <>
      {/* Invisible wider stroke for easy clicking/selecting the arrow */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        stroke="transparent"
        strokeWidth={28}
        className="react-flow__edge-interaction cursor-pointer"
      />
      <BaseEdge
        path={edgePath}
        markerEnd={currentMarker}
        style={{
          ...style,
          stroke: selected ? '#06b6d4' : '#6366f1',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: selected ? '5,5' : '4,4',
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group z-20"
        >
          <button
            type="button"
            onClick={handleDelete}
            title="Delete this connection arrow (Wrong option? Click to remove)"
            aria-label="Delete connection"
            className={`flex items-center justify-center rounded-full transition-all duration-200 shadow-xl cursor-pointer ${
              selected
                ? 'px-2.5 py-1 space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white border-2 border-dark-950 scale-105 ring-2 ring-rose-500/40 text-[11px] font-semibold'
                : 'w-6 h-6 bg-dark-900/95 hover:bg-rose-600 hover:text-white text-slate-400 border border-slate-700/80 hover:border-rose-500/60 hover:scale-125'
            }`}
          >
            {selected ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </>
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
