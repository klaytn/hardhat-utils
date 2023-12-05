import { task } from "hardhat/config";
import _ from "lodash";
import { PluginError, URL_4bytes, URL_sigdb, getArtifact, getArtifactNames, make4bytesPostData, makeSigdbPostData } from "../helpers";

import "../type-extensions";

export const TASK_UPLOAD_ABI = "upload-abi";

task(TASK_UPLOAD_ABI, "Upload function and event signatures")
  .addFlag("byte4", "Upload to https://www.4byte.directory/")
  .addFlag("sigdb", "Upload to https://openchain.xyz/signatures")
  .addPositionalParam("name", "Contract name (leave empty to use all contracts)", "")
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
    for (const name of names) {
      const { abi } = await getArtifact(name);
      for (const frag of abi) {
        if (frag.type == 'function' || frag.type == 'event') {
          abis.push(frag);
        }
      }
    }
    console.log(`Uploading ${abis.length} function and event signatures..`);

    if (byte4) {
      await doPost(URL_4bytes, make4bytesPostData(abis));
    }
    if (sigdb) {
      await doPost(URL_sigdb, makeSigdbPostData(abis));
    }
  });

async function doPost(url: string, data: any) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  console.log(`POST ${url} ${resp.status} ${resp.statusText}`);
  try {
    console.log(JSON.stringify(await resp.json(), null, 2));
  } catch {
    console.log(await resp.text());
  }
}