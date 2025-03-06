import fetch from "node-fetch";
import chalk from "chalk";
import readline from "readline";
import fs from "fs/promises";
import { banner } from "./banner.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url"; // Import necessary functions for file URL conversion
import { dirname } from "path"; // Import necessary functions for path manipulation
import { config } from "./config.js";
import { questions } from "./questions.js";
import { baseHeader } from "./core.js";
import { checkBaseUrl } from "./checkAPI.js";
const __filename = fileURLToPath(import.meta.url); // Get the current module's filename
const __dirname = dirname(__filename);

async function loadWallets() {
  try {
    const data = await fs.readFile("wallets.txt", "utf8");
    const wallets = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    if (wallets.length === 0) {
      throw new Error("No wallets found in wallets.txt");
    }
    return wallets;
  } catch (err) {
    console.log(`${chalk.red("[ERROR]")} Error reading wallets.txt: ${err.message}`);
    process.exit(1);
  }
}

async function loadProxies() {
  try {
    const data = await fs.readFile("proxies.txt", "utf8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((proxy) => {
        if (proxy.includes("://")) {
          const url = new URL(proxy);
          const protocol = url.protocol.replace(":", "");
          const auth = url.username ? `${url.username}:${url.password}` : "";
          const host = url.hostname;
          const port = url.port;
          return { protocol, host, port, auth };
        } else {
          const parts = proxy.split(":");
          let [protocol, host, port, user, pass] = parts;
          protocol = protocol.replace("//", "");
          const auth = user && pass ? `${user}:${pass}` : "";
          return { protocol, host, port, auth };
        }
      });
  } catch (err) {
    console.log(`${chalk.yellow("[INFO]")} No proxy.txt found or error reading file. Using direct connection.`);
    return [];
  }
}

function createAgent(proxy) {
  if (!proxy) return null;

  const { protocol, host, port, auth } = proxy;
  const authString = auth ? `${auth}@` : "";
  const proxyUrl = `${protocol}://${authString}${host}:${port}`;

  return protocol.startsWith("socks") ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
}

class WalletStatistics {
  constructor(AI_ENDPOINTS) {
    this.agentInteractions = {};
    for (const endpoint in AI_ENDPOINTS) {
      this.agentInteractions[AI_ENDPOINTS[endpoint].name] = 0;
    }
    this.totalPoints = 0;
    this.totalInteractions = 0;
    this.lastInteractionTime = null;
    this.successfulInteractions = 0;
    this.failedInteractions = 0;
  }
}

class WalletSession {
  constructor(walletAddress, sessionId, AI_ENDPOINTS) {
    this.walletAddress = walletAddress;
    this.sessionId = sessionId;
    this.dailyPoints = 0;
    this.startTime = new Date();
    this.nextResetTime = new Date(this.startTime.getTime() + 24 * 60 * 60 * 1000);
    this.statistics = new WalletStatistics(AI_ENDPOINTS);
  }

  updateStatistics(agentName, success = true) {
    this.statistics.agentInteractions[agentName]++;
    this.statistics.totalInteractions++;
    this.statistics.lastInteractionTime = new Date();
    if (success) {
      this.statistics.successfulInteractions++;
      this.statistics.totalPoints += 10; // Points per successful interaction
    } else {
      this.statistics.failedInteractions++;
    }
  }

  printStatistics() {
    console.log(`\n${chalk.blue(`[Session ${this.sessionId}]`)} ${chalk.green(`[${this.walletAddress}]`)} | ${chalk.cyan("💰 Total Points:")} ${chalk.green(this.statistics.totalPoints)} `);
  }
}

