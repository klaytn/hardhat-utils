import { PluginError } from "./misc";

export enum TracerType {
  STRUCT = "struct",
  REVERT = "revert",
  CALL = "call",
  STACKUPCOL = "stackupcol",
  STACKUPEXE = "stackupexe",
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

    case "stackupcol":
      return { tracerType: TracerType.STACKUPCOL, tracerArg: BundlerCollectorTracer }
    case "stackupexe":
      return { tracerType: TracerType.STACKUPEXE, tracerArg: BundlerExecutionTracer }
  }

  throw PluginError(`Unknown tracer type '${tracer}' (allowed: call,revert,struct,stackupcol,stackupexe)`);
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

export async function traceCall(unsignedTx: any, block: string, config: TraceConfig): Promise<any> {
  const configAPI = resolveTraceConfig(config);

  if (!unsignedTx.gas) {
    // If !unsignedTx.gas, debug_traceCall will use gasLimit MaxUint63, making the output unreadable.
    unsignedTx.gas = hre.ethers.utils.hexValue(1e10);
  }
  return await hre.ethers.provider.send("debug_traceCall", [unsignedTx, block, configAPI]);
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
      return console.log(JSON.stringify(trace));
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

function trimTracerJs(encoded: string): string {
  let code = Buffer.from(encoded, 'base64').toString('utf8');

  // https://github.com/stackup-wallet/stackup-bundler/blob/v0.6.32/pkg/tracer/load.go
  // comment regex from https://stackoverflow.com/a/59094308
  code = code.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|^\/\/.*/g,'');
  code = code.trim();
  code = code.replace(/^var tracer =/, '');
  code = code.replace(/;$/, '');
  code = code.replace(/\B\s+|\s+\B/g, '');
  return code;
}

