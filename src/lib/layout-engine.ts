import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Gate, Netlist } from '@/types/silicon';

// ─── Node dimensions ──────────────────────────────────────────────────────────

export const PORT_W = 110;
export const PORT_H = 32;
export const GATE_W = 100;

export function gateH(inputCount: number): number {
  // Enough vertical space so handles don't overlap (24px per input, min 48px)
  return Math.max(48, inputCount * 24 + 12);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sanitizeId(net: string): string {
  return net.replace(/\[/g, '_').replace(/\]/g, '');
}

// ─── ReactFlow layout (dagre) ─────────────────────────────────────────────────

export function computeLayout(netlist: Netlist): { nodes: Node[]; edges: Edge[] } {
  const outputNetMap = new Map<string, Gate>();
  for (const gate of netlist.gates) {
    outputNetMap.set(gate.output, gate);
  }

  // Map gate id → gate for quick lookup
  const gateMap = new Map<string, Gate>();
  for (const gate of netlist.gates) gateMap.set(gate.id, gate);

  const nodeIdSet = new Set<string>();

  // ── Build unpositioned nodes ──────────────────────────────────────────────

  const rawNodes: Node[] = [];

  for (const net of netlist.inputs) {
    const id = `port-in-${sanitizeId(net)}`;
    nodeIdSet.add(id);
    rawNodes.push({
      id,
      type: 'siliconNode',
      position: { x: 0, y: 0 },
      width: PORT_W,
      height: PORT_H,
      data: { nodeKind: 'port', label: net, portType: 'input' },
    });
  }

  for (const gate of netlist.gates) {
    nodeIdSet.add(gate.id);
    const h = gateH(gate.inputs.length);
    rawNodes.push({
      id: gate.id,
      type: 'siliconNode',
      position: { x: 0, y: 0 },
      width: GATE_W,
      height: h,
      data: {
        nodeKind: 'gate',
        label: gate.type,
        gateType: gate.type,
        inputCount: gate.inputs.length,
      },
    });
  }

  for (const net of netlist.outputs) {
    const id = `port-out-${sanitizeId(net)}`;
    nodeIdSet.add(id);
    rawNodes.push({
      id,
      type: 'siliconNode',
      position: { x: 0, y: 0 },
      width: PORT_W,
      height: PORT_H,
      data: { nodeKind: 'port', label: net, portType: 'output' },
    });
  }

  // ── Build edges with per-input target handles ─────────────────────────────

  const rawEdges: Edge[] = [];

  for (const gate of netlist.gates) {
    gate.inputs.forEach((inputNet, inputIdx) => {
      let sourceId: string;
      if (netlist.inputs.includes(inputNet)) {
        sourceId = `port-in-${sanitizeId(inputNet)}`;
      } else {
        const srcGate = outputNetMap.get(inputNet);
        if (!srcGate) return;
        sourceId = srcGate.id;
      }
      if (!nodeIdSet.has(sourceId)) return;

      rawEdges.push({
        id: `e-${sourceId}-${gate.id}-${inputIdx}`,
        source: sourceId,
        target: gate.id,
        targetHandle: `input-${inputIdx}`,
        type: 'smoothstep',
        style: { stroke: '#22d3ee', strokeWidth: 1.5, opacity: 0.55 },
      });
    });
  }

  for (const outNet of netlist.outputs) {
    const srcGate = outputNetMap.get(outNet);
    if (!srcGate) continue;
    const targetId = `port-out-${sanitizeId(outNet)}`;
    if (!nodeIdSet.has(targetId)) continue;
    rawEdges.push({
      id: `e-${srcGate.id}-${targetId}`,
      source: srcGate.id,
      target: targetId,
      type: 'smoothstep',
      style: { stroke: '#22d3ee', strokeWidth: 1.5, opacity: 0.55 },
    });
  }

  // ── Dagre layout ──────────────────────────────────────────────────────────

  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',   // left → right
    nodesep: 40,     // vertical gap between nodes in the same rank
    ranksep: 110,    // horizontal gap between ranks
    marginx: 50,
    marginy: 50,
  });

  for (const node of rawNodes) {
    g.setNode(node.id, { width: node.width ?? GATE_W, height: node.height ?? PORT_H });
  }

  for (const edge of rawEdges) {
    if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  Dagre.layout(g);

  // Dagre returns centre coordinates → convert to ReactFlow top-left
  const positionedNodes = rawNodes.map(node => {
    const dn = g.node(node.id);
    if (!dn) return node;
    return {
      ...node,
      position: {
        x: dn.x - (node.width ?? GATE_W) / 2,
        y: dn.y - (node.height ?? PORT_H) / 2,
      },
    };
  });

  return { nodes: positionedNodes, edges: rawEdges };
}

