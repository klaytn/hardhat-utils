import { HardhatPluginError } from "hardhat/plugins";
import fs from "fs";
import _ from "lodash";
import child_process from "child_process";

export function PluginError(message: string, parent?: Error | undefined): Error {
  return new HardhatPluginError("hardhat-utils", message, parent)
}

console.log('afdsafsd');

export async function sleep(msec: number) {
  await new Promise(resolve => setTimeout(resolve, msec));
}

export function isFilePath(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

let dockerComposePath: string | null = null;

// Find docker compose command, if not set.
// Prefers 'docker compose' (V2) over 'docker-compose' (V1)
// see https://docs.docker.com/compose/migrate/ for the difference.
function findDockerCompose(): string {
  if (dockerComposePath) {
    return dockerComposePath;
  }

  try {
    child_process.execSync("docker compose version", {stdio: 'pipe'});
    dockerComposePath = "docker compose";
    return dockerComposePath;
  } catch (e) {
  }

  try {
    child_process.execSync("docker-compose --version", {stdio: 'pipe'});
    dockerComposePath = "docker-compose";
    return dockerComposePath;
  } catch (e) {
  }

  throw new Error("docker compose not installed. Follow https://docs.docker.com/compose/install/");
}

export function runDockerCompose(args: string, opts: any = {}) {
  let dockerCompose = findDockerCompose();
  let cmd = `${dockerCompose} --ansi never ${args}`
  opts.stdio = 'inherit';
  child_process.execSync(cmd, opts);
}

export function isDevDependency(path: string): boolean {
  return _.startsWith(path, "lib/forge-std/") ||
         _.startsWith(path, "hardhat/");
}

export async function currentNetworkEIP3085(): Promise<any> {
  const ethersNet = await hre.ethers.provider.getNetwork();
  const chainId = ethersNet.chainId;
  const url = hre.ethers.provider.connection.url;

  const param = { // https://eips.ethereum.org/EIPS/eip-3085
    chainId: '0x' + chainId.toString(16),
    chainName: 'hardhat:' + hre.network.name,
    rpcUrls: [url],
  }
  return param;
}
