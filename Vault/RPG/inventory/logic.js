import { humanizedSend } from "../../../core/human.js";
import { settings } from "../../../core/settings.js";

export default {
  name: "Inventory",
  description: "Melihat isi tas atau inventory RPG",
  command: "inventory",
  shortcuts: ["bag", "tas"],
  category: "RPG",

  async execute(client, message, args) {
    const jid = message.key.remoteJid;
    const sender = (message.key.participant || jid).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    
    const user = message.rpg || {};
    
    let inventory = {};
    if (user.inventory) {
      if (typeof user.inventory === "string") {
        try {
          inventory = JSON.parse(user.inventory);
        } catch (e) {
          inventory = {};
        }
      } else if (typeof user.inventory === "object") {
        inventory = user.inventory;
      }
    }

    const currency = settings.rpgSystem?.currency || "🪙 lazy coin";
    const itemKeys = Object.keys(inventory);

    let text = ` ╭━━━[ 🎒 \`INVENTORY\` ]━━━\n┃\n`;
    text += `┃ Pemilik: @${sender}\n┃\n`;

    const validItems = itemKeys.filter(key => inventory[key] > 0);

    if (validItems.length === 0) {
      text += `┃ 🕸️ Tas kamu kosong melompong.\n`;
    } else {
      for (const itemId of validItems) {
        const itemName = itemId.charAt(0).toUpperCase() + itemId.slice(1);
        text += `┣ 📦 *${itemName}* (ID: ${itemId})\n`;
        text += `┃ 🔢 Jumlah: \`${inventory[itemId]}\` x\n┃\n`;
      }
    }

    text += `╰━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `💡 *Tips:* Gunakan \`${settings.prefix}use <id_item>\` untuk memakai item.`;

    await humanizedSend(client, jid, text, message);
  }
};
