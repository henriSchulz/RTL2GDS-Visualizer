'use client';

import dynamic from 'next/dynamic';
import { GitBranch } from 'lucide-react';
import { GATE_COLORS, type GateType } from '@/types/silicon';
import type { SiliconFlowState } from '@/hooks/useSiliconFlow';

const SynthesisPhaseInner = dynamic(
  () => import('./SynthesisPhaseInner').then(m => m.SynthesisPhaseInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center border border-zinc-800 rounded-md bg-zinc-900/50 animate-pulse">
        <span className="text-zinc-600 text-sm font-mono">Loading graph...</span>
      </div>
    ),
  }
);

const LEGEND_GATES: GateType[] = ['AND', 'OR', 'XOR', 'NOT', 'BUF'];

type SynthesisPhaseProps = Pick<SiliconFlowState, 'flowNodes' | 'flowEdges' | 'netlist'>;

export function SynthesisPhase({ flowNodes, flowEdges, netlist }: SynthesisPhaseProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-cyan-400" />
        <span className="text-zinc-300 text-sm font-medium font-mono">Gate-Level Netlist</span>
        {netlist && (
          <span className="text-zinc-600 text-xs font-mono ml-auto">
            {netlist.gates.length} gates · {netlist.inputs.length} inputs · {netlist.outputs.length} outputs
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {LEGEND_GATES.map(gateType => (
          <div key={gateType} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: GATE_COLORS[gateType].fill, border: `1px solid ${GATE_COLORS[gateType].stroke}` }}
            />
            <span className="text-zinc-500 text-xs font-mono">{gateType}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-6 h-px" style={{ background: '#22d3ee', opacity: 0.7 }} />
          <span className="text-zinc-500 text-xs font-mono">Wire</span>
        </div>
      </div>

      <SynthesisPhaseInner flowNodes={flowNodes} flowEdges={flowEdges} netlist={netlist} />
    </div>
  );
}
