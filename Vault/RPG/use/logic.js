import fs from "fs";
import path from "path";
import { updateUserRPG } from "../../../core/db.js";
import { humanizedSend } from "../../../core/human.js";
import { settings } from "../../../core/settings.js";

export default {
  name: "Use Item",
  description: "Menggunakan item dari dalam tas",
  command: "use",
  shortcuts: ["pakai", "consume"],
  category: "RPG",

  async execute(client, message, args) {
    const jid = message.key.remoteJid;
    const sender = (message.key.participant || jid).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

    if (!message.rpg) message.rpg = {};
    const user = message.rpg;
    
    let currentHp = user.hp ?? 100;
    let currentMana = user.mana ?? 50;
 
    let inventory = {};
    if (user.inventory) {
      if (typeof user.inventory === 'string') {
        try { inventory = JSON.parse(user.inventory); } catch(e) { inventory = {}; }
      } else if (typeof user.inventory === 'object') {
        inventory = user.inventory;
      }
    }

    if (!args[0]) {
      return await humanizedSend(client, jid, `⚠️ *Format Salah!*\nKetik: \`${settings.prefix}use <id_item>\`\nContoh: \`${settings.prefix}use potion\``, message);
    }

    const itemId = args[0].toLowerCase();

    if (!inventory[itemId] || inventory[itemId] <= 0) {
      return await humanizedSend(client, jid, `❌ Kamu tidak memiliki *${itemId}* di dalam tas! Cek \`${settings.prefix}bag\``, message);
    }

    const itemPath = path.resolve(`./database/item_data/${itemId}.json`);
    if (!fs.existsSync(itemPath)) {
      return await humanizedSend(client, jid, `❌ Data item \`${itemId}\` rusak atau tidak terdaftar di sistem.`, message);
    }

    let item;
    try {
      item = JSON.parse(fs.readFileSync(itemPath, "utf8"));
    } catch (e) {
      return await humanizedSend(client, jid, `❌ Gagal membaca efek dari item \`${itemId}\`.`, message);
    }

    if (item.type !== "consumable") {
      return await humanizedSend(client, jid, `❌ Item *${item.name}* bukan barang konsumsi dan tidak bisa digunakan langsung!`, message);
    }

    const maxHp = settings.rpgSystem?.maxHp || 1000;
    const bonusHp = item.effect?.hp || 0;
    const bonusMana = item.effect?.mana || 0;

    let newHp = Math.min(maxHp, currentHp + bonusHp);
    let newMana = currentMana + bonusMana;

    inventory[itemId] -= 1;
    if (inventory[itemId] <= 0) {
      delete inventory[itemId]; 
    }

    const inventoryString = JSON.stringify(inventory);
    
    const success = await updateUserRPG(sender, {
      hp: newHp,
      mana: newMana,
      inventory: inventoryString
    });

    if (success) {
      message.rpg.hp = newHp;
      message.rpg.mana = newMana;
      message.rpg.inventory = inventory; 

      const logText = `╭━━━[ 🧪 \`ITEM CONSUMED\` ]━━━
┃
┃ Berhasil menggunakan 1x *${item.name}*!
┃ 🧪 _"${item.description}"_
┃
┣━━➤ 📊 \`STATISTIK TERBARU\`
┃ ❤️ HP   : \`${currentHp}\` ➔ *_${newHp}_* / ${maxHp}
┃ 💧 Mana : \`${currentMana}\` ➔ *_${newMana}_*
┃
╰━━━━━━━━━━━━━━━━━━━━━━`;
      
      await humanizedSend(client, jid, logText, message);
    } else {
      await humanizedSend(client, jid, "❌ Gagal memproses efek item ke database.", message);
    }
  }
};
