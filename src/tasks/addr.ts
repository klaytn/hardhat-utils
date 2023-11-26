import { task } from "hardhat/config";
import _ from "lodash";
import "../type-extensions";

export const TASK_ADDR = "addr";

task(TASK_ADDR, "Get address of a deployed contract")
  .addOptionalPositionalParam("name", "Contract name", "")
  .setAction(async (taskArgs) => {
    const { name } = taskArgs;
    if (name == "") {
      const deployments = await hre.deployments.all();
      const addrs = _.mapValues(deployments, (d) => d.address);
      console.log(JSON.stringify(addrs, null, 2));
    } else {
      const deployment = await hre.deployments.get(name);
      console.log(deployment.address);
    }
  });
