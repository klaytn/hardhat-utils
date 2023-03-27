"use strict";

const Web3Modal = window.Web3Modal.default;

let web3Modal;
let provider;
let selectedAccount;
let targetNet;
let targetTx;

$("document").ready(function() {
  const providerOptions = {
  };

  web3Modal = new Web3Modal({
    providerOptions,
  });

  $("#btn-connect").click(onConnect);
  $("#btn-disconnect").click(onDisconnect);
  $("#btn-send").click(onSend);

  $(".connected").hide();
  $(".disconnected").show();

  refreshTarget();
});

async function onConnect() {
  try {
    provider = await web3Modal.connect();
  } catch(e) {
    if (e instanceof Error) {
      alert("Cannot connect to wallet: " + e.message);
      console.log(e);
      return;
    }
  }

  provider.on("accountsChanged", refreshAccount);
  provider.on("chainChanged", refreshAccount);
  provider.on("networkChanged", refreshAccount);

  await refreshAccount();
  await switchNetwork();

  $(".connected").show();
  $(".disconnected").hide();
}

async function onDisconnect() {
  if (provider.close) {
    await provider.close();
    await web3Modal.clearCachedProvider();
    provider = null;
  }
  selectedAccount = null;

  $(".connected").hide();
  $(".disconnected").show();
}

async function onSend() {
  let txhash;
  try {
    txhash = await provider.request({
      method: 'eth_sendTransaction',
      params: [ targetTx ],
    });
  } catch (e) {
    alert(`Wallet error: ${e.code}: ${e.message}`);
    throw e;
  }
  $("#btn-send").prop("disabled", true);

  $("#sent-txhash").text(txhash);
  if (targetNet.blockExplorerUrls && targetNet.blockExplorerUrls[0]) {
    $("#sent-txhash").attr("href", targetNet.blockExplorerUrls[0] + "/tx/" + txhash);
  }

  $.ajax(`/sent?txhash=${txhash}`);
}

async function refreshTarget() {
  $.ajax("/target")
    .done((target) => {
      target = JSON.parse(target);
      targetNet = target.net;
      targetTx = target.tx;
      console.log(target);

      $("#target-net").text(JSON.stringify({
        chainId: parseInt(targetNet.chainId),
        name: targetNet.chainName,
        url: targetNet.rpcUrls[0],
      }, null, 2));
      $("#unsigned-tx").text(JSON.stringify(targetTx, null, 2));

      $(".targetacquired").show();
    });
}

async function refreshAccount() {
  const web3 = new Web3(provider);

  const chainId = await web3.eth.getChainId();
  $("#connected-network").text(`chainId = ${chainId}`);

  const accounts = await web3.eth.getAccounts();
  const account = accounts[0];
  selectedAccount = account;
  $("#selected-account").text(`${account}`);

  let balance = await web3.eth.getBalance(account);
  balance = web3.utils.fromWei(balance, "ether");
  balance = parseFloat(balance).toFixed(4);
  $("#selected-balance").text(`${balance} ETH`);
}

async function switchNetwork() {
  const web3 = new Web3(provider);
  const chainId = await web3.eth.getChainId();
  if (chainId == parseInt(targetNet.chainId)) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetNet.chainId }]
    });
    return;
  } catch (e) {
    if (e.code == 4902 || e.data && e.data.originalError && e.data.originalError.code == 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [ targetNet ]
      });
    } else {
      alert(`Wallet error: ${e.code}: ${e.message}`);
      throw e;
    }
  }
}
