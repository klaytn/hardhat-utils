import { ethers } from "ethers5";
import { HttpNetworkConfig } from "hardhat/types";
import { PluginError } from ".";

// Return RPC url from the current network.
export async function networkRpcUrl(): Promise<string> {
  const name = hre.network.name;
  if (name == "hardhat") {
    throw PluginError("No RPC url for 'hardhat' network");
  }

  const config = hre.network.config as HttpNetworkConfig;
  if (!config.url) {
    throw PluginError(`No RPC url for '${name}' network`);;
  } else {
    return config.url;
  }
}

// Local RPC endpoint for use from docker container.
export async function networkRpcUrlFromDocker(attachRemote: boolean): Promise<string> {
  const name = hre.network.name;
  if (name == "hardhat") {
    throw PluginError("Cannot attach 'hardhat' network; Maybe missing '--network localhost'?");
  } else if (name == "localhost") {
    return "http://host.docker.internal:8545/";
  } else if (!attachRemote) {
    throw PluginError("Refuse to attach to non-localhost network; Use --attach-remote if you must");
  } else {
    return networkRpcUrl();
  }
}

// Heuristically determine if the RPC endpoint supports debug_traceTransaction RPC.
export async function networkSupportsTracer(): Promise<boolean> {
  try {
    await hre.ethers.provider.send("debug_traceTransaction",
      [ethers.constants.HashZero, {tracer: "callTracer"}]);
    return true;
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.includes("non-default tracer not supported yet")) {
        return false; // anvil does not support tracers
      } else if (e.message.includes("Method debug_traceTransaction not found")) {
        return false; // hardhat node does not support tracers
      } else if (e.message.includes("transaction 0000000000000000000000000000000000000000000000000000000000000000 not found")) {
        return true; // It seems the tracers are supported.
      }
    }
    return false; // Otherwise assume not available.
  }
}
