// Wrapper for https://github.com/Arachnid/deterministic-deployment-proxy
// Based on https://github.com/eth-infinitism/account-abstraction/blob/main/src/Create2Factory.ts
import { type Provider } from "@ethersproject/providers";
import { type Signer } from "@ethersproject/abstract-signer";
import { BigNumberish } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import { hexConcat, hexlify, hexZeroPad, keccak256 } from 'ethers/lib/utils'

import { getArtifact } from "./artifact";
import {DeploymentSubmission} from "hardhat-deploy/dist/types";
import _ from "lodash";

// Analogous to hardhat-deploy:DeployOptions.
export interface Create2FactoryDeployOptions {
  from: string;
  initCode: string;
  salt?: BigNumberish;

  gasLimit?: BigNumberish;

  abi?: any[]; // abi to store in deployments/. If not given, load from compiled artifact.
}

// Create2Factory
export class Create2Factory {
  static readonly contractAddress = "0x4e59b44847b379578588920ca78fbf26c0b4956c";
  static readonly deployerAddress = "0x3fab184622dc19b6109349b94811493bf2a45362";
  static readonly deployRawTx = "0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222";
  static readonly deployGasPrice = 100e9;
  static readonly deployGasLimit = 100000;
  static readonly deployFee = (Create2Factory.deployGasLimit * Create2Factory.deployGasPrice).toString(); // 0.01 ETH

  private factoryExists = false;
  private readonly provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  // Deploy the factory itself.
  async deployFactory(from_: string) {
    if (await this._factoryExists()) {
      console.log(`reusing "Create2Factory" at ${Create2Factory.contractAddress}`);
      await this._saveDeployment("Create2Factory", {
        abi: [],
        address: Create2Factory.contractAddress,
      });
      return;
    }

    const signer = await hre.deployments.getSigner(from_);

    // Top up fee to deployerAddress
    const balance = await this.provider.getBalance(Create2Factory.deployerAddress);
    if (balance.lt(Create2Factory.deployFee)) {
      const feeTx = await signer.sendTransaction({
        to: Create2Factory.deployerAddress,
        value: Create2Factory.deployFee,
      });
      await feeTx.wait();
      console.log(`topped up Create2Factory.deployerAddress with ${formatEther(Create2Factory.deployFee)} ETH (tx: ${feeTx.hash})`);
    }

    // Send hardcoded deploy tx
    const deployTx = await this.provider.sendTransaction(Create2Factory.deployRawTx);
    process.stdout.write(`deploying "Create2Factory" (tx: ${deployTx.hash})...: `);
    const deployRc = await deployTx.wait();
    console.log(`deployed at ${Create2Factory.contractAddress} with ${deployRc.gasUsed} gas`);

    await this._saveDeployment("Create2Factory", {
      abi: [], // no ABI
      address: deployRc.contractAddress,
      receipt: deployRc,
      transactionHash: deployRc.transactionHash,
      deployedBytecode: await this.provider.getCode(Create2Factory.contractAddress),
    });
  }

  // Deploy a contract using the factory. Use it when you want to use a hardcoded initCode.
  // If you can use compiled artifact, use hre.deployments.deploy(name, { deterministicDeployment: true });
  async deployContract(name: string, options: Create2FactoryDeployOptions) {
    if (!(await this._factoryExists())) {
      throw new Error("Create2Factory not deployed");
    }

    const signer = await hre.deployments.getSigner(options.from);
    const initCode = options.initCode;
    const salt = options.salt ?? 0;
    const gasLimit = options.gasLimit;
    const abi = options.abi ?? (await getArtifact(name)).abi;

    const contractAddress = Create2Factory.getDeployedAddress(initCode, salt);
    const calldata = Create2Factory.getDeployCalldata(initCode, salt);

    const code = await this.provider.getCode(contractAddress);
    if (code.length > 2) {
      console.log(`reusing "${name}" at ${contractAddress}`);
      await this._saveDeployment(name, {
        abi: abi,
        address: contractAddress,
        deployedBytecode: code,
      });
      return;
    }

    const deployTx = await signer.sendTransaction({
      to: Create2Factory.contractAddress,
      data: calldata,
      gasLimit: gasLimit,
    });
    process.stdout.write(`deploying "${name}" (tx: ${deployTx.hash})...: `);
    const deployRc = await deployTx.wait();
    // The deployment is an internal transaction, so the deployRc.contractAddress is null.
    console.log(`deployed at ${contractAddress} with ${deployRc.gasUsed} gas`);

    await this._saveDeployment(name, {
      abi: abi,
      address: contractAddress,
      receipt: deployRc,
      transactionHash: deployRc.transactionHash,
      deployedBytecode: await this.provider.getCode(contractAddress),
    });
  }

  async _factoryExists(): Promise<boolean> {
    if (!this.factoryExists) {
      const code = await this.provider.getCode(Create2Factory.contractAddress);
      this.factoryExists = (code.length > 2);
    }
    return this.factoryExists;
  }

  async _saveDeployment(name: string, deployment: DeploymentSubmission) {
    const previous = await hre.deployments.getOrNull("Create2Factory");
    if (previous != null) {
      return; // Do not overwrite existing deployment.
    }
    await hre.deployments.save(name, deployment);
  }

  static getDeployCalldata(initCode: string, salt: BigNumberish): string {
    const saltBytes32 = hexZeroPad(hexlify(salt), 32)
    return hexConcat([
      saltBytes32,
      initCode
    ])
  }

  static getDeployedAddress(initCode: string, salt: BigNumberish): string {
    const saltBytes32 = hexZeroPad(hexlify(salt), 32)
    return '0x' + keccak256(hexConcat([
      '0xff',
      Create2Factory.contractAddress,
      saltBytes32,
      keccak256(initCode)
    ])).slice(-40);
  }
};
