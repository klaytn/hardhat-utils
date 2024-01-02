import _ from "lodash";
import path from "path";
import process from "process";
import { task } from "hardhat/config";
import { deriveAccounts, networkRpcUrlFromDocker, runDockerCompose } from "../helpers";

export const TASK_BUNDLER = "aa-bundler";

task(TASK_BUNDLER, "Launch local Klaytn bundler")
  .addOptionalParam("host", "HTTP JSON-RPC hostname", "0.0.0.0")
  .addOptionalParam("port", "HTTP JSON-RPC port", "4337")
  .addFlag("attachRemote", "Allow attach to remote RPC endpoint (may incur costs)")
  .addOptionalParam("dockerImageId", "Docker image id", "stackupwallet/stackup-bundler:latest")
  .addOptionalParam("entrypoints", "Comma-separated list of EntryPoint addresses", "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")
  .addOptionalParam("mnemonic", "Bundler account mnemonic", "test test test test test test test test test test test junk")
  .addOptionalParam("derivationPath", "Bundler account derivation path", "m/44'/60'/0'/0/")
  .addOptionalParam("index", "Bundler account index under the derivation path", "0")
  .setAction(async (taskArgs) => {
    const { host, port, dockerImageId, attachRemote, entrypoints, mnemonic, derivationPath, index } = taskArgs;

    const dir = path.resolve(__dirname, "../fixtures/bundler");
    process.chdir(dir);

    const rpcUrl = await networkRpcUrlFromDocker(attachRemote);
    const accounts = deriveAccounts({
      mnemonic: mnemonic,
      path: derivationPath,
      initialIndex: parseInt(index),
      count: 1,
    })
    const privateKey = accounts[0].privateKey.substring(2);

    const extraEnvs = {
      "DOCKER_IMAGE": dockerImageId,
      "DOCKER_LISTEN": `${host}:${port}`,
      "BUNDLER_NODE_RPC": rpcUrl,
      "BUNDLER_PRIVATE_KEY": privateKey,
      "BUNDLER_ENTRYPOINT": entrypoints,
    }
    _.assign(process.env, extraEnvs);
    console.log("[+] Using env:", extraEnvs);
    console.log("[+] Starting ERC-4337 bundler at", `http://${host}:${port}/`);

    // Having an empty SIGINT handler prevents this task to quit on Ctrl+C.
    // This task is supposed to quit after docker-compose down.
    process.on('SIGINT', () => {});
    try {
      // --force-recreate to remove old database and start over
      runDockerCompose("up --force-recreate");
    } catch (e) {
      runDockerCompose("kill");
      runDockerCompose("down");
    }
  });
