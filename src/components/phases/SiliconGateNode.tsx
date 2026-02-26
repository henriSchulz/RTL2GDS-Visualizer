'use client';

import { Handle, Position } from '@xyflow/react';
import { GATE_COLORS, type GateType } from '@/types/silicon';
import { gateH } from '@/lib/layout-engine';

interface SiliconGateNodeData {
  nodeKind: 'gate' | 'port';
  label: string;
  gateType?: GateType;
  portType?: 'input' | 'output';
  inputCount?: number;
}

interface SiliconGateNodeProps {
  data: SiliconGateNodeData;
}

export function SiliconGateNode({ data }: SiliconGateNodeProps) {
  // ── Port node ──────────────────────────────────────────────────────────────
  if (data.nodeKind === 'port') {
    return (
      <div
        className="flex items-center px-2 rounded border border-zinc-600 bg-zinc-800 text-zinc-300 text-xs font-mono"
        style={{ width: 110, height: 32 }}
      >
        {data.portType === 'input' && (
          <Handle
            type="source"
            position={Position.Right}
            style={{ background: '#22d3ee', border: 'none', width: 7, height: 7, top: '50%' }}
          />
        )}
        {data.portType === 'output' && (
          <Handle
            type="target"
            position={Position.Left}
            style={{ background: '#a78bfa', border: 'none', width: 7, height: 7, top: '50%' }}
          />
        )}
        <span className="truncate w-full text-center" title={data.label}>{data.label}</span>
      </div>
    );
  }

  // ── Gate node ──────────────────────────────────────────────────────────────
  const colors = GATE_COLORS[data.gateType ?? 'BUF'];
  const inputCount = data.inputCount ?? 1;
  const height = gateH(inputCount);

  // Distribute input handles evenly on the left side
  const inputHandles = Array.from({ length: inputCount }, (_, i) => {
    const pct = ((i + 1) / (inputCount + 1)) * 100;
    return { id: `input-${i}`, topPct: pct };
  });

  return (
    <div
      className="relative flex items-center justify-center rounded-md font-mono text-sm font-bold select-none"
      style={{
        width: 100,
        height,
        background: colors.fill,
        border: `1.5px solid ${colors.stroke}`,
        color: colors.text,
        boxShadow: `0 0 8px ${colors.stroke}22`,
      }}
    >
      {/* Per-input handles — positioned vertically */}
      {inputHandles.map(({ id, topPct }) => (
        <Handle
          key={id}
          id={id}
          type="target"
          position={Position.Left}
          style={{
            top: `${topPct}%`,
            background: colors.stroke,
            border: `1.5px solid ${colors.fill}`,
            width: 7,
            height: 7,
            transform: 'translateY(-50%)',
          }}
        />
      ))}

      {/* Gate label */}
      <span>{data.label}</span>

      {/* Single output handle centred on the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          top: '50%',
          background: colors.stroke,
          border: `1.5px solid ${colors.fill}`,
          width: 7,
          height: 7,
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
}
