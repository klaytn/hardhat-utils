# hardhat-utils

[Hardhat](https://hardhat.org) utility tasks.

## Installation

```bash
npm install @klaytn/hardhat-utils
```

## Import the tasks

- In `hardhat.config.js`
  - Import all tasks
    ```
    require("@klaytn/hardhat-utils");
    ```
  - Import selectively (see [tasks/](./src/tasks))
    ```
    require("@klaytn/hardhat-utils/tasks/accounts");
    require("@klaytn/hardhat-utils/tasks/klaytnNode");
    ```
- In `hardhat.config.ts`
  - Import all tasks
    ```
    import "@klaytn/hardhat-utils";
    ```
  - Import selectively
    ```
    import "@klaytn/hardhat-utils/tasks/accounts";
    import "@klaytn/hardhat-utils/tasks/klaytnNode";
    ```

## Import the helper functions

- In your `.js` script
  ```
  const { deriveAccounts } = require("@klaytn/hardhat-utils/helpers");
  ```
- In your `.ts` script
  ```
  import { deriveAccounts } from "@klaytn/hardhat-utils/helpers";
  ```

## Required plugins

This plugin is dependent on other plugins. Make sure to require or import them in your `hardhat.config.js`.

- [@nomiclabs/hardhat-ethers](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers)
- [hardhat-deploy](https://www.npmjs.com/package/hardhat-deploy)

```
npm install @nomiclabs/hardhat-ethers hardhat-deploy
```
```
// hardhat.config.js
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");

// hardhat.config.ts
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
```

## Tasks

Type `hh <task name> --help` for detailed help. Below paragraphs outlines notable use cases.

### Account related tasks

#### `hh accounts`

Print account addresses and balances. Useful for checking the curent hardhat network.

```
hh accounts
```
```
    address                                    balance
  0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 10000000.0
  1 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 10000000.0
  2 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 10000000.0
  3 0x90F79bf6EB2c4f870365E785982E1f101E93b906 10000000.0
  4 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 10000000.0
  5 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc 10000000.0
  6 0x976EA74026E726554dB657fA54763abd0C3a0aa9 10000000.0
  7 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 10000000.0
  8 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f 10000000.0
  9 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 10000000.0
```

#### `hh decrypt-keystore`

Decrypt JSON keystore file to print the address and private key.
Also accepts the [KIP-3](https://kips.klaytn.foundation/KIPs/kip-3) (Klaytn keystore v4) in which case
multiple addresses and private keys are printed.

```
hh decrypt-keystore keystore.json --password "mypass"
```
```
    address                                    private key
  0 0x0cc57a3c4E276A37AB0A98ba6899CAf6037996fB 278c3d035328daf04ab2597da96dd2d8868fd61a8837030f7d8a85f27b7f1bad
```

#### `hh faucet`

Transfer native coins in batch. Useful when you top up balances for gas fee.

```
hh faucet --from 0 --to 1,2,3
```
```
Send from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to 3 accounts 1 ETH each
to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 txid 0x9574b62242f7d7f4b2ba040b775345aad8e4bfe38d588c783590298d861cc52f
to 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC txid 0xf594661765fcf2f7b17994661818d256af4db84aac4c518e3fd2e775790844c0
to 0x90F79bf6EB2c4f870365E785982E1f101E93b906 txid 0xe4e41e5750cdb5a25fd41f75f19e9feef96cc1ea7445fe503b17d9a44e5d4cda
```

#### `hh mnemonic`

Print addresses and private keys derived from a [BIP-39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and [BIP-32 path](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki).
By default, the Hardhat default mnemonic and Ethereum deriation path is used.

```
hh mnemonic
```
```
    address                                    private key
  0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  1 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
  2 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
  3 0x90F79bf6EB2c4f870365E785982E1f101E93b906 7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
  4 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
  5 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc 8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
  6 0x976EA74026E726554dB657fA54763abd0C3a0aa9 92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
  7 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
  8 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97
  9 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
```

### `abi`

Print ABI of a contract. See also: `call`, `docs`, `send`, `smart-flatten` and `upload-abi` .
- `hh abi` prints ABIs of all contracts in your project
- `hh abi Counter` prints the ABI of a specific contract

You can choose output formats
- `hh abi` by default prints in human-readable string format.
- `hh abi --json` prints in JSON format to be used in other apps.

### `addr`

Print the address of deployed contracts. See also: `call`, `deploy`, `import` and `send`.
- `hh addr` prints all deployed contracts on the current network.
- `hh addr Counter` prints the addrees of the specific contracg.

### `call`

Call a read-only function of  a deployed contract. See also: `abi`, `addr`, `deploy` and `send`.

- `hh call Counter number` calls the `number()` function of the Counter contract deployed on current network.
- `hh call MyToken "balanceOf(address)" 0xarg` calls the exact function. When multiple functions have the same name, or somehow hardhat does not recognize the function, specify exact function signature including argument types.
- `hh call --from 1 Counter number` overrides sender address.
- `hh call --to <addr> Counter number` overrides the contract address. Use it when the contract is deployed but not saved in `deployments/`.

### `deploy`

Deploy contracts by running scripts in `deploy/`. As a result, addresses and ABI will be saved under `deployments/<network>`. See also: `addr`, `call`, `explorer`, `import` and `send`
- `hh deploy` runs all deploy scripts.
- `hh deploy --tags` selectivly run deploy scripts with specific tags.
- `hh deploy --reset` deletes existing `deployments/<network>` and re-deployes.
- `hh deploy --export out.json` exports all contracts addresses and ABI for current network.
- `hh deploy --export-all all.json` exports all contracts addresses and ABI for every networks.
- See [hardhat-deploy plugin docs](https://github.com/wighawag/hardhat-deploy) for details.

### `docs`

Generate HTML and markdown docs describing the compiled contracts. See also: `abi`.

- `hh docs` generates docs `docs/*.md` and `docs/www/*.html`
- `hh docs --coverage ./coverage` copies coverage [solidity-coverage](https://github.com/sc-forks/solidity-coverage) report from the specified location into the output docs.

### `explorer`

Launch the [BlockScout](https://github.com/blockscout/blockscout) block explorer for current network. See also: `deploy`.
- `hh explorer` launches the BlockScout container that fetches block data from the JSON-RPC.

### `import`

Import a deployment, i.e. address and ABI, of an existing contract. As a result, addresses and ABI will be saved under `deployments/<network>`. See also: `addr` and `deploy`.
- `hh import Counter <addr>` saves the contract address and ABI
- `hh import Counter <addr> <deployTxHash>` saves the contract address, ABI and deploy transaction receipt.

### `klaytn-node`

Launch a klaytn consensus node. See also: `deploy`.
- `hh klaytn-node` starts a klaytn private chain. Other scripts can refer to this node via `--network localhost`.
- `hh klaytn-node --base-fee` sets the gas fee to 0, allowing any account to send transactions without the native coin.
- `hh --docker-image-id klaytn/klaytn:v1.10.0` launches the specific version of klaytn container image from https://hub.docker.com/r/klaytn/klaytn or from local images.

### `send`

Call a read-only function of  a deployed contract. See also: `abi`, `addr`, `call` and `deploy`.

- `hh send Counter increment` calls the `increment()` function of the Counter contract deployed on current network.
- `hh send WKLAY "withdraw(uint256)" 1000` calls the exact function. When multiple functions have the same name, or somehow hardhat does not recognize the function, specify exact function signature including argument types.
- `hh send --from 1 Counter increment` overrides sender address.
- `hh send --to <addr> Counter increment` overrides the contract address. Use it when the contract is deployed but not saved in `deployments/`.
- `hh send Counter increment --unsigned` prints an unsigned transaction JSON.
- `hh send Counter increment --browser` launches a simple web page for browser wallets like MetaMask to sign and send the transaction.

### `smart-flatten`

Flatten source code to be submitted to block explorers. If there are multiple license identifiers (i.e. `// SPDX-License-Identifier: ..`), only keep the license from the last file. See also: `abi` and `upload-abi`.

- `hh smart-flatten Counter` flattens required sources for Counter contract and writes Counter.flat.sol file.
- `hh smart-flatten contracts/Counter.sol` flattens required sources to compile the spefieid source.
- `hh smart-flatten --force-license MIT` overrides the final license identifier.
- `hh smart-flatten --include-dev` allows debugging libraries like hardhat/console.sol to be flattened.

### `upload-abi`

Upload ABI to online database sites. See also: `abi` and `smart-flatten`.

- `hh upload-abi --byte4` submits ABIs of all compiled contracts to https://www.4byte.directory/
- `hh upload-abi --sigdb` submits ABIs of all compiled contracts to https://openchain.xyz/signatures
- `hh upload-abi --sigdb Counter` submits ABI for a specific contract.

