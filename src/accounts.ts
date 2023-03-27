import type ethers from "ethers"
import fs from "fs";
import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";
import readlineSync from "readline-sync";

import { FromArgType, PluginError } from "./helpers";
import "./type-extensions";

export const TASK_ACCOUNTS = "accounts";
export const TASK_FAUCET = "faucet";
export const TASK_KEYSTORE_DECRYPT = "keystore-decrypt";
export const TASK_KEYSTORE_ENCRYPT = "keystore-encrypt";
export const TASK_KEYSTORE_KIP3 = "keystore-kip3";
export const TASK_MNEMONIC = "mnemonic";

const hardhatNetworkMnemonic = "test test test test test test test test test test test junk";

task(TASK_ACCOUNTS, "Get infromation about active accounts")
  .addOptionalParam("from", "Caller address or index", "", FromArgType)
  .addFlag("json", "Print output in json")
  .setAction(async (taskArgs) => {
    const { from, json } = taskArgs;

    let signers: ethers.Signer[];
    if (from == "") {
      signers = await hre.ethers.getSigners();
    } else {
      signers = [await hre.ethers.getSigner(from)];
    }

    const out = [];
    for (const signer of signers) {
      const address = await signer.getAddress();
      const balance = hre.ethers.utils.formatEther(
        await hre.ethers.provider.getBalance(address)
      );
      out.push({ address, balance });
    }

    if (json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      out.forEach((info) => {
        console.log(info.address, info.balance);
      });
    }
  });

task(TASK_FAUCET, "Send some coins to other accounts")
  .addOptionalParam("from", "Sender address or index", 0, FromArgType)
  .addOptionalParam("to", "A comma-separated string of recipient addresses and indices. By default all signers", "")
  .addOptionalParam("amount", "Amount of coins to send in ETH", "1")
  .setAction(async (taskArgs) => {
    const { from, to, amount } = taskArgs;

    const sender = await hre.ethers.getSigner(from);
    const value = hre.ethers.utils.parseEther(amount);

    const recipients: string[] = [];
    if (to == "") {
      const allSigners = await hre.ethers.getSigners();
      for (const signer of allSigners) {
        recipients.push(await signer.getAddress());
      }
    } else {
      for (const token of _.split(to, ",")) {
        if (hre.ethers.utils.isAddress(token)) { // address
          recipients.push(token);
        } else if (/^\d+$/.test(token)) { // index
          const signer = await hre.ethers.getSigner(_.toNumber(token) as any);
          recipients.push(await signer.getAddress());
        } else {
          throw PluginError(`Not an address or index: ${token}`);
        }
      }
    }

    console.log(`Send from ${sender.address} to ${recipients.length} accounts ${amount} ETH each`);

    const txs = [];
    for (const recipient of recipients) {
      const tx = await sender.sendTransaction({
        to: recipient,
        value: value
      });
      txs.push(tx.wait());
    }

    const rcs = await Promise.all(txs);
    for (const rc of rcs) {
      console.log(`to ${rc.to} txid ${rc.transactionHash}`);
    }
  });

task(TASK_KEYSTORE_DECRYPT, "Decrypt a keystore.json and print the private key")
  .addPositionalParam("file", "Keystore file")
  .addOptionalParam("password", "Keystore password", undefined)
  .setAction(async (taskArgs) => {
    let { file, password } = taskArgs;

    let keystore = JSON.parse(fs.readFileSync(file).toString())
    if (keystore.version == 4) {
      keystore = convertKeystoreV4(keystore)
    }

    if (password === undefined) {
      password = readlineSync.question("Keystore password: ", { hideEchoBack: true });
    }
    let keystoreStr = JSON.stringify(keystore)
    let wallet = hre.ethers.Wallet.fromEncryptedJsonSync(keystoreStr, password)
    console.log(wallet.address, wallet.privateKey);
  });

