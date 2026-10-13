import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
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
    sourcePosition: sourcePosition || Position.Right,
    targetX,
    targetY,
    targetPosition: targetPosition || Position.Left,
  });

  const handleDelete = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (data?.onDeleteEdge) {
      data.onDeleteEdge(id);
    }
  };

  const markerId = `arrow-marker-${id}`;
  const neonColor = selected ? '#C084FC' : '#A855F7';

  return (
    <>
      {/* Explicit SVG Arrowhead Marker definition with neon purple styling */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="14"
          markerHeight="14"
          orient="auto"
        >
          <path
            d="M 1 2 L 11 6 L 1 10 z"
            fill={neonColor}
            stroke={neonColor}
            strokeWidth="1"
          />
        </marker>
      </defs>

      {/* Invisible wider stroke for easy clicking/selecting the arrow */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        stroke="transparent"
        strokeWidth={36}
        className="react-flow__edge-interaction cursor-pointer"
      />

      {/* Outer Neon Glow Halo Underlay */}
      <path
        d={edgePath}
        fill="none"
        stroke={neonColor}
        strokeWidth={selected ? 7 : 5}
        strokeOpacity={selected ? 0.75 : 0.5}
        strokeLinecap="round"
        style={{
          filter: 'blur(3px)',
          pointerEvents: 'none',
        }}
      />

      {/* Visible Pipeline Connection Path with sharp core & neon glow */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          ...style,
          stroke: neonColor,
          strokeWidth: selected ? 3.5 : 2.5,
          filter: selected
            ? 'drop-shadow(0 0 8px #C084FC) drop-shadow(0 0 16px rgba(192, 132, 252, 0.9))'
            : 'drop-shadow(0 0 6px #A855F7) drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))',
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease',
        }}
      />

      {/* Delete connection button on edge midpoint */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group z-30"
        >
          <button
            type="button"
            onClick={handleDelete}
            title="Delete this connection arrow"
            aria-label="Delete connection"
            className={`flex items-center justify-center rounded-full transition-all duration-200 shadow-xl cursor-pointer ${
              selected
                ? 'px-3 py-1 space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/60 scale-105 ring-2 ring-rose-500/30 text-[11px] font-semibold backdrop-blur-md'
                : 'w-6 h-6 bg-[#0D1220]/90 hover:bg-rose-600 hover:text-white text-purple-300 border border-purple-500/40 hover:border-rose-500 hover:scale-125 backdrop-blur-md opacity-80 group-hover:opacity-100'
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
