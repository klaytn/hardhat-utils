import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";

import { deriveAccounts, defaultMnemonic, defaultDerivationPath } from "../helpers";
import "../type-extensions";

export const TASK_MNEMONIC = "mnemonic";

task(TASK_MNEMONIC, "Derive accounts from BIP-39 mnemonic")
  .addPositionalParam("words", "Mnemonic words", defaultMnemonic)
  .addOptionalParam("path", "Derivation path", defaultDerivationPath)
  .addOptionalParam("count", "Number of accounts to derive", "10")
  .setAction(async (taskArgs) => {
    const { words, path, count } = taskArgs;

    const wallets = deriveAccounts({
      mnemonic: words,
      path: path,
      count: parseInt(count),
    });

    console.log("    address                                    private key");
    _.forEach(wallets, (wallet, idx) => {
      console.log(idx.toString().padStart(3, ' '), wallet.address, _.trimStart(wallet.privateKey, "0x"));
    });
  });