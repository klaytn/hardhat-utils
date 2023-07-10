# hardhat-utils

[Hardhat](https://hardhat.org) utility tasks.

## Installation

```bash
npm install @klaytn/hardhat-utils
```

Import the plugin in your `hardhat.config.js`:

```js
require("@klaytn/hardhat-utils");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@klaytn/hardhat-utils";
```

## Required plugins

This plugin is dependent on other plugins. Make sure to require or import them in your `hardhat.config.js`.

- [@nomiclabs/hardhat-ethers](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers)
- [hardhat-deploy](https://www.npmjs.com/package/hardhat-deploy)

## Tasks


Type `hh <task name> --help` for detailed help. Below paragraphs outlines notable use cases.

### `abi`

Print ABI of a contract. See also: `call`, `docs`, `send`, `smart-flatten` and `upload-abi` .
- `hh abi` prints ABIs of all contracts in your project
- `hh abi Counter` prints the ABI of a specific contract

You can choose output formats
- `hh abi` by default prints in human-readable string format.
- `hh abi --json` prints in JSON format to be used in other apps.

### `accounts`

Print account address and balance. Useful for checking the curent hardhat network. See also: `faucet` and `mnemonic`

- `hh accounts` prints the address and balance of the default accounts for current network.
- `hh accounts --from 0` prints for one specific account. Can be address or index.

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

### `keystore-decrypt`

Decrypt a JSON keystore to get private key. See also: `keystore-encrypt`, `keystore-kip3`, and `mnemonic`.
- `hh keystore-decrypt keystore.json --password 1234` prints the private key.

### `keystore-encrypt`

Encrypt a private key to a keystore.json. See also: `keystore-decrypt` and `mnemonic`.
- `hh keystore-encrypt <privHex> --password 1234` prints a JSON keystore v3.

### `keystore-kip3`

Convert [KIP-3 v4 keystore](https://github.com/klaytn/kips/blob/main/KIPs/kip-3.md) to v3 keystore. See also: `keystore-decrypt`.
- `hh keystore-kip3 v4.json` prints a JSON keystore v4.

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

## Usage

```sh
# Print ABI
hh abi Counter
hh abi Counter --json

# Show addresses and balances of loaded accounts
hh accounts
hh accounts --from 2 --json

# Send coins for gas fee
hh faucet --from 0 --to 1-8 --amount 0.1

# Deploy contracts
hh deploy

# Save deployed contract addreses
hh import Counter 0xaddr

# Get address from deployments
hh addr          # List all addresses
hh addr Counter

# Call contract function
hh call Counter number              # load address from deployments
hh call Counter number --to 0xaddr  # call designated address

# Send transaction to contract
hh send Counter setNumber 123              # load address from deployments
hh send Counter setNumber 123 --to 0xaddr  # call designated address
hh send Counter increment--unsigned        # print unsigned tx
hh send Counter increment --browser        # launch web page for browser wallet

# Flatten and print compilation info and sort out multiple licenses
hh smart-flatten Counter

# Upload ABI to online database
hh upload-abi Counter --byte4 --sigdb

# Work with keystore and mnemonic
hh mnemonic --index 2
hh keystore-decrypt k.json --password 1111
hh keystore-encrypt 0xprivatekey --password 1111 > k.json
hh keystore-kip3 v4.json v3.json
find ./keys/*.json -exec hh keystore-kip3 {} {}_v3.json \;  # batch convert
find ./keys/*.json -exec hh keystore-kip3 {} {} \;  # batch convert in-place

# Launch blockscout explorer for local network
# Requires docker-compose and docker
hh explorer
hh explorer --restart
hh explorer --stop
```
