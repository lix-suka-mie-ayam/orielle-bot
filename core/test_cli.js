import readline from "readline";
import chalk from "chalk";
import { settings } from "./settings.js";

import {
  processMessage,
  initLoader
} from "./loader.js";

import { state } from "./state.js";

await initLoader();

state.botNumber =
  "12345678910";

const client = {
  async sendPresenceUpdate(
    type
  ) {
    if (type === "composing") {
      console.log(
        chalk.grey(
          "sedang mengetik..."
        )
      );
    }
  },

  async sendMessage(
    jid,
    content
  ) {
    console.log(
      chalk.red(
        `[${settings.botName}]\n ${content.text}`
      )
    );
  }
};

const rl =
  readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "--> "
  });

console.log(
  chalk.red(
    "CLI aktif, ketik command (awali dengan prefix)"
  )
);

rl.prompt();

rl.on(
  "line",
  async line => {
    const text = line.trim();

    if (!text) {
      rl.prompt();
      return;
    }

    const message = {
      key: {
        remoteJid:
          "1818277281818@s.whatsapp.net",
        participant:
          "8776667679486@s.whatsapp.net",
        fromMe: false
      },

      messageTimestamp:
        Math.floor(
          Date.now() / 1000
        ),

      pushName: "CLI User",

      message: {
        conversation: text
      }
    };

    try {
      await processMessage(
        client,
        message
      );
    } catch (e) {
      console.log(e);
    }

    rl.prompt();
  }
);
