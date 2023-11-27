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
  import { deriveAccounts } from "@klaytn/hardhat-utils/helpers";

## Required plugins

This plugin is dependent on other plugins. Make sure to require or import them in your `hardhat.config.js`.

- [@nomiclabs/hardhat-ethers](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers)
- [hardhat-deploy](https://www.npmjs.com/package/hardhat-deploy)

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
  1 0x1F2f81B67d1A718c09221eBeb3F12a7192389663 a06d13800719307ea7e2503ea441c2ea49279d0d600a2eec2887b50928869676
  2 0xF5D27139C99621859e8D1b0f6Be8BF3b8dAca609 c32f4007ffad303db99dee0d79a720e1d70c4b2babf8e33cb28170a16bac467d
  3 0x7E39a9097C975E6A63f1e0ade4b7312cF2854F9c c274d13302891d0d91a60891a48fde8c2860018f8dcb6293dcc0b28a238590b0
  4 0x09859661f2574E80C5a51EA3e0E29cA19D21f513 83c127e5207b70086a702c93f1c9a041f15ce49ee5183ce848f35c64de196eff
  5 0x3AcFe8529FD4C2028f8A26805F9Bf9bAB2cc41eF 48f97204ac4886dfbd819ada04ea31a730c6fc43fcb08900566360ee7402f93b
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

### `faucet`

Transfer native coins in batch. Intended to fill balances for gas fee. See also: `accounts` and `mnemonic`.
- `hh faucet` sends by default 1 ETH to all accounts on current network.
- `hh --from 1 --to 2` sends 1 ETH from account[1] to account[2].
- `hh --amount 0.1` sends 0.1 ETH instead.

### `import`

Import a deployment, i.e. address and ABI, of an existing contract. As a result, addresses and ABI will be saved under `deployments/<network>`. See also: `addr` and `deploy`.
- `hh import Counter <addr>` saves the contract address and ABI
- `hh import Counter <addr> <deployTxHash>` saves the contract address, ABI and deploy transaction receipt.

### `klaytn-node`

Launch a klaytn consensus node. See also: `deploy`.
- `hh klaytn-node` starts a klaytn private chain. Other scripts can refer to this node via `--network localhost`.
- `hh klaytn-node --base-fee` sets the gas fee to 0, allowing any account to send transactions without the native coin.
- `hh --docker-image-id klaytn/klaytn:v1.10.0` launches the specific version of klaytn container image from https://hub.docker.com/r/klaytn/klaytn or from local images.

### `mnemonic`

Print addresses and private keys derived from a [BIP-39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and [BIP-32 path](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki). See also: `accounts`, `faucet`, `keystore-decrypt` and `keystore-encrypt`.
- `hh mnemonic` prints 10 accounts derived from the junk mnemonic (`test test test test test test test test test test test junk`) and the Ethereum wallet path (`m/44'/60'/0'/0/`).
- `hh --index 0-4 --path "m/44'/60'/0'/1234/" "<mnemonic words>"` prints a customized result.

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

