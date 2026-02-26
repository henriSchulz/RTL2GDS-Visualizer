export type GateType = 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'NOT' | 'BUF';

export interface Gate {
  id: string;
  type: GateType;
  inputs: string[];
  output: string;
}

export interface Netlist {
  moduleName: string;
  inputs: string[];
  outputs: string[];
  gates: Gate[];
}

export type FlowStep = 'rtl' | 'synthesis' | 'layout' | 'fabrication';

export const FLOW_STEPS: FlowStep[] = ['rtl', 'synthesis', 'layout', 'fabrication'];

export const FLOW_STEP_LABELS: Record<FlowStep, string> = {
  rtl: 'RTL',
  synthesis: 'Synthesis',
  layout: 'Layout',
  fabrication: 'Fabrication',
};

export const GATE_COLORS: Record<GateType, { fill: string; stroke: string; text: string }> = {
  XOR:  { fill: '#1d4ed8', stroke: '#60a5fa', text: '#bfdbfe' },
  XNOR: { fill: '#1e3a8a', stroke: '#3b82f6', text: '#bfdbfe' },
  AND:  { fill: '#166534', stroke: '#4ade80', text: '#bbf7d0' },
  NAND: { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0' },
  OR:   { fill: '#92400e', stroke: '#fbbf24', text: '#fef3c7' },
  NOR:  { fill: '#78350f', stroke: '#f59e0b', text: '#fef3c7' },
  NOT:  { fill: '#991b1b', stroke: '#f87171', text: '#fee2e2' },
  BUF:  { fill: '#374151', stroke: '#9ca3af', text: '#e5e7eb' },
};
