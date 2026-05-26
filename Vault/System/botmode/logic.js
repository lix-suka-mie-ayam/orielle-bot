import { settings } from "../../../core/settings.js";
import { humanizedSend } from "../../../core/human.js";
import { readTemp, writeTemp } from "../../../core/db_temp.js";

function normalize(value) {
  return value.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

function isOwner(message) {
  const sender = normalize(message.key.participant || message.key.remoteJid);
  const owner = normalize(settings.ownerNumber);
  return sender === owner;
}

export default {
  command: "botmode",
  shortcuts: ["mode"],
  category: "system",
  description: "mengubah mode jangkauan sihir bot",
  minLevel: "pemula",
  expReward: 0,

  async execute(client, message, args) {
    const jid = message.key.remoteJid;

    if (!isOwner(message)) {
      return await humanizedSend(client, jid, "❌ Hanya Guild Master yang bisa mengubah mode.", message);
    }

    const mode = (args[0] || "").toLowerCase();
    const available = ["public", "self", "priv", "sal"];

    if (!available.includes(mode)) {
      return await humanizedSend(
        client,
        jid,
        `🔮 *Mode Jangkauan Sihir:*\n\n- public\n- self\n- priv\n- sal\n\nContoh:\n${settings.prefix}botmode public`,
        message
      );
    }

    let config = readTemp("system_config") || {};
    config.botMode = mode;
    writeTemp("system_config", config);

    await humanizedSend(
      client,
      jid,
      `⚙️ Jangkauan sihir berhasil diubah ke mode: *${mode.toUpperCase()}*`,
      message
    );
  }
};
