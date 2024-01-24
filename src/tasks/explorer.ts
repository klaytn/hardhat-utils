import { task } from "hardhat/config";
import _ from "lodash";
import path from "path";
import process from "process";

import { networkRpcUrlFromDocker, networkSupportsTracer, runDockerCompose } from "../helpers";
import "../type-extensions";

export const TASK_EXPLORER = "explorer";

task(TASK_EXPLORER, "Launch blockscout explorer")
  .addOptionalParam("host", "HTTP hostname", "0.0.0.0")
  .addOptionalParam("port", "HTTP port", "4000")
  .addFlag("debug", "Print debug logs")
  .addFlag("attachRemote", "Allow attach to remote RPC endpoint (may incur costs)")
  .setAction(async (taskArgs) => {
    const { host, port, debug, attachRemote, explorerVersion } = taskArgs;

    const dir = path.resolve(__dirname, "../fixtures/blockscout");
    process.chdir(dir);

    const rpcUrl = await networkRpcUrlFromDocker(attachRemote);
    const url = `http://localhost:${port}`;
    const supportsTracer = await networkSupportsTracer();
    const extraEnvs = {
      'DOCKER_RPC_HTTP_URL': rpcUrl,
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
      runDockerCompose("up --force-recreate -d redis_db db backend frontend smart-contract-verifier");
      runDockerCompose("up --force-recreate proxy");
    } catch (e) {
      runDockerCompose("kill");
      runDockerCompose("down");
    }
  });
