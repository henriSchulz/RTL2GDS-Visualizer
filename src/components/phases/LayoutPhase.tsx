'use client';

import { useMemo, useState } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import {
  Layers, Maximize, Grid, Clock, GitFork,
  CheckCircle, GitBranch, Info, ChevronRight, ChevronLeft
} from 'lucide-react';
import { GATE_COLORS, type GateType, CELL_LIBRARY } from '@/types/silicon';
import { computeSVGLayout } from '@/lib/layout-engine';
import type { SiliconFlowState } from '@/hooks/useSiliconFlow';

const GATE_W = 80;
const GATE_H = 48;

const PHYSICAL_DESIGN_STEPS = [
  { id: 'partitioning', icon: GitBranch, label: 'Partitioning', desc: 'Group logic into functional clusters' },
  { id: 'floorplanning', icon: Maximize, label: 'Floorplanning', desc: 'Define chip area and macro placement' },
  { id: 'placement', icon: Grid, label: 'Placement', desc: 'Position standard cells into rows' },
  { id: 'routing', icon: GitFork, label: 'Routing', desc: 'Interconnect cells using metal layers' },
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
  const [subStepIdx, setSubStepIdx] = useState(0);
  const [highlightedType, setHighlightedType] = useState<GateType | null>(null);

  // Stable random positions for the "Cloud" phase
  const cloudPositions = useMemo(() => {
    if (!netlist) return new Map();
    const pos = new Map();
    netlist.gates.forEach(g => {
      pos.set(g.id, {
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400
      });
    });
    return pos;
  }, [netlist]);

  const layout = useMemo(() => {
    if (!netlist) return null;
    return computeSVGLayout(netlist);
  }, [netlist]);

  const currentStepId = PHYSICAL_DESIGN_STEPS[subStepIdx].id;

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

  const stats = useMemo(() => {
    if (!netlist) return [];
    const counts: Record<string, number> = {};
    netlist.gates.forEach(g => {
      counts[g.type] = (counts[g.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type: type as GateType, count }));
  }, [netlist]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Sub-step Stepper */}
      <div className="flex items-center gap-3 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800 backdrop-blur-sm">
        <button
          onClick={() => setSubStepIdx(i => Math.max(0, i - 1))}
          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400"
          disabled={subStepIdx === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex justify-around">
          {PHYSICAL_DESIGN_STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${i === subStepIdx ? 'text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
              onClick={() => setSubStepIdx(i)}
            >
              <step.icon className="w-4 h-4" />
              <span className="text-[9px] font-mono uppercase font-bold tracking-tighter">{step.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setSubStepIdx(i => Math.min(PHYSICAL_DESIGN_STEPS.length - 1, i + 1))}
          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400"
          disabled={subStepIdx === PHYSICAL_DESIGN_STEPS.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="col-span-8 flex flex-col gap-3 min-h-0 relative">
          <div className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 overflow-auto relative">
            <svg
              viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
              width={layout.viewWidth}
              height={layout.viewHeight}
              className="transition-all duration-700 ease-in-out"
              style={{ minWidth: '100%', fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              {/* Grid overlay */}
              <defs>
                <pattern id="layoutGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(113,113,122,0.1)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width={layout.viewWidth} height={layout.viewHeight} fill="url(#layoutGrid)" />

              {/* VDD/VSS Rails (Only in Placement/Routing) */}
              {(currentStepId === 'placement' || currentStepId === 'routing') && (
                Array.from(new Set(layout.items.map(item => item.y))).map((y, i) => (
                  <g key={`rails-${i}`}>
                    <rect
                      x={0} y={y - GATE_H / 2 - 2}
                      width={layout.viewWidth} height={4}
                      fill="rgba(239, 68, 68, 0.3)"
                    />
                    <text x={5} y={y - GATE_H / 2 - 4} fill="rgba(239, 68, 68, 0.6)" fontSize="8" className="font-mono font-bold italic">VDD</text>

                    <rect
                      x={0} y={y + GATE_H / 2 - 2}
                      width={layout.viewWidth} height={4}
                      fill="rgba(59, 130, 246, 0.3)"
                    />
                    <text x={5} y={y + GATE_H / 2 + 8} fill="rgba(59, 130, 246, 0.6)" fontSize="8" className="font-mono font-bold italic">VSS</text>
                  </g>
                ))
              )}

              {/* Modules (Partitioning / Floorplanning) */}
              {(currentStepId === 'partitioning' || currentStepId === 'floorplanning') && layout.modules?.map((mod, i) => (
                <motion.g
                  key={mod.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: currentStepId === 'floorplanning' ? [0, 2, -2, 0] : 0,
                    y: currentStepId === 'floorplanning' ? [0, -1, 1, 0] : 0,
                  }}
                  transition={{
                    x: { repeat: Infinity, duration: 2 + i * 0.5 },
                    y: { repeat: Infinity, duration: 1.5 + i * 0.3 }
                  }}
                >
                  <rect
                    x={mod.x} y={mod.y} width={mod.width} height={mod.height}
                    fill={mod.color} fillOpacity="0.1"
                    stroke={mod.color} strokeWidth="2" strokeDasharray="4 4"
                    rx="8"
                  />
                  <text
                    x={mod.x + 10} y={mod.y + 20}
                    fill={mod.color} fontSize="12" fontWeight="bold" className="font-mono"
                  >
                    {mod.name}
                  </text>
                </motion.g>
              ))}

              {/* Wires */}
              {currentStepId === 'routing' && layout.edges.map(edge => {
                if (!edge.path) return null;
                return (
                  <g key={edge.id}>
                    {edge.path.map((seg, i, arr) => {
                      if (i === 0) return null;
                      const prev = arr[i - 1];
                      const isM1 = seg.layer === 'M1';
                      return (
                        <g key={`${edge.id}-seg-${i}`}>
                          <motion.line
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: i * 0.2, duration: 0.3 }}
                            x1={prev.x} y1={prev.y}
                            x2={seg.x} y2={seg.y}
                            stroke={isM1 ? '#3b82f6' : '#ef4444'}
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          {/* Via */}
                          {i < arr.length - 1 && seg.layer !== arr[i+1].layer && (
                            <rect
                              x={seg.x - 2} y={seg.y - 2} width={4} height={4}
                              fill="#fff" stroke="#000" strokeWidth="0.5"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Standard Cells */}
              {layout.items.map(item => {
                if (item.kind === 'gate') {
                  const colors = GATE_COLORS[(item.gateType as GateType) ?? 'BUF'];
                  const libInfo = CELL_LIBRARY[item.gateType as string];
                  const cellW = (libInfo?.area || 1) * GATE_W;
                  const portCount = item.inputCount ?? 1;
                  const isHighlighted = highlightedType === item.gateType;

                  const cloudPos = cloudPositions.get(item.id);
                  const isPart = currentStepId === 'partitioning';
                  const targetX = isPart && cloudPos ? cloudPos.x : item.x;
                  const targetY = isPart && cloudPos ? cloudPos.y : item.y;

                  return (
                    <motion.g
                      key={item.id}
                      layoutId={item.id}
                      initial={false}
                      animate={{
                        x: targetX - cellW / 2,
                        y: targetY - GATE_H / 2,
                        opacity: highlightedType && !isHighlighted ? 0.3 : 1,
                        scale: isHighlighted ? 1.05 : 1
                      }}
                      transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                    >
                      <rect
                        width={cellW} height={GATE_H}
                        fill={colors.fill}
                        fillOpacity="0.9"
                        stroke={isHighlighted ? '#fff' : colors.stroke}
                        strokeWidth={isHighlighted ? 3 : 1.5}
                      />

                      {/* Cell Name */}
                      <text
                        x={cellW / 2} y={GATE_H / 2 + 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={colors.text} fontSize="10" fontWeight="bold"
                        className="select-none pointer-events-none"
                      >
                        {item.label}
                      </text>

                      {/* Pins (Only in Placement/Routing) */}
                      {(currentStepId === 'placement' || currentStepId === 'routing') && (
                        <>
                          {[...Array(portCount)].map((_, i) => (
                            <rect
                              key={i}
                              x={cellW / (portCount + 1) * (i + 1) - 2}
                              y={-2}
                              width={4} height={4}
                              fill="#94a3b8"
                            />
                          ))}
                          <rect x={cellW / 2 - 2} y={GATE_H - 2} width={4} height={4} fill="#94a3b8" />
                        </>
                      )}
                    </motion.g>
                  );
                }

                // Port nodes
                const isInput = item.kind === 'input';
                return (
                  <motion.g
                    key={item.id}
                    layoutId={item.id}
                    animate={{ x: item.x - 20, y: item.y - 14 }}
                  >
                    <rect
                      width={40} height={28} rx="3"
                      fill="#18181b" stroke={isInput ? '#22d3ee' : '#a78bfa'} strokeWidth="1"
                    />
                    <text
                      x={20} y={15}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={isInput ? '#22d3ee' : '#a78bfa'} fontSize="8"
                      className="font-bold"
                    >
                      {item.label.length > 6 ? item.label.slice(0, 6) + '…' : item.label}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>

          {/* Phase Overlay Info */}
          <div className="absolute top-4 left-4 pointer-events-none">
            {(() => {
              const PhaseIcon = PHYSICAL_DESIGN_STEPS[subStepIdx].icon;
              return (
                <motion.div
                  key={currentStepId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-md backdrop-blur-md shadow-2xl"
                >
                  <h3 className="text-cyan-400 font-mono text-sm font-bold flex items-center gap-2">
                    {PhaseIcon && <PhaseIcon className="w-4 h-4" />}
                    {PHYSICAL_DESIGN_STEPS[subStepIdx].label}
                  </h3>
                  <p className="text-zinc-500 text-[10px] mt-1 font-mono">{PHYSICAL_DESIGN_STEPS[subStepIdx].desc}</p>
                </motion.div>
              );
            })()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 flex flex-col gap-4 overflow-auto pr-2">
          {/* Master Library */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <h4 className="text-zinc-400 text-[10px] font-mono font-bold uppercase mb-3 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Standard Cell Library
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(CELL_LIBRARY).map(cell => (
                <div
                  key={cell.name}
                  className={`p-2 rounded border transition-all cursor-help group relative ${highlightedType === cell.type ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'}`}
                  onMouseEnter={() => setHighlightedType(cell.type)}
                  onMouseLeave={() => setHighlightedType(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-200 text-[10px] font-bold font-mono">{cell.name}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: GATE_COLORS[cell.type].fill }} />
                  </div>
                  <div className="text-zinc-500 text-[8px] font-mono leading-tight">{cell.logic}</div>

                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-zinc-900 border border-zinc-700 rounded hidden group-hover:block z-50 shadow-xl pointer-events-none">
                    <div className="text-cyan-400 text-[10px] font-bold mb-1">{cell.description}</div>
                    <div className="text-zinc-400 text-[9px] mb-1">Pins: {cell.pins.join(', ')}</div>
                    <div className="text-zinc-500 text-[8px] mb-2">Area: {cell.area} units</div>
                    {cell.truthTable && (
                      <div className="border-t border-zinc-800 pt-1">
                        <div className="text-[7px] text-zinc-500 uppercase font-bold mb-1">Truth Table</div>
                        {cell.truthTable.map(row => (
                          <div key={row} className="font-mono text-[8px] text-zinc-400 flex justify-between">
                            <span>{row.split('|')[0]}</span>
                            <span className="text-cyan-600">→</span>
                            <span className="text-cyan-400 font-bold">{row.split('|')[1]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Design Stats */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <h4 className="text-zinc-400 text-[10px] font-mono font-bold uppercase mb-3 flex items-center gap-2">
              <Info className="w-3 h-3" /> Design Statistics
            </h4>
            <div className="space-y-2">
              {stats.map(({ type, count }) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-1.5 rounded bg-zinc-950/30 border border-zinc-800/50"
                  onMouseEnter={() => setHighlightedType(type)}
                  onMouseLeave={() => setHighlightedType(null)}
                >
                  <span className="text-zinc-500 text-[10px] font-mono">{type}</span>
                  <span className="text-cyan-400 text-[10px] font-mono font-bold">{count}x</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between">
                <span className="text-zinc-500 text-[10px] font-mono uppercase">Total Cells</span>
                <span className="text-zinc-200 text-[10px] font-mono font-bold">{netlist.gates.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto p-3 rounded-md border border-cyan-500/20 bg-cyan-500/5">
            <div className="text-cyan-400 text-[10px] font-mono font-semibold mb-1 uppercase tracking-tight">Layout Insights</div>
            <p className="text-zinc-400 text-[10px] leading-relaxed font-mono">
              Cells are organized in rows with shared VDD/VSS rails. Manhattan routing minimizes congestion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
