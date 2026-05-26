import { settings } from "./settings.js";
import { readTemp, writeTemp } from "./db_temp.js";
import { humanizedSend } from "./human.js";

export async function checkAndConsumeLimit(client, message, commandName, isPremiumUser = false) {
  const jid = message.key?.remoteJid || "";
  const sender = (message.key?.participant || jid).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

  const freeCommands = ["menu", "roast"];
  if (freeCommands.includes(commandName.toLowerCase())) {
    return true; 
  }

  if (sender === settings.ownerNumber) {
    return true;
  }

  if (isPremiumUser) {
    return true;
  }

  const userRpg = message.rpg || {};

  const playerLevel = userRpg.level || settings.defaultLevel || "pemula";

  const maxLimit = settings.levelLimits[playerLevel] || settings.levelLimits["pemula"] || 5;

  let userLimits = readTemp("user_limits") || {};
  const todayDate = new Date().toISOString().split('T')[0]; 
  
  if (!userLimits[sender] || userLimits[sender].date !== todayDate) {
     userLimits[sender] = {
        date: todayDate,
        usage: 0
     };
  }

  if (userLimits[sender].usage >= maxLimit) {
     const limitText = `╭━━━[ ⚠️ \`LIMIT HABIS\` ]━━━
┃
┃ Maaf @${sender},
┃ Limit penggunaan fitur bot kamu hari ini telah habis!
┃ (Batas limit rank *${playerLevel.toUpperCase()}*: ${maxLimit} penggunaan)
┃
┃ 💡 *Tips:* Tingkatkan rank kamu, atau minta Owner untuk memberikan akses *Premium* melalui fitur \`★addprem\` agar mendapatkan limit tanpa batas!
╰━━━━━━━━━━━━━━━━━━━━━━`;

     await humanizedSend(client, jid, limitText, message);
     return false; 
  }

  userLimits[sender].usage += 1;
  writeTemp("user_limits", userLimits);
  
  return true; 
}
