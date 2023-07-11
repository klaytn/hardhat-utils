import axios, { AxiosError } from "axios";
import { task } from "hardhat/config";
import { HttpNetworkConfig } from "hardhat/types";
import _ from "lodash";
import path from "path";
import process from "process";
import { runDockerCompose } from "./helpers";

import { PluginError, sleep } from "./helpers";
import "./type-extensions";

export const TASK_EXPLORER = "explorer";

task(TASK_EXPLORER, "Launch blockscout explorer")
  .addOptionalParam("host", "HTTP hostname", "0.0.0.0")
  .addOptionalParam("port", "HTTP port", "4000")
  .addFlag("debug", "Print debug logs")
  .addFlag("attachRemote", "Allow attach to remote RPC endpoint (may incur costs)")
  .addOptionalParam("explorerVersion", "Blockscout version (currently only supports 4.x.y)", "4.1.8")
  .setAction(async (taskArgs) => {
    const { host, port, debug, attachRemote, explorerVersion } = taskArgs;

    const dir = path.resolve(__dirname, "../fixtures/blockscout");
    process.chdir(dir);

    const rpcUrl = await getRPCUrl(attachRemote);
    const url = `http://localhost:${port}`;
    const disableTracer = await shouldDisableTracer();
    const extraEnvs = {
      'DOCKER_RPC_HTTP_URL': rpcUrl,
      'DOCKER_TAG': explorerVersion,
      'DOCKER_LISTEN': `${host}:${port}`,
      'DOCKER_DISABLE_TRACER': _.toString(disableTracer),
      "DOCKER_DEBUG": debug ? "1" : "0",
    }
    _.assign(process.env, extraEnvs);
    console.log('[+] Using env:', extraEnvs);
    console.log('[+] Open in the browser:', url);

    // Having an empty SIGINT handler prevents this task to quit on Ctrl+C.
    // This task is supposed to quit after docker-compose down.
    process.on('SIGINT', () => {});
    try {
      // --force-recreate to remove old database and start over
      runDockerCompose("up --force-recreate -d db");
      runDockerCompose("up --force-recreate blockscout");
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

// Heuristically determine if the RPC endpoint supports debug_traceTransaction RPC.
async function shouldDisableTracer(): Promise<boolean> {
  try {
    await hre.ethers.provider.send("debug_traceTransaction",
      [hre.ethers.constants.HashZero, {tracer: "callTracer"}]);
    return false;
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.includes("non-default tracer not supported yet")) {
        return true; // anvil does not support tracers
      } else if (e.message.includes("Method debug_traceTransaction not found")) {
        return true; // hardhat node does not support tracers
      } else if (e.message.includes("transaction 0000000000000000000000000000000000000000000000000000000000000000 not found")) {
        return false; // It seems the tracers are supported.
      }
    }
    console.log("Cannot recognize debug_traceTransaction error:", e);
    return true; // Otherwise disable by default.
  }
}
