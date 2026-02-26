'use client';

import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { GATE_COLORS, type GateType } from '@/types/silicon';
import { computeSVGLayout } from '@/lib/layout-engine';
import type { SiliconFlowState } from '@/hooks/useSiliconFlow';

const GATE_W = 80;
const GATE_H = 48;

const LEGEND_GATES: GateType[] = ['AND', 'OR', 'XOR', 'NOT', 'BUF'];

type LayoutPhaseProps = Pick<SiliconFlowState, 'netlist'>;

export function LayoutPhase({ netlist }: LayoutPhaseProps) {
  const layout = useMemo(() => {
    if (!netlist) return null;
    return computeSVGLayout(netlist);
  }, [netlist]);

  if (!netlist || !layout) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-zinc-300 text-sm font-medium font-mono">Physical Layout</span>
        </div>
        <div className="flex-1 flex items-center justify-center border border-zinc-800 rounded-md bg-zinc-900/50">
          <div className="text-center">
            <div className="text-zinc-500 text-sm font-mono mb-2">No layout data</div>
            <div className="text-zinc-600 text-xs">Go back to RTL and click Compile</div>
          </div>
        </div>
      </div>
    );
  }

  const itemMap = new Map(layout.items.map(item => [item.id, item]));

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-zinc-300 text-sm font-medium font-mono">Physical Layout</span>
        <span className="text-zinc-600 text-xs font-mono ml-auto">
          {netlist.gates.length} cells placed
        </span>
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
      </div>

      <div className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/50 overflow-auto">
        <svg
          viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
          width={layout.viewWidth}
          height={layout.viewHeight}
          style={{ minWidth: '100%', fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          {/* Grid overlay */}
          <defs>
            <pattern id="layoutGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="0.5" cy="0.5" r="0.5" fill="rgba(113,113,122,0.2)" />
            </pattern>
          </defs>
          <rect width={layout.viewWidth} height={layout.viewHeight} fill="url(#layoutGrid)" />

          {/* Wires (draw before gates so they appear behind) */}
          {layout.edges.map(edge => {
            const src = itemMap.get(edge.sourceId);
            const dst = itemMap.get(edge.targetId);
            if (!src || !dst) return null;

            const x1 = src.x + (src.kind === 'gate' ? GATE_W / 2 : 20);
            const y1 = src.y;
            const x2 = dst.x - (dst.kind === 'gate' ? GATE_W / 2 : 0);
            const y2 = dst.y;
            const midX = (x1 + x2) / 2;

            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="rgba(34,211,238,0.35)"
                strokeWidth="1"
              />
            );
          })}

          {/* Gate rectangles */}
          {layout.items.map(item => {
            if (item.kind === 'gate') {
              const colors = GATE_COLORS[(item.gateType as GateType) ?? 'BUF'];
              const portCount = 2; // simplified
              return (
                <g key={item.id} transform={`translate(${item.x - GATE_W / 2}, ${item.y - GATE_H / 2})`}>
                  <rect
                    width={GATE_W} height={GATE_H}
                    rx="3"
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="1.5"
                  />
                  {/* Input dots */}
                  {[...Array(portCount)].map((_, i) => (
                    <circle
                      key={i}
                      cx={0}
                      cy={GATE_H / (portCount + 1) * (i + 1)}
                      r="2.5"
                      fill={colors.stroke}
                    />
                  ))}
                  {/* Output dot */}
                  <circle cx={GATE_W} cy={GATE_H / 2} r="2.5" fill={colors.stroke} />
                  <text
                    x={GATE_W / 2} y={GATE_H / 2 + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={colors.text} fontSize="11" fontWeight="600"
                  >
                    {item.label}
                  </text>
                </g>
              );
            }

            // Port nodes
            const isInput = item.kind === 'input';
            return (
              <g key={item.id} transform={`translate(${item.x - 20}, ${item.y - 14})`}>
                <rect
                  width={40} height={28} rx="3"
                  fill="#18181b" stroke="#3f3f46" strokeWidth="1"
                />
                <text
                  x={20} y={15}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={isInput ? '#22d3ee' : '#a78bfa'} fontSize="8"
                >
                  {item.label.length > 6 ? item.label.slice(0, 6) + '…' : item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
