import fs from "fs";
import path from "path";
import { queryDB } from "./db.js";
import { readTemp, writeTemp } from "./db_temp.js";
import { fileURLToPath, pathToFileURL } from "url";

import { settings } from "./settings.js";
import { state } from "./state.js";

import { validateModules, checkRateLimit } from "./safe.js";
import { humanizedSend } from "./human.js";

import { checkAndConsumeLimit } from "./limit.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function info(text) { console.log(`[INFO] ${text}`); }
function success(text) { console.log(`[SUCCESS] ${text}`); }
function failed(text) { console.log(`[ERROR] ${text}`); }

function scan(dir) {
  const result = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      result.push(...scan(full));
    } else if (item === "logic.js") {
      result.push(full);
    }
  }
  return result;
}

export async function initLoader() {
  if (state.modules.length) return;
  const files = scan(path.resolve("./Vault"));
  const importedModules = [];
  for (const file of files) {
    try {
      const imported = await import(pathToFileURL(file));
      if (imported?.default) {
        importedModules.push(imported.default);
        success(`${imported.default.command} loaded`);
      }
    } catch (e) { failed(`${file}\n${e.stack}`); }
  }
  const checked = await validateModules(importedModules);
  state.modules = checked.valid || [];
  state.commands.clear();
  for (const mod of state.modules) {
    state.commands.set(mod.command, mod);
    if (Array.isArray(mod.shortcuts)) {
      for (const shortcut of mod.shortcuts) {
        state.commands.set(shortcut, mod);
      }
    }
  }
}

function getPrefix(text) {
  const prefixes = [settings.prefix, ...(settings.alternativePrefixes || [])];
  return prefixes.find(prefix => text.startsWith(prefix));
}

function getText(message) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption || ""
  );
}

export async function processMessage(client, message) {
  try {
    await initLoader();
    if (!message?.message) return;

    const jid = message.key?.remoteJid || "";
    const sender = (message.key.participant || jid || "").split("@")[0].split(":")[0];
    const text = getText(message);

    if (typeof text !== "string" || !text.trim()) return;
    if (!checkRateLimit(sender)) return;

    let userCache = readTemp("users_cache") || {};

    if (!userCache[sender]) {
      try {
        let dbRes = await queryDB({ action: "getUser", number: sender });
        if (!dbRes.user) {
          const defaultStats = {
            action: "createUser",
            number: sender,
            hp: settings.rpgSystem?.startingHp || 100,
            mana: settings.rpgSystem?.startingMana || 50,
            gold: settings.rpgSystem?.startingGold || 500,
            role: settings.rpgSystem?.classes?.[0] || "Novice",
            level: settings.defaultLevel || "pemula",
            exp: 0
          };
          await queryDB(defaultStats);
          dbRes = await queryDB({ action: "getUser", number: sender });
        }
        userCache[sender] = dbRes.user;
        writeTemp("users_cache", userCache);
      } catch (err) { console.log("[DB ERROR] Auto-Registration failed:", err.message); }
    }

    message.rpg = userCache[sender] || {};
    
    for (const mod of state.modules) {
      try {
        if (typeof mod.onMessage === "function") {
          const handled = await mod.onMessage(client, message, text);
          if (handled) return;
        }
      } catch (e) { console.log(e.message); }
    }

    const prefix = getPrefix(text);
    if (!prefix) return;

    const body = text.slice(prefix.length).trim();
    if (!body) {
      return await humanizedSend(client, jid, `╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃ ⚠️ \`MANA FLUCTUATION\` ⚠️ ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n@${sender}, mantra apa yang ingin kamu rapalkan?\nKamu hanya menyebutkan katalis (prefix) tanpa merapal skill (command).\n\n📜 Buka \`Grimoire\` kamu dengan ketik:\n${settings.prefix}menu\n\n> 🌐 \`SYSTEM OF A DOWN\``, message);
    }

    const args = body.split(/\s+/);
    const cmd = (args.shift() || "").toLowerCase();
    if (!cmd) return;

    const module = state.commands.get(cmd);
    if (!module) {
      return await humanizedSend(client, jid, `╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃ ❌ \`SKILL NOT FOUND\` ❌  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\nHalt, @${sender}!\nSkill atau Quest \`${cmd}\` tidak terdaftar di dalam arsip ${settings.rpgSystem?.guildName || "Guild"}.\n\n📜 Cek daftar Quest/Skill yang tersedia:\n${settings.prefix}menu\n\n> 🌐 \`SYSTEM LOG\``, message);
    }

    const isLimitSecure = await checkAndConsumeLimit(client, message, cmd);
    if (!isLimitSecure) {
      return; 
    }
    
    await module.execute(client, message, args);
  } catch (e) { console.log(e.stack); }
}
