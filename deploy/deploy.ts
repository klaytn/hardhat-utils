import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { Create2Factory } from "../src/helpers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;

  const factory = new Create2Factory(hre.ethers.provider);
  await factory.deployFactory(deployer);

  await hre.deployments.deploy("Counter", {
    from: deployer,
    deterministicDeployment: true,
    log: true,
  });
};

export default func;
