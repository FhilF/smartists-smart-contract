const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  getAddressFromPrivateKey,
} = require("@stacks/transactions");
const { readFileSync } = require("fs");

const {
  StacksNetwork,
  isMainnet,
  isMocknet,
  keys,
  StacksApiUrl,
  contractName,
  key,
} = require("./config");
const fs = require("fs");

async function deployContract(contract, contractName, replaceFn, nonce) {
  const network = new StacksNetwork();

  const codeBody = fs
    .readFileSync(`./contracts/${contract}.clar`)
    .toString();

  let newCodeBody = codeBody;

  if (replaceFn) {
    newCodeBody = replaceFn(newCodeBody);
  }

  const txDetails = () => {
    if (nonce) {
      return {
        contractName: contractName ? contractName : contract,
        codeBody: newCodeBody,
        senderKey: key.privateKey,
        network,
        nonce,
      };
    } else {
      return {
        contractName: contractName ? contractName : contract,
        codeBody: newCodeBody,
        senderKey: key.privateKey,
        network,
      };
    }
  };

  var transaction = await makeContractDeploy(txDetails());

  const broadcastResponse = await broadcastTransaction(transaction, network);
  const txId = broadcastResponse.txid;
  console.log(network);
  console.log(broadcastResponse);
  console.log(txId);
  console.log(`deploy contract ${contractName ? contractName : contract}`);
}

(async function () {
  if (isMocknet) {
    // await deployContract("nft-trait");
    await deployContract("genuine", null, null, 1n);
  } else {
    // await deployContract("nft-trait");
    await deployContract("genuine", "genuine-v2", (s) => {
      const newCodeBody = s.replace(
        /\STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6/g,
        `${keys.list["testnet-key-2"].addressTestnet}`
      );
      return newCodeBody;
    });
  }
})();
