// Safe expression engine (BUILD-02). No eval, no Function. Only this grammar is accepted:
//   expr   = term (("+" | "-") term)*
//   term   = unary (("*" | "/") unary)*
//   unary  = "-" unary | atom
//   atom   = number | name | fn "(" expr ("," expr)* ")" | "(" expr ")"
//   fn     = min | max | abs
// Rules: a result exists only when every needed input is a finite number; otherwise Unknown (null), never 0.
// Division by zero is Unknown. There are no default values. Unit kinds are checked before use (inferKind).
import type { ResultKind, UnitKind, Values } from "./types";

export class ExprError extends Error { constructor(msg: string) { super(msg); this.name = "ExprError"; } }

export type Node =
  | { t: "num"; v: number }
  | { t: "id"; name: string }
  | { t: "neg"; a: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/"; a: Node; b: Node }
  | { t: "fn"; name: "min" | "max" | "abs"; args: Node[] };

const MAX_LEN = 600;
const MAX_DEPTH = 40;
const FNS = ["min", "max", "abs"] as const;

export function parse(src: string): Node {
  if (typeof src !== "string") throw new ExprError("expression must be text");
  if (src.length === 0 || src.length > MAX_LEN) throw new ExprError("expression length");
  let i = 0; let depth = 0;
  const ws = () => { while (src[i] === " ") i++; };
  const enter = () => { if (++depth > MAX_DEPTH) throw new ExprError("too deep"); };
  const leave = () => { depth--; };
  function expr(): Node {
    enter(); let a = term(); ws();
    while (src[i] === "+" || src[i] === "-") { const op = src[i] as "+" | "-"; i++; const b = term(); a = { t: "bin", op, a, b }; ws(); }
    leave(); return a;
  }
  function term(): Node {
    let a = unary(); ws();
    while (src[i] === "*" || src[i] === "/") { const op = src[i] as "*" | "/"; i++; const b = unary(); a = { t: "bin", op, a, b }; ws(); }
    return a;
  }
  function unary(): Node {
    ws();
    if (src[i] === "-") { i++; enter(); const a = unary(); leave(); return { t: "neg", a }; }
    return atom();
  }
  function atom(): Node {
    ws();
    const c = src[i];
    if (c === undefined) throw new ExprError("unexpected end");
    if (c === "(") { i++; const e = expr(); ws(); if (src[i] !== ")") throw new ExprError("expected )"); i++; return e; }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i)); if (!m) throw new ExprError("bad number");
      i += m[0].length; return { t: "num", v: Number(m[0]) };
    }
    if (/[A-Za-z]/.test(c)) {
      const m = /^[A-Za-z][A-Za-z0-9]*/.exec(src.slice(i)) as RegExpExecArray;
      i += m[0].length; ws();
      if (src[i] === "(") {
        if (!(FNS as readonly string[]).includes(m[0])) throw new ExprError(`unknown function ${m[0]}`);
        i++; const args: Node[] = [expr()]; ws();
        while (src[i] === ",") { i++; args.push(expr()); ws(); }
        if (src[i] !== ")") throw new ExprError("expected )");
        i++;
        if (m[0] === "abs" && args.length !== 1) throw new ExprError("abs takes one argument");
        if (m[0] !== "abs" && args.length < 2) throw new ExprError(`${m[0]} takes two or more arguments`);
        return { t: "fn", name: m[0] as "min" | "max" | "abs", args };
      }
      return { t: "id", name: m[0] };
    }
    throw new ExprError(`unexpected character ${JSON.stringify(c)}`);
  }
  const root = expr(); ws();
  if (i < src.length) throw new ExprError(`unexpected character ${JSON.stringify(src[i])}`);
  return root;
}

