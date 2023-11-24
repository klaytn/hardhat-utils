import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";

import "../type-extensions";

export const TASK_MNEMONIC = "mnemonic";
export const defaultMnemonic = "test test test test test test test test test test test junk";

task(TASK_MNEMONIC, "Derive accounts from BIP-39 mnemonic")
  .addPositionalParam("words", "Mnemonic words", defaultMnemonic)
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