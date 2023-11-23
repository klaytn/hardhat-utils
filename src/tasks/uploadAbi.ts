import axios from "axios";
import { task } from "hardhat/config";
import _ from "lodash";
import { PluginError, getArtifactNames } from "../helpers";

import "../type-extensions";

export const TASK_UPLOAD_ABI = "upload-abi";

task(TASK_UPLOAD_ABI, "Upload function and event signatures")
  .addFlag("byte4", "Upload to https://www.4byte.directory/")
  .addFlag("sigdb", "Upload to https://openchain.xyz/signatures")
  .addPositionalParam("name", "Contract name (all contracts if empty)", "")
  .setAction(async (taskArgs) => {
    const { byte4, sigdb, name } = taskArgs;
    if (!_.some([byte4, sigdb])) {
      throw PluginError("No site selected (example: --byte4 --sigdb)");
    }

    let names: string[];
    if (name == "") {
      names = await getArtifactNames();
    } else {
      names = [ name ];
    }

    const abis = [];
    for (const n of names) {
      const { abi } = hre.artifacts.readArtifactSync(n);
      for (const frag of abi) {
        if (frag.type == 'function' || frag.type == 'event') {
          abis.push(frag);
        }
      }
    }
    console.log(`Uploading ${abis.length} function and event signatures..`);

    if (byte4) {
      console.log(await upload4bytes(abis));
    }
    if (sigdb) {
      console.log(await uploadSigdb(abis));
    }
  });

// https://www.4byte.directory/docs/
const URL_4bytes = "https://www.4byte.directory/api/v1/import-abi/";
async function upload4bytes(abis: any[]): Promise<any> {
  console.log(`..to ${URL_4bytes}`);
  const data = { contract_abi: JSON.stringify(abis) };
  const res = await axios.post(URL_4bytes, data);
  return JSON.stringify(res.data, null, 2);
}

// https://docs.openchain.xyz/
const URL_sigdb = "https://api.openchain.xyz/signature-database/v1/import";
async function uploadSigdb(abis: any[]): Promise<any> {
  console.log(`..to ${URL_sigdb}`);
  const formats = hre.ethers.utils.FormatTypes;

  const functions: string[] = [];
  const events: string[] = [];
  for (const frag of abis) {
    if (frag.type == 'function') {
      const ffrag = hre.ethers.utils.FunctionFragment.fromObject(frag);
      functions.push(ffrag.format(formats.sighash));
    }
    if (frag.type == 'event') {
      const efrag = hre.ethers.utils.EventFragment.fromObject(frag);
      events.push(efrag.format(formats.sighash));
    }
  }
  const data = {
    'function': _.uniq(functions),
    'event': _.uniq(events)
  };

  const res = await axios.post(URL_sigdb, data);
  return JSON.stringify(res.data, null, 2);
}