// ─── SVG layout (LayoutPhase) — kept manual with barycenter ordering ──────────

export interface SVGLayoutItem {
  id: string;
  kind: 'input' | 'output' | 'gate';
  label: string;
  gateType?: string;
  inputCount?: number;
  col: number;
  row: number;
  x: number;
  y: number;
  module?: string;
}

export interface SVGLayoutData {
  items: SVGLayoutItem[];
  edges: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    netName: string;
    path?: Array<{ x: number; y: number; layer: 'M1' | 'M2' }>;
  }>;
  viewWidth: number;
  viewHeight: number;
  modules?: Array<{ id: string; name: string; x: number; y: number; width: number; height: number; color: string }>;
}

function buildDepthMap(netlist: Netlist): Map<string, number> {
  const outputNetMap = new Map<string, Gate>();
  for (const gate of netlist.gates) outputNetMap.set(gate.output, gate);

  const depthCache = new Map<string, number>();

  function getDepth(gateId: string): number {
    if (depthCache.has(gateId)) return depthCache.get(gateId)!;
    const gate = netlist.gates.find(g => g.id === gateId);
    if (!gate) return 0;
    const inputDepths = gate.inputs.map(net => {
      if (netlist.inputs.includes(net)) return -1;
      const src = outputNetMap.get(net);
      return src ? getDepth(src.id) : -1;
    });
    const d = Math.max(...inputDepths) + 1;
    depthCache.set(gateId, d);
    return d;
  }

  for (const gate of netlist.gates) getDepth(gate.id);
  return depthCache;
}