class KiteAIAutomation {
  constructor(walletAddress, proxyList = [], sessionId, AI_ENDPOINTS) {
    this.AI_ENDPOINTS = AI_ENDPOINTS;
    this.session = new WalletSession(walletAddress, sessionId, AI_ENDPOINTS);
    this.proxyList = proxyList;
    this.currentProxyIndex = 0;
    this.MAX_DAILY_POINTS = 200;
    this.POINTS_PER_INTERACTION = 10;
    this.MAX_DAILY_INTERACTIONS = this.MAX_DAILY_POINTS / this.POINTS_PER_INTERACTION;
    this.isRunning = true;
  }

  getCurrentProxy() {
    if (this.proxyList.length === 0) return null;
    return this.proxyList[this.currentProxyIndex];
  }

  rotateProxy() {
    if (this.proxyList.length === 0) return null;
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
    const proxy = this.getCurrentProxy();
    this.logMessage("🔄", `Rotating to proxy: ${proxy.protocol}://${proxy.host}:${proxy.port}`, "cyan");
    return proxy;
  }

  logMessage(emoji, message, color = "white") {
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const sessionPrefix = chalk.blue(`[Session ${this.session.sessionId}]`);
    const walletPrefix = chalk.green(`[${this.session.walletAddress.slice(0, 6)}...]`);
    console.log(`${chalk.yellow(`[${timestamp}]`)} ${sessionPrefix} ${walletPrefix} ${chalk[color](`${emoji} ${message}`)}`);
  }

  resetDailyPoints() {
    const currentTime = new Date();
    if (currentTime >= this.session.nextResetTime) {
      this.logMessage("✨", "Starting new 24-hour reward period", "green");
      this.session.dailyPoints = 0;
      this.session.nextResetTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
      return true;
    }
    return false;
  }

  async shouldWaitForNextReset() {
    if (this.session.dailyPoints >= this.MAX_DAILY_POINTS) {
      const waitSeconds = (this.session.nextResetTime - new Date()) / 1000;
      if (waitSeconds > 0) {
        this.logMessage(
          "⏳",
          `Maximum daily points (${this.MAX_DAILY_POINTS}) reached | Next reset: ${this.session.nextResetTime.toISOString().replace("T", " ").slice(0, 19)}`,
          "yellow"
        );
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        this.resetDailyPoints();
      }
      return true;
    }
    return false;
  }

  async getRecentTransactions() {
    this.logMessage("🔍", "Scanning recent transactions...", "white");
    const url = "https://testnet.kitescan.ai/api/v2/transactions";
    const params = new URLSearchParams({
      filter: "validated",
    });

    try {
      const agent = createAgent(this.getCurrentProxy());
      const response = await fetch(`${url}?${params}`, {
        agent,
        headers: {
          ...baseHeader,
        },
      });
      const data = await response.json();
      const hashes = data.items?.map((item) => item.hash) || [];
      this.logMessage("📊", `Found ${hashes.length} recent transactions`, "magenta");
      return hashes;
    } catch (e) {
      this.logMessage("❌", `Transaction fetch error: ${e}`, "red");
      this.rotateProxy();
      return [];
    }
  }

  async getStatus() {
    this.logMessage("Getting data user...", "white");
    const url = "https://api-kiteai.bonusblock.io/api/kite-ai/get-status";

    try {
      const agent = createAgent(this.getCurrentProxy());
      const response = await fetch(`${url}`, {
        agent,
        headers: {
          ...baseHeader,
        },
      });
      const data = await response.json();
      console.log(data);
      // const hashes = data.payload

      return data;
    } catch (e) {
      this.logMessage("❌", `Transaction fetch error: ${e}`, "red");
      this.rotateProxy();
      return [];
    }
  }

  async sendAiQuery(endpoint, message) {
    const agent = createAgent(this.getCurrentProxy());
    const headers = {
      ...baseHeader,
      Accept: "text/event-stream",
    };
    const data = {
      message,
      stream: true,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        agent,
        headers,
        body: JSON.stringify(data),
      });

