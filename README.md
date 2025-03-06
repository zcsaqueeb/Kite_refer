Here’s the translated content in English along with the README guide you requested:

---

**Tool: Go Kite AI (KiteAI)**

**Uses:** Node.js (supports both no-proxy and proxy setups)

**🌐 Website Link:** [KiteAI](https://testnet.gokite.ai?r=G692XZhY)

### Features:
✔️ Updates to the API (added functionality for automatic API updates)  
✔️ All other features remain unchanged  

---

### 🖥 **Instructions:**
After downloading and extracting the files, open your terminal and follow these steps:

1️⃣ **Install necessary modules:**  
Run the following command in the terminal:  
`npm install`  
Then configure the bot in the `config.js` file.

2️⃣ **Wallet configuration:**  
Save wallet addresses in the `wallets.txt` file.  
Save proxy details in the `proxies.txt` file in this format:  
`http://username:password@ip:port`

3️⃣ **Question setup:**  
Set up questions in the `questions.js` file. Some sample questions are already provided, but users should avoid using the same questions repeatedly. The system may have bots that penalize repetitive questions by deducting points.  

To generate unique questions, you can use AI tools like [poe.com](https://poe.com) or [groq.com](https://groq.com). While creating questions, ensure they are related to topics KiteAI supports, which are:  
- **Kite AI Assistant**  
- **Crypto Price Assistant**  
- **Transaction Analyzer**

For those unfamiliar with creating questions, here’s a suggested prompt to use:  
*“If you're a (topic), generate (number of questions) engaging questions about blockchain, cryptocurrency, or Web3 technology. Make it thought-provoking and suitable for an AI assistant to answer.”*  

After generating the questions, update each topic in the `questions.js` file.

4️⃣ **Run the tool:**  
Use one of the following commands to run the tool:  
`node main`  (may be not working)
or  
`node main-thread`  ( use this )

---

### **⚠️ Notes:**

1️⃣ Points may not appear immediately after using the tool. It may take around a day for the points to update. The project has acknowledged this issue and is working on resolving it—it’s not a bug in the tool itself. Please be patient.  

2️⃣ **Autoref function:** Although the autoref function generates referrals, it doesn't add points because the referral conditions require completing the following:  
   - Completing at least **three agent actions**,  
   - Following KiteAI on X (formerly Twitter),  
   - Retweeting on X (Twitter).  

   Instructions for autoref: Use the command `node autoref`. Wallets for this function are created in the `wallets_ref.txt` file in this format:  
   `address|privatekey|mnemonic`  

   Private keys are stored in the `privateKeys_ref.txt` file.

3️⃣ **Pre-linked Wallets:** All wallets must be linked with a registered account before running the tool.  

---

**💬 Useful Links:**  
- **Group Chat:** [Telegram Chat](https://t.me/airdrophuntersieutocchat)  
- **Telegram Boost:** [Boost Telegram](https://t.me/boost/airdrophuntersieutoc)  
- **GitHub Repository:** [GitHub](https://github.com/Hunga9k50doker/kite-ai)

---

**#kiteai**

I hope this helps! Let me know if you need further assistance. 😊
