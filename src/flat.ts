import fs from "fs";
import { task } from "hardhat/config";
import { BuildInfo, DependencyGraph, CompilationJob, Artifact } from "hardhat/types";
import {
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS,
  TASK_COMPILE_SOLIDITY_MERGE_COMPILATION_JOBS,
  TASK_FLATTEN_GET_DEPENDENCY_GRAPH,
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
} from "hardhat/builtin-tasks/task-names";
import _ from "lodash";
import path from "path";

import "./type-extensions";
import {isDevDependency, isFilePath, PluginError} from "./helpers";

export const TASK_FLAT = "smart-flatten";

task(TASK_FLAT, "Flatten source code of a contract and print compilation info")
  .addPositionalParam("nameOrPath", "Contract name or file path")
  .addOptionalPositionalParam("outputPath", "Path to write flattened file (default: *.flat.sol)", undefined)
  .addOptionalParam("forceLicense", "Override to a SPDX license", "")
  .addFlag("includeDev", "Include dev dependencies (hardhat/*.sol, forge-std/*.sol)")
  .addFlag("noCompile", "Do not compile before running")
  .setAction(async (taskArgs) => {
    const { nameOrPath, outputPath, forceLicense, includeDev, noCompile } = taskArgs;

    if (!noCompile) {
      await hre.run(TASK_COMPILE);
    }

    const resolved = await resolveSource(nameOrPath);

    resolved.sources.forEach((path) => {
      if (!includeDev && isDevDependency(path)) {
        throw PluginError(`Dependency '${path}' is for debugging. If you want to include it in the flattened file, add --include-dev flag.`);
      };
    });

    const flattened = await hre.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
      files: [resolved.sourcePath] });

    const dedup = deduplicateLicenses(flattened, forceLicense);
    const metadata: any = {
      ...resolved,
      inputLicenses: dedup.inputLicenses,
      outputLicense: dedup.outputLicense,
    };
    const finalSource = dedup.source;

    let flattenedPath;
    if (outputPath === undefined) {
      const filename = path.basename(resolved.sourcePath, ".sol") + ".flat.sol";
      flattenedPath = path.join(hre.config.paths.artifacts, filename);
    } else {
      flattenedPath = outputPath;
    }
    fs.writeFileSync(flattenedPath, finalSource)

    console.error(metadata);
    console.log(`\nFlattened source written to ${flattenedPath}\n`);
  });

interface ResolvedSource {
  sourcePath: string;
  solcVersion: string;
  solcSettings: {
    optimizer: any;
  };
  sources: string[];
}
async function resolveSource(nameOrPath: string): Promise<ResolvedSource> {
  const resolved: ResolvedSource = {
    sourcePath: '',
    solcVersion: '',
    solcSettings: {
      optimizer: {},
    },
    sources: [],
  };

  if (isFilePath(nameOrPath)) {
    resolved.sourcePath = nameOrPath;
    const dependencyGraph = await hre.run(TASK_FLATTEN_GET_DEPENDENCY_GRAPH, {
      files: [resolved.sourcePath] });
    resolved.sources = dependencyGraph.getResolvedFiles().map((f: any) => f.sourceName);

    // Run a subset of the hardhat compile task to determine compiler config.
    const { jobs } = await hre.run(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS, {
      dependencyGraph: dependencyGraph });
    const mergedJobs: CompilationJob[] = await hre.run(TASK_COMPILE_SOLIDITY_MERGE_COMPILATION_JOBS, {
      compilationJobs: jobs });
    if (mergedJobs.length != 1) {
      throw PluginError(`Multiple mergedCompilationJob. Please report bug`);
    }
    const solcConfig = mergedJobs[0].getSolcConfig();

    resolved.solcVersion = solcConfig.version;
    resolved.solcSettings.optimizer = solcConfig.settings.optimizer;
  } else {
    const artifact: Artifact = await hre.artifacts.readArtifact(nameOrPath);

    resolved.sourcePath = artifact.sourceName;
    const dependencyGraph = await hre.run(TASK_FLATTEN_GET_DEPENDENCY_GRAPH, {
      files: [resolved.sourcePath] });
    resolved.sources = dependencyGraph.getResolvedFiles().map((f: any) => f.sourceName);

    // Read build info to determine compiler config.
    const fqname = artifact.sourceName + ":" + artifact.contractName;
    const buildInfo = await hre.artifacts.getBuildInfo(fqname)
    if (!buildInfo) {
      throw PluginError(`Cannot read buildinfo for ${fqname}. Please report bug.`);
    }
    resolved.solcVersion = buildInfo.solcVersion;
    resolved.solcSettings.optimizer = buildInfo.input.settings.optimizer;
  }
  return resolved;
}

interface LicenseDedup {
  source: string;
  inputLicenses: string[];
  outputLicense: string;
}
function deduplicateLicenses(source: string, forceLicense?: string): LicenseDedup {
  const re = /\/\/\s*SPDX-License-Identifier:\s*(.+)/m;
  const licenses = [];
  let outputSource = "";

  for (const line of source.split('\n')) {
    const match = re.exec(line);
    if (match) {
      licenses.push(match[1]);
      outputSource += '\n';
    } else {
      outputSource += line + '\n';
    }
  }

  let outputLicense: string;
  if (forceLicense) {
    outputLicense = forceLicense;
  } else {
    const uniqLicenses = _.uniq(licenses);
    if (uniqLicenses.length == 0) {
      outputLicense = 'UNLICENSED';
    } else {
      outputLicense = licenses[licenses.length - 1];
    }
  }

  outputSource = `// SPDX-License-Identifier: ${outputLicense}\n` + outputSource;

  return {
    source: outputSource,
    inputLicenses: licenses,
    outputLicense: outputLicense,
  };
}
