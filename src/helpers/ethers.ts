import { ethers } from "ethers5";
import _ from "lodash";
import { PluginError } from "./misc";
import { HardhatNetworkAccountConfig, HardhatNetworkHDAccountsConfig } from "hardhat/types";
import { normalizeHardhatNetworkAccountsConfig } from "hardhat/internal/core/providers/util";

// propOverrideProxyHandler is an ES6 ProxyHandler that addsa several readonly properties.
//
// See https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-ethers/src/internal/index.ts
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
// See node_modules/typescript/lib/lib.es2015.proxy.d.ts
type propOverrides = {[prop: PropertyKey]: any };

class propOverrideProxyHandler implements ProxyHandler<any> {
  overrides: propOverrides;

  constructor(overrides: propOverrides) {
    this.overrides = overrides;
  }

  get(target: any, prop: PropertyKey, receiver: any) {
    if (_.has(this.overrides, prop)) {
      return this.overrides[prop];
    }
    return Reflect.get(target, prop, receiver);
  }

  getOwnPropertyDescriptor(target: any, prop: PropertyKey) {
    if (_.has(this.overrides, prop)) {
      return {
        enumerable: true,
        writable: false,
        value: this.overrides[prop]
      };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }

  has(target: any, prop: PropertyKey) {
    if (_.has(this.overrides, prop)) {
      return true;
    }
    return Reflect.has(target, prop);
  }

  ownKeys(target: any): any[] {
    let keys = Reflect.ownKeys(target);
    return _.concat(keys, _.keys(this.overrides));
  }
}

export const extendHardhatEthers: ProxyHandler<any> = new propOverrideProxyHandler({
  "getWallet": getWallet,
  "getWallets": getWallets,
});

// Maps address => privateKey
let knownWallets: { [key: string]: string } = {};

function createWallet(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey);
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