// curl -sSL https://github.com/stackup-wallet/stackup-bundler/raw/v0.6.32/pkg/tracer/BundlerCollectorTracer.js | base64
const BundlerCollectorTracer = trimTracerJs(`
Ly8gVGhpcyBpcyB0aGUgc2FtZSBCdW5kbGVyQ29sbGVjdG9yVHJhY2VyIGZyb20gZ2l0aHViLmNvbS9ldGgtaW5maW5pdGlzbS9idW5kbGVyIHRyYW5zcGlsZWQgZG93biB0byBFUzUuCgp2YXIgdHJhY2VyID0gewogIG51bWJlckxldmVsczogW10sCiAgY3VycmVudExldmVsOiBudWxsLAogIGtlY2NhazogW10sCiAgY2FsbHM6IFtdLAogIGxvZ3M6IFtdLAogIGRlYnVnOiBbXSwKICBsYXN0T3A6ICIiLAogIG51bWJlckNvdW50ZXI6IDAsCgogIGZhdWx0OiBmdW5jdGlvbiBmYXVsdChsb2csIGRiKSB7CiAgICB0aGlzLmRlYnVnLnB1c2goCiAgICAgICJmYXVsdCBkZXB0aD0iICsKICAgICAgICBsb2cuZ2V0RGVwdGgoKSArCiAgICAgICAgIiBnYXM9IiArCiAgICAgICAgbG9nLmdldEdhcygpICsKICAgICAgICAiIGNvc3Q9IiArCiAgICAgICAgbG9nLmdldENvc3QoKSArCiAgICAgICAgIiBlcnI9IiArCiAgICAgICAgbG9nLmdldEVycm9yKCkKICAgICk7CiAgfSwKICByZXN1bHQ6IGZ1bmN0aW9uIHJlc3VsdChjdHgsIGRiKSB7CiAgICByZXR1cm4gewogICAgICBudW1iZXJMZXZlbHM6IHRoaXMubnVtYmVyTGV2ZWxzLAogICAgICBrZWNjYWs6IHRoaXMua2VjY2FrLAogICAgICBsb2dzOiB0aGlzLmxvZ3MsCiAgICAgIGNhbGxzOiB0aGlzLmNhbGxzLAogICAgICAvLyBmb3IgaW50ZXJuYWwgZGVidWdnaW5nLgogICAgICBkZWJ1ZzogdGhpcy5kZWJ1ZywKICAgIH07CiAgfSwKICBlbnRlcjogZnVuY3Rpb24gZW50ZXIoZnJhbWUpIHsKICAgIHRoaXMuZGVidWcucHVzaCgKICAgICAgImVudGVyIGdhcz0iICsKICAgICAgICBmcmFtZS5nZXRHYXMoKSArCiAgICAgICAgIiB0eXBlPSIgKwogICAgICAgIGZyYW1lLmdldFR5cGUoKSArCiAgICAgICAgIiB0bz0iICsKICAgICAgICB0b0hleChmcmFtZS5nZXRUbygpKSArCiAgICAgICAgIiBpbj0iICsKICAgICAgICB0b0hleChmcmFtZS5nZXRJbnB1dCgpKS5zbGljZSgwLCA1MDApCiAgICApOwogICAgdGhpcy5jYWxscy5wdXNoKHsKICAgICAgdHlwZTogZnJhbWUuZ2V0VHlwZSgpLAogICAgICBmcm9tOiB0b0hleChmcmFtZS5nZXRGcm9tKCkpLAogICAgICB0bzogdG9IZXgoZnJhbWUuZ2V0VG8oKSksCiAgICAgIG1ldGhvZDogdG9IZXgoZnJhbWUuZ2V0SW5wdXQoKSkuc2xpY2UoMCwgMTApLAogICAgICBnYXM6IGZyYW1lLmdldEdhcygpLAogICAgICB2YWx1ZTogZnJhbWUuZ2V0VmFsdWUoKSwKICAgIH0pOwogIH0sCiAgZXhpdDogZnVuY3Rpb24gZXhpdChmcmFtZSkgewogICAgdGhpcy5jYWxscy5wdXNoKHsKICAgICAgdHlwZTogZnJhbWUuZ2V0RXJyb3IoKSAhPSBudWxsID8gIlJFVkVSVCIgOiAiUkVUVVJOIiwKICAgICAgZ2FzVXNlZDogZnJhbWUuZ2V0R2FzVXNlZCgpLAogICAgICBkYXRhOiB0b0hleChmcmFtZS5nZXRPdXRwdXQoKSkuc2xpY2UoMCwgMTAwMCksCiAgICB9KTsKICB9LAoKICAvLyBpbmNyZW1lbnQgdGhlICJrZXkiIGluIHRoZSBsaXN0LiBpZiB0aGUga2V5IGlzIG5vdCBkZWZpbmVkIHlldCwgdGhlbiBzZXQgaXQgdG8gIjEiCiAgY291bnRTbG90OiBmdW5jdGlvbiBjb3VudFNsb3QobGlzdCwga2V5KSB7CiAgICBpZiAoIWxpc3Rba2V5XSkgbGlzdFtrZXldID0gMDsKICAgIGxpc3Rba2V5XSArPSAxOwogIH0sCiAgc3RlcDogZnVuY3Rpb24gc3RlcChsb2csIGRiKSB7CiAgICB2YXIgb3Bjb2RlID0gbG9nLm9wLnRvU3RyaW5nKCk7CiAgICAvLyB0aGlzLmRlYnVnLnB1c2godGhpcy5sYXN0T3AgKyAnLScgKyBvcGNvZGUgKyAnLScgKyBsb2cuZ2V0RGVwdGgoKSArICctJyArIGxvZy5nZXRHYXMoKSArICctJyArIGxvZy5nZXRDb3N0KCkpCiAgICBpZiAobG9nLmdldEdhcygpIDwgbG9nLmdldENvc3QoKSkgewogICAgICB0aGlzLmN1cnJlbnRMZXZlbC5vb2cgPSB0cnVlOwogICAgfQoKICAgIGlmIChvcGNvZGUgPT09ICJSRVZFUlQiIHx8IG9wY29kZSA9PT0gIlJFVFVSTiIpIHsKICAgICAgaWYgKGxvZy5nZXREZXB0aCgpID09PSAxKSB7CiAgICAgICAgLy8gZXhpdCgpIGlzIG5vdCBjYWxsZWQgb24gdG9wLWxldmVsIHJldHVybi9yZXZlcnQsIHNvIHdlIHJlY29uc3RydWN0IGl0CiAgICAgICAgLy8gZnJvbSBvcGNvZGUKICAgICAgICB2YXIgb2ZzID0gcGFyc2VJbnQobG9nLnN0YWNrLnBlZWsoMCkudG9TdHJpbmcoKSk7CiAgICAgICAgdmFyIGxlbiA9IHBhcnNlSW50KGxvZy5zdGFjay5wZWVrKDEpLnRvU3RyaW5nKCkpOwogICAgICAgIHZhciBkYXRhID0gdG9IZXgobG9nLm1lbW9yeS5zbGljZShvZnMsIG9mcyArIGxlbikpLnNsaWNlKDAsIDEwMDApOwogICAgICAgIHRoaXMuZGVidWcucHVzaChvcGNvZGUgKyAiICIgKyBkYXRhKTsKICAgICAgICB0aGlzLmNhbGxzLnB1c2goewogICAgICAgICAgdHlwZTogb3Bjb2RlLAogICAgICAgICAgZ2FzVXNlZDogMCwKICAgICAgICAgIGRhdGE6IGRhdGEsCiAgICAgICAgfSk7CiAgICAgIH0KICAgIH0KCiAgICBpZiAob3Bjb2RlLm1hdGNoKC9eKEVYVC4qfENBTEx8Q0FMTENPREV8REVMRUdBVEVDQUxMfFNUQVRJQ0NBTEwpJC8pICE9IG51bGwpIHsKICAgICAgLy8gdGhpcy5kZWJ1Zy5wdXNoKCdvcD0nICsgb3Bjb2RlICsgJyBsYXN0PScgKyB0aGlzLmxhc3RPcCArICcgc3RhY2tzaXplPScgKyBsb2cuc3RhY2subGVuZ3RoKCkpCiAgICAgIHZhciBpZHggPSBvcGNvZGUuc3RhcnRzV2l0aCgiRVhUIikgPyAwIDogMTsKICAgICAgdmFyIGFkZHIgPSB0b0FkZHJlc3MobG9nLnN0YWNrLnBlZWsoaWR4KS50b1N0cmluZygxNikpOwogICAgICB2YXIgYWRkckhleCA9IHRvSGV4KGFkZHIpOwogICAgICB2YXIgY29udHJhY3RTaXplID0KICAgICAgICAoY29udHJhY3RTaXplID0gdGhpcy5jdXJyZW50TGV2ZWwuY29udHJhY3RTaXplW2FkZHJIZXhdKSAhPT0gbnVsbCAmJgogICAgICAgIGNvbnRyYWN0U2l6ZSAhPT0gdm9pZCAwCiAgICAgICAgICA/IGNvbnRyYWN0U2l6ZQogICAgICAgICAgOiAwOwogICAgICBpZiAoY29udHJhY3RTaXplID09PSAwICYmICFpc1ByZWNvbXBpbGVkKGFkZHIpKSB7CiAgICAgICAgdGhpcy5jdXJyZW50TGV2ZWwuY29udHJhY3RTaXplW2FkZHJIZXhdID0gZGIuZ2V0Q29kZShhZGRyKS5sZW5ndGg7CiAgICAgIH0KICAgIH0KCiAgICBpZiAobG9nLmdldERlcHRoKCkgPT09IDEpIHsKICAgICAgLy8gTlVNQkVSIG9wY29kZSBhdCB0b3AgbGV2ZWwgc3BsaXQgbGV2ZWxzCiAgICAgIGlmIChvcGNvZGUgPT09ICJOVU1CRVIiKSB0aGlzLm51bWJlckNvdW50ZXIrKzsKICAgICAgaWYgKHRoaXMubnVtYmVyTGV2ZWxzW3RoaXMubnVtYmVyQ291bnRlcl0gPT0gbnVsbCkgewogICAgICAgIHRoaXMuY3VycmVudExldmVsID0gdGhpcy5udW1iZXJMZXZlbHNbdGhpcy5udW1iZXJDb3VudGVyXSA9IHsKICAgICAgICAgIGFjY2Vzczoge30sCiAgICAgICAgICBvcGNvZGVzOiB7fSwKICAgICAgICAgIGNvbnRyYWN0U2l6ZToge30sCiAgICAgICAgfTsKICAgICAgfQogICAgICB0aGlzLmxhc3RPcCA9ICIiOwogICAgICByZXR1cm47CiAgICB9CgogICAgaWYgKHRoaXMubGFzdE9wID09PSAiR0FTIiAmJiAhb3Bjb2RlLmluY2x1ZGVzKCJDQUxMIikpIHsKICAgICAgLy8gY291bnQgIkdBUyIgb3Bjb2RlIG9ubHkgaWYgbm90IGZvbGxvd2VkIGJ5ICJDQUxMIgogICAgICB0aGlzLmNvdW50U2xvdCh0aGlzLmN1cnJlbnRMZXZlbC5vcGNvZGVzLCAiR0FTIik7CiAgICB9CiAgICBpZiAob3Bjb2RlICE9PSAiR0FTIikgewogICAgICAvLyBpZ25vcmUgInVuaW1wb3J0YW50IiBvcGNvZGVzOgogICAgICBpZiAoCiAgICAgICAgb3Bjb2RlLm1hdGNoKAogICAgICAgICAgL14oRFVQXGQrfFBVU0hcZCt8U1dBUFxkK3xQT1B8QUREfFNVQnxNVUx8RElWfEVRfExURT98Uz9HVEU/fFNMVHxTSFtMUl18QU5EfE9SfE5PVHxJU1pFUk8pJC8KICAgICAgICApID09IG51bGwKICAgICAgKSB7CiAgICAgICAgdGhpcy5jb3VudFNsb3QodGhpcy5jdXJyZW50TGV2ZWwub3Bjb2Rlcywgb3Bjb2RlKTsKICAgICAgfQogICAgfQogICAgdGhpcy5sYXN0T3AgPSBvcGNvZGU7CgogICAgaWYgKG9wY29kZSA9PT0gIlNMT0FEIiB8fCBvcGNvZGUgPT09ICJTU1RPUkUiKSB7CiAgICAgIHZhciBzbG90ID0gbG9nLnN0YWNrLnBlZWsoMCkudG9TdHJpbmcoMTYpOwogICAgICB2YXIgX2FkZHIgPSB0b0hleChsb2cuY29udHJhY3QuZ2V0QWRkcmVzcygpKTsKICAgICAgdmFyIGFjY2VzcyA9IHZvaWQgMDsKICAgICAgaWYgKChhY2Nlc3MgPSB0aGlzLmN1cnJlbnRMZXZlbC5hY2Nlc3NbX2FkZHJdKSA9PSBudWxsKSB7CiAgICAgICAgdGhpcy5jdXJyZW50TGV2ZWwuYWNjZXNzW19hZGRyXSA9IGFjY2VzcyA9IHsKICAgICAgICAgIHJlYWRzOiB7fSwKICAgICAgICAgIHdyaXRlczoge30sCiAgICAgICAgfTsKICAgICAgfQogICAgICB0aGlzLmNvdW50U2xvdChvcGNvZGUgPT09ICJTTE9BRCIgPyBhY2Nlc3MucmVhZHMgOiBhY2Nlc3Mud3JpdGVzLCBzbG90KTsKICAgIH0KCiAgICBpZiAob3Bjb2RlID09PSAiS0VDQ0FLMjU2IikgewogICAgICAvLyBjb2xsZWN0IGtlY2NhayBvbiA2NC1ieXRlIGJsb2NrcwogICAgICB2YXIgX29mcyA9IHBhcnNlSW50KGxvZy5zdGFjay5wZWVrKDApLnRvU3RyaW5nKCkpOwogICAgICB2YXIgX2xlbiA9IHBhcnNlSW50KGxvZy5zdGFjay5wZWVrKDEpLnRvU3RyaW5nKCkpOwogICAgICAvLyBjdXJyZW50bHksIHNvbGlkaXR5IHVzZXMgb25seSAyLXdvcmQgKDYtYnl0ZSkgZm9yIGEga2V5LiB0aGlzIG1pZ2h0IGNoYW5nZS4uCiAgICAgIC8vIHN0aWxsLCBubyBuZWVkIHRvIHJldHVybiB0b28gbXVjaAogICAgICBpZiAoX2xlbiA+IDIwICYmIF9sZW4gPCA1MTIpIHsKICAgICAgICAvLyBpZiAobGVuID09IDY0KSB7CiAgICAgICAgdGhpcy5rZWNjYWsucHVzaCh0b0hleChsb2cubWVtb3J5LnNsaWNlKF9vZnMsIF9vZnMgKyBfbGVuKSkpOwogICAgICB9CiAgICB9IGVsc2UgaWYgKG9wY29kZS5zdGFydHNXaXRoKCJMT0ciKSkgewogICAgICB2YXIgY291bnQgPSBwYXJzZUludChvcGNvZGUuc3Vic3RyaW5nKDMpKTsKICAgICAgdmFyIF9vZnMyID0gcGFyc2VJbnQobG9nLnN0YWNrLnBlZWsoMCkudG9TdHJpbmcoKSk7CiAgICAgIHZhciBfbGVuMiA9IHBhcnNlSW50KGxvZy5zdGFjay5wZWVrKDEpLnRvU3RyaW5nKCkpOwogICAgICB2YXIgdG9waWNzID0gW107CiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykgewogICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcwogICAgICAgIHRvcGljcy5wdXNoKCIweCIgKyBsb2cuc3RhY2sucGVlaygyICsgaSkudG9TdHJpbmcoMTYpKTsKICAgICAgfQogICAgICB2YXIgX2RhdGEgPSB0b0hleChsb2cubWVtb3J5LnNsaWNlKF9vZnMyLCBfb2ZzMiArIF9sZW4yKSk7CiAgICAgIHRoaXMubG9ncy5wdXNoKHsKICAgICAgICB0b3BpY3M6IHRvcGljcywKICAgICAgICBkYXRhOiBfZGF0YSwKICAgICAgfSk7CiAgICB9CiAgfSwKfTsK
`);

