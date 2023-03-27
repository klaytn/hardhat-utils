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

TBD

## Configuration

TBD

## Usage

```sh
# Print ABI
hh abi Counter
hh abi Counter --json

# Show addresses and balances of loaded accounts
hh accounts
hh accounts --from 2 --json

# Get address from deployments
hh addr          # List all addresses
hh addr Counter

# Call contract function
hh call Counter number              # load address from deployments
hh call Counter number --to 0xaddr  # call designated address

# Send transaction to contract
hh send Counter setNumber 123              # load address from deployments
hh send Counter setNumber 123 --to 0xaddr  # call designated address
hh send Counter setNumber 123 --from 0xaddr --unsigned  # print unsigned tx

# Flatten and print compilation info and sort out multiple licenses
hh smart-flatten Counter

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
