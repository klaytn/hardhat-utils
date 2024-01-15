import { task } from "hardhat/config";
import { Log } from "@ethersproject/abstract-provider";
import _ from "lodash";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult, formatTrace, traceTx } from "../helpers";
import "../type-extensions";

export const TASK_TRACETX = "tracetx";

task(TASK_TRACETX, "debug_traceTransaction a transaction")
  .addOptionalParam("tracer", "tracer type (call,revert,struct,stackup) (default: call)", "")
  .addFlag("json", "Print raw trace in json")
  .addPositionalParam("txid", "transaction hash")
  .setAction(async (taskArgs) => {
    const { tracer, json, txid } = taskArgs;

    const trace = await traceTx(txid, tracer);
  
    if (json) {
      console.log(JSON.stringify(trace, null, 2));
    } else {
      formatTrace(trace, tracer);
    }
  });
