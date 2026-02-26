'use client';

import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Layers, Maximize, Grid, Clock, GitFork, CheckCircle } from 'lucide-react';
import { GATE_COLORS, type GateType } from '@/types/silicon';
import { computeSVGLayout } from '@/lib/layout-engine';
import type { SiliconFlowState } from '@/hooks/useSiliconFlow';

const GATE_W = 80;
const GATE_H = 48;

const LEGEND_GATES: GateType[] = ['AND', 'OR', 'XOR', 'NOT', 'BUF'];

const PHYSICAL_DESIGN_STEPS = [
  { icon: Maximize, label: 'Floorplanning', desc: 'Define chip area and I/O pad placement' },
  { icon: Grid, label: 'Placement', desc: 'Position standard cells to minimize wire length' },
  { icon: Clock, label: 'CTS', desc: 'Clock Tree Synthesis — distribute clock signals' },
  { icon: GitFork, label: 'Routing', desc: 'Interconnect cells using metal layers' },
  { icon: CheckCircle, label: 'Verification', desc: 'DRC/LVS checks to ensure manufacturability' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

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

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="col-span-8 flex flex-col gap-3 min-h-0">
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

          {/* VDD/VSS Rails */}
          {Array.from(new Set(layout.items.map(item => item.y))).map((y, i) => (
            <g key={`rails-${i}`}>
              <line
                x1={0} y1={y - GATE_H / 2 - 4}
                x2={layout.viewWidth} y2={y - GATE_H / 2 - 4}
                stroke="rgba(239, 68, 68, 0.2)"
                strokeWidth="2"
              />
              <text x={10} y={y - GATE_H / 2 - 8} fill="rgba(239, 68, 68, 0.4)" fontSize="6" className="font-mono">VDD</text>
              <line
                x1={0} y1={y + GATE_H / 2 + 4}
                x2={layout.viewWidth} y2={y + GATE_H / 2 + 4}
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="2"
              />
              <text x={10} y={y + GATE_H / 2 + 12} fill="rgba(59, 130, 246, 0.4)" fontSize="6" className="font-mono">VSS</text>
            </g>
          ))}

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
                d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                fill="none"
                stroke="rgba(34,211,238,0.4)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Gate rectangles */}
          {layout.items.map(item => {
            if (item.kind === 'gate') {
              const colors = GATE_COLORS[(item.gateType as GateType) ?? 'BUF'];
              const portCount = item.inputCount ?? 1;
              return (
                <g key={item.id} transform={`translate(${item.x - GATE_W / 2}, ${item.y - GATE_H / 2})`}>
                  <rect
                    width={GATE_W} height={GATE_H}
                    fill={colors.fill}
                    fillOpacity="0.9"
                    stroke={colors.stroke}
                    strokeWidth="1.5"
                  />
                  {/* Standard cell accents */}
                  <rect width={4} height={GATE_H} fill={colors.stroke} fillOpacity="0.5" />
                  <rect x={GATE_W - 4} width={4} height={GATE_H} fill={colors.stroke} fillOpacity="0.5" />

                  {/* Input pins */}
                  {[...Array(portCount)].map((_, i) => (
                    <rect
                      key={i}
                      x={-2}
                      y={GATE_H / (portCount + 1) * (i + 1) - 2}
                      width={4}
                      height={4}
                      fill={colors.stroke}
                    />
                  ))}
                  {/* Output pin */}
                  <rect x={GATE_W - 2} y={GATE_H / 2 - 2} width={4} height={4} fill={colors.stroke} />

                  <text
                    x={GATE_W / 2} y={GATE_H / 2 + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={colors.text} fontSize="10" fontWeight="bold"
                    className="select-none"
                  >
                    {item.label}
                  </text>

                  {/* Pin Labels */}
                  <text x={5} y={portCount === 1 ? GATE_H / 2 : GATE_H / 4} fill={colors.stroke} fontSize="5" className="opacity-70 font-bold">A</text>
                  {portCount > 1 && (
                    <text x={5} y={3 * GATE_H / 4} fill={colors.stroke} fontSize="5" className="opacity-70 font-bold">B</text>
                  )}
                  <text x={GATE_W - 10} y={GATE_H / 2 + 2} fill={colors.stroke} fontSize="5" className="opacity-70 font-bold text-right">Y</text>
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

        {/* Sidebar */}
        <div className="col-span-4 flex flex-col gap-4 overflow-auto pr-2">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Physical Design Flow</span>
            <motion.div
              className="flex flex-col gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {PHYSICAL_DESIGN_STEPS.map(({ icon: Icon, label, desc }) => (
                <motion.div
                  key={label}
                  variants={stepVariants}
                  className="flex gap-3 p-3 rounded-md border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 shrink-0">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-zinc-300 text-xs font-semibold font-mono mb-0.5">{label}</div>
                    <div className="text-zinc-500 text-[10px] leading-relaxed">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="mt-auto p-3 rounded-md border border-cyan-500/20 bg-cyan-500/5">
            <div className="text-cyan-400 text-[10px] font-mono font-semibold mb-1 uppercase tracking-tight">Layout Info</div>
            <p className="text-zinc-400 text-[10px] leading-relaxed font-mono">
              The GDSII file is the final output of this phase, containing the exact geometry of every mask layer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