      const sessionPrefix = chalk.blue(`[Session ${this.session.sessionId}]`);
      const walletPrefix = chalk.green(`[${this.session.walletAddress.slice(0, 6)}...]`);
      process.stdout.write(`${sessionPrefix} ${walletPrefix} ${chalk.cyan("🤖 AI Response: ")}`);

      let accumulatedResponse = "";

      for await (const chunk of response.body) {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr === "[DONE]") break;

              const jsonData = JSON.parse(jsonStr);
              const content = jsonData.choices?.[0]?.delta?.content || "";
              if (content) {
                accumulatedResponse += content;
                process.stdout.write(chalk.magenta(content));
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      console.log();
      return accumulatedResponse.trim();
    } catch (e) {
      this.logMessage("❌", `AI query error: ${e}`, "red");
      this.rotateProxy();
      return "";
    }
  }

  async reportUsage(endpoint, message, response) {
    this.logMessage("📝", "Recording interaction...", "white");
    const url = "https://quests-usage-dev.prod.zettablock.com/api/report_usage";
    const data = {
      wallet_address: this.session.walletAddress,
      agent_id: this.AI_ENDPOINTS[endpoint].agent_id,
      request_text: message,
      response_text: response,
      request_metadata: {},
    };

    try {
      const agent = createAgent(this.getCurrentProxy());
      const result = await fetch(url, {
        method: "POST",
        agent,
        headers: {
          ...baseHeader,
        },
        body: JSON.stringify(data),
      });
      return result.status === 200;
    } catch (e) {
      this.logMessage("❌", `Usage report error: ${e}`, "red");
      this.rotateProxy();
      return false;
    }
  }

  async runAccount() {
    this.logMessage(
      "💼",
      `Wallet: ${this.session.walletAddress} | Daily Target: ${this.MAX_DAILY_POINTS} points (${this.MAX_DAILY_INTERACTIONS} interactions) | Next Reset: ${this.session.nextResetTime
        .toISOString()
        .replace("T", " ")
        .slice(0, 19)}`,
      "cyan"
    );
    let interactionCount = 0;
    try {
      while (this.isRunning) {
        this.resetDailyPoints();
        await this.shouldWaitForNextReset();
        interactionCount++;
        this.logMessage(
          "🔄",
          `[Session ${this.session.sessionId}] Interaction #${interactionCount} | Progress: ${this.session.dailyPoints + this.POINTS_PER_INTERACTION}/${
            this.MAX_DAILY_POINTS
          } points | Next Reset: ${this.session.nextResetTime.toISOString().replace("T", " ").slice(0, 19)}`,
          "magenta"
        );

        const transactions = await this.getRecentTransactions();
        this.AI_ENDPOINTS["https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main"].questions = transactions.map((tx) => `Analyze this transaction in detail: ${tx}`);

        const endpoints = Object.keys(this.AI_ENDPOINTS);
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const questions = this.AI_ENDPOINTS[endpoint].questions;
        const question = questions[Math.floor(Math.random() * questions.length)];

        this.logMessage("🤖", `AI System: ${this.AI_ENDPOINTS[endpoint].name} | Agent ID: ${this.AI_ENDPOINTS[endpoint].agent_id} | Query: ${question}`, "cyan");

        const response = await this.sendAiQuery(endpoint, question);
        let interactionSuccess = false;

        if (await this.reportUsage(endpoint, question, response)) {
          this.logMessage("✅", "Interaction successfully recorded", "green");
          this.session.dailyPoints += this.POINTS_PER_INTERACTION;
          interactionSuccess = true;
        } else {
          this.logMessage("⚠️", "Interaction recording failed", "red");
        }

        // Update statistics for this interaction
        this.session.updateStatistics(this.AI_ENDPOINTS[endpoint].name, interactionSuccess);

        // Display current statistics after each interaction
        this.session.printStatistics();

        const delay = Math.random() * 2 + 1;
        this.logMessage("⏳", `Cooldown: ${delay.toFixed(1)} seconds...`, "yellow");
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    } catch (e) {
      if (e.name === "AbortError") {
        this.logMessage("🛑", "Process terminated by user", "yellow");
      } else {
        this.logMessage("❌", `Error: ${e}`, "red");
      }
    }
  }

  stop() {
    this.isRunning = false;
  }
}

