import fs from "fs";
import { humanizedSend } from "../../../core/human.js";
import { settings } from "../../../core/settings.js";
import { giveExp } from "../../../core/db.js";

const sessions = new Map();
const gameData = JSON.parse(fs.readFileSync("./Vault/Games/susun_kata/data.json"));

const asciiStart = [
`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    *_⚔️ RPG GAME ⚔️_*      
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`,
`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
   *_🎮 WORD QUEST 🎮_*     
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
];

const asciiGameOver = [
`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
     *_☠️ GAME OVER ☠️_*     
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
];

const asciiWrong = [
`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
     *_❌ WRONG ❌_*        
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
];

const asciiSuccess = [
`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    ⚔️ QUEST CLEAR ⚔️    
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
];

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(word) {
  let result = word.split("").sort(() => Math.random() - 0.5).join("");
  for (let i = 0; i < 20; i++) {
    result = result.split("").sort(() => Math.random() - 0.5).join("");
  }
  return result === word ? shuffle(word) : result;
}

function getSender(message) {
  return message.key.participant || message.key.remoteJid;
}

function getNumber(jid = "") {
  return jid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

export default {
  command: "susunkata",
  shortcuts: ["sk"],
  category: "game",
  description: "game susun kata (Word Quest)",
  minLevel: "pemula",
  expReward: settings.susunKataReward?.exp || 25,

  async execute(client, message) {
    const jid = message.key.remoteJid;
    const sender = getSender(message);

    if (sessions.has(jid)) {
      return await humanizedSend(client, jid, "⚠️ Masih ada Quest yang berjalan di area ini!", message);
    }

    const selected = gameData[random(0, gameData.length - 1)];
    const original = selected.kata.toUpperCase().trim();
    const shuffled = shuffle(original);
    const header = asciiStart[random(0, asciiStart.length - 1)];

    const sent = await humanizedSend(
      client,
      jid,
`${header}

⚔️ QUEST :
Susun huruf menjadi kata yang benar

╭────────────────╮
│ 🧩 HURUF ACAK
│ *${shuffled}*
╰────────────────╯

╭────────────────╮
│ 💡 PETUNJUK
│ *${selected.clue}*
╰────────────────╯

╭────────────────╮
│ ⏳ WAKTU
│ *${selected.waktu} detik*
╰────────────────╯

📜 RULE:
• Reply pesan ini
• Jawaban harus benar

🎁 REWARD:
*+${settings.susunKataReward?.exp || 25} EXP*`,
      message
    );

    const timeout = setTimeout(async () => {
      sessions.delete(jid);
      const gameOverHeader = asciiGameOver[0];
      await humanizedSend(
        client,
        jid,
        `${gameOverHeader}\n\n*⏳ Waktu habis!*\n\n📖 Jawaban:\n*${original}*\n\n💀 Quest gagal diselesaikan`,
        message
      );
    }, selected.waktu * 1000);

    sessions.set(jid, {
      answer: original,
      sender: getNumber(sender),
      messageId: sent.key.id,
      timeout
    });
  },

  async onMessage(client, message, text) {
    try {
      const jid = message.key.remoteJid;
      if (!sessions.has(jid)) return false;

      const game = sessions.get(jid);
      const sender = getNumber(getSender(message));

      if (sender !== game.sender) return false;

      const quoted = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
      if (!quoted || quoted !== game.messageId) return false;

      const answer = text.trim().toUpperCase();

      if (answer !== game.answer) {
        return await humanizedSend(
          client,
          jid,
          `${asciiWrong[0]}\n\n*_❌ jawaban salah_*\n\nCoba lagi dengan me-reply pesan quest!`,
          message
        );
      }

      clearTimeout(game.timeout);
      sessions.delete(jid);

      const reward = settings.susunKataReward?.exp || 25;

      await giveExp(client, message, reward);

      await humanizedSend(
        client,
        jid,
`${asciiSuccess[0]}

*🎉 Jawaban benar!*

🏆 Kata: *${game.answer}*
✨ Reward: *+${reward} EXP*

📈 EXP berhasil ditambahkan ke profilmu!`,
        message
      );

      return true;
    } catch {
      return false;
    }
  }
};