/** Input ids used by the expression, in order of first use, no duplicates. */
export function identifiers(n: Node, out: string[] = []): string[] {
  switch (n.t) {
    case "id": if (!out.includes(n.name)) out.push(n.name); break;
    case "neg": identifiers(n.a, out); break;
    case "bin": identifiers(n.a, out); identifiers(n.b, out); break;
    case "fn": for (const a of n.args) identifiers(a, out); break;
    default: break;
  }
  return out;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Evaluate. Unknown (null) unless every needed input is a finite number; division by zero is Unknown. */
export function evaluate(n: Node, values: Values): number | null {
  // Every needed input must be present even when a branch would not use it (no partial answers).
  for (const id of identifiers(n)) if (!isNum(values[id])) return null;
  const ev = (x: Node): number | null => {
    switch (x.t) {
      case "num": return x.v;
      case "id": return values[x.name] as number;
      case "neg": { const a = ev(x.a); return a === null ? null : -a; }
      case "bin": {
        const a = ev(x.a); const b = ev(x.b);
        if (a === null || b === null) return null;
        let r: number;
        if (x.op === "+") r = a + b; else if (x.op === "-") r = a - b; else if (x.op === "*") r = a * b;
        else { if (b === 0) return null; r = a / b; }
        return Number.isFinite(r) ? r : null;
      }
      case "fn": {
        const vs: number[] = [];
        for (const a of x.args) { const v = ev(a); if (v === null) return null; vs.push(v); }
        return x.name === "abs" ? Math.abs(vs[0] as number) : x.name === "min" ? Math.min(...vs) : Math.max(...vs);
      }
    }
  };
  return ev(n);
}

export const evaluateText = (src: string, values: Values): number | null => evaluate(parse(src), values);

// ---------- unit-kind validation ----------
export class UnitError extends Error { constructor(msg: string) { super(msg); this.name = "UnitError"; } }
/** "scalar" = a plain number (a literal, or a ratio of two like quantities). */
export type Kind = UnitKind | "scalar";

const PER_MONEY: readonly Kind[] = ["qty", "count", "days", "rate", "scalar"];

function mul(a: Kind, b: Kind): Kind {
  if (a === "scalar") return b;
  if (b === "scalar") return a;
  if (a === "money" && PER_MONEY.includes(b)) return "money";
  if (b === "money" && PER_MONEY.includes(a)) return "money";
  throw new UnitError(`cannot multiply ${a} by ${b}`);
}
function div(a: Kind, b: Kind): Kind {
  if (a === "percent" && b === "scalar") return "scalar"; // percent / 100 is a fraction (a plain number)
  if (b === "scalar") return a;
  if (a === b) return "scalar";
  if (a === "money" && (b === "qty" || b === "count" || b === "days")) return "money";
  throw new UnitError(`cannot divide ${a} by ${b}`);
}

/** Infer the unit kind of an expression from the unit kinds of its inputs. Throws UnitError on a mismatch. */
export function inferKind(n: Node, kinds: Record<string, UnitKind>): Kind {
  switch (n.t) {
    case "num": return "scalar";
    case "id": { const k = kinds[n.name]; if (!k) throw new UnitError(`unknown input ${n.name}`); return k; }
    case "neg": return inferKind(n.a, kinds);
    case "bin": {
      const a = inferKind(n.a, kinds); const b = inferKind(n.b, kinds);
      if (n.op === "+" || n.op === "-") { if (a !== b) throw new UnitError(`cannot ${n.op === "+" ? "add" : "subtract"} ${a} and ${b}`); return a; }
      return n.op === "*" ? mul(a, b) : div(a, b);
    }
    case "fn": {
      const ks = n.args.map((x) => inferKind(x, kinds));
      const first = ks[0] as Kind;
      if (ks.some((k) => k !== first)) throw new UnitError(`${n.name} needs the same unit kind in every argument`);
      return first;
    }
  }
}

/** Can a result of inferred kind `got` be declared as `want`? A plain number may be a ratio, percent, count, qty or rate. */
export function kindFits(got: Kind, want: ResultKind): boolean {
  if (got === want) return true;
  if (got === "scalar") return want === "ratio" || want === "percent" || want === "count" || want === "qty" || want === "rate";
  return false;
}
