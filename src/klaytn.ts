import type ethers from "ethers";
import _ from "lodash";
import fs from "fs";
import path from "path";
import process from "process";
import { BigNumber, Wallet } from "ethers";
import { task } from "hardhat/config";
import { PluginError, runDockerCompose } from "./helpers";

import { normalizeHardhatNetworkAccountsConfig } from "hardhat/internal/core/providers/util";

export const TASK_KLAYTN_NODE = "klaytn-node";

task(TASK_KLAYTN_NODE, "Launch local Klaytn node")
  .addFlag("attach", "Attach to already launched node")
  .addFlag("debug", "Print debug logs from the node")
  .addOptionalParam("host", "HTTP JSON-RPC hostname", "0.0.0.0")
  .addOptionalParam("port", "HTTP JSON-RPC port", "8545")
  .addOptionalParam("dockerImageId", "Docker image id", "klaytn/klaytn:latest")
  .addOptionalParam("mnemonic", "Funded accounts mnemonic", "test test test test test test test test test test test junk")
  .addOptionalParam("derivationPath", "Funded accounts derivation path", "m/44'/60'/0'/0/")
  .addOptionalParam("balance", "Funded accounts balance in KLAY", "10000000")
  .addOptionalParam("chainId", "Chain ID", "31337")
  .addOptionalParam("hardfork", "Hardfork level (none, istanbul, london, ethtxtype, magma, kore, mantle, latest)", "latest")
  .addOptionalParam("baseFee", "KIP-71 base fee in ston; If not specified, use Cypress default", "")
  .addOptionalParam("unitPrice", "pre KIP-71 unit price in ston", "25")
  .setAction(async (taskArgs) => {
    const { attach, debug, host, port, dockerImageId, balance } = taskArgs;

    const dir = path.resolve(__dirname, "../fixtures/klaytn");
    process.chdir(dir);

    if (attach) {
      runDockerCompose("exec CN kcn attach /klaytn/klay.ipc");
      return;
    }

    let accounts = generateAccounts(taskArgs);
    let genesis = makeGenesis(taskArgs, accounts);
    let nodekey = accounts[0].privateKey.substring(2); // strip 0x
    let keystores = await generateKeystoreJson(accounts);
    console.log("[+] Using genesis:", genesis);
    console.log("[+] Using nodekey:", nodekey);
    console.log("[+] Available accounts:");
    _.forEach(accounts, (account, idx) => {
      let idxstr = ("#" + idx).padStart(3,' ');
      console.log(`Account ${idxstr}: ${account.address} (${balance} KLAY)`);
      console.log(`Private Key: ${account.privateKey}\n`);
    });

    const extraEnvs = {
      "DOCKER_IMAGE": dockerImageId,
      "DOCKER_LISTEN": `${host}:${port}`,
      "DOCKER_DEBUG": debug ? "1" : "0",
    }
    _.assign(process.env, extraEnvs);
    console.log("[+] Using env:", extraEnvs);
    console.log("[+] Starting JSON-RPC server at", `http://${host}:${port}/`);
    console.log("    To attach to the console,");
    console.log("      npx hardhat klaytn-node --attach");
    console.log("    Press Ctrl+C to stop");
    console.log("");

    // @ts-ignore: tsc does not recognize mkdirSync for some reason.
    fs.mkdirSync("input/keystore", { recursive: true });
    fs.writeFileSync("input/genesis.json", genesis);
    fs.writeFileSync("input/nodekey", nodekey)
    _.forEach(keystores, (json, idx) => {
      let idxstr = idx.toString().padStart(3, '0');
      fs.writeFileSync(`input/keystore/account_${idxstr}`, json);
    });

    // Having an empty SIGINT handler prevents this task to quit on Ctrl+C.
    // This task is supposed to quit after docker-compose down.
    process.on('SIGINT', () => {});
    try {
      // --force-recreate to remove old database and start over
      runDockerCompose("up --force-recreate");
    } catch (e) {
      runDockerCompose("down");
    }
  });

