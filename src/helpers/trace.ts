import {PluginError} from "./misc";

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

    case "revert":
    case "reverttracer":
      return { tracerType: TracerType.REVERT, tracerArg: "revertTracer" };

    case "call":
    case "calltracer":
    case "fastcall":
    case "fastcalltracer":
      return { tracerType: TracerType.CALL, tracerArg: "fastCallTracer" };
  }
  throw PluginError(`Unknown tracer type '${tracer}'`);
}

export async function traceCall(unsignedTx: any, tracer: string): Promise<any> {
  const { tracerArg } = resolveTracer(tracer);

  const config = {
    tracer: tracerArg,
  };

  return await hre.ethers.provider.send("debug_traceCall", [unsignedTx, "latest", config]);
}

export function formatTrace(trace: any, tracer: string): void {
  const { tracerType } = resolveTracer(tracer);

  switch (tracerType) {
    case TracerType.STRUCT:
      return formatStructTrace(trace);
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
  console.log(`  gasUsed: ${trace.gas}, failed: ${trace.failed}, returnValue: '${trace.returnValue}'`);
  console.log(`  pc    opcode             gas  gasUsed`);

  let gasUsedNum = 0;
  for (const log of trace.structLogs) {
    gasUsedNum += log.gasCost;

    const indent = '  '.repeat(log.depth);
    const pc = log.pc.toString().padStart(5, '0');
    const op = log.op.padEnd(16, ' ');
    const gas = log.gasCost.toString().padStart(5, ' ');
    const gasUsed = gasUsedNum.toString().padStart(8, ' ');
    console.log(`${indent}${pc} ${op} ${gas} ${gasUsed}`);
  }
}

export function formatRevertTrace(trace: string) {
  if (trace.length == 0) {
    console.warn("warn: empty revert reason. Either not reverted or reverted without reason");
  }
  console.log(`  revert reason: '${trace}'`);
}