async function runWorker(workerData) {
  const { wallet, accountIndex, proxy, proxyList, AI_ENDPOINTS } = workerData;
  const to = new KiteAIAutomation(wallet, proxyList, accountIndex + 1, AI_ENDPOINTS);
  try {
    await to.runAccount();
    parentPort.postMessage({
      accountIndex,
    });
  } catch (error) {
    parentPort.postMessage({ accountIndex, error: error.message });
  } finally {
    if (!isMainThread) {
      parentPort.postMessage("taskComplete");
    }
  }
}

async function main() {
  console.log(banner);
  console.log(`${chalk.cyan("📝 Register First:")} ${chalk.green("https://testnet.gokite.ai?r=kMDdRk2k")}`);

  // Load wallets and proxies
  const wallets = await loadWallets();
  const proxies = await loadProxies();

  console.log(`${chalk.cyan("📊 Loaded:")} ${chalk.green(wallets.length)} wallets and ${chalk.green(proxies.length)} proxies\n`);

  if (proxies.length === 0) console.log("No proxies found in proxy.txt - running without proxies");
  if (wallets.length === 0) {
    console.log('No Wallets found..."');
    return;
  }

  const { endpoint, message } = await checkBaseUrl();
  if (!endpoint) return console.log(chalk.red(`Không thể tìm thấy agent Interactions, thử lại sau!`));
  console.log(chalk.yellow(`${message}`));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const AI_ENDPOINTS = endpoint.apis.reduce((acc, item) => {
    acc[item.api] = {
      agent_id: item.agent_id,
      name: item.name,
      questions: questions[item.name],
    };
    return acc;
  }, {});

  // {
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

  console.log("Starting run Program with all Wallets:", wallets.length);
  let maxThreads = config.max_threads;

  while (true) {
    let currentIndex = 0;
    const errors = [];

    while (currentIndex < wallets.length) {
      const workerPromises = [];
      const batchSize = Math.min(maxThreads, wallets.length - currentIndex);
      for (let i = 0; i < batchSize; i++) {
        const worker = new Worker(__filename, {
          workerData: {
            wallet: wallets[currentIndex],
            accountIndex: currentIndex,
            proxy: proxies[currentIndex % proxies.length],
            proxyList: proxies,
            AI_ENDPOINTS,
          },
        });

        workerPromises.push(
          new Promise((resolve) => {
            worker.on("message", (message) => {
              if (message === "taskComplete") {
                worker.terminate();
              }
              // if (settings.ENABLE_DEBUG) {
              //   console.log(message);
              // }
              resolve();
            });
            worker.on("error", (error) => {
              console.log(`Lỗi worker cho tài khoản ${currentIndex}: ${error.message}`);
              worker.terminate();
              resolve();
            });
            worker.on("exit", (code) => {
              worker.terminate();
              if (code !== 0) {
                errors.push(`Worker cho tài khoản ${currentIndex} thoát với mã: ${code}`);
              }
              resolve();
            });
          })
        );

        currentIndex++;
      }

      await Promise.all(workerPromises);

      if (errors.length > 0) {
        errors.length = 0;
      }

      if (currentIndex < wallets.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    console.log(chalk.magenta(`[${new Date().toISOString()}] Completed all accounts wait ${config.time_sleep} minutes...`));
    await new Promise((resolve) => setTimeout(resolve, config.time_sleep * 60 * 1000));
  }
}

if (isMainThread) {
  main().catch((error) => {
    console.log("Lỗi rồi:", error);
    process.exit(1);
  });
} else {
  runWorker(workerData);
}