function generateAccounts(taskArgs: any): ethers.Wallet[] {
  const { mnemonic, derivationPath } = taskArgs;

  let accounts: any[] = normalizeHardhatNetworkAccountsConfig({
    mnemonic: mnemonic,
    path: derivationPath,
    initialIndex: 0,
    count: 10,
    accountsBalance: "0", // irrelevant here
  });
  return _.map(accounts, (account) => new Wallet(account.privateKey));
}

async function generateKeystoreJson(accounts: ethers.Wallet[]): Promise<string[]> {
  let keystores: string[] = [];
  for (var i = 0; i < accounts.length; i++) {
    let json = await accounts[i].encrypt("", { scrypt: { N: 2, p: 1 } });
    keystores.push(json);
  }
  return keystores;
}

type genesisAlloc = {
  [key: string]: {
    balance: string | undefined;
  };
};
type hardforkConfig = {
  [key: string]: number;
};

const hardforkItems = [
  { "short": "istanbul",  "config": "istanbulCompatibleBlock" },
  { "short": "london",    "config": "londonCompatibleBlock" },
  { "short": "ethtxtype", "config": "ethTxTypeCompatibleBlock" },
  { "short": "magma",     "config": "magmaCompatibleBlock" },
  { "short": "kore",      "config": "koreCompatibleBlock" },
];
const hardforkShorts = _.map(hardforkItems, (item) => item.short);

function getHardforkConfig(shortName: string): hardforkConfig {
  shortName = shortName.toLowerCase().trim();
  if (shortName == "none" || shortName == "") {
    return {};
  }

  // collect until the given name
  let config: hardforkConfig = {};
  let i: number;
  for (i = 0; i < hardforkItems.length; i++) {
    let item = hardforkItems[i];
    config[item.config] = 0;
    if (item.short == shortName) {
      return config;
    }
  }
  if (i == hardforkItems.length && shortName == "latest") {
    return config;
  }

  throw PluginError(`Unknown hardfork name '${shortName}', Allowed: ${_.join(hardforkShorts)}`);
}

function makeGenesis(taskArgs: any, accounts: ethers.Wallet[]): string {
  let chainId = parseInt(taskArgs.chainId);

  let hardforks = getHardforkConfig(taskArgs.hardfork);

  var kip71 = null;
  if (taskArgs.baseFee) {
    let baseFee = BigNumber.from(taskArgs.baseFee).mul(1e9).toNumber();
    kip71 = {
      "lowerboundbasefee": baseFee,
      "upperboundbasefee": baseFee,
      "gastarget": 30000000,
      "maxblockgasusedforbasefee": 60000000,
      "basefeedenominator": 20,
    };
  }

  let unitPrice = BigNumber.from(taskArgs.unitPrice).mul(1e9).toNumber();

  let timestamp = Math.floor(Date.now()/1000);
  let timestampHex = BigNumber.from(timestamp).toHexString();

  let cnAddr = accounts[0].address;
  let extraData =
    "0x0000000000000000000000000000000000000000000000000000000000000000f85ad594"
    + cnAddr.substring(2)
    + "b8410000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0";

  let balanceHex = hre.ethers.utils.parseEther(taskArgs.balance).toHexString();
  let alloc: genesisAlloc = {};
  _.forEach(accounts, (account) => {
    alloc[account.address] = { balance: balanceHex };
  });

  let genesis = {
    "config": {
      "chainId": chainId,
      ...hardforks,
      "istanbul": {
        "epoch": 30,
        "policy": 2,
        "sub": 1,
      },
      "deriveShaImpl": 2,
      "unitPrice": unitPrice,
      "governance": {
        "governingNode": "0x0000000000000000000000000000000000000000",
        "governanceMode": "none",
        "govParamContract": "0x0000000000000000000000000000000000000000",
        "reward": {
          "mintingAmount": 1000000000,
          "ratio": "100/0/0",
          "useGiniCoeff": false,
          "deferredTxFee": true,
          "stakingUpdateInterval": 60,
          "proposerUpdateInterval": 30,
          "minimumStake": 5000000
        },
        "kip71": kip71,
      },
    },
    "timestamp": timestampHex,
    "extraData": extraData,
    "governanceData": null,
    "blockScore": "0x1",
    "alloc": alloc,
    "number": "0x0",
    "gasUsed": "0x0",
    "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
  };

  return JSON.stringify(genesis,null,2);
}
