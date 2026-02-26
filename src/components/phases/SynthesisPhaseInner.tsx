'use client';

import '@xyflow/react/dist/style.css';
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant } from '@xyflow/react';
import { SiliconGateNode } from './SiliconGateNode';
import { GATE_COLORS, type GateType } from '@/types/silicon';
import type { SiliconFlowState } from '@/hooks/useSiliconFlow';
import type { Node, Edge } from '@xyflow/react';

// MUST be defined outside the component to prevent re-renders
const nodeTypes = { siliconNode: SiliconGateNode };

const GATE_TYPES: GateType[] = ['AND', 'OR', 'XOR', 'NOT', 'BUF'];

type SynthesisPhaseInnerProps = Pick<SiliconFlowState, 'flowNodes' | 'flowEdges' | 'netlist'>;

export function SynthesisPhaseInner({ flowNodes, flowEdges, netlist }: SynthesisPhaseInnerProps) {
  if (!netlist || flowNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border border-zinc-800 rounded-md bg-zinc-900/50">
        <div className="text-center">
          <div className="text-zinc-500 text-sm font-mono mb-2">No netlist available</div>
          <div className="text-zinc-600 text-xs">Go back to RTL and click Compile</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-md border border-zinc-800 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
      <ReactFlow
        nodes={flowNodes as Node[]}
        edges={flowEdges as Edge[]}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        style={{ background: '#09090b' }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#22d3ee', strokeWidth: 1.5, opacity: 0.55 },
        }}
        edgesFocusable={false}
        nodesDraggable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={0.5}
          color="rgba(113,113,122,0.25)"
        />
        <Controls
          style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '6px',
          }}
        />
        <MiniMap
          style={{ background: '#18181b', border: '1px solid #27272a' }}
          nodeColor={(node) => {
            const data = node.data as { gateType?: GateType; nodeKind: string };
            if (data.nodeKind === 'port') return '#3f3f46';
            return GATE_COLORS[data.gateType ?? 'BUF'].fill;
          }}
          maskColor="rgba(9,9,11,0.8)"
        />
      </ReactFlow>
    </div>
  );
}
