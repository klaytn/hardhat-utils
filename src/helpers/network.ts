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

// Heuristically determine if the RPC endpoint supports debug_traceTransaction RPC.
export async function networkSupportsTracer(): Promise<boolean> {
  try {
    await hre.ethers.provider.send("debug_traceTransaction",
      [hre.ethers.constants.HashZero, {tracer: "callTracer"}]);
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