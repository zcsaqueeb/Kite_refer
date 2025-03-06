// Import dependencies
import chalk from "chalk";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createInterface } from "readline";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import axios from "axios";
import fs from "fs";
import { banner } from "./banner.js";
import { questions } from "./questions.js";
import { baseHeader } from "./core.js";
import { checkBaseUrl } from "./checkAPI.js";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ClientAPI {
  constructor(accountIndex, initData, baseURL) {
    this.accountIndex = accountIndex;
    this.queryId = initData;
    this.baseURL = baseURL;
  }
}

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Rate Limiting Configuration
const rateLimitConfig = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 10000,
  requestsPerMinute: 15,
  intervalBetweenCycles: 15000,
  walletVerificationRetries: 3,
};

let lastRequestTime = Date.now();
let isRunning = true;

// Handle CTRL+C to gracefully stop the script
process.on("SIGINT", () => {
  console.log(chalk.yellow("\n\n🛑 Stopping the script gracefully..."));
  isRunning = false;
  setTimeout(() => {
    console.log(chalk.green("👋 Thank you for using Kite AI!"));
    process.exit(0);
  }, 1000);
});

const proxyConfig = {
  enabled: false,
  current: "direct",
  proxies: [],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateDelay = (attempt) => {
  return Math.min(rateLimitConfig.maxDelay, rateLimitConfig.baseDelay * Math.pow(2, attempt));
};

// Modified to use correct endpoint and handle specific error cases
async function verifyWallet(wallet) {
  try {
    // Skip wallet verification and proceed with usage reporting
    return true;
  } catch (error) {
    console.log(chalk.yellow("⚠️ Proceeding without wallet verification..."));
    return true;
  }
}

const checkRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minimumInterval = 60000 / rateLimitConfig.requestsPerMinute;

  if (timeSinceLastRequest < minimumInterval) {
    const waitTime = minimumInterval - timeSinceLastRequest;
    await sleep(waitTime);
  }

  lastRequestTime = Date.now();
};

function loadProxiesFromFile() {
  try {
    const proxyList = fs
      .readFileSync("proxies.txt", "utf-8")
      .split("\n")
      .filter((line) => line.trim())
      .map((proxy) => proxy.trim());
    proxyConfig.proxies = proxyList;
    console.log(chalk.green(`✅ Successfully loaded ${proxyList.length} proxies from file`));
  } catch (error) {
    console.log(chalk.yellow("⚠️ proxies.txt not found or empty. Using direct connection."));
  }
}

function getNextProxy() {
  if (!proxyConfig.enabled || proxyConfig.proxies.length === 0) {
    return null;
  }
  const proxy = proxyConfig.proxies.shift();
  proxyConfig.proxies.push(proxy);
  return proxy;
}

function createProxyAgent(proxyUrl) {
  try {
    if (!proxyUrl) return null;

    if (proxyUrl.startsWith("socks")) {
      return new SocksProxyAgent(proxyUrl);
    } else if (proxyUrl.startsWith("http")) {
      return {
        https: new HttpsProxyAgent(proxyUrl),
        http: new HttpProxyAgent(proxyUrl),
      };
    }
    return null;
  } catch (error) {
    console.error(chalk.red(`⚠️ Error creating proxy agent: ${error.message}`));
    return null;
  }
}

function createAxiosInstance(proxyUrl = null) {
  const config = {
    headers: { ...baseHeader },
  };

  if (proxyUrl) {
    const proxyAgent = createProxyAgent(proxyUrl);
    if (proxyAgent) {
      if (proxyAgent.https) {
        config.httpsAgent = proxyAgent.https;
        config.httpAgent = proxyAgent.http;
      } else {
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
      }
    }
  }

  return axios.create(config);
}

function displayAppTitle() {
  console.log(banner);
}

async function sendRandomQuestion(agent, agentName, axiosInstance) {
  try {
    await checkRateLimit();

    const randomQuestions = questions[agentName] || Object.values(questions).flat();
    const randomQuestion = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];

    const payload = { message: randomQuestion, stream: false };
    const response = await axiosInstance.post(`https://${agent.toLowerCase().replace("_", "-")}.stag-vxzy.zettablock.com/main`, payload);

    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red("⚠️ Error:"), error.response ? error.response.data : error.message);
    return null;
  }
}

async function reportUsage(wallet, options, retryCount = 0) {
  try {
    await checkRateLimit();

    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {},
    };

    await axios.post(`https://quests-usage-dev.prod.zettablock.com/api/report_usage`, payload, {
      headers: { ...baseHeader },
    });

    console.log(chalk.green("✅ Usage data reported successfully!\n"));
  } catch (error) {
    const isRateLimit = error.response?.data?.error?.includes("Rate limit exceeded");

    if (isRateLimit && retryCount < rateLimitConfig.maxRetries) {
      const delay = calculateDelay(retryCount);
      console.log(chalk.yellow(`⏳ Rate limit detected, retrying in ${delay / 1000} seconds...`));
      await sleep(delay);
      return reportUsage(wallet, options, retryCount + 1);
    }

    // Log the error but continue execution
    console.log(chalk.yellow("⚠️ Usage report issue, continuing execution..."));
  }
}

