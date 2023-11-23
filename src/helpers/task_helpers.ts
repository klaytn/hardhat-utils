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
  to: string;
}

interface ResolvedFuncArgs {
  contract: ethers.Contract;
  sender: ethers.Signer;
  unsignedTx: any;
}

export async function resolveFuncArgs(taskArgs: FuncTaskCommonArgs): Promise<ResolvedFuncArgs> {
  const { name, func, args, from, to } = taskArgs;

  let contract: ethers.Contract;
  if (to == "") {
    const deployment = await hre.deployments.get(name);
    contract = new hre.ethers.Contract(deployment.address, deployment.abi);
  } else {
    contract = await hre.ethers.getContractAt(name, to);
  }

  const sender = await hre.ethers.getSigner(from);
  //console.log(await sender.getAddress());

  const unsignedTx = await contract
    .connect(sender)
    .populateTransaction[func](...args);
  //console.log(utx);

  return { contract, sender, unsignedTx };
}

export interface NormalizeOpts {
  dec: boolean;
}

function normalizeItem(item: any, opts?: NormalizeOpts): any {
  if (item?.constructor.name == "BigNumber") {
    if (opts?.dec) {
      return item.toString();
    } else {
      return item.toHexString();
    }
  } else if (_.isNumber(item)) {
    if (opts?.dec) {
      return item.toString();
    } else {
      return "0x" + item.toString(16);
    }
  } else {
    return item;
  }
}

export function normalizeCallResult(res: any, opts?: NormalizeOpts): any {
  if (_.isArray(res)) {
    let out = new Array(res.length);
    for (var i = 0; i < res.length; i++) {
      out[i] = normalizeItem(res[i], opts);
    }
    return out;
  } else {
    return normalizeItem(res, opts);
  }
}

export function normalizeRpcResult(obj: any, opts?: NormalizeOpts) {
  _.forOwn(obj, (_val, key) => {
    obj[key] = normalizeItem(obj[key], opts);
  });
  return obj;
}
