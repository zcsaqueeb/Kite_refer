# **KiteAI Tool**

KiteAI is a Node.js-based tool that works with both proxy and no-proxy setups. It offers features like automatic API updates and specialized functionality for blockchain, cryptocurrency, and Web3 tasks.  

**🌐 Website Link:** [KiteAI](https://testnet.gokite.ai/?r=kMDdRk2k)

---

## **Features**
- **Automatic API Updates**: Seamlessly updates APIs with the newest changes.  
- **Multi-Functionality**: Supports tasks like assisting with blockchain-related queries, crypto price analysis, and transaction data insights.
- **Customizable Configuration**: Personalize the tool via easy-to-edit configuration files.
- **Proxy/No-Proxy Support**: Flexible options for setup.

---

## **Setup Instructions**

### Step 1: Install Dependencies
1. After downloading and extracting the tool, open a terminal in the project folder.  
2. Run the following command to install required modules:  
   ```bash
   npm install
   ```
3. Configure the bot in the `config.js` file.

---

### Step 2: Add Wallet and Proxy Details
- Save wallet addresses in the `wallets.txt` file.
- Save proxy details in the `proxies.txt` file in the following format:
  ```
  http://username:password@ip:port
  ```

---

### Step 3: Set Up Questions
1. Edit the `questions.js` file to include your unique questions. Sample questions are provided, but it’s highly recommended to create your own questions to avoid system penalties for repetitive or common queries.
2. To generate unique questions, use tools like:  
   - [Poe](https://poe.com)  
   - [Groq](https://groq.com)  

3. Focus on the main topics KiteAI supports:  
   - Kite AI Assistant  
   - Crypto Price Assistant  
   - Transaction Analyzer  

   **Prompt for generating questions:**  
   *“If you're a [topic], generate [number of questions] engaging questions about blockchain, cryptocurrency, or Web3 technology. Make it thought-provoking and suitable for an AI assistant to answer.”*  

---

### Step 4: Run the Tool
Execute one of the following commands in the terminal to launch the tool:
- For standard operation:  
   ```bash
   node main
   ```
- For threaded operation (recommended):  
   ```bash
   node main-thread
   ```

---

## **Important Notes**
1. **Points Update Delay**: Points may take up to 24 hours to reflect. The development team is addressing this issue, so please be patient.
2. **Autoref Function**:  
   - This feature generates referrals but doesn’t award points unless specific actions are completed:
     - Perform at least three agent actions.
     - Follow KiteAI on X (Twitter).
     - Retweet KiteAI on X (Twitter).
   - To run the autoref function, use:  
     ```bash
     node autoref
     ```
     Wallets created via autoref are saved in the `wallets_ref.txt` file in the following format:  
     ```
     address|privatekey|mnemonic
     ```
     Private keys are stored in `privateKeys_ref.txt`.
3. **Pre-Linked Wallets**: Ensure wallets are linked with pre-registered accounts before running the tool.

---

## **Useful Links**
- **Group Chat:** [Telegram Chat](https://t.me/airdrophuntersieutocchat)  
- **Telegram Boost:** [Boost Telegram](https://t.me/boost/airdrophuntersieutoc)  
- **GitHub Repository:** [GitHub](https://github.com/Hunga9k50doker/kite-ai)

---

### **#kiteai**
This guide ensures you’re set up and running smoothly. Feel free to reach out if you have more questions or need clarification! 🚀
