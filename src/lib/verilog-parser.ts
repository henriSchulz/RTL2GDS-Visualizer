import type { Gate, GateType, Netlist } from '@/types/silicon';

export const DEFAULT_VERILOG = `module alu_slice(
  input  A, B, Cin, Sel,
  output Sum, Cout
);
  wire w1, w2, w3;

  // Mixed gate-level and library instantiations
  assign w1 = A ^ B;

  // Library Cell AOI21
  AOI21 u1 (.A1(A), .A2(B), .B(Cin), .Y(w2));

  // Library Cell MUX
  MUX  u2 (.S(Sel), .A(w1), .B(w2), .Y(Sum));

  // Logic for Cout
  assign w3 = A & B;
  assign Cout = w3 | (w1 & Cin);

endmodule`;

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type TokenKind = 'IDENT' | 'AND' | 'OR' | 'XOR' | 'NOT' | 'PLUS' | 'LPAREN' | 'RPAREN';
interface Token { kind: TokenKind; value: string }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === '&') { tokens.push({ kind: 'AND', value: '&' }); i++; }
    else if (ch === '|') { tokens.push({ kind: 'OR', value: '|' }); i++; }
    else if (ch === '^') { tokens.push({ kind: 'XOR', value: '^' }); i++; }
    else if (ch === '~') { tokens.push({ kind: 'NOT', value: '~' }); i++; }
    else if (ch === '+') { tokens.push({ kind: 'PLUS', value: '+' }); i++; }
    else if (ch === '(') { tokens.push({ kind: 'LPAREN', value: '(' }); i++; }
    else if (ch === ')') { tokens.push({ kind: 'RPAREN', value: ')' }); i++; }
    else if (/[\w\[\]]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[\w\[\]]/.test(expr[i])) { ident += expr[i++]; }
      tokens.push({ kind: 'IDENT', value: ident });
    } else {
      i++; // skip whitespace and unknown chars
    }
  }
  return tokens;
}

// ─── Pratt Parser ─────────────────────────────────────────────────────────────

const PREC: Partial<Record<TokenKind, number>> = {
  PLUS: 1, OR: 1, XOR: 2, AND: 3,
};

function opToGateType(kind: TokenKind): GateType {
  if (kind === 'AND') return 'AND';
  if (kind === 'OR') return 'OR';
  if (kind === 'XOR') return 'XOR';
  return 'BUF';
}

function parseExpr(
  tokens: Token[],
  pos: { i: number },
  gates: Gate[],
  counter: { n: number },
  minPrec = 0,
): string {
  let lhsNet = parseUnary(tokens, pos, gates, counter);

  while (pos.i < tokens.length) {
    const tok = tokens[pos.i];
    const prec = PREC[tok.kind];
    if (prec === undefined || prec <= minPrec) break;
    pos.i++;
    const rhsNet = parseExpr(tokens, pos, gates, counter, prec);

    if (tok.kind === 'PLUS') {
      // Half-adder expansion for single-bit: a + b → AND (carry) + XOR (sum)
      const carryNet = `_carry${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: 'AND', inputs: [lhsNet, rhsNet], output: carryNet, module: 'Arithmetic' });
      const sumNet = `_n${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: 'XOR', inputs: [lhsNet, rhsNet], output: sumNet, module: 'Arithmetic' });
      lhsNet = sumNet;
    } else {
      const outNet = `_n${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: opToGateType(tok.kind), inputs: [lhsNet, rhsNet], output: outNet, module: 'GlueLogic' });
      lhsNet = outNet;
    }
  }
  return lhsNet;
}

function parseUnary(
  tokens: Token[],
  pos: { i: number },
  gates: Gate[],
  counter: { n: number },
): string {
  if (pos.i < tokens.length && tokens[pos.i].kind === 'NOT') {
    pos.i++;
    const operandNet = parseUnary(tokens, pos, gates, counter);
    const outNet = `_n${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: 'NOT', inputs: [operandNet], output: outNet, module: 'GlueLogic' });
    return outNet;
  }
  return parsePrimary(tokens, pos, gates, counter);
}

