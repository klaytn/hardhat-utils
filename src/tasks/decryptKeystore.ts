import fs from "fs";
import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";
import readlineSync from "readline-sync";

import "../type-extensions";

export const TASK_DECRYPT_KEYSTORE = "decrypt-keystore";

task(TASK_DECRYPT_KEYSTORE, "Decrypt a keystore.json and print the private key")
  .addPositionalParam("file", "Keystore file")
  .addOptionalParam("password", "Keystore password", undefined)
  .setAction(async (taskArgs) => {
    let { file, password } = taskArgs;

    // TODO: use @klaytn/ethers-ext:decryptKeystoreList
    let keystore = JSON.parse(fs.readFileSync(file).toString());
    if (password === undefined) {
      password = readlineSync.question("Keystore password: ", { hideEchoBack: true });
    }
    let keystoreStr = JSON.stringify(keystore)
    let wallet = hre.ethers.Wallet.fromEncryptedJsonSync(keystoreStr, password)
    console.log(wallet.address, wallet.privateKey);
  });
