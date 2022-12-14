import { ChatGPTAPI, getOpenAIAuth } from "chatgpt";
import TelegramBot from "node-telegram-bot-api";

const getChatgptApi = async () => {
  const openAIAuth = await getOpenAIAuth({
    email: process.env.OPENAI_EMAIL,
    password: process.env.OPENAI_PASSWORD,
  });

  const api = new ChatGPTAPI({
    ...openAIAuth,
  });

  await api.ensureAuth();
  return api;
};

const auth = (msg) => {
  const authorizedUsers = process.env.AUTHORIZED_USERS?.split(",") ?? [];
  if (!authorizedUsers.includes(msg.from.username)) {
    throw new Error("sorry, you are not authorized to use this bot");
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