function parsePrimary(
  tokens: Token[],
  pos: { i: number },
  gates: Gate[],
  counter: { n: number },
): string {
  if (pos.i >= tokens.length) return '_err';
  const tok = tokens[pos.i];
  if (tok.kind === 'LPAREN') {
    pos.i++;
    const net = parseExpr(tokens, pos, gates, counter, 0);
    if (pos.i < tokens.length && tokens[pos.i].kind === 'RPAREN') pos.i++;
    return net;
  }
  if (tok.kind === 'IDENT') {
    pos.i++;
    return tok.value;
  }
  return '_err';
}

// ─── Bus Addition (Ripple Carry Adder) ────────────────────────────────────────

/**
 * Expands `lhs = opA + opB` (N-bit bus) into a chain of N full adders.
 *
 * Bit 0 — half adder (no carry in):
 *   XOR(A[0], B[0])  → lhs[0]
 *   AND(A[0], B[0])  → _hc0
 *
 * Bit i (i > 0) — full adder:
 *   XOR(A[i], B[i])         → _xi  (intermediate)
 *   XOR(_xi, carry_in)      → lhs[i]
 *   AND(A[i], B[i])         → _faia (partial carry)
 *   AND(_xi, carry_in)      → _faib (partial carry)
 *   OR(_faia, _faib)        → _ci  (carry out, or _cout for last bit)
 */
