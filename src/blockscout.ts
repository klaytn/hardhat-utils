import axios, { AxiosError } from "axios";
import child_process from "child_process";
import { task } from "hardhat/config";
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
  .addOptionalParam("explorerVersion", "Blockscout version (currently only supports 4.x.y)", "4.1.8")
  .setAction(async (taskArgs) => {
    const { host, port, stop, restart, explorerVersion } = taskArgs;

    const url = `http://localhost:${port}`;
    const disableTracer = await shouldDisableTracer()
    const extraEnvs = {
      'DOCKER_TAG': explorerVersion,
      'DOCKER_LISTEN': `${host}:${port}`,
      'DOCKER_DISABLE_TRACER': _.toString(disableTracer),
    }
    _.assign(process.env, extraEnvs);
    console.log('[+] Using env:', extraEnvs);

    const dir = path.resolve(__dirname, "../fixtures/blockscout");
    process.chdir(dir);

    // Start containers
    if (stop) {
      stopServer();
      return;
    } else if (restart) {
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

async function shouldDisableTracer(): Promise<boolean> {
  try {
    await hre.ethers.provider.send("debug_traceTransaction",
      [hre.ethers.constants.HashZero, {tracer: "callTracer"}]);
  } catch (e: any) {
    if (e instanceof Error && e.message.includes("non-default tracer not supported yet")) {
      return true; // anvil does not support tracers
    }
  }
  return false; // otherwise leave it up to Blockscout.
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
