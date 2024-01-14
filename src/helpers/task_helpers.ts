import type ethers from "ethers";
import _ from "lodash";
import "../type-extensions";

export class FromArgType {
  static validate(_argName: string, _argumentValue: any): void {
  }
  static parse(_argName: string, strValue: string): any {
    if (/^\d+$/.test(strValue)) {
      return _.toNumber(strValue);
    } else {
      return strValue;
    }
  }
}

export class AmountArgType {
  static validate(_argName: string, _argumentValue: any): void {
  }
  static parse(_argName: string, strValue: string): any {
    if (/^\d+$/.test(strValue)) {
      return _.toNumber(strValue);
    } else {
      return strValue;
    }
  }
}

export interface FuncTaskCommonArgs {
  name: string;
  func: string;
  args: string[];
  from: string;
  to?: string;
}

interface ResolvedFuncArgs {
  contract: ethers.Contract;
  sender: ethers.Signer;
  unsignedTx: any;
}

export async function resolveFuncArgs(taskArgs: FuncTaskCommonArgs): Promise<ResolvedFuncArgs> {
  const { name, func, args, from, to } = taskArgs;

  let contract: ethers.Contract;
  if (!to || to == "") { // 'to' address unspecified; lookup in deployments
    const deployment = await hre.deployments.get(name);
    contract = new hre.ethers.Contract(deployment.address, deployment.abi);
  } else { // 'to' address specified
    contract = await hre.ethers.getContractAt(name, to);
  }

  const sender = await hre.ethers.getSigner(from);

  try {
    const frag = contract.interface.getFunction(func);
    const adjustedArgs = adjustFuncArgsType(frag, args);

    const unsignedTx = await contract
      .connect(sender)
      .populateTransaction[func](...adjustedArgs);
    return { contract, sender, unsignedTx };
  } catch (e) {
    // Fall back to explicit function signature

    // build "function foo(uint a)" format
    let strFrag = func;
    if (!func.startsWith("function ")) {
      strFrag = "function " + strFrag;
    }
    if (!func.includes("(")) {
      strFrag = strFrag + "()" // heuristically append ()
    }

    const iface = new hre.ethers.utils.Interface([strFrag]); // improvised Interface with one function
    const fragName = _.keys(iface.functions)[0]; // compact "foo(uint)" format
    console.warn(`warn: function '${func}' not found in ${name}.. trying '${fragName}'`);

    const frag = iface.getFunction(fragName);
    const adjustedArgs = adjustFuncArgsType(frag, args);

    const data = iface.encodeFunctionData(func, adjustedArgs);
    const unsignedTx = {
      from: sender.address,
      to: contract.address,
      data: data,
    };
    return { contract, sender, unsignedTx };
  }
}

export function adjustFuncArgsType(frag: ethers.utils.FunctionFragment, args: any[]): any[] {
  if (frag.inputs.length != args.length) {
    throw new Error(`Argument count mismatch for ${frag.format()}: want ${frag.inputs.length}, have ${args.length}`);
  }

  for (let i = 0; i < args.length; i++) {
    const ty = frag.inputs[i];
    const arg = args[i];

    // If an array is expected, try to split argument using comma.
    if (ty.baseType == "array") {
      args[i] = _.split(arg, ",");
    }

    // If a bool is expected, try to interpret the input as bool.
    if (ty.baseType == "bool") {
      args[i] = parseBool(arg);
    }
  }

  return args;
}

function parseBool(arg: any): boolean {
  if (_.isNumber(arg)) {
    return !!arg;
  }
  if (_.isString(arg)) {
    // Explicit string "false" and "true"
    if (arg.toLowerCase() == "false") { return false; }
    if (arg.toLowerCase() == "true") { return true; }

    // Otherwise it must be a number
    return !!Number(arg);
  }
  throw new Error(`Argument not boolean: '${arg}'`);
}

export interface NormalizeOpts {
  raw?: boolean;
  dec?: boolean;
  eth?: boolean;
}

// Prettify function call result in array
export function normalizeCallResult(res: any, opts?: NormalizeOpts): any {
  if (_.isArray(res) && !_.isString(res)) {
    return _.map(res, (item) => normalizeCallResult(item, opts));
  } else {
    return normalizeItem(res, opts);
  }
}

// Prettify RPC call result such as eth_getTransactionReceipt
export function normalizeRpcResult(obj: any, opts?: NormalizeOpts) {
  return  _.mapValues(obj, (val) => normalizeItem(val, opts));
}

function normalizeItem(item: any, opts?: NormalizeOpts): any {
  if (item?.constructor.name == "BigNumber" || _.isNumber(item)) {
    const num = hre.ethers.BigNumber.from(item);
    if (opts?.dec) {
      return num.toString();
    } else if (opts?.eth) {
      return hre.ethers.utils.formatEther(num);
    } else {
      return num.toHexString();
    }
  } else {
    return item;
  }
}
