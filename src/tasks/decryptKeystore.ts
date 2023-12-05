import fs from "fs";
import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";
import readlineSync from "readline-sync";
import { isKIP3Json, splitKeystoreKIP3 } from "@klaytn/js-ext-core";

import "../type-extensions";

export const TASK_DECRYPT_KEYSTORE = "decrypt-keystore";

task(TASK_DECRYPT_KEYSTORE, "Decrypt a keystore.json and print the private key")
  .addPositionalParam("file", "Keystore file")
  .addOptionalParam("password", "Keystore password", undefined)
  .addFlag("json", "Print output in json")
  .setAction(async (taskArgs) => {
    let { file, password, json } = taskArgs;

    const keystore = fs.readFileSync(file).toString();
    let keystores: string[];
    if (isKIP3Json(keystore)) {
      keystores = splitKeystoreKIP3(keystore);
    } else {
      keystores = [keystore];
    }

    if (password === undefined) {
      password = readlineSync.question("Keystore password: ", { hideEchoBack: true });
    }

    const wallets = keystores.map((keystore) => {
      return hre.ethers.Wallet.fromEncryptedJsonSync(keystore, password);
    });

    if (json) {
      const combined = wallets.map((wallet) => {
        return { address: wallet.address, privateKey: wallet.privateKey };
      });
      console.log(JSON.stringify(combined, null, 2));
    } else {
      console.log("    address                                    private key");
      wallets.forEach((wallet, idx) => {
        console.log(idx.toString().padStart(3, ' '), wallet.address,wallet.privateKey.substring(2));
      });
    }
  });
