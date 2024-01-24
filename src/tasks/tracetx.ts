import { task } from "hardhat/config";
import { Log } from "@ethersproject/abstract-provider";
import _ from "lodash";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult, formatTrace, traceTx } from "../helpers";
import "../type-extensions";

export const TASK_TRACETX = "tracetx";

task(TASK_TRACETX, "debug_traceTransaction a transaction")
  .addOptionalParam("tracer", "tracer type (call,revert,struct,stackupcol,stackupexe)", "call")
  .addOptionalParam("limit", "(only if --tracer struct) maximum number of opcodes", "")
  .addOptionalParam("timeout", "trace timeout in Go duration format", "5s")
  .addFlag("json", "Print raw trace in json")
  .addFlag("withContext", "(only if --json --tracer struct) include memory, stack, storage")
  .addPositionalParam("txid", "transaction hash")
  .setAction(async (taskArgs) => {
    const { tracer, json, txid } = taskArgs;

    const trace = await traceTx(txid, taskArgs);
  
    if (json) {
      console.log(JSON.stringify(trace, null, 2));
    } else {
      formatTrace(trace, tracer);
    }
  });
