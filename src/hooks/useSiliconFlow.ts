'use client';

import { useState, useCallback } from 'react';
import { parseVerilog, DEFAULT_VERILOG } from '@/lib/verilog-parser';
import { computeLayout } from '@/lib/layout-engine';
import type { FlowStep, Netlist } from '@/types/silicon';
import { FLOW_STEPS } from '@/types/silicon';
import type { Node, Edge } from '@xyflow/react';

export interface SiliconFlowState {
  currentStep: FlowStep;
  stepIndex: number;
  verilogCode: string;
  netlist: Netlist | null;
  parseError: string | null;
  flowNodes: Node[];
  flowEdges: Edge[];
  setVerilogCode: (code: string) => void;
  compile: () => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;
}

export function useSiliconFlow(): SiliconFlowState {
  const [stepIndex, setStepIndex] = useState(0);
  const [verilogCode, setVerilogCode] = useState(DEFAULT_VERILOG);
  const [netlist, setNetlist] = useState<Netlist | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);

  const compile = useCallback(() => {
    const { netlist: parsed, error } = parseVerilog(verilogCode);
    if (error) {
      setParseError(error);
      setNetlist(null);
      return;
    }
    setParseError(null);
    setNetlist(parsed);
    const { nodes, edges } = computeLayout(parsed);
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [verilogCode]);

  const goNext = useCallback(() => {
    setStepIndex(i => Math.min(i + 1, FLOW_STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setStepIndex(i => Math.max(i - 1, 0));
  }, []);

  return {
    currentStep: FLOW_STEPS[stepIndex],
    stepIndex,
    verilogCode,
    netlist,
    parseError,
    flowNodes,
    flowEdges,
    setVerilogCode,
    compile,
    goNext,
    goBack,
    canGoNext: stepIndex < FLOW_STEPS.length - 1,
    canGoBack: stepIndex > 0,
  };
}