// curl -sSL https://github.com/stackup-wallet/stackup-bundler/raw/v0.6.32/pkg/tracer/BundlerExecutionTracer.js | base64
const BundlerExecutionTracer = trimTracerJs(`
dmFyIHRyYWNlciA9IHsKICByZXZlcnRzOiBbXSwKICB2YWxpZGF0aW9uT09HOiBmYWxzZSwKICBleGVjdXRpb25PT0c6IGZhbHNlLAogIGV4ZWN1dGlvbkdhc0xpbWl0OiAwLAoKICBfZGVwdGg6IDAsCiAgX2V4ZWN1dGlvbkdhc1N0YWNrOiBbXSwKICBfZGVmYXVsdEdhc0l0ZW06IHsgdXNlZDogMCwgcmVxdWlyZWQ6IDAgfSwKICBfbWFya2VyOiAwLAogIF92YWxpZGF0aW9uTWFya2VyOiAxLAogIF9leGVjdXRpb25NYXJrZXI6IDMsCiAgX3VzZXJPcGVyYXRpb25FdmVudFRvcGljczA6CiAgICAiMHg0OTYyOGZkMTQ3MTAwNmMxNDgyZGE4ODAyOGU5Y2U0ZGJiMDgwYjgxNWM5YjAzNDRkMzllNWE4ZTZlYzE0MTlmIiwKCiAgX2lzVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkgewogICAgcmV0dXJuICgKICAgICAgdGhpcy5fbWFya2VyID49IHRoaXMuX3ZhbGlkYXRpb25NYXJrZXIgJiYKICAgICAgdGhpcy5fbWFya2VyIDwgdGhpcy5fZXhlY3V0aW9uTWFya2VyCiAgICApOwogIH0sCgogIF9pc0V4ZWN1dGlvbjogZnVuY3Rpb24gKCkgewogICAgcmV0dXJuIHRoaXMuX21hcmtlciA9PT0gdGhpcy5fZXhlY3V0aW9uTWFya2VyOwogIH0sCgogIF9pc1VzZXJPcGVyYXRpb25FdmVudDogZnVuY3Rpb24gKGxvZykgewogICAgdmFyIHRvcGljczAgPSAiMHgiICsgbG9nLnN0YWNrLnBlZWsoMikudG9TdHJpbmcoMTYpOwogICAgcmV0dXJuIHRvcGljczAgPT09IHRoaXMuX3VzZXJPcGVyYXRpb25FdmVudFRvcGljczA7CiAgfSwKCiAgX3NldFVzZXJPcGVyYXRpb25FdmVudDogZnVuY3Rpb24gKG9wY29kZSwgbG9nKSB7CiAgICB2YXIgY291bnQgPSBwYXJzZUludChvcGNvZGUuc3Vic3RyaW5nKDMpKTsKICAgIHZhciBvZnMgPSBwYXJzZUludChsb2cuc3RhY2sucGVlaygwKS50b1N0cmluZygpKTsKICAgIHZhciBsZW4gPSBwYXJzZUludChsb2cuc3RhY2sucGVlaygxKS50b1N0cmluZygpKTsKICAgIHZhciB0b3BpY3MgPSBbXTsKICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykgewogICAgICB0b3BpY3MucHVzaCgiMHgiICsgbG9nLnN0YWNrLnBlZWsoMiArIGkpLnRvU3RyaW5nKDE2KSk7CiAgICB9CiAgICB2YXIgZGF0YSA9IHRvSGV4KGxvZy5tZW1vcnkuc2xpY2Uob2ZzLCBvZnMgKyBsZW4pKTsKICAgIHRoaXMudXNlck9wZXJhdGlvbkV2ZW50ID0gewogICAgICB0b3BpY3M6IHRvcGljcywKICAgICAgZGF0YTogZGF0YSwKICAgIH07CiAgfSwKCiAgZmF1bHQ6IGZ1bmN0aW9uIGZhdWx0KGxvZywgZGIpIHt9LAogIHJlc3VsdDogZnVuY3Rpb24gcmVzdWx0KGN0eCwgZGIpIHsKICAgIHJldHVybiB7CiAgICAgIHJldmVydHM6IHRoaXMucmV2ZXJ0cywKICAgICAgdmFsaWRhdGlvbk9PRzogdGhpcy52YWxpZGF0aW9uT09HLAogICAgICBleGVjdXRpb25PT0c6IHRoaXMuZXhlY3V0aW9uT09HLAogICAgICBleGVjdXRpb25HYXNMaW1pdDogdGhpcy5leGVjdXRpb25HYXNMaW1pdCwKICAgICAgdXNlck9wZXJhdGlvbkV2ZW50OiB0aGlzLnVzZXJPcGVyYXRpb25FdmVudCwKICAgICAgb3V0cHV0OiB0b0hleChjdHgub3V0cHV0KSwKICAgICAgZXJyb3I6IGN0eC5lcnJvciwKICAgIH07CiAgfSwKCiAgZW50ZXI6IGZ1bmN0aW9uIGVudGVyKGZyYW1lKSB7CiAgICBpZiAodGhpcy5faXNFeGVjdXRpb24oKSkgewogICAgICB2YXIgbmV4dCA9IHRoaXMuX2RlcHRoICsgMTsKICAgICAgaWYgKHRoaXMuX2V4ZWN1dGlvbkdhc1N0YWNrW25leHRdID09PSB1bmRlZmluZWQpCiAgICAgICAgdGhpcy5fZXhlY3V0aW9uR2FzU3RhY2tbbmV4dF0gPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9kZWZhdWx0R2FzSXRlbSk7CiAgICB9CiAgfSwKICBleGl0OiBmdW5jdGlvbiBleGl0KGZyYW1lKSB7CiAgICBpZiAodGhpcy5faXNFeGVjdXRpb24oKSkgewogICAgICBpZiAoZnJhbWUuZ2V0RXJyb3IoKSAhPT0gdW5kZWZpbmVkKSB7CiAgICAgICAgdGhpcy5yZXZlcnRzLnB1c2godG9IZXgoZnJhbWUuZ2V0T3V0cHV0KCkpKTsKICAgICAgfQoKICAgICAgaWYgKHRoaXMuX2RlcHRoID49IDIpIHsKICAgICAgICAvLyBHZXQgdGhlIGZpbmFsIGdhcyBpdGVtIGZvciB0aGUgbmVzdGVkIGZyYW1lLgogICAgICAgIHZhciBuZXN0ZWQgPSBPYmplY3QuYXNzaWduKAogICAgICAgICAge30sCiAgICAgICAgICB0aGlzLl9leGVjdXRpb25HYXNTdGFja1t0aGlzLl9kZXB0aCArIDFdIHx8IHRoaXMuX2RlZmF1bHRHYXNJdGVtCiAgICAgICAgKTsKCiAgICAgICAgLy8gUmVzZXQgdGhlIG5lc3RlZCBnYXMgaXRlbSB0byBwcmV2ZW50IGRvdWJsZSBjb3VudGluZyBvbiByZS1lbnRyeS4KICAgICAgICB0aGlzLl9leGVjdXRpb25HYXNTdGFja1t0aGlzLl9kZXB0aCArIDFdID0gT2JqZWN0LmFzc2lnbigKICAgICAgICAgIHt9LAogICAgICAgICAgdGhpcy5fZGVmYXVsdEdhc0l0ZW0KICAgICAgICApOwoKICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSB0b3RhbCBnYXMgdXNlZCBieSBhbGwgZnJhbWVzIGF0IHRoaXMgZGVwdGguCiAgICAgICAgLy8gVGhpcyBkb2VzIG5vdCBhY2NvdW50IGZvciB0aGUgZ2FzIHJlcXVpcmVkIGR1ZSB0byB0aGUgNjMvNjQgcnVsZS4KICAgICAgICB2YXIgdXNlZCA9IGZyYW1lLmdldEdhc1VzZWQoKTsKICAgICAgICB0aGlzLl9leGVjdXRpb25HYXNTdGFja1t0aGlzLl9kZXB0aF0udXNlZCArPSB1c2VkOwoKICAgICAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSB0b3RhbCBnYXMgcmVxdWlyZWQgYnkgYWxsIGZyYW1lcyBhdCB0aGlzIGRlcHRoLgogICAgICAgIC8vIFRoaXMgYWNjb3VudHMgZm9yIGFkZGl0aW9uYWwgZ2FzIG5lZWRlZCBkdWUgdG8gdGhlIDYzLzY0IHJ1bGUuCiAgICAgICAgdGhpcy5fZXhlY3V0aW9uR2FzU3RhY2tbdGhpcy5fZGVwdGhdLnJlcXVpcmVkICs9CiAgICAgICAgICB1c2VkIC0gbmVzdGVkLnVzZWQgKyBNYXRoLmNlaWwoKG5lc3RlZC5yZXF1aXJlZCAqIDY0KSAvIDYzKTsKCiAgICAgICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgZmluYWwgZ2FzIGxpbWl0LgogICAgICAgIHRoaXMuZXhlY3V0aW9uR2FzTGltaXQgPSB0aGlzLl9leGVjdXRpb25HYXNTdGFja1t0aGlzLl9kZXB0aF0ucmVxdWlyZWQ7CiAgICAgIH0KICAgIH0KICB9LAoKICBzdGVwOiBmdW5jdGlvbiBzdGVwKGxvZywgZGIpIHsKICAgIHZhciBvcGNvZGUgPSBsb2cub3AudG9TdHJpbmcoKTsKICAgIHRoaXMuX2RlcHRoID0gbG9nLmdldERlcHRoKCk7CiAgICBpZiAodGhpcy5fZGVwdGggPT09IDEgJiYgb3Bjb2RlID09PSAiTlVNQkVSIikgdGhpcy5fbWFya2VyKys7CgogICAgaWYgKAogICAgICB0aGlzLl9kZXB0aCA8PSAyICYmCiAgICAgIG9wY29kZS5zdGFydHNXaXRoKCJMT0ciKSAmJgogICAgICB0aGlzLl9pc1VzZXJPcGVyYXRpb25FdmVudChsb2cpCiAgICApCiAgICAgIHRoaXMuX3NldFVzZXJPcGVyYXRpb25FdmVudChvcGNvZGUsIGxvZyk7CgogICAgaWYgKGxvZy5nZXRHYXMoKSA8IGxvZy5nZXRDb3N0KCkgJiYgdGhpcy5faXNWYWxpZGF0aW9uKCkpCiAgICAgIHRoaXMudmFsaWRhdGlvbk9PRyA9IHRydWU7CgogICAgaWYgKGxvZy5nZXRHYXMoKSA8IGxvZy5nZXRDb3N0KCkgJiYgdGhpcy5faXNFeGVjdXRpb24oKSkKICAgICAgdGhpcy5leGVjdXRpb25PT0cgPSB0cnVlOwogIH0sCn07Cg==
`);