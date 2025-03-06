import chalk from "chalk";
import Web3 from "web3";
import fs from "fs";

const web3 = new Web3(new Web3.providers.HttpProvider("https://api.avax.network/ext/bc/C/rpc"));
function loadData() {
  try {
    const proxies = fs
      .readFileSync("privateKeys.txt", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean); // Remove empty lines

    if (proxies.length === 0) {
      console.error("❌ No privateKeys found in privateKeys.txt!");
      process.exit(1);
    }

    return proxies;
  } catch (error) {
    console.error("❌ Error reading privateKeys.txt:", error.message);
    process.exit(1);
  }
}

const main = async () => {
  const privateKeys = loadData();
  const addresses = [];
  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i].startsWith("0x") ? privateKeys[i] : `0x${privateKeys[i]}`;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const address = account.address;
    if (address) {
      addresses.push(address);
    }
  }
  fs.writeFileSync("wallets.txt", addresses.join("\n"));
  console.log(chalk.green(`�� ${addresses.length} wallet addresses saved to wallets.txt!`));
  return true;
};
main();
