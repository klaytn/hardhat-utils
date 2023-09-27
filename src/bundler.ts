import type ethers from "ethers";
import _ from "lodash";
import fs from "fs";
import { HttpNetworkConfig } from "hardhat/types";
import path from "path";
import process from "process";
import { Wallet } from "ethers";
import { task } from "hardhat/config";
import { PluginError, runDockerCompose } from "./helpers";
import { normalizeHardhatNetworkAccountsConfig } from "hardhat/internal/core/providers/util";

export const TASK_BUNDLER = "aa-bundler";

task(TASK_BUNDLER, "Launch local Klaytn node")
  .addOptionalParam("host", "HTTP JSON-RPC hostname", "0.0.0.0")
  .addOptionalParam("port", "HTTP JSON-RPC port", "4337")
  .addFlag("debug", "Print debug logs from the bundler")
  .addFlag("attachRemote", "Allow attach to remote RPC endpoint (may incur costs)")
  .addOptionalParam("dockerImageId", "Docker image id", "stackupwallet/stackup-bundler:latest")
  .addOptionalParam("entrypoints", "Comma-separated list of EntryPoint addresses", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
  .addOptionalParam("mnemonic", "Bundler account mnemonic", "test test test test test test test test test test test junk")
  .addOptionalParam("derivationPath", "Bundler account derivation path", "m/44'/60'/0'/0/")
  .addOptionalParam("index", "Bundler account index under the derivation path", "0")
  .setAction(async (taskArgs) => {
    const { host, port, debug, dockerImageId } = taskArgs;

    const dir = path.resolve(__dirname, "../fixtures/bundler");
    process.chdir(dir);

    const envFile = await makeEnvFile(taskArgs);
    fs.writeFileSync("input/.env", envFile);
    console.log("[+] Configured:\n", envFile);

    const extraEnvs = {
      "DOCKER_IMAGE": dockerImageId,
      "DOCKER_LISTEN": `${host}:${port}`,
      "DOCKER_DEBUG": debug ? "1" : "0",
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
      runDockerCompose("down");
    }
  });

async function getRPCUrl(attachRemote: boolean): Promise<string> {
  const name = hre.network.name;
  if (name == "hardhat") {
    throw PluginError("Cannot run explorer for 'hardhat' network; Use --network localhost");
  }
  if (!attachRemote && name != "localhost") {
    throw PluginError("Cannot run explorer for other than 'localhost' network; Use --attach-remote if you must");
  }

  if (name == "localhost") {
    return "http://host.docker.internal:8545/";
  }
  const config = hre.network.config as HttpNetworkConfig;
  if (!config.url) {
    throw PluginError(`No RPC url for '${name}' network`);;
  } else {
    return config.url;
  }
}

function generateAccount(taskArgs: any): ethers.Wallet {
  const { mnemonic, derivationPath, index } = taskArgs;

  let accounts: any[] = normalizeHardhatNetworkAccountsConfig({
    mnemonic: mnemonic,
    path: derivationPath,
    initialIndex: parseInt(index),
    count: 1,
    accountsBalance: "0", // irrelevant here
  });
  return new Wallet(accounts[0].privateKey);
}

async function makeEnvFile(taskArgs: any): Promise<string> {
  const { entrypoints, attachRemote } = taskArgs;

  const rpcUrl = await getRPCUrl(attachRemote);
  const privateKey = generateAccount(taskArgs).privateKey.substring(2);

  let env = "";
  env += "ERC4337_BUNDLER_ETH_CLIENT_URL=" + rpcUrl + "\n";
  env += "ERC4337_BUNDLER_PRIVATE_KEY=" + privateKey + "\n";
  env += "ERC4337_BUNDLER_SUPPORTED_ENTRY_POINTS=" + entrypoints + "\n";
  env += "ERC4337_BUNDLER_MAX_OP_TTL_SECONDS=30\n";

  return env;
}
