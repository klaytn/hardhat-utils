import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("tasks", function() {
  useEnvironment("hardhat-project");

  describe("accounts", function() {
    it("success", async function() {
      await this.hre.run("accounts")
      await this.hre.run("accounts", { from: 1, json: true })
    });
  });

  describe("addr", function() {
    it("success", async function() {
      await this.hre.run("addr", { name: 'Lock' })
    });
  });
});