task(TASK_KEYSTORE_ENCRYPT, "Encrypt a private into a keystore.json")
  .addOptionalPositionalParam("priv", "Private key", undefined)
  .addOptionalParam("password", "Keystore password", undefined)
  .setAction(async (taskArgs) => {
    let { priv, password } = taskArgs;

    if (priv == undefined) {
      priv = readlineSync.question("Private key: ", { hideEchoBack: true });
    }
    if (password === undefined) {
      password = readlineSync.question("Keystore password: ", { hideEchoBack: true });
    }

    const wallet = new hre.ethers.Wallet(priv);
    const keystore = await wallet.encrypt(password);
    console.log(keystore);
  });

task(TASK_KEYSTORE_KIP3, "Convert KIP-3 keystore v4 into keystore v3")
  .addPositionalParam("input", "Input v4 file")
  .addOptionalPositionalParam("output", "Output file. If omitted, printed to stdout", undefined)
  .addFlag("silent", "Silently exit on error")
  .setAction(async (taskArgs) => {
    const { input, output, silent } = taskArgs;

    let keystore: any;
    try {
      keystore = JSON.parse(fs.readFileSync(input).toString())
      if (!isKeystore(keystore)) {
        throw new Error(`Not a keystore: ${input}`);
      }
    } catch (e) {
      if (silent) {
        return;
      } else {
        throw e;
      }
    }

    if (keystore.version == 4) {
      keystore = convertKeystoreV4(keystore)
    }

    const keystoreStr = JSON.stringify(keystore);
    if (output == undefined) {
      console.log(keystoreStr);
    } else {
      fs.writeFileSync(output, keystoreStr);
    }
  });

task(TASK_MNEMONIC, "Derive accounts from BIP-39 mnemonic")
  .addPositionalParam("words", "Mnemonic words", hardhatNetworkMnemonic)
  .addOptionalParam("path", "Derivation path", "m/44'/60'/0'/0/")
  .addOptionalParam("index", "A comma-separated string of indices or index ranges", "0-9")
  .setAction(async (taskArgs) => {
    const { words, path, index } = taskArgs;

    const indexRe = /^\d+$/;
    const rangeRe = /^(\d+)-(\d+)$/;
    let indices: number[] = [];
    for (let token of _.split(index, ',')) {
      token = _.trim(token);

      let match = token.match(indexRe);
      if (match) {
        indices.push(parseInt(match[0]));
        continue;
      }

      match = token.match(rangeRe)
      if (match) {
        let lo = parseInt(match[1]);
        let hi = parseInt(match[2]);
        if (lo > hi) {
          [ hi, lo ] = [ lo, hi ];
        }
        indices = _.concat(indices, _.range(lo, hi + 1));
      }
    }

    indices = _.sortedUniq(_.sortBy(indices));

    for (const i of indices) {
      const subpath = _path.join(path, i.toString());
      const wallet = hre.ethers.Wallet.fromMnemonic(words, subpath);
      console.log(i, wallet.address, wallet.privateKey);
    }
  });

// Heuristically detect keystore v3 or v4
function isKeystore(keystore: any): boolean {
  const uuidRe = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
  if (!uuidRe.test(keystore?.id)) {
    return false;
  }
  if (!_.isNumber(keystore?.version)) {
    return false;
  }

  if (keystore.version == 3 && keystore.crypto) {
    return true;
  } else if (keystore.version == 4 && keystore.keyring) {
    return true;
  } else {
    return false;
  }
}

// Convert KIP-3 (V4) keystore to the standard V3
// See https://kips.klaytn.foundation/KIPs/kip-3
function convertKeystoreV4(keystore: any): any {
  let keyring = keystore.keyring
  let crypto
  if (_.isArray(keyring[0])) {
    crypto = keyring[0][0]
  } else {
    crypto = keyring[0]
  }

  keystore.crypto = crypto
  keystore.version = 3
  delete keystore.keyring
  return keystore
}
