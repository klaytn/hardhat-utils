import { Wallet } from "ethers";
import { HardhatNetworkHDAccountsConfig } from "hardhat/types";
import _ from "lodash";
import path from "path";

export const defaultMnemonic = "test test test test test test test test test test test junk";
export const defaultDerivationPath = "m/44'/60'/0'/0/";

export interface DeriveAccountsConfig {
  mnemonic?: string;
  path?: string;
  initialIndex?: number;
  count?: number;
}

export function deriveAccounts(config: DeriveAccountsConfig): Wallet[] {
  config.mnemonic ??= defaultMnemonic;
  config.path ??= defaultDerivationPath;
  config.initialIndex ??= 0;
  config.count ??= 10;

  const range = _.range(config.initialIndex, config.initialIndex + config.count);
  return _.map(range, (i) => {
    const subpath = path.join(config.path!, i.toString());
    return Wallet.fromMnemonic(config.mnemonic!, subpath);
  });
}