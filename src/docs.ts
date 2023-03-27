import fs from "fs";
import { task } from "hardhat/config";
import _ from "lodash";
import path from "path";
import shell from "shelljs";
import * as Sqrl from "squirrelly";

import { isDevDependency, PluginError } from "./helpers";
import "./type-extensions";

export const TASK_DOCS = "docs";

task(TASK_DOCS, "Generate Markdown and HTML docs (with dodoc)")
  .addFlag("noDodoc", "Skip solidity NatSpec docs")
  .addOptionalParam("coverage", "Path to coverage output", undefined)
  .setAction(async (taskArgs) => {
    const { noDodoc, coverage } = taskArgs;

    const docsDir = path.join(hre.config.paths.root, "docs");
    const wwwDir = path.join(docsDir, "www");
    shell.mkdir("-p", wwwDir);

    writeIndex(wwwDir, taskArgs)
    console.log(`Written index.html`);

    if (!noDodoc) {
      await runDodoc(docsDir);
      await convertDodoc(docsDir, wwwDir)
      console.log(`Copied contract docs markdown`);
    }
    if (coverage) {
      await copyCoverage(coverage, wwwDir);
      console.log(`Copied coverage`);
    }

    console.log(`HTML docs generated in ${wwwDir}/index.html`);
  });

async function writeIndex(wwwDir: string, taskArgs: any) {
  const packageDir = hre.config.paths.root;
  const packagePath = path.join(packageDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath).toString());

  const templateDir = path.resolve(__dirname, "../fixtures/docs");
  const templatePath = path.join(templateDir, "index.html");
  const template = fs.readFileSync(templatePath).toString();

  const staticDir = path.join(templateDir, "static");
  shell.cp("-r", staticDir, wwwDir);

  const names = await getContractNames();

  const htmlPath = path.join(wwwDir, "index.html");
  const html = Sqrl.render(template, {
    packageName: packageJson.name || path.basename(packageDir),
    packageDesc: packageJson.description || "",
    packageRepo: packageJson.repository || "",
    contractNames: names,
    hasContractDocs: !taskArgs.noDodoc,
    hasCoverage: !!taskArgs.coverage,
  });
  fs.writeFileSync(htmlPath, html);
}

async function runDodoc(outputDir: string) {
  // Check for hardhat-dodoc is lazy Because task docs is a non-critical feature.
  if (!hre.tasks['dodoc']) {
    throw PluginError("hardhat-dodoc plugin not loaded. In your hardhat.config.js, please require or import '@primitivefi/hardhat-dodoc' before hardhat-utils.");
  }

  hre.config.dodoc.freshOutput = false; // Do not clear docs/ dir
  hre.config.dodoc.outputDir = outputDir;
  await hre.run("dodoc");
}

async function convertDodoc(docsDir: string, wwwDir: string) {
  const templateDir = path.resolve(__dirname, "../fixtures/docs");
  const templatePath = path.join(templateDir, "md.html");
  const template = fs.readFileSync(templatePath).toString();

  const names = await getContractNames();
  let allMd = "";
  for (const name of names) {
    const mdPath = path.join(docsDir, name+".md");
    const md = fs.readFileSync(mdPath).toString();
    allMd += md + "\n";

    const htmlPath = path.join(wwwDir, name+".html");
    const html = Sqrl.render(template, { md: md });
    fs.writeFileSync(htmlPath, html);
  }

  const allHtmlPath = path.join(wwwDir, "_all.html");
  const allHtml = Sqrl.render(template, { md: allMd });
  fs.writeFileSync(allHtmlPath, allHtml);
}

async function copyCoverage(coverageDir: string, wwwDir: string) {
  shell.cp("-r", coverageDir, wwwDir);
}

async function getContractNames() {
  const fqnames = await hre.artifacts.getAllFullyQualifiedNames();
  const names = [];
  for (const fqname of _.sortBy(fqnames)) {
    const [ srcPath, name ] = _.split(fqname, ':');
    if (!isDevDependency(srcPath)) {
      names.push(name);
    }
  }
  return names;
}
