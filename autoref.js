import Web3 from "web3";
import axios from "axios";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { config } from "./config.js";
import { banner } from "./banner.js";
import { ethers } from "ethers";
import chalk from "chalk";

// 🔹 Load proxy list from file
function loadProxies() {
  try {
    const proxies = fs
      .readFileSync("proxies.txt", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean); // Remove empty lines

    if (proxies.length === 0) {
      console.error("❌ No proxies found in proxies.txt!");
      process.exit(1);
    }

    return proxies;
  } catch (error) {
    console.error("❌ Error reading proxies.txt:", error.message);
    process.exit(1);
  }
}

// 🔹 Rotate proxy for each request
let proxyIndex = 0;
const proxies = loadProxies();

function getNextProxy() {
  const proxy = proxies[proxyIndex];
  proxyIndex = (proxyIndex + 1) % proxies.length; // Cycle through proxies
  return proxy;
}

// 🔹 Configure Axios with a rotating proxy
function createAxiosInstance(proxyUrl) {
  return axios.create({
    baseURL: "https://api-kiteai.bonusblock.io/api/auth",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    httpsAgent: new HttpsProxyAgent(proxyUrl),
  });
}

// 🔥 Sleep function to prevent rate limits
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔹 Fetch nonce from API
async function getNonce(nonce, axiosInstance) {
  await sleep(2000); // Delay to prevent rate limits
  try {
    const payload = { nonce };
    const response = await axiosInstance.post("/get-auth-ticket", payload);
    return response.data?.payload?.trim() || null;
  } catch (error) {
    console.error("❌ Error fetching nonce:", error.response?.data || error.message);
    return null;
  }
}

// 🔹 Sign nonce with private key
async function signMessage(privateKey, message, web3Instance) {
  try {
    const { signature } = web3Instance.eth.accounts.sign(message, privateKey);
    return signature;
  } catch (error) {
    console.error("❌ Error signing message:", error.message);
    return null;
  }
}

// 🔹 Send signed message to API
async function authenticate(walletAddress, signature, nonce, axiosInstance) {
  try {
    const payload = {
      blockchainName: "ethereum",
      nonce: nonce,
      referralId: config.code,
      signedMessage: signature,
    };

    const response = await axiosInstance.post("/eth", payload);
    return response.data || null;
  } catch (error) {
    console.error("❌ Authentication error:", error.response?.data || error.message);
    return null;
  }
}

// 🔹 Get the current proxy IP
async function getCurrentIP(axiosInstance) {
  try {
    const response = await axiosInstance.get("https://api64.ipify.org?format=json");
    return response.data.ip;
  } catch (error) {
    console.error("❌ Error fetching proxy IP:", error.response?.data || error.message);
    return "Unknown";
  }
}

// 🔹 Register a wallet using rotating proxies
async function registerWallet(wallet) {
  const proxyUrl = getNextProxy();
  const axiosInstance = createAxiosInstance(proxyUrl);
  const web3Instance = new Web3(
    new Web3.providers.HttpProvider("https://rpc-sepolia.rockx.com/", {
      agent: new HttpsProxyAgent(proxyUrl),
    })
  );

  // 🔥 Get proxy IP before registering
  const currentIP = await getCurrentIP(axiosInstance);
  console.log(`📝 Registering wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
  console.log(`🌍 Current Proxy IP: ${currentIP}`);

  const nonce = `timestamp_${Date.now()}`;
  const authTicket = await getNonce(nonce, axiosInstance);

  if (!authTicket) {
    console.error("❌ Failed to fetch auth ticket. Retrying with next proxy...");
    return false; // Skip to next wallet with new proxy
  }

  const signature = await signMessage(wallet.privateKey, authTicket, web3Instance);
  if (!signature) {
    console.error("❌ Failed to sign message.");
    return false;
  }

  const authData = await authenticate(wallet.address, signature, nonce, axiosInstance);
  if (!authData || !authData.success) {
    console.error("❌ Authentication failed.");
    return false;
  }

  console.log(chalk.magenta(`✅ Wallet ${wallet.address} registration successful!`));
  return true;
}

function createNewWallet() {
  const wallet = ethers.Wallet.createRandom();

  const walletDetails = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
  };

  console.log(chalk.green(`New Ethereum Wallet created Address: ${walletDetails.address}`));

  return walletDetails;
}

// 🔥 Start wallet registration process
async function startRegistration() {
  console.log(`🔹 Starting buff ref for ${config.code}...`);
  for (let i = 0; i < config.number_ref; i++) {
    const wallet = createNewWallet();
    const isRegisted = await registerWallet(wallet);
    if (isRegisted) {
      // Save wallet details in JSON format
      const walletJson = JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic
      });

      fs.appendFileSync("wallets_ref.txt", `${walletJson}\n`);
      fs.appendFileSync("wallets.txt", `${wallet.address}\n`);
      fs.appendFileSync("privateKeys_ref.txt", `\n${wallet.privateKey}`);
    }
  }
}

startRegistration();