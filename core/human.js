import { settings } from "./settings.js";

function random(min, max) {
  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function simulateTyping(
  client,
  jid,
  duration
) {
  const interval = 3000;

  const cycles = Math.ceil(
    duration / interval
  );

  for (let i = 0; i < cycles; i++) {
    try {
      await client.sendPresenceUpdate(
        "composing",
        jid
      );
    } catch {}

    await sleep(interval);
  }

  try {
    await client.sendPresenceUpdate(
      "paused",
      jid
    );
  } catch {}
}

function buildMentions(text) {
  const detected =
    text.match(/@(\d{5,16})/g) || [];

  return detected.map(tag => {
    return (
      tag.replace("@", "") +
      "@s.whatsapp.net"
    );
  });
}

function rpgDecorate(text) {
  if (text.includes("╭━") || text.includes("➤")) return text;

  const styles = [
    `[ ⚔️ \`SYSTEM\` ]\n➤ ${text}`,
    `[ 🛡️ \`GUILD INFO\` ]\n➤ ${text}`,
    `[ ✨ \`WORLD CHAT\` ]\n➤ ${text}`,
    `[ 📜 \`NOTICE\` ]\n➤ ${text}`
  ];

  return styles[random(0, styles.length - 1)];
}

export async function humanizedSend(
  client,
  jid,
  content,
  quoted = null,
  extra = {}
) {
  try {
    const delay = random(
      settings.humanizedDelayMin || 1000,
      settings.humanizedDelayMax || 3500
    );

    const sender =
      quoted?.key?.participant ||
      quoted?.key?.remoteJid ||
      null;

    const mentions = sender
      ? [sender]
      : [];

    let message = {};

    if (typeof content === "string") {
      message.text = rpgDecorate(content);
    } else {
      message = { ...content };
    }

    if (message.text) {
      mentions.push(
        ...buildMentions(message.text)
      );
    }

    message.mentions = mentions;

    Object.assign(message, extra);

    await simulateTyping(
      client,
      jid,
      delay
    );

    await sleep(delay);

    return client.sendMessage(
      jid,
      message,
      {
        quoted
      }
    );
  } catch (err) {
    console.log(
      "[HUMANIZED ERROR]",
      err.stack || err.message
    );
  }
}