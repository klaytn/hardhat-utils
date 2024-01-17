import { PluginError } from "./misc";

export enum TracerType {
  STRUCT = "struct",
  REVERT = "revert",
  CALL = "call",
}

export interface TraceConfig {
  tracer?: string; // Tracer type. JS trace script not accepted.
  timeout?: string; // Timeout in Go Duration
  withContext?: boolean; // Enable memory, stack, storage
  limit?: string; // Maximum number of opcodes
}

export interface TraceConfigAPI {
  // vm.LogConfig
  // https://github.com/klaytn/klaytn/blob/v1.12.0/blockchain/vm/logger.go#L49
  disableMemory?: boolean;
  disableStack?: boolean;
  disableStorage?: boolean;
  limit?: number; // number of opcodes

  // tracers.TraceConfig
  // https://github.com/klaytn/klaytn/blob/v1.12.0/node/cn/tracers/api.go#L175
  tracer?: string | null; // Tracer type or JS trace script
  timeout?: string; // Debug execution timeout in Go Duration
  loggerTimeout?: string; // JSON marshal timeout in Go Duration
}

export function resolveTracer(tracer?: string) {
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

export function resolveTraceConfig(config: TraceConfig): TraceConfigAPI {
  const { tracerType, tracerArg } = resolveTracer(config.tracer);
  const output: TraceConfigAPI = {tracer: tracerArg};

  if (tracerType == TracerType.STRUCT && !config.withContext) {
    output.disableMemory = true;
    output.disableStack = true;
    output.disableStorage = true;
  }
  if (tracerType == TracerType.STRUCT && config.limit) {
    output.limit = parseInt(config.limit);
  }
  if (config.timeout) {
    output.timeout = config.timeout;
    output.loggerTimeout = config.timeout;
  }

  return output;
}

export async function traceCall(unsignedTx: any, config: TraceConfig): Promise<any> {
  const configAPI = resolveTraceConfig(config);

  if (!unsignedTx.gas) {
    // If !unsignedTx.gas, debug_traceCall will use gasLimit MaxUint63, making the output unreadable.
    unsignedTx.gas = hre.ethers.utils.hexValue(1e10);
  }
  return await hre.ethers.provider.send("debug_traceCall", [unsignedTx, "latest", configAPI]);
}

export async function traceTx(txid: any, config: TraceConfig): Promise<any> {
  const configAPI = resolveTraceConfig(config);

  return await hre.ethers.provider.send("debug_traceTransaction", [txid, configAPI]);
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
  console.log(`  gasUsed: ${formatNumber(trace.gas)}, failed: ${trace.failed}, returnValue: '${trace.returnValue}'`);
  console.log(`  pc    opcode              gasCost        gas`);

  for (const log of trace.structLogs) {
    const indent = "  ".repeat(log.depth);
    const pc = formatNumber(log.pc, 5, '0');
    const op = log.op.padEnd(16, ' ');
    const gasCost = formatNumber(log.gasCost, 10);
    const gas = formatNumber(log.gas, 10);
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
  console.log(`${indent}  gasUsed: ${formatNumber(trace.gasUsed)}, value: ${value}, error: '${error}'`);

  for (const call of trace.calls || []) {
    formatCallTrace(call, depth + 1);
  }
}

export function formatRevertTrace(trace: string) {
  console.log(`RevertTrace`)
  console.log(`  revert reason: '${trace}'`);
  if (trace.length == 0) {
    console.warn("  empty revert reason means (a) not reverted or (b) reverted without reason");
    console.warn("  try callTracer (--tracer call) for further details");
  }
}

function formatNumber(num: string | number, padlen: number = 0, fillString: string = ' '): string {
  const BigNumber= hre.ethers.BigNumber;
  let bn = BigNumber.from(num.toString());
  if (bn.gt(BigNumber.from("0x7fff000000000000"))) {
    bn = bn.sub(BigNumber.from("0x7fffffffffffffff"));
  }
  return bn.toString().padStart(padlen, fillString);
}
