import { updateUserRPG } from "../../core/db.js";
import { humanizedSend } from "../../core/human.js";
import { settings } from "../../core/settings.js";
import { readTemp, writeTemp } from "../../core/db_temp.js";

export default {
  command: "profile",
  shortcuts: ["status", "stat", "me", "profil"],
  category: "PROFILE",
  execute: async (client, message, args) => {
    const jid = message.key?.remoteJid || "";
    const sender = (message.key.participant || jid).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    
    const stats = message.rpg || {}; 

    let playerRole = stats.role || "Novice";
    let playerLevel = stats.level || "pemula";
    let playerExp = stats.exp ?? 0;
    let playerHp = stats.hp ?? 100;
    let playerMana = stats.mana ?? 50;
    let playerGold = stats.gold ?? 500;

    const currency = settings.rpgSystem?.currency || "🪙 lazy coin";
    const prefix = settings.prefix;

    const expRequirements = settings.rpgSystem?.expRequirements || { "pemula": 100 };
    const levelOrder = settings.rpgSystem?.levelOrder || ["pemula"];

    if (args[0] === "claim") {
       const cooldowns = readTemp("cooldowns") || {};
       if (!cooldowns[sender]) cooldowns[sender] = {};

       const lastClaim = cooldowns[sender].claim || 0;
       const now = Date.now();
       const cdTime = 24 * 60 * 60 * 1000; 

       if (now - lastClaim < cdTime) {
         const remaining = cdTime - (now - lastClaim);
         const hours = Math.floor(remaining / (1000 * 60 * 60));
         const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

         const waitText = `╭━━━[ ⏳ \`COOLDOWN\` ]━━━
┃
┃ Sabar, @${sender}!
┃ Jatah subsidi Guild kamu hari ini sudah diambil.
┃
┃ ⏱️ Tunggu: ${hours} jam ${minutes} menit lagi.
┃
╰━━━━━━━━━━━━━━━━━━━━━━`;
         return await humanizedSend(client, jid, waitText, message);
       }

       const goldReward = 150;
       const expReward = 30; 
       
       let finalGold = playerGold + goldReward;
       let finalExp = playerExp + expReward;
       let finalLevel = playerLevel;
       let levelUpMessage = "";

       let currentReq = expRequirements[finalLevel] || 100;
       if (finalExp >= currentReq) {
          const currentIndex = levelOrder.indexOf(finalLevel);
          if (currentIndex !== -1 && currentIndex < levelOrder.length - 1) {
             finalLevel = levelOrder[currentIndex + 1];
             finalExp = finalExp - currentReq; 
             levelUpMessage = `\n\n🎉 *LEVEL UP!*\nRank kamu naik menjadi *${finalLevel.toUpperCase()}*!`;
          }
       }

       const dbUpdateRes = await updateUserRPG(sender, { 
          gold: finalGold,
          exp: finalExp,
          level: finalLevel
       });

       if (dbUpdateRes && dbUpdateRes.user) {
          let userCache = readTemp("users_cache") || {};
          userCache[sender] = dbUpdateRes.user;
          writeTemp("users_cache", userCache);
       }

       cooldowns[sender].claim = now;
       writeTemp("cooldowns", cooldowns);
       
       const claimText = `╭━━━[ 🎁 \`DAILY REWARD\` ]━━━
┃
┃ Selamat, @${sender}!
┃ Kamu telah menerima subsidi harian dari Guild.
┃
┃ ${currency} \`+${goldReward}\`
┃ ✨ EXP \`+${expReward}\`${levelUpMessage}
┃ 💰 Total kekayaanmu: ${finalGold}
┃
╰━━━━━━━━━━━━━━━━━━━━━━

> 🌐 \`${settings.rpgSystem?.guildName || "ADVENTURER GUILD"}\``;

       return await humanizedSend(client, jid, claimText, message);
    }

    const targetExp = expRequirements[playerLevel] || 100;
    const progressCount = Math.min(Math.floor((playerExp / targetExp) * 10), 10);
    const progressBar = "🟩".repeat(progressCount) + "⬜".repeat(10 - progressCount);
    const percent = Math.min(Math.floor((playerExp / targetExp) * 100), 100);

    const maxHp = settings.rpgSystem?.maxHp || 1000;
    
    const profileText = `╭━━━[ 👤 \`GUILD ID CARD\` ]━━━
┃ 
┃ 🏷️ *Name* : @${sender}
┃ 🛡️ *Class* : ${playerRole}
┃ 🎖️ *Rank* : ${String(playerLevel).toUpperCase()}
┃
┣━━━[ 📊 \`ATTRIBUTES\` ]━━━
┃ ❤️ *HP* : ${playerHp} / ${maxHp}
┃ 💧 *Mana* : ${playerMana}
┃ ${currency} : ${playerGold}
┃
┣━━━[ ✨ \`EXP PROGRESS\` ]━━━
┃ 📈 *Exp* : ${playerExp} / ${targetExp} (${percent}%)
┃ 🧭 *Bar* : [${progressBar}]
┃ 🎯 *Sisa* : ${Math.max(0, targetExp - playerExp)} EXP lagi menuju Rank berikutnya!
┃
╰━━━━━━━━━━━━━━━━━━━━━━

📜 *Tips:* Ketik \`${prefix}profile claim\` untuk mengambil subsidi harianmu!

> 🌐 \`SYSTEM OF A DOWN\``;

    await humanizedSend(client, jid, profileText, message);
  }
};
