import { PluginError } from "./misc";

export enum TracerType {
  STRUCT = "struct",
  REVERT = "revert",
  CALL = "call",
}

export function resolveTracer(tracer: string) {
  if (!tracer || tracer.length == 0) {
    return { tracerType: TracerType.STRUCT, tracerArg: null };
  }

  tracer = tracer.toLowerCase();
  switch (tracer) {
    case "struct":
    case "structlog":
    case "structlogger":
      return { tracerType: TracerType.STRUCT, tracerArg: null };

    case "call":
    case "calltracer":
    case "fastcall":
    case "fastcalltracer":
      return { tracerType: TracerType.CALL, tracerArg: "fastCallTracer" };

    case "revert":
    case "reverttracer":
      return { tracerType: TracerType.REVERT, tracerArg: "revertTracer" };  
  }

  throw PluginError(`Unknown tracer type '${tracer}' (allowed: struct, call, revert, stackup)`);
}

export async function traceCall(unsignedTx: any, tracer: string): Promise<any> {
  const { tracerArg } = resolveTracer(tracer);

  const config = {
    tracer: tracerArg,
  };

  return await hre.ethers.provider.send("debug_traceCall", [unsignedTx, "latest", config]);
}

export async function traceTx(txid: any, tracer: string): Promise<any> {
  const { tracerArg } = resolveTracer(tracer);

  const config = {
    tracer: tracerArg,
  };

  return await hre.ethers.provider.send("debug_traceTransaction", [txid, config]);
}

export function formatTrace(trace: any, tracer: string): void {
  const { tracerType } = resolveTracer(tracer);

  switch (tracerType) {
    case TracerType.STRUCT:
      return formatStructTrace(trace);
    case TracerType.CALL:
      return formatCallTrace(trace);
    case TracerType.REVERT:
      return formatRevertTrace(trace);
    default:
      return console.log(trace);
  }
}

export interface StructLog {
  pc: number;
  op: string; // opcode name
  gas: number; // remaining
  gasCost: number; // spent on this opcode
  depth: number;
}

export interface StructTrace {
  gas: number;
  failed: boolean;
  returnValue: string;
  structLogs: StructLog[];
}

export function formatStructTrace(trace: StructTrace) {
  console.log(`StructTrace`);
  console.log(`  gasUsed: ${toNumber(trace.gas)}, failed: ${trace.failed}, returnValue: '${trace.returnValue}'`);
  console.log(`  pc    opcode             gasCost       gas`);

  for (const log of trace.structLogs) {
    const indent = "  ".repeat(log.depth);
    const pc = toDecimal(log.pc, 5, '0');
    const op = log.op.padEnd(16, ' ');
    const gasCost = toDecimal(log.gasCost, 9);
    const gas = toDecimal(log.gas, 9);
    console.log(`${indent}${pc} ${op} ${gasCost} ${gas}`);
  }
}

export interface CallFrame {
  type: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  output: string;

  error?: string;
  revertReason?: string;
  reverted?: { contract: string, message: string };

  calls?: CallFrame[];
}

export function formatCallTrace(trace: CallFrame, depth: number = 0) {
  if (depth == 0) {
    console.log(`CallTrace`);
  }

  const indent = "  ".repeat(depth);
  console.log(`${indent}  ${trace.type} ${trace.to}`);
  
  const value = hre.ethers.utils.formatEther(trace.value || 0);
  let error = trace.error || "";
  if (trace.revertReason) {
    error += ` (${trace.revertReason})`;
  }
  if (trace.reverted?.message) {
    error += ` (${trace.reverted.message})`;
  }
  console.log(`${indent}  gasUsed: ${toNumber(trace.gasUsed)}, value: ${value}, error: '${error}'`);

  for (const call of trace.calls || []) {
    formatCallTrace(call, depth + 1);
  }
}

export function formatRevertTrace(trace: string) {
  if (trace.length == 0) {
    console.warn("warn: empty revert reason. Either not reverted or reverted without reason");
  }
  console.log(`  revert reason: '${trace}'`);
}

function toNumber(num: string | number): number {
  return hre.ethers.BigNumber.from(num).toNumber();
}

function toDecimal(num: string | number, padlen: number = 0, fillString: string = ' '): string {
  return toNumber(num).toString().padStart(padlen, fillString);
}