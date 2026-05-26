import { spawn } from "child_process";
import { readTemp, writeTemp } from "./db_temp.js";
import { settings } from "./settings.js"; 
import { humanizedSend } from "./human.js"; 

export async function queryDB(payload) {
  return new Promise((resolve, reject) => {
    const process = spawn("python3", ["./database/db_manager.py"]);
    let output = "";
    let error = "";

    process.stdout.on("data", data => { output += data.toString(); });
    process.stderr.on("data", data => { error += data.toString(); });

    process.on("close", code => {
      if (code !== 0) return reject(new Error(error || "DB Process Failed"));
      try {
        resolve(JSON.parse(output));
      } catch (err) {
        reject(new Error("Invalid DB Response"));
      }
    });

    process.stdin.write(JSON.stringify(payload));
    process.stdin.end();
  });
}

export async function updateUserRPG(sender, updates) {
  try {
    await queryDB({ action: "updateUser", number: sender, ...updates });
    let cache = readTemp("users_cache") || {};
    if (cache[sender]) {
      Object.assign(cache[sender], updates);
      writeTemp("users_cache", cache);
    }
    return true;
  } catch (err) {
    console.log("[DB ERROR] Failed to update user stat:", err.message);
    return false;
  }
}

export async function giveExp(client, message, amount) {
  const stats = message.rpg;
  if (!stats) return false;

  const sender = stats.number;
  let currentExp = stats.exp + amount;
  let currentLevel = stats.level;

  const reqs = settings.levelExpRequirements || {};

  const levelNames = Object.keys(reqs).sort((a, b) => reqs[b] - reqs[a]);

  let newLevel = currentLevel;

  for (const lvl of levelNames) {
    if (currentExp >= reqs[lvl]) {
      newLevel = lvl;
      break;
    }
  }

  let updates = { exp: currentExp };
  let leveledUp = false;

  if (newLevel !== currentLevel && reqs[newLevel] > (reqs[currentLevel] || 0)) {
    leveledUp = true;
    updates.level = newLevel;
    updates.hp = settings.rpgSystem?.maxHp || 1000; 
    updates.mana = settings.rpgSystem?.startingMana || 50; 
    updates.gold = stats.gold + 500; 
  }

  await updateUserRPG(sender, updates);

  Object.assign(stats, updates);

  if (leveledUp) {
    const jid = message.key?.remoteJid || "";
    const lvlText = `╭━━━[ 🌟 \`RANK UP\` ]━━━
┃
┃ Mantap, @${sender}!
┃ Dedikasimu di Guild membuahkan hasil.
┃
┃ 📈 Rank: ${currentLevel.toUpperCase()} ➔ *${newLevel.toUpperCase()}*
┃ ❤️ HP & Mana dipulihkan penuh!
┃ 💰 Bonus Rank Up: +500 Gold
┃
╰━━━━━━━━━━━━━━━━━━━━━━

> 🌐 \`${settings.rpgSystem?.guildName || "ADVENTURER GUILD"}\``;
    
    setTimeout(async () => {
      await humanizedSend(client, jid, lvlText, message);
    }, 2000);
  }

  return leveledUp;
}
