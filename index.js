import config from "./config.js";
import { ChatGPTAPI } from "chatgpt";
import TelegramBot from "node-telegram-bot-api";

const getChatgptApi = async () => {
  const chatgptApi = new ChatGPTAPI({
    sessionToken: config.gptToken,
  });

  await chatgptApi.ensureAuth();
  return chatgptApi;
};

const auth = (msg) => {
  if (!config.authorizedUsers.includes(msg.from.username)) {
    throw new Error("抱歉，您没有使用本机器人的权限。");
  }
};

const init = async () => {
  const chatgptApi = await getChatgptApi();
  const bot = new TelegramBot(config.botToken, { polling: true });

  let conversation = chatgptApi.getConversation();

  bot.setMyCommands([
    {
      command: "/reset_thread",
      description: "reset thread",
    },
  ]);

  bot.onText(/\/reset_thread/, async (msg) => {
    try {
      await auth(msg);
      conversation = chatgptApi.getConversation();
      bot.sendMessage(msg.chat.id, "done!");
    } catch (e) {
      bot.sendMessage(msg.chat.id, e.message);
    }
  });

  bot.on("message", async (msg) => {
    if (msg.text[0] === "/") {
      return;
    }
    const username = msg.from.username;
    try {
      await auth(msg);
      bot.sendChatAction(msg.chat.id, "typing");
      const response = await conversation.sendMessage(msg.text);
      bot.sendMessage(msg.chat.id, response, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      bot.sendMessage(msg.chat.id, e.message);
    }
  });

  bot.on("polling_error", console.error);
};

process.on("uncaughtException", async (err) => {
  process.exit(1);
});

init().catch(console.error);
