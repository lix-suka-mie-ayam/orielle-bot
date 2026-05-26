import fs from "fs";
import path from "path";
import { updateUserRPG } from "../../../core/db.js"; 
import { humanizedSend } from "../../../core/human.js";
import { settings } from "../../../core/settings.js";

export default {
  name: "Shop",
  description: "Toko perlengkapan RPG",
  command: "shop",
  shortcuts: ["toko", "beli"],
  category: "RPG",

  async execute(client, message, args) {
    const jid = message.key.remoteJid;
    const sender = (message.key.participant || jid).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

    if (!message.rpg) message.rpg = {};
    const user = message.rpg;
    
    const playerGold = user.gold ?? 500;

    let inventory = {};
    if (user.inventory) {
      if (typeof user.inventory === 'string') {
        try { inventory = JSON.parse(user.inventory); } catch(e) { inventory = {}; }
      } else if (typeof user.inventory === 'object') {
        inventory = user.inventory;
      }
    }

    const currency = settings.rpgSystem?.currency || "🪙 lazy coin";
    const itemsDir = path.resolve("./database/item_data");

    if (!fs.existsSync(itemsDir)) {
      fs.mkdirSync(itemsDir, { recursive: true });
    }

    const itemFiles = fs.readdirSync(itemsDir).filter(file => file.endsWith(".json"));
    const shopItems = [];

    for (const file of itemFiles) {
      try {
        const itemData = JSON.parse(fs.readFileSync(path.join(itemsDir, file), "utf8"));
        shopItems.push(itemData);
      } catch (e) {
        console.error(`Gagal membaca item ${file}:`, e);
      }
    }

    if (!args[0]) {
      let text = ` ╭━━━[ 🛒 \`GLOBAL SHOP\` ]━━━\n┃\n`;
      text += `┃ Saldo: ${currency} \`${playerGold}\`\n┃\n`;

      if (shopItems.length === 0) {
        text += `┃ ❌ _Belum ada item yang dijual._\n`;
      } else {
        for (const item of shopItems) {
          const icon = item.type === "consumable" ? "📦" : "⚔️";
          text += `┣ ${icon} *${item.name}* (ID: ${item.id})\n`;
          text += `┃ 💰 Harga: ${item.price}\n`;
          text += `┃ 📜 ${item.description}\n┃\n`;
        }
      }

      text += `╰━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📝 *Cara Beli:* Ketik \`${settings.prefix}shop <id_item> <jumlah>\`\n`;
      text += `Contoh: \`${settings.prefix}shop potion 2\``;

      return await humanizedSend(client, jid, text, message);
    }

    const itemId = args[0].toLowerCase();
    const amount = parseInt(args[1]) || 1;

    if (amount <= 0) {
      return await humanizedSend(client, jid, `❌ Jumlah pembelian tidak valid!`, message);
    }

    const itemToBuy = shopItems.find(i => i.id === itemId);

    if (!itemToBuy) {
      return await humanizedSend(client, jid, `❌ Item dengan ID \`${itemId}\` tidak ditemukan di toko.`, message);
    }

    const totalCost = itemToBuy.price * amount;

    if (playerGold < totalCost) {
      return await humanizedSend(client, jid, `❌ Saldo tidak cukup!\nKamu butuh \`${totalCost}\` ${currency} untuk membeli ${amount}x *${itemToBuy.name}*.\nSaldo kamu: \`${playerGold}\``, message);
    }

    inventory[itemId] = (inventory[itemId] || 0) + amount;
    const newGold = playerGold - totalCost;

    const inventoryString = JSON.stringify(inventory);

    const success = await updateUserRPG(sender, {
      gold: newGold,
      inventory: inventoryString
    });

    if (success) {
      message.rpg.gold = newGold;
      message.rpg.inventory = inventory; 

      const receipt = `╭━━━[ 💳 \`PEMBELIAN SUKSES\` ]━━━
┃
┃ Berhasil membeli:
┃ 📦 ${amount}x *${itemToBuy.name}*
┃ ➖ Total harga: \`${totalCost}\` ${currency}
┃
┣━━➤ 💰 \`SISA SALDO\`
┃ ${currency}: \`${newGold}\`
┃
╰━━━━━━━━━━━━━━━━━━━━━━
Cek tas kamu dengan mengetik \`${settings.prefix}inventory\``;
      
      await humanizedSend(client, jid, receipt, message);
    } else {
      await humanizedSend(client, jid, `❌ Terjadi kesalahan pada sistem database. Pembelian gagal.`, message);
    }
  }
};
