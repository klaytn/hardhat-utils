import axios, { AxiosError } from "axios";
import child_process from "child_process";
import { task } from "hardhat/config";
import { HttpNetworkConfig } from "hardhat/types";
import _ from "lodash";
import path from "path";
import process from "process";

import { PluginError, sleep } from "./helpers";
import "./type-extensions";

export const TASK_EXPLORER = "explorer";

task(TASK_EXPLORER, "Launch blockscout explorer")
  .addOptionalParam("host", "HTTP hostname", "0.0.0.0")
  .addOptionalParam("port", "HTTP port", "4000")
  .addFlag("restart", "Restart container if there is one currently running")
  .addFlag("stop", "Stop containers and exit")
  .addFlag("attachRemote", "Allow attach to remote RPC endpoint (may incur costs)")
  .addOptionalParam("explorerVersion", "Blockscout version (currently only supports 4.x.y)", "4.1.8")
  .setAction(async (taskArgs) => {
    const { host, port, stop, restart, attachRemote, explorerVersion } = taskArgs;

    const dir = path.resolve(__dirname, "../fixtures/blockscout");
    process.chdir(dir);

    // stop container ASAP
    if (stop) {
      stopServer();
      return;
    }

    const rpcUrl = await getRPCUrl(attachRemote);
    const url = `http://localhost:${port}`;
    const disableTracer = await shouldDisableTracer();
    const extraEnvs = {
      'DOCKER_RPC_HTTP_URL': rpcUrl,
      'DOCKER_TAG': explorerVersion,
      'DOCKER_LISTEN': `${host}:${port}`,
      'DOCKER_DISABLE_TRACER': _.toString(disableTracer),
    }
    _.assign(process.env, extraEnvs);
    console.log('[+] Using env:', extraEnvs);

    // Start containers
    if (restart) {
      stopServer();
    }
    startServer();

    // Wait for server
    const ok = await waitServer(url)
    if (!ok) {
      stopServer();
      throw PluginError("Cannot connect to explorer");
    }
    console.log('Blockscout explorer is running. To stop:');
    console.log('\n  npx hardhat explorer --stop\n');

    // Source code verify
    console.log("[+] Uploading source code of deployed contracts..");
    try {
      await verifyBatch(url)
    } catch {
      console.log('[+] Failed to upload source code.. skipping');
    }
  });


function startServer() {
  child_process.execFileSync("docker-compose", ["up", "-d"], {stdio: 'inherit'});
}
function stopServer() {
  child_process.execFileSync("docker-compose", ["down"], {stdio: 'inherit'});
}

async function getRPCUrl(attachRemote: boolean): Promise<string> {
  const name = hre.network.name;
  if (name == "hardhat") {
    throw PluginError("Cannot run explorer for 'hardhat' network; Use --network localhost");
  }
  if (!attachRemote && name != "localhost") {
    throw PluginError("Cannot run explorer for 'localhost' network; Use --attach-remote if you must");
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

async function waitServer(url: string, maxRetry: number = 10): Promise<boolean> {
  process.stdout.write(`[+] Waiting for ${url} to be online.. `);

  while (maxRetry--) {
    try {
      const ret = await axios.get(url);
      if (ret.status == 200) {
        break;
      } else {
        console.log(`ret.status ret.statusText`);
      }
    } catch (e) {
      if (e instanceof AxiosError) {
        console.log(e.code);
      } else {
        throw e;
      }
    }

    await sleep(3000);
    process.stdout.write('Retrying.. ');
  }
  if (maxRetry == 0) {
    return false
  }

  console.log(`Server is up!`);
  console.log(`\n  Go to ${url} in your browser.\n`);
  return true
}

async function verifyBatch(url: string) {
  // hardhat-deploy's etherscan-verify task will control upload speed
  // to obey rate limit. Therefore we run multiple commands in parallel.
  const deployments = await hre.deployments.all();
  const promises = [];
  for (const name of _.keys(deployments)) {
    promises.push(hre.run("etherscan-verify", { apiUrl: url, contractName: name }));
  }
  await Promise.all(promises);
}