function expandRippleCarryAdder(
  lhs: string,
  opA: string,
  opB: string,
  width: number,
  gates: Gate[],
  counter: { n: number },
): void {
  let carryIn: string | null = null;

  for (let i = 0; i < width; i++) {
    const a = `${opA}[${i}]`;
    const b = `${opB}[${i}]`;
    const sumOut = `${lhs}[${i}]`;

    if (i === 0) {
      // Half adder for LSB
      const carryOut = `_hc0`;
      gates.push({ id: `g${counter.n++}`, type: 'XOR', inputs: [a, b], output: sumOut, module: 'Adder' });
      gates.push({ id: `g${counter.n++}`, type: 'AND', inputs: [a, b], output: carryOut, module: 'Adder' });
      carryIn = carryOut;
    } else {
      // Full adder for bits 1..N-1
      const xor1Out = `_x${i}_${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: 'XOR', inputs: [a, b], output: xor1Out, module: 'Adder' });

      gates.push({ id: `g${counter.n++}`, type: 'XOR', inputs: [xor1Out, carryIn!], output: sumOut, module: 'Adder' });

      const and1Out = `_fa${i}a_${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: 'AND', inputs: [a, b], output: and1Out, module: 'Adder' });

      const and2Out = `_fa${i}b_${counter.n}`;
      gates.push({ id: `g${counter.n++}`, type: 'AND', inputs: [xor1Out, carryIn!], output: and2Out, module: 'Adder' });

      const carryOut = i === width - 1 ? `_cout` : `_c${i}`;
      gates.push({ id: `g${counter.n++}`, type: 'OR', inputs: [and1Out, and2Out], output: carryOut, module: 'Adder' });
      carryIn = carryOut;
    }
  }
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseVerilog(code: string): { netlist: Netlist; error: string | null } {
  const gates: Gate[] = [];
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  const counter = { n: 0 };

  // Strip comments
  const clean = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Module name
  const moduleMatch = clean.match(/module\s+(\w+)\s*[(\s]/);
  const moduleName = moduleMatch?.[1] ?? 'unknown';

  // ── Width map: base name → bit width (from all bus declarations) ──
  const widthMap = new Map<string, number>();
  const busWidthRe = /\b(?:input|output|wire|reg)\s+\[(\d+):(\d+)\]\s+(\w+)/g;
  for (const m of clean.matchAll(busWidthRe)) {
    const [, highStr, lowStr, name] = m;
    const width = Math.abs(parseInt(highStr) - parseInt(lowStr)) + 1;
    widthMap.set(name, width);
  }

  // ── Port declarations → inputs / outputs sets ──
  const busPortRe = /\b(input|output)\s+\[(\d+):(\d+)\]\s+(\w+)/g;
  for (const m of clean.matchAll(busPortRe)) {
    const [, dir, highStr, lowStr, name] = m;
    const high = parseInt(highStr);
    const low = parseInt(lowStr);
    const [from, to] = high >= low ? [low, high] : [high, low];
    for (let i = from; i <= to; i++) {
      (dir === 'input' ? inputs : outputs).add(`${name}[${i}]`);
    }
  }

  const scalarPortRe = /\b(input|output)\s+(?!\[)(\w+)\s*[;,)]/g;
  for (const m of clean.matchAll(scalarPortRe)) {
    const [, dir, name] = m;
    if (name !== 'reg' && name !== 'wire') {
      (dir === 'input' ? inputs : outputs).add(name);
    }
  }

  // ── Cell Instantiations ──
  // Matches: AOI22 u1 (.A1(a), .Y(y));
  const instRe = /\b(\w+)\s+(\w+)\s*\(([\s\S]+?)\)\s*;/g;
  const keywords = new Set(['module', 'input', 'output', 'wire', 'reg', 'assign', 'begin', 'end', 'endmodule']);

  for (const m of clean.matchAll(instRe)) {
    const [full, type, id, portMapStr] = m;
    if (keywords.has(type)) continue;

    const portMap: Record<string, string> = {};
    const portRe = /\.([\w\d]+)\s*\(([\w\d\[\]]+)\)/g;
    for (const pm of portMapStr.matchAll(portRe)) {
      portMap[pm[1]] = pm[2];
    }

    // Heuristic: pins starting with Y, Q, out, Sum, Cout are outputs
    const outputPin = Object.keys(portMap).find(p =>
      /^(Y|Q|out|Sum|Cout)/i.test(p)
    ) || 'Y';

    const output = portMap[outputPin];
    const gateInputs = Object.keys(portMap)
      .filter(p => p !== outputPin)
      .map(p => portMap[p]);

    if (output) {
      gates.push({
        id,
        type: type as GateType,
        inputs: gateInputs,
        output,
        // For partitioning, we can use a simple heuristic or look for module markers
        module: type.startsWith('AOI') || type.startsWith('NAND') || type.startsWith('NOR') ? 'Library' : 'SubModule'
      });
    }
  }

  // ── Assign statements ──
  const assignRe = /assign\s+([\w\[\]]+)\s*=\s*(.+?);/g;
  for (const m of clean.matchAll(assignRe)) {
    const [, lhs, rhs] = m;
    const trimmedRhs = rhs.replace(/\s+/g, '');

    // ── Bus addition detection ──
    // Only when lhs is a whole bus name (no bit index) and rhs is exactly "A+B"
    const busAddMatch = trimmedRhs.match(/^(\w+)\+(\w+)$/);
    if (busAddMatch && !lhs.includes('[')) {
      const [, opA, opB] = busAddMatch;
      const wA = widthMap.get(opA) ?? 1;
      const wB = widthMap.get(opB) ?? 1;
      const maxWidth = Math.max(wA, wB);

      if (maxWidth > 1) {
        // Infer output width: prefer explicit lhs declaration, fallback to max operand width
        const wLhs = widthMap.get(lhs) ?? maxWidth;

        // Ensure per-bit output names appear in outputs set if lhs is a declared output
        if (outputs.has(lhs)) {
          outputs.delete(lhs);
          for (let i = 0; i < wLhs; i++) outputs.add(`${lhs}[${i}]`);
        }

        expandRippleCarryAdder(lhs, opA, opB, wLhs, gates, counter);
        continue; // skip expression parser for this assign
      }
    }

    // ── Normal expression parse (scalar or single-bit) ──
    const tokens = tokenize(trimmedRhs);
    if (tokens.length === 0) continue;

    const pos = { i: 0 };
    const startGateCount = gates.length;
    let resultNet: string;

    try {
      resultNet = parseExpr(tokens, pos, gates, counter, 0);
    } catch {
      return {
        netlist: { moduleName, inputs: [...inputs], outputs: [...outputs], gates },
        error: `Parse error in assign ${lhs} = ${rhs}`,
      };
    }

    if (gates.length === startGateCount) {
      // Identity/buffer: assign wire = net;
      gates.push({ id: `g${counter.n++}`, type: 'BUF', inputs: [resultNet], output: lhs, module: 'GlueLogic' });
    } else {
      // Rename the last synthesised net to the lhs name
      gates[gates.length - 1].output = lhs;
      const oldNet = resultNet;
      for (let i = startGateCount; i < gates.length - 1; i++) {
        gates[i].inputs = gates[i].inputs.map(n => n === oldNet ? lhs : n);
      }
    }
  }

  return {
    netlist: { moduleName, inputs: [...inputs], outputs: [...outputs], gates },
    error: null,
  };
}