export function computeSVGLayout(netlist: Netlist): SVGLayoutData {
  const outputNetMap = new Map<string, Gate>();
  for (const gate of netlist.gates) outputNetMap.set(gate.output, gate);

  const depthMap = buildDepthMap(netlist);
  const maxDepth = netlist.gates.length > 0 ? Math.max(...depthMap.values()) : 0;

  const COL_GAP = 150;
  const ROW_GAP = 70;
  const MARGIN = 60;

  const columns = new Map<number, SVGLayoutItem[]>();

  netlist.inputs.forEach((net, i) => {
    if (!columns.has(0)) columns.set(0, []);
    columns.get(0)!.push({
      id: `port-in-${sanitizeId(net)}`, kind: 'input', label: net,
      col: 0, row: i, x: 0, y: 0,
    });
  });

  for (const gate of netlist.gates) {
    const col = (depthMap.get(gate.id) ?? 0) + 1;
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push({
      id: gate.id, kind: 'gate', label: gate.type, gateType: gate.type,
      inputCount: gate.inputs.length,
      col, row: 0, x: 0, y: 0,
      module: gate.module || 'Logic'
    });
  }

  const outputCol = maxDepth + 2;
  netlist.outputs.forEach((net, i) => {
    if (!columns.has(outputCol)) columns.set(outputCol, []);
    columns.get(outputCol)!.push({
      id: `port-out-${sanitizeId(net)}`, kind: 'output', label: net,
      col: outputCol, row: i, x: 0, y: 0,
    });
  });

  // ── Barycenter crossing minimization (2 passes) ────────────────────────────
  const colEntries = Array.from(columns.entries()).sort(([a], [b]) => a - b);

  // Forward pass: sort each column by average predecessor y-position
  const tempY = new Map<string, number>(); // id → estimated y for barycenter
  for (const [, items] of colEntries) {
    items.forEach((item, i) => tempY.set(item.id, i));
  }

  for (let pass = 0; pass < 2; pass++) {
    for (const [, items] of colEntries) {
      items.forEach(item => {
        if (item.kind !== 'gate') return;
        const gate = netlist.gates.find(g => g.id === item.id);
        if (!gate) return;
        const srcYs = gate.inputs
          .map(net => {
            const srcId = netlist.inputs.includes(net)
              ? `port-in-${sanitizeId(net)}`
              : (outputNetMap.get(net)?.id ?? null);
            return srcId ? (tempY.get(srcId) ?? 0) : 0;
          });
        if (srcYs.length > 0) {
          tempY.set(item.id, srcYs.reduce((a, b) => a + b, 0) / srcYs.length);
        }
      });
      items.sort((a, b) => (tempY.get(a.id) ?? 0) - (tempY.get(b.id) ?? 0));
    }
  }

  // ── Assign final positions ─────────────────────────────────────────────────
  const itemMap = new Map<string, SVGLayoutItem>();
  let maxRows = 0;
  const totalCols = maxDepth + 3;

  for (const [col, items] of colEntries) {
    if (items.length > maxRows) maxRows = items.length;
    items.forEach((item, row) => {
      item.col = col;
      item.row = row;
      item.x = MARGIN + col * COL_GAP;
      item.y = MARGIN + row * ROW_GAP;
      itemMap.set(item.id, item);
    });
  }

  // ── Edges ──────────────────────────────────────────────────────────────────
  const svgEdges: SVGLayoutData['edges'] = [];
  for (const gate of netlist.gates) {
    for (const inputNet of gate.inputs) {
      const srcId = netlist.inputs.includes(inputNet)
        ? `port-in-${sanitizeId(inputNet)}`
        : (outputNetMap.get(inputNet)?.id ?? null);
      if (!srcId) continue;

      const src = itemMap.get(srcId);
      const dst = itemMap.get(gate.id);
      let path: SVGLayoutData['edges'][0]['path'] = undefined;

      if (src && dst) {
        const x1 = src.x + 50;
        const y1 = src.y;
        const x2 = dst.x - 50;
        const y2 = dst.y;
        const midX = (x1 + x2) / 2;
        path = [
          { x: x1, y: y1, layer: 'M1' },
          { x: midX, y: y1, layer: 'M1' },
          { x: midX, y: y2, layer: 'M2' },
          { x: x2, y: y2, layer: 'M1' },
        ];
      }

      svgEdges.push({
        id: `e-${srcId}-${gate.id}-${inputNet}`,
        sourceId: srcId,
        targetId: gate.id,
        netName: inputNet,
        path
      });
    }
  }
  for (const outNet of netlist.outputs) {
    const srcGate = outputNetMap.get(outNet);
    if (!srcGate) continue;

    const src = itemMap.get(srcGate.id);
    const dstId = `port-out-${sanitizeId(outNet)}`;
    const dst = itemMap.get(dstId);
    let path: SVGLayoutData['edges'][0]['path'] = undefined;

    if (src && dst) {
      const x1 = src.x + 50;
      const y1 = src.y;
      const x2 = dst.x - 50;
      const y2 = dst.y;
      const midX = (x1 + x2) / 2;
      path = [
        { x: x1, y: y1, layer: 'M1' },
        { x: midX, y: y1, layer: 'M1' },
        { x: midX, y: y2, layer: 'M2' },
        { x: x2, y: y2, layer: 'M1' },
      ];
    }

    svgEdges.push({
      id: `e-${srcGate.id}-out-${sanitizeId(outNet)}`,
      sourceId: srcGate.id,
      targetId: dstId,
      netName: outNet,
      path
    });
  }

  const viewWidth = MARGIN * 2 + totalCols * COL_GAP + 80;
  const viewHeight = MARGIN * 2 + maxRows * ROW_GAP + 48;

  // ── Build Module Clusters (Partitioning) ──
  const moduleClusters = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
  for (const item of itemMap.values()) {
    if (item.kind !== 'gate') continue;
    const mod = item.module || 'Default';
    const current = moduleClusters.get(mod) || { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    moduleClusters.set(mod, {
      x1: Math.min(current.x1, item.x - 50),
      y1: Math.min(current.y1, item.y - 30),
      x2: Math.max(current.x2, item.x + 50),
      y2: Math.max(current.y2, item.y + 30),
    });
  }

  const svgModules: SVGLayoutData['modules'] = Array.from(moduleClusters.entries()).map(([name, bounds], i) => ({
    id: `mod-${name}`,
    name,
    x: bounds.x1,
    y: bounds.y1,
    width: bounds.x2 - bounds.x1,
    height: bounds.y2 - bounds.y1,
    color: `hsl(${i * 137.5 % 360}, 60%, 40%)`
  }));

  return { items: Array.from(itemMap.values()), edges: svgEdges, viewWidth, viewHeight, modules: svgModules };
}
