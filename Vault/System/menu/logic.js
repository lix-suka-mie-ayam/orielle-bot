import { state } from "../../../core/state.js";
import { humanizedSend } from "../../../core/human.js";
import { settings } from "../../../core/settings.js";
import { readTemp } from "../../../core/db_temp.js";

export default {
  name: "Menu",
  description: "Daftar fitur RPG",
  command: "menu",
  shortcuts: ["help", "list"],
  category: "System",
  minLevel: "pemula",
  expReward: 1,

  async execute(client, message, args) {
    const jid = message.key.remoteJid;
    const sender = (message.key.participant || jid).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

    const user = message.rpg || {};
    const playerRole = user.role || "Novice";
    const playerLevel = user.level || "pemula"; 
    const playerExp = user.exp ?? 0;
    const playerHp = user.hp ?? 100;
    const playerMana = user.mana ?? 50; 
    const playerGold = user.gold ?? 500;

    if (playerMana <= 0) {
       const limitText = `╭━━━[ ⚠️ \`MANA HABIS\` ]━━━\n┃\n┃ Maaf @${sender},\n┃ 💧 Mana kamu sudah habis!\n┃ Kamu tidak dapat membuka menu atau menggunakan skill.\n┃\n┃ 📜 Istirahatlah sejenak atau gunakan potion.\n╰━━━━━━━━━━━━━━━━━━━━━━`;
       return await humanizedSend(client, jid, limitText, message);
    }

    const levelList = settings.rpgSystem?.levels || ["pemula"];
    const expRequirements = settings.rpgSystem?.expRequirements || { "pemula": 100 };
    
    let displayRank = levelList[0]; 
    for (const lvl of levelList) {
      if (playerExp >= (expRequirements[lvl] || 0)) {
        displayRank = lvl;
      } else {
        break; 
      }
    }

    const isPremium = playerLevel === "premium" || sender === settings.ownerNumber;
    let userLimits = readTemp("user_limits") || {};
    const todayDate = new Date().toISOString().split('T')[0];
    let usage = 0;
    
    if (userLimits[sender] && userLimits[sender].date === todayDate) {
        usage = userLimits[sender].usage;
    }
    
    const maxLimit = settings.levelLimits[playerLevel] || 5;
    const sisaLimit = isPremium ? "∞ (Unlimited)" : Math.max(0, maxLimit - usage);

    const config = readTemp("system_config") || { botMode: "public" };

    const now = new Date();
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const h = now.getHours();
    let greeting = "Selamat datang";
    if (h >= 5 && h <= 10) greeting = "Pagi petualang 🌅";
    else if (h >= 11 && h <= 14) greeting = "Siang petualang ☀️";
    else if (h >= 15 && h <= 18) greeting = "Sore petualang 🌇";
    else greeting = "Malam petualang 🌙";

    const grouped = {};
    for (const mod of state.modules) {
      const category = (mod.category || "UNCATEGORIZED").toUpperCase();
      if (!grouped[category]) grouped[category] = [];
      if (!grouped[category].some(m => m.command === mod.command)) {
        grouped[category].push(mod);
      }
    }

    const currency = settings.rpgSystem?.currency || "🪙 lazy coin";

    const currentRankIndex = levelList.indexOf(displayRank);
    const nextRank = levelList[currentRankIndex + 1] || displayRank;
    const targetExp = expRequirements[displayRank] || 100;
    
    const progressCount = Math.min(Math.floor((playerExp / targetExp) * 10), 10);
    const progressBar = "🟩".repeat(progressCount) + "⬜".repeat(10 - progressCount);
    const sisaExp = Math.max(0, targetExp - playerExp);

    let text = `
╭──➤𓂃𓊝〔 *_${settings.botName} RPG_* 〕 
│ Creator : *_${settings.creator}_*
│ Status  : Online ●
│ Mode    : *_${config.botMode.toUpperCase()}_*
│
│ 📅 ${day}, ${date} ${month} ${year}
│ ⏰ ${hours}:${minutes}:${seconds}
│ 💬 ${greeting}
╰───── ⋆⋅☆⋅⋆ ─────

╭──➤𓂃𓊝〔 *_PLAYER STATS_* 〕
│ 👤 Name  : @${sender}
│ 🛡️ Class : *_${playerRole}_*
│ 🎖️ Rank  : *_${String(displayRank).toUpperCase()}_*
│ ❤️ HP    : *_${playerHp}_* / 1000
│ 💧 Mana  : *_${playerMana}_*
│ ⚡ Limit : *_${sisaLimit}_*
│ ${currency}: *_${playerGold}_*
│
┣━━➤〔 📊 \`EXP INDICATOR\` 〕
│ ✨ Exp   : *_${playerExp} / ${targetExp}_*
│ 🧭 Bar   : [${progressBar}]
│ 🎯 Next  : *_${sisaExp} EXP lagi menuju Rank ${String(nextRank).toUpperCase()}_*
╰───── ⋆⋅☆⋅⋆ ─────
`;
    const sortedCategories = Object.keys(grouped).sort();

    for (const category of sortedCategories) {
      text += `\n╭──➤𓂃𓊝〔 *_${category}_* 〕\n`;
      for (const feature of grouped[category]) {
        text += `│ ➜ *_${settings.prefix}${feature.command}_*\n`;
      }
      text += `╰───── ⋆⋅☆⋅⋆ ─────\n`;
    }

    text += `\n> ${settings.creator}`;

    await humanizedSend(client, jid, text, message);
  }
};
