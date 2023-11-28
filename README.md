# hardhat-utils

[Hardhat](https://hardhat.org) utility tasks and helper functions.

## <a name='Installation'></a>Installation

```bash
npm install @klaytn/hardhat-utils
```

## <a name='Tableofcontents'></a>Table of contents

<!-- https://marketplace.visualstudio.com/items?itemName=joffreykern.markdown-toc -->
<!-- vscode-markdown-toc -->
* [Installation](#Installation)
* [Table of contents](#Tableofcontents)
* [Import the tasks](#Importthetasks)
* [Import the helper functions](#Importthehelperfunctions)
* [Required plugins](#Requiredplugins)
* [Tasks](#Tasks)
	* [Before using tasks](#Beforeusingtasks)
	* [Account tasks](#Accounttasks)
		* [`hh accounts`](#hhaccounts)
		* [`hh decrypt-keystore`](#hhdecrypt-keystore)
		* [`hh faucet`](#hhfaucet)
		* [`hh mnemonic`](#hhmnemonic)
	* [Contract tasks](#Contracttasks)
		* [`hh abi`](#hhabi)
		* [`hh addr`](#hhaddr)
		* [`hh call`](#hhcall)
		* [`hh deploy`](#hhdeploy)
		* [`hh import`](#hhimport)
		* [`hh send`](#hhsend)
		* [`hh upload-abi`](#hhupload-abi)
		* [`hh verify`](#hhverify)
	* [Server launching tasks](#Serverlaunchingtasks)
		* [`hh aa-bundler`](#hhaa-bundler)
		* [`hh explorer`](#hhexplorer)
		* [`hh klaytn-node`](#hhklaytn-node)
* [Helper functions](#Helperfunctions)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=false
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Importthetasks'></a>Import the tasks

- In `hardhat.config.js`
  - Import all tasks
    ```js
    require("@klaytn/hardhat-utils");
    ```
  - Import selectively (see [src/tasks/](./src/tasks) for the list)
    ```js
    require("@klaytn/hardhat-utils/tasks/accounts");
    require("@klaytn/hardhat-utils/tasks/klaytnNode");
    ```
- In `hardhat.config.ts`
  - Import all tasks
    ```ts
    import "@klaytn/hardhat-utils";
    ```
  - Import selectively (see [src/tasks/](./src/tasks) for the list)
    ```ts
    import "@klaytn/hardhat-utils/tasks/accounts";
    import "@klaytn/hardhat-utils/tasks/klaytnNode";
    ```

## <a name='Importthehelperfunctions'></a>Import the helper functions

- In your `.js` script
  ```js
  const { deriveAccounts } = require("@klaytn/hardhat-utils/helpers");
  ```
- In your `.ts` script
  ```ts
  import { deriveAccounts } from "@klaytn/hardhat-utils/helpers";
  ```

## <a name='Requiredplugins'></a>Required plugins

This plugin depends on other plugins. Make sure to require or import them in your `hardhat.config.js` or `hardhat.config.ts`.

- [@nomiclabs/hardhat-ethers](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers)
- [hardhat-deploy](https://www.npmjs.com/package/hardhat-deploy)

```
npm install @nomiclabs/hardhat-ethers hardhat-deploy
```
```ts
// hardhat.config.js
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");

// hardhat.config.ts
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
```

## <a name='Tasks'></a>Tasks

Type `hh <task name> --help` for detailed help. Below paragraphs outlines notable use cases.

### <a name='Beforeusingtasks'></a>Before using tasks

(Recommended) Install hardhat shorthand. Below paragraphs assumes hardhat-shorthand is installed, but you can still use the tasks
with `npx hardhat`.

```
npm install --global hardhat-shorthand
```
```
npx hardhat --version
hh --version
```

Choose the network via

- Configure the `HARDHAT_NETWORK` environment
  ```sh
  export HARDHAT_NETWORK=localhost
  hh accounts
  ```
- Attach the `--network` option at each command
  ```sh
  hh --network localhost accounts
  ```

### <a name='Accounttasks'></a>Account tasks

#### <a name='hhaccounts'></a>`hh accounts`

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

#### <a name='hhdecrypt-keystore'></a>`hh decrypt-keystore`

Decrypt JSON keystore file to print the address and private key.
It also accepts the [KIP-3](https://kips.klaytn.foundation/KIPs/kip-3) (Klaytn keystore v4) in which case
multiple addresses and private keys are printed.

```
hh decrypt-keystore keystore.json --password "mypass"
```
```
    address                                    private key
  0 0x0cc57a3c4E276A37AB0A98ba6899CAf6037996fB 278c3d035328daf04ab2597da96dd2d8868fd61a8837030f7d8a85f27b7f1bad
```

#### <a name='hhfaucet'></a>`hh faucet`

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

#### <a name='hhmnemonic'></a>`hh mnemonic`

Print addresses and private keys derived from a [BIP-39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and [BIP-32 path](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki).
By default, the Hardhat default mnemonic (`test test test test test test test test test test test junk`) and Ethereum deriation path (`m/44'/60'/0'/0/i`) is used.

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

### <a name='Contracttasks'></a>Contract tasks

#### <a name='hhabi'></a>`hh abi`

Print ABIs of compiled or deployed contracts.

```
hh abi
```
```
# contracts/Counter.sol:Counter
function increment()                     // 0xd09de08a
function number() view returns (uint256) // 0x8381f58a
function setNumber(uint256 newNumber)    // 0x3fb5c1cb
```

You can customize the output.

```
# Print in JSON
hh abi --json

# Specify a contract
hh abi Counter
```

#### <a name='hhaddr'></a>`hh addr`

Print the deployed contract addresses.

```
hh addr
```
```
{
  "Counter": "0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37"
}
```

#### <a name='hhcall'></a>`hh call`

Call a read-only function of a deployed contract.

```
hh call Counter number
```
```
[
  "0x00"
]
```

You can customize the call.

```sh
# specify the function signature (in case the ABI is broken or nonexistent)
hh call MyToken "balanceOf(address)" 0x1234

# specify 'from' address (in case the result differs by msg.sender)
hh call --from 1 Counter number

# override contract address (in case the contract is not saved in 'deployments/')
hh call --to 0xaddr Counter number
```

#### <a name='hhdeploy'></a>`hh deploy`

Deploy tasks is not part of hardhat-utils, but describing it here because it is essential for the contract tasks. See [hardhat-deploy plugin docs](https://github.com/wighawag/hardhat-deploy) for details.

Deploys contracts according to the scripts under the `deploy/` directory.

```
hh deploy
```
```
deploying "Counter" (tx: 0x2f15606c21060c20a60ea6a251f031de61cb143b6c64b6eeb9b52d9d2421939b)...: deployed at 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 with 185065 gas
```

#### <a name='hhimport'></a>`hh import`

Import a deployment (i.e. address and ABI) of an existing contract. As a result, addresses and ABI will be saved under `deployments/<network>`.
Use it when the contract is deployed by other party but you want to reference it.

```
hh import Counter 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

#### <a name='hhsend'></a>`hh send`

Send a function invoking transaction to a deployed contract.

```
hh send Counter increment
```
```
sent Counter#increment (tx: 0xd9624e9d5a711812cb77169b3467761eb4952a9656aea970b64dba5102a84a9c)...ok (block 3, gas used: 44778)
emit SetNumber(uint256) [
  "0x01"
]
```

You can customize the transaction.

```sh
# specify the function signature (in case the ABI is broken or nonexistent)
hh send WKLAY "withdraw(uint256)" 1000

# specify 'from' address (in case the result differs by msg.sender)
hh send --from 1 Counter increment

# override contract address (in case the contract is not saved in 'deployments/')
hh send --to 0xaddr Counter increment

# print unsigned transaction (in case private key is in another machine)
hh send --unsigned Counter increment
```

#### <a name='hhupload-abi'></a>`hh upload-abi`

Upload ABI to online database services.

```
hh upload-abi --byte4
```
```
Uploading 8 function and event signatures..
POST https://www.4byte.directory/api/v1/import-abi/ 201 Created
{
  "num_processed": 8,
  "num_imported": 0,
  "num_duplicates": 8,
  "num_ignored": 0
}
```

Type `hh upload-abi --help` to see list of supported services.

```
hh upload-abi --help
```
```
OPTIONS:

  --byte4       Upload to https://www.4byte.directory/
  --sigdb       Upload to https://openchain.xyz/signatures
```

#### <a name='hhverify'></a>`hh verify`

TODO

### <a name='Serverlaunchingtasks'></a>Server launching tasks

#### <a name='hhaa-bundler'></a>`hh aa-bundler`

Launch the ERC-4337 bundler for the current network. Do not use with public endpoints since bundler generates a lot of RPC traffic.
Supports [stackup-bundler](https://github.com/stackup-wallet/stackup-bundler).

```
hh aa-bundler
```
```
[+] Using env: {
  DOCKER_IMAGE: 'stackupwallet/stackup-bundler:latest',
  DOCKER_LISTEN: '0.0.0.0:4337',
  BUNDLER_NODE_RPC: 'http://host.docker.internal:8545/',
  BUNDLER_PRIVATE_KEY: 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  BUNDLER_ENTRYPOINT: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
}
[+] Starting ERC-4337 bundler at http://0.0.0.0:4337/
[+] Building 0.0s (0/0)                                                                                                            docker:desktop-linux
[+] Running 2/0
 ✔ Network bundler_default      Created                                                                                                            0.0s
 ✔ Container bundler-stackup-1  Created                                                                                                            0.0s
Attaching to bundler-stackup-1
bundler-stackup-1  | debconf: delaying package configuration, since apt-utils is not installed
bundler-stackup-1  | checking eth_chainId... {"jsonrpc":"2.0","id":1,"result":"0x7a69"}connected to RPC 'http://host.docker.internal:8545/'
bundler-stackup-1  | badger 2023/11/28 06:48:00 INFO: All 0 tables opened in 0s
bundler-stackup-1  | badger 2023/11/28 06:48:00 INFO: Discard stats nextEmptySlot: 0
bundler-stackup-1  | badger 2023/11/28 06:48:00 INFO: Set nextTxnTs to 0
```

You can customize the instance.

```sh
# Use specific version
hh aa-bundler --docker-image-id stackupwallet/stackup-bundler:latest

# Use different sender account
hh aa-bundler --index 10

# Use different RPC port
hh aa-bundler --port 4000
```

#### <a name='hhexplorer'></a>`hh explorer`

Launch the [BlockScout](https://github.com/blockscout/blockscout) block explorer for current network. Do not use with public endpoints since explorer generates a lot of RPC traffic. Supports BlockScout v5.x with only a few services enabled (including smart-contract-verifier).

After running the task, go to http://localhost:4000.

```
hh explorer
```
```
[+] Using env: {
  DOCKER_RPC_HTTP_URL: 'http://host.docker.internal:8545/',                                                                                               DOCKER_TAG: '4.1.8',                                                                                                                                    DOCKER_LISTEN: '0.0.0.0:4000',
  DOCKER_DISABLE_TRACER: 'true',                                                                                                                          DOCKER_DEBUG: '0'                                                                                                                                     }
[+] Open in the browser: http://localhost:4000                                                                                                          [+] Building 0.0s (0/0)                                                                                                            docker:desktop-linux [+] Running 6/6
 ✔ Network blockscout_default                      Created                                                                                         0.0s  ✔ Container blockscout-db-1                       Started                                                                                         0.0s
 ✔ Container blockscout-frontend-1                 Started                                                                                         0.0s  ✔ Container blockscout-redis_db-1                 Started                                                                                         0.0s
 ✔ Container blockscout-smart-contract-verifier-1  Started                                                                                         0.0s  ✔ Container blockscout-backend-1                  Started                                                                                         0.0s
[+] Building 0.0s (0/0)                                                                                                            docker:desktop-linux [+] Running 6/0
 ✔ Container blockscout-frontend-1                 Running                                                                                         0.0s
 ✔ Container blockscout-smart-contract-verifier-1  Running                                                                                         0.0s
 ✔ Container blockscout-redis_db-1                 Running                                                                                         0.0s
 ✔ Container blockscout-db-1                       Running                                                                                         0.0s
 ✔ Container blockscout-backend-1                  Running                                                                                         0.0s
 ✔ Container blockscout-proxy-1                    Created                                                                                         0.0s
Attaching to blockscout-proxy-1
```

#### <a name='hhklaytn-node'></a>`hh klaytn-node`

Launch a [Klaytn](https://github.com/klaytn/klaytn) consensus node. Analogous to `hh node` or `anvil`.


```
hh klaytn-node
```
```
[+] Using nodekey: ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
[+] Available accounts (each having ${balance} KLAY):
    address                                    private key
  0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  1 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
  2 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
  3 0x90F79bf6EB2c4f870365E785982E1f101E93b906 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
  4 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
  5 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
  6 0x976EA74026E726554dB657fA54763abd0C3a0aa9 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
  7 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
  8 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97
  9 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
[+] Using env: {
  DOCKER_IMAGE: 'klaytn/klaytn:latest',
  DOCKER_LISTEN: '0.0.0.0:8545',
  DOCKER_DEBUG: '0'
}
[+] Starting JSON-RPC server at http://0.0.0.0:8545/
    To attach to the console,
      npx hardhat klaytn-node --attach
    Press Ctrl+C to stop
```

After running the task, type `hh klaytn-node --attach` to use the console.

```
hh klaytn-node --attach
```
```
Welcome to the Klaytn JavaScript console!

instance: Klaytn/v1.11.1/linux-amd64/go1.20.6
 datadir: /klaytn
 modules: admin:1.0 debug:1.0 eth:1.0 governance:1.0 istanbul:1.0 klay:1.0 net:1.0 personal:1.0 rpc:1.0 txpool:1.0 web3:1.0

>
```

You can customize the instance.

```sh
# Use specific version
hh klaytn-node --docker-image-id klaytn/klaytn:dev

# Configure fork level
hh klaytn-node --hardfork cancun

# Configure zero fee network
hh klaytn-node --base-fee 0 --unit-price 0
```

## <a name='Helperfunctions'></a>Helper functions

See [src/helpers/](./src/helpers) for full list.

```ts
import { deriveAccounts } from "@klaytn/hardhat-utils/helpers";

const accounts = deriveAccounts();
console.log(accounts[0].address);
// 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

