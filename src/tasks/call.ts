import { task } from "hardhat/config";
import _ from "lodash";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult } from "../helpers";
import "../type-extensions";

export const TASK_CALL = "call";

task(TASK_CALL, "Call a read-only function to a contract")
  .addOptionalParam("from", "Caller address or index", 0, FromArgType)
  .addOptionalParam("to", "Target address. Loaded from deployments if empty.", "")
  .addFlag("raw", "Print output in raw binary")
  .addFlag("dec", "Print numbers in decimal (default is hex)")
  .addFlag("eth", "Print numbers in eth (i.e. 18 decimals) (default is hex)")
  .addPositionalParam("name", "Contract name (example: 'Counter', 'src/Lock.sol:Lock')")
  .addPositionalParam("func", "Function name or signature (example: 'number()', 'balanceOf(address)')")
  .addVariadicPositionalParam("args", "call arguments", [])
  .setAction(async (taskArgs) => {
    const { func, raw, dec, eth } = taskArgs;
    const { contract, sender, unsignedTx } = await resolveFuncArgs(taskArgs);

    const output = await sender.call(unsignedTx);
    if (raw) {
      console.log(output);
    } else {
      const decoded = contract.interface.decodeFunctionResult(func, output);
      const normalized = normalizeCallResult(decoded, { dec, eth });
      console.log(JSON.stringify(normalized, null, 2));
    }
  });
