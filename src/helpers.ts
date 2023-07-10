import type ethers from "ethers";
import child_process from "child_process";
import fs from "fs";
import { HardhatPluginError } from "hardhat/plugins";
import _ from "lodash";
import { normalizeHardhatNetworkAccountsConfig } from "hardhat/internal/core/providers/util";
import { HardhatNetworkAccountConfig, HardhatNetworkHDAccountsConfig } from "hardhat/types";

import "./type-extensions";

export class FromArgType {
  static validate(argName: string, argumentValue: any): void {
  }
  static parse(argName: string, strValue: string): any {
    if (/^\d+$/.test(strValue)) {
      return _.toNumber(strValue);
    } else {
      return strValue;
    }
  }
}

export class AmountArgType {
  static validate(argName: string, argumentValue: any): void {
  }
  static parse(argName: string, strValue: string): any {
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
  _.forOwn(obj, (val, key) => {
    obj[key] = normalizeItem(obj[key], opts);
  });
  return obj;
}

export function PluginError(message: string, parent?: Error | undefined): Error {
  return new HardhatPluginError("hardhat-utils", message, parent)
}

export async function sleep(msec: number) {
  await new Promise(resolve => setTimeout(resolve, msec));
}

export function isFilePath(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function isDevDependency(path: string): boolean {
  return _.startsWith(path, "lib/forge-std/") ||
         _.startsWith(path, "hardhat/");
}

export async function currentNetworkEIP3085(): Promise<any> {
  const ethersNet = await hre.ethers.provider.getNetwork();
  const chainId = ethersNet.chainId;
  const url = hre.ethers.provider.connection.url;

  const param = { // https://eips.ethereum.org/EIPS/eip-3085
    chainId: '0x' + chainId.toString(16),
    chainName: 'hardhat:' + hre.network.name,
    rpcUrls: [url],
  }
  return param;
}

// Maps address => privateKey
let knownWallets: { [key: string]: string } = {};

function createWallet(privateKey: string): ethers.Wallet {
  return new hre.ethers.Wallet(privateKey);
}

export async function getWallet(address: string): Promise<ethers.Wallet> {
  if (_.isEmpty(knownWallets)) {
    // Load accounts
    let wallets = await getWallets();
    _.forEach(wallets, (wallet) => {
      knownWallets[wallet.address] = wallet.privateKey;
    });
  }
  return createWallet(knownWallets[address]);
}

export async function getWallets(): Promise<ethers.Wallet[]> {
  // hre.network.config.accounts can be one of:
  // - HardhatNetworkAccountsConfig =
  //   | HardhatNetworkHDAccountsConfig  -- (1)
  //   | HardhatNetworkAccountConfig[]   -- (2)
  // - HttpNetworkAccountsConfig
  //   | "remote"                        -- (3)
  //   | string[]                        -- (4)
  //   | HttpNetworkHDAccountsConfig     -- (5)
  // See https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-core/src/types/config.ts
  let accountsConfig = hre.network.config.accounts;
  if (accountsConfig == "remote") { // (3)
    throw PluginError(`Cannot create Wallets for 'remote' accounts of the network '${hre.network.name}'`);
  } else if (_.isArray(accountsConfig)) {
    if (accountsConfig.length == 0) {
      return [];
    } else if (_.isString(accountsConfig[0])) { // (4)
      let array = accountsConfig as string[];
      return _.map(array, (elem) => createWallet(elem));
    } else { // (2)
      let array = accountsConfig as HardhatNetworkAccountConfig[];
      return _.map(array, (elem) => createWallet(elem.privateKey));
    }
  } else {
    let hdconfig = accountsConfig as HardhatNetworkHDAccountsConfig; // (1) and (5)
    let normalized = normalizeHardhatNetworkAccountsConfig(hdconfig);
    return _.map(normalized, (elem) => createWallet(elem.privateKey));
  }
}

let dockerComposePath: string | null = null;

// Find docker compose command, if not set.
// Prefers 'docker compose' (V2) over 'docker-compose' (V1)
// see https://docs.docker.com/compose/migrate/ for the difference.
function findDockerCompose(): string {
  if (dockerComposePath) {
    return dockerComposePath;
  }

  try {
    child_process.execSync("docker compose version", {stdio: 'pipe'});
    dockerComposePath = "docker compose";
    return dockerComposePath;
  } catch (e) {
  }

  try {
    child_process.execSync("docker-compose --version", {stdio: 'pipe'});
    dockerComposePath = "docker-compose";
    return dockerComposePath;
  } catch (e) {
  }

  throw new Error("docker compose not installed. Follow https://docs.docker.com/compose/install/");
}

export function runDockerCompose(args: string, opts: any = {}) {
  let dockerCompose = findDockerCompose();
  let cmd = `${dockerCompose} --ansi never ${args}`
  opts.stdio = 'inherit';
  child_process.execSync(cmd, opts);
}
