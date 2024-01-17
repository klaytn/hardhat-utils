import { task } from "hardhat/config";
import { Log } from "@ethersproject/abstract-provider";
import _ from "lodash";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult, traceCall, formatTrace } from "../helpers";
import "../type-extensions";

export const TASK_TRACECALL = "tracecall";

task(TASK_TRACECALL, "debug_traceCall a transaction")
  .addOptionalParam("from", "Caller address or index", 0, FromArgType)
  .addOptionalParam("to", "Target address. Loaded from deployments if empty.", "")
  .addOptionalParam("tracer", "tracer type (call,revert,struct,stackup,stackupcol,stackupexe)", "call")
  .addOptionalParam("limit", "(only if --tracer struct) maximum number of opcodes", "")
  .addOptionalParam("timeout", "trace timeout in Go duration format", "5s")
  .addOptionalParam("block", "block number to run the trace on", "latest")
  .addFlag("json", "Print raw trace in json")
  .addFlag("withContext", "(only if --json --tracer struct) include memory, stack, storage")
  .addPositionalParam("name", "Contract name (example: 'Counter', 'src/Lock.sol:Lock')")
  .addPositionalParam("func", "Function name or signature (example: 'number()', 'balanceOf(address)')")
  .addVariadicPositionalParam("args", "call arguments", [])
  .setAction(async (taskArgs) => {
    const { tracer, block, json } = taskArgs;
    const { unsignedTx } = await resolveFuncArgs(taskArgs);

    const trace = await traceCall(unsignedTx, block, taskArgs);
  
    if (json) {
      console.log(JSON.stringify(trace, null, 2));
    } else {
      formatTrace(trace, tracer);
    }
  });