function loadWalletsFromFile() {
  try {
    return fs
      .readFileSync("wallets.txt", "utf-8")
      .split("\n")
      .filter((wallet) => wallet.trim())
      .map((wallet) => wallet.trim().toLowerCase());
  } catch (error) {
    console.error(chalk.red("⚠️ Error: wallets.txt not found"));
    return [];
  }
}

async function processAgentCycle(wallet, agentId, agentName, useProxy) {
  try {
    const proxy = useProxy ? getNextProxy() : null;
    const axiosInstance = createAxiosInstance(proxy);

    if (proxy) {
      console.log(chalk.blue(`🌐 Using proxy: ${proxy}`));
    }

    const nanya = await sendRandomQuestion(agentId, agentName, axiosInstance);

    if (nanya) {
      console.log(chalk.cyan("❓ Question:"), chalk.bold(nanya.question));
      console.log(chalk.green("💡 Answer:"), chalk.italic(nanya?.response?.content ?? ""));

      await reportUsage(wallet, {
        agent_id: agentId,
        question: nanya.question,
        response: nanya?.response?.content ?? "No answer",
      });
    }
  } catch (error) {
    console.error(chalk.red("⚠️ Error in agent cycle:"), error.message);
  }
}

// const AI_ENDPOINTS = {
//   "https://deployment-uu9y1z4z85rapgwkss1muuiz.stag-vxzy.zettablock.com/main": {
//     agent_id: "deployment_UU9y1Z4Z85RAPGwkss1mUUiZ",
//     name: "Kite AI Assistant",
//     questions: questions["Kite AI Assistant"],
//   },
//   "https://deployment-ecz5o55dh0dbqagkut47kzyc.stag-vxzy.zettablock.com/main": {
//     agent_id: "deployment_ECz5O55dH0dBQaGKuT47kzYC",
//     name: "Crypto Price Assistant",
//     questions: questions["Crypto Price Assistant"],
//   },
//   "https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main": {
//     agent_id: "deployment_SoFftlsf9z4fyA3QCHYkaANq",
//     name: "Transaction Analyzer",
//     questions: questions["Transaction Analyzer"],
//   },
// };

async function startContinuousProcess(wallet, endpoint, useProxy) {
  console.log(chalk.blue(`\n📌 Processing wallet: ${wallet}`));
  console.log(chalk.yellow("Press Ctrl+C to stop the script\n"));

  const agents = endpoint.agents;
  // deployment_nC3y3k7zy6gekSZMCSordHu7: "Crypto Price Assistant",
  // deployment_SoFftlsf9z4fyA3QCHYkaANq: "Transaction Analyzer",

  let cycleCount = 1;

  while (isRunning) {
    console.log(chalk.magenta(`\n🔄 Cycle #${cycleCount}`));
    console.log(chalk.dim("----------------------------------------"));

    for (const [agentId, agentName] of Object.entries(agents)) {
      if (!isRunning) break;

      console.log(chalk.magenta(`\n🤖 Using Agent: ${agentName}`));
      await processAgentCycle(wallet, agentId, agentName, useProxy);

      if (isRunning) {
        console.log(chalk.yellow(`⏳ Waiting ${rateLimitConfig.intervalBetweenCycles / 1000} seconds before next interaction...`));
        await sleep(rateLimitConfig.intervalBetweenCycles);
      }
    }

    cycleCount++;
    console.log(chalk.dim("----------------------------------------"));
  }
}

async function main() {
  displayAppTitle();

  const askMode = () => {
    return new Promise((resolve) => {
      readline.question(chalk.yellow("🔄 Choose connection mode (1: No Proxy, 2: Proxy): "), resolve);
    });
  };

  try {
    const mode = await askMode();
    proxyConfig.enabled = mode === "2";

    if (proxyConfig.enabled) {
      loadProxiesFromFile();
    }

    const { endpoint, message } = await checkBaseUrl();
    if (!endpoint) return console.log(chalk.red(`Không thể tìm thấy ID API, thử lại sau!`));
    console.log(chalk.yellow(`${message}`));

    const walletMode = "2";
    let wallets = [];

    wallets = loadWalletsFromFile();
    if (wallets.length === 0) {
      console.log(chalk.red("❌ No wallets loaded. Stopping program."));
      readline.close();
      return;
    }

    for (const wallet of wallets) {
      await startContinuousProcess(wallet, endpoint, proxyConfig.enabled);
    }
  } catch (error) {
    console.error(chalk.red("⚠️ An error occurred:"), error);
    readline.close();
  }
}

main();
