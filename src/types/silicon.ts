export type GateType =
  | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'NOT' | 'BUF'
  | 'AOI21' | 'AOI22' | 'MUX' | 'DFF' | 'ADDER';

export interface Gate {
  id: string;
  type: GateType;
  inputs: string[];
  output: string;
  module?: string; // For partitioning
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

export interface LibraryCellInfo {
  type: GateType;
  name: string;
  description: string;
  pins: string[];
  area: number; // relative width
  logic: string;
  truthTable?: string[];
}

export const CELL_LIBRARY: Record<string, LibraryCellInfo> = {
  AND:  { type: 'AND',  name: 'AND2',  description: '2-Input AND Gate', pins: ['A', 'B', 'Y'], area: 1, logic: 'Y = A & B', truthTable: ['00|0', '01|0', '10|0', '11|1'] },
  OR:   { type: 'OR',   name: 'OR2',   description: '2-Input OR Gate',  pins: ['A', 'B', 'Y'], area: 1, logic: 'Y = A | B', truthTable: ['00|0', '01|1', '10|1', '11|1'] },
  NAND: { type: 'NAND', name: 'NAND2', description: '2-Input NAND Gate', pins: ['A', 'B', 'Y'], area: 1, logic: 'Y = ~(A & B)', truthTable: ['00|1', '01|1', '10|1', '11|0'] },
  NOR:  { type: 'NOR',  name: 'NOR2',  description: '2-Input NOR Gate',  pins: ['A', 'B', 'Y'], area: 1, logic: 'Y = ~(A | B)', truthTable: ['00|1', '01|0', '10|0', '11|0'] },
  XOR:  { type: 'XOR',  name: 'XOR2',  description: '2-Input XOR Gate',  pins: ['A', 'B', 'Y'], area: 1.2, logic: 'Y = A ^ B', truthTable: ['00|0', '01|1', '10|1', '11|0'] },
  NOT:  { type: 'NOT',  name: 'INV',   description: 'Inverter',          pins: ['A', 'Y'],      area: 0.8, logic: 'Y = ~A', truthTable: ['0|1', '1|0'] },
  AOI21: {
    type: 'AOI21',
    name: 'AOI21',
    description: 'AND-OR-Invert 2-1',
    pins: ['A1', 'A2', 'B', 'Y'],
    area: 1.5,
    logic: 'Y = ~((A1 & A2) | B)'
  },
  AOI22: {
    type: 'AOI22',
    name: 'AOI22',
    description: 'AND-OR-Invert 2-2',
    pins: ['A1', 'A2', 'B1', 'B2', 'Y'],
    area: 2,
    logic: 'Y = ~((A1 & A2) | (B1 & B2))'
  },
  MUX:  { type: 'MUX',  name: 'MUX2',  description: '2-to-1 Multiplexer', pins: ['S', 'A', 'B', 'Y'], area: 1.5, logic: 'Y = S ? B : A' },
  DFF:  { type: 'DFF',  name: 'DFF',   description: 'D Flip-Flop',        pins: ['D', 'CLK', 'Q'],    area: 2.5, logic: 'Q <= D on CLK edge' },
};

export const GATE_COLORS: Record<GateType, { fill: string; stroke: string; text: string }> = {
  XOR:   { fill: '#1d4ed8', stroke: '#60a5fa', text: '#bfdbfe' },
  XNOR:  { fill: '#1e3a8a', stroke: '#3b82f6', text: '#bfdbfe' },
  AND:   { fill: '#166534', stroke: '#4ade80', text: '#bbf7d0' },
  NAND:  { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0' },
  OR:    { fill: '#92400e', stroke: '#fbbf24', text: '#fef3c7' },
  NOR:   { fill: '#78350f', stroke: '#f59e0b', text: '#fef3c7' },
  NOT:   { fill: '#991b1b', stroke: '#f87171', text: '#fee2e2' },
  BUF:   { fill: '#374151', stroke: '#9ca3af', text: '#e5e7eb' },
  AOI21: { fill: '#6d28d9', stroke: '#a78bfa', text: '#ddd6fe' },
  AOI22: { fill: '#5b21b6', stroke: '#8b5cf6', text: '#ddd6fe' },
  MUX:   { fill: '#be185d', stroke: '#f472b6', text: '#fce7f3' },
  DFF:   { fill: '#0369a1', stroke: '#38bdf8', text: '#e0f2fe' },
  ADDER: { fill: '#0f766e', stroke: '#2dd4bf', text: '#ccfbf1' },
};
