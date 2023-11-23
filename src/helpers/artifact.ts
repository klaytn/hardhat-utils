import ethers from "ethers";
import { Artifact } from "hardhat/types";
import _ from "lodash";

// Stringify an ABI to JSON or human-readable format.
// The ABI can be anything that is accepted by ethers.utils.Interface.
export async function stringifyAbi(abi: any, json = true): Promise<any> {
  const iface = new hre.ethers.utils.Interface(abi);

  // See all FormatTypes: https://github.com/ethers-io/ethers.js/blob/v5.7/packages/abi/src.ts/fragments.ts#L235
  const formats = hre.ethers.utils.FormatTypes;

  if (json) {
    return iface.format(formats.json);
  }

  // TODO: pretty-print by aligning hashes
  const out = [];
  for (const f of iface.fragments) {
    const decl = f.format(formats.full);
    let hash;
    switch (f.type) {
      case "function":
        hash = iface.getSighash(f);
        out.push(`${decl} // ${hash}`);
        break;
      case "event":
        hash = iface.getEventTopic(f as ethers.utils.EventFragment);
        out.push(`${decl} // ${hash}`);
        break;
      case "error":
      case "constructor":
        out.push(decl);
        break;
    }
  }
  return _.join(out, '\n');
}

export async function getArtifact(name: string): Promise<Artifact>{
  try {
    // Covers compiled contract name ("Token") and compiled FQname ("contracts/Token.sol:Token")
    return await hre.artifacts.readArtifact(name);
  } catch {
    // Covers saved deployments by contract name ("Token")
    return await hre.deployments.getArtifact(name);
  }
}

export async function getArtifactNames(): Promise<string[]> {
  const compiledNames = await hre.artifacts.getAllFullyQualifiedNames();
  const deployedNames = _.keys(await hre.deployments.all());
  return _.uniq(_.concat(compiledNames, deployedNames));
}