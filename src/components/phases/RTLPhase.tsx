'use client';

import dynamic from 'next/dynamic';
import { type Monaco } from '@monaco-editor/react';
import { Play, AlertCircle, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiliconFlowState } from '@/hooks/useSiliconFlow';
import { useState } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-zinc-900 animate-pulse rounded flex items-center justify-center">
      <span className="text-zinc-600 text-sm font-mono">Loading editor...</span>
    </div>
  ),
});

function handleBeforeMount(monaco: Monaco) {
  monaco.editor.defineTheme('silicon-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '22d3ee' },
      { token: 'comment', foreground: '52525b' },
      { token: 'identifier', foreground: 'e4e4e7' },
      { token: 'number', foreground: 'a78bfa' },
      { token: 'operator', foreground: '4ade80' },
      { token: 'string', foreground: 'fbbf24' },
    ],
    colors: {
      'editor.background': '#09090b',
      'editor.foreground': '#e4e4e7',
      'editorLineNumber.foreground': '#52525b',
      'editorLineNumber.activeForeground': '#71717a',
      'editor.lineHighlightBackground': '#18181b',
      'editorCursor.foreground': '#22d3ee',
      'editor.selectionBackground': '#1e3a5f',
      'editorIndentGuide.background1': '#27272a',
      'editorGutter.background': '#09090b',
      'editor.inactiveSelectionBackground': '#1e3a5f88',
    },
  });

  monaco.languages.register({ id: 'verilog' });
  monaco.languages.setMonarchTokensProvider('verilog', {
    keywords: [
      'module', 'endmodule', 'input', 'output', 'inout',
      'wire', 'reg', 'assign', 'always', 'begin', 'end',
      'if', 'else', 'case', 'endcase', 'posedge', 'negedge',
    ],
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/\/\*/, { token: 'comment.block', next: '@blockComment' }],
        [/\b(module|endmodule|input|output|inout|wire|reg|assign|always|begin|end|if|else|case|endcase|posedge|negedge)\b/, 'keyword'],
        [/[0-9]+'[bBhHdD][0-9a-fA-FxXzZ_]+/, 'number'],
        [/\b[0-9]+\b/, 'number'],
        [/[a-zA-Z_]\w*/, 'identifier'],
        [/[&|^~]/, 'operator'],
        [/[=<>!]+/, 'operator'],
      ],
      blockComment: [
        [/[^/*]+/, 'comment.block'],
        [/\*\//, { token: 'comment.block', next: '@pop' }],
        [/[/*]/, 'comment.block'],
      ],
    },
  });
}

function handleMount(_editor: unknown, monaco: Monaco) {
  monaco.editor.setTheme('silicon-dark');
}

// ─── Pin Diagram ──────────────────────────────────────────────────────────────

const DEFAULT_INPUTS = ['A[0]', 'A[1]', 'A[2]', 'A[3]', 'B[0]', 'B[1]', 'B[2]', 'B[3]', 'Cin'];
const DEFAULT_OUTPUTS = ['Sum[0]', 'Sum[1]', 'Sum[2]', 'Sum[3]', 'Cout'];

function PinDiagram({ inputs, outputs }: { inputs: string[]; outputs: string[] }) {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  const SVG_W = 420;
  const SVG_H = 340;
  const BOX_X = 140;
  const BOX_Y = 30;
  const BOX_W = 140;
  const BOX_H = 280;
  const PIN_LEN = 50;

  const inputCount = inputs.length;
  const outputCount = outputs.length;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
    >
      {/* Grid pattern */}
      <defs>
        <pattern id="pinGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="0.5" fill="rgba(113,113,122,0.2)" />
        </pattern>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="url(#pinGrid)" />

      {/* Module box */}
      <rect
        x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H}
        fill="#18181b" stroke="#22d3ee" strokeWidth="1.5" rx="4"
      />

      {/* Module name */}
      <text
        x={BOX_X + BOX_W / 2} y={BOX_Y + BOX_H / 2}
        textAnchor="middle" dominantBaseline="middle"
        fill="#52525b" fontSize="10" letterSpacing="1"
      >
        MODULE
      </text>

      {/* Input pins */}
      {inputs.map((pin, i) => {
        const y = BOX_Y + ((i + 1) * BOX_H) / (inputCount + 1);
        const isHovered = hoveredPin === pin;
        const color = isHovered ? '#22d3ee' : '#71717a';
        return (
          <g
            key={pin}
            onMouseEnter={() => setHoveredPin(pin)}
            onMouseLeave={() => setHoveredPin(null)}
            style={{ cursor: 'pointer' }}
          >
            <line
              x1={BOX_X - PIN_LEN} y1={y} x2={BOX_X} y2={y}
              stroke={color} strokeWidth={isHovered ? 1.5 : 1}
            />
            <circle cx={BOX_X} cy={y} r="3" fill={color} />
            <text
              x={BOX_X - PIN_LEN - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fill={color} fontSize="9"
            >
              {pin}
            </text>
          </g>
        );
      })}

      {/* Output pins */}
      {outputs.map((pin, i) => {
        const y = BOX_Y + ((i + 1) * BOX_H) / (outputCount + 1);
        const isHovered = hoveredPin === pin;
        const color = isHovered ? '#22d3ee' : '#71717a';
        const arrowX = BOX_X + BOX_W + PIN_LEN;
        return (
          <g
            key={pin}
            onMouseEnter={() => setHoveredPin(pin)}
            onMouseLeave={() => setHoveredPin(null)}
            style={{ cursor: 'pointer' }}
          >
            <line
              x1={BOX_X + BOX_W} y1={y} x2={arrowX - 8} y2={y}
              stroke={color} strokeWidth={isHovered ? 1.5 : 1}
            />
            {/* Arrow head */}
            <polygon
              points={`${arrowX - 8},${y - 4} ${arrowX},${y} ${arrowX - 8},${y + 4}`}
              fill={color}
            />
            <text
              x={arrowX + 6} y={y}
              textAnchor="start" dominantBaseline="middle"
              fill={color} fontSize="9"
            >
              {pin}
            </text>
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hoveredPin && (
        <g>
          <rect x={SVG_W / 2 - 50} y={SVG_H - 28} width={100} height={20} rx="3" fill="#18181b" stroke="#22d3ee" strokeWidth="0.5" />
          <text x={SVG_W / 2} y={SVG_H - 15} textAnchor="middle" fill="#22d3ee" fontSize="9">
            {hoveredPin}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── RTL Phase ────────────────────────────────────────────────────────────────

type RTLPhaseProps = Pick<SiliconFlowState, 'verilogCode' | 'setVerilogCode' | 'compile' | 'parseError' | 'netlist'>;

export function RTLPhase({ verilogCode, setVerilogCode, compile, parseError, netlist }: RTLPhaseProps) {
  const inputs = netlist?.inputs ?? DEFAULT_INPUTS;
  const outputs = netlist?.outputs ?? DEFAULT_OUTPUTS;

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Editor */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-zinc-300 text-sm font-medium font-mono">RTL Source — Verilog</span>
        </div>

        <div className="flex-1 rounded-md overflow-hidden border border-zinc-800 min-h-0">
          <MonacoEditor
            height="100%"
            language="verilog"
            value={verilogCode}
            onChange={val => setVerilogCode(val ?? '')}
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            options={{
              fontSize: 13,
              lineHeight: 20,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              renderLineHighlight: 'line',
              fontFamily: 'var(--font-geist-mono), "Cascadia Code", "Fira Code", monospace',
              fontLigatures: true,
              padding: { top: 12, bottom: 12 },
              scrollbar: { vertical: 'auto', horizontal: 'auto' },
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={compile}
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold gap-2"
          >
            <Play className="w-4 h-4" />
            Compile
          </Button>
          {parseError && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{parseError}</span>
            </div>
          )}
          {!parseError && netlist && (
            <span className="text-green-400 text-xs font-mono">
              ✓ {netlist.gates.length} gates synthesised
            </span>
          )}
        </div>
      </div>

      {/* Right: Pin Diagram */}
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 text-sm font-medium font-mono">Module Interface</span>
          <span className="text-zinc-600 text-xs font-mono ml-auto">
            {inputs.length} in · {outputs.length} out
          </span>
        </div>
        <div className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/50 overflow-hidden flex items-center justify-center p-4">
          <PinDiagram inputs={inputs} outputs={outputs} />
        </div>
      </div>
    </div>
  );
}
