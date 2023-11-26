import { task } from "hardhat/config";
import { HttpNetworkConfig } from "hardhat/types";
import _ from "lodash";
import path from "path";
import process from "process";

import { PluginError, networkRpcUrl, networkRpcUrlFromDocker, networkSupportsTracer, runDockerCompose } from "../helpers";
import "../type-extensions";

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

    const rpcUrl = await networkRpcUrlFromDocker(attachRemote);
    const url = `http://localhost:${port}`;
    const supportsTracer = await networkSupportsTracer();
    const extraEnvs = {
      'DOCKER_RPC_HTTP_URL': rpcUrl,
      'DOCKER_TAG': explorerVersion,
      'DOCKER_LISTEN': `${host}:${port}`,
      'DOCKER_DISABLE_TRACER': _.toString(!supportsTracer),
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