require("dotenv").config();
const fs = require("fs");
const {
  StacksTestnet,
  StacksMainnet,
  StacksMocknet,
} = require("@stacks/network");


const isMainnet = JSON.parse(process.env.MAINNET);
const isMocknet = JSON.parse(process.env.MOCKNET);

const StacksApiUrl = isMainnet
  ? "https://stacks-node-api.mainnet.stacks.co"
  : isMocknet
  ? "http://localhost:3999"
  : "https://stacks-node-api.testnet.stacks.co";

const StacksNetwork = isMainnet
  ? StacksMainnet
  : isMocknet
  ? StacksMocknet
  : StacksTestnet;

const keys = {
  list: JSON.parse(fs.readFileSync("./key.json").toString()),
};

const key = isMocknet ? keys.list["mocknet-key-1"] : keys.list["testnet-key-1"]

const contractName = "genuine"

module.exports = {
  keys,
  key,
  StacksNetwork,
  StacksApiUrl,
  isMainnet,
  isMocknet,
  contractName
};
