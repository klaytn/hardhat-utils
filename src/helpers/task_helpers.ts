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
  if (!to || to == "") {
    const deployment = await hre.deployments.get(name);
    contract = new hre.ethers.Contract(deployment.address, deployment.abi);
  } else {
    contract = await hre.ethers.getContractAt(name, to);
  }

  const sender = await hre.ethers.getSigner(from);

  const unsignedTx = await contract
    .connect(sender)
    .populateTransaction[func](...args);

  return { contract, sender, unsignedTx };
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
