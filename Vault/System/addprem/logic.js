import { settings } from "../../../core/settings.js";
import { updateUserRPG } from "../../../core/db.js";
import { humanizedSend } from "../../../core/human.js";

export default {
  name: "Add Premium",
  description: "Memberikan status Premium tanpa batas limit ke user",
  command: "addprem",
  shortcuts: ["vip"],
  category: "Owner",

  async execute(client, message, args) {
    const jid = message.key.remoteJid;
    const sender = (message.key.participant || jid).split("@")[0].split(":")[0];

    if (sender !== settings.ownerNumber) {
       return await humanizedSend(client, jid, "❌ Akses Ditolak! Hanya Grandmaster (Owner) yang berwenang memberikan restu Premium.", message);
    }

    let target = args[0];
    if (message.message?.extendedTextMessage?.contextInfo?.participant) {
       target = message.message.extendedTextMessage.contextInfo.participant.split("@")[0];
    }

    if (!target) {
       return await humanizedSend(client, jid, `📋 *Format Salah!*\nKetik: \`${settings.prefix}addprem 628xxx\` atau balas pesan target dengan teks \`${settings.prefix}addprem\``, message);
    }

    const targetClean = target.replace(/[^0-9]/g, "");

    const success = await updateUserRPG(targetClean, { level: "premium" });

    if (success) {
       const successText = `╭━━━[ 👑 \`PROMOSI PREMIUM\` ]━━━
┃
┃ Selamat! @${targetClean} telah resmi
┃ diangkat menjadi Member *PREMIUM*.
┃
┃ ✨ Hak Istimewa:
┃ ➔ Limit Penggunaan Bot: *TANPA BATAS (Infinity)* ♾️
┃
╰━━━━━━━━━━━━━━━━━━━━━━`;
       await humanizedSend(client, jid, successText, message);
    } else {
       await humanizedSend(client, jid, "❌ Terjadi kesalahan internal saat mencoba memperbarui status di database.", message);
    }
  }
};
