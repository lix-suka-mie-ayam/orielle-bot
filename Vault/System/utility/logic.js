import fs from "fs";
import path from "path";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { humanizedSend } from "../../../core/human.js";

export default {
  command: "rvo",
  shortcuts: ["readviewonce", "lihatviewonce"],
  category: "utility",
  description: "Membaca pesan view once yang dibalas",
  minLevel: "pemula",
  expReward: 5,
  
  async execute(client, message, args) {
    const jid = message.key.remoteJid;
    const from = jid;
    
    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedKey = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
    
    if (!quotedMessage) {
      await humanizedSend(client, jid, { 
        text: "⚔️ [Quest Gagal]\nPetualang, kau harus menargetkan pesan view once terlebih dahulu sebelum aku bisa mengurai mantranya!" 
      });
      return;
    }
    
    const isViewOnce = 
      (quotedMessage.imageMessage?.viewOnce === true) || 
      (quotedMessage.videoMessage?.viewOnce === true);
    
    if (!isViewOnce) {
      await humanizedSend(client, jid, { 
        text: "🔮 [Identifikasi Gagal]\nPesan yang kau tunjuk bukanlah item [View Once]. Carilah jejak pesan rahasia yang menghilang setelah dilihat." 
      });
      return;
    }
    
    let mediaType = null;
    let mediaMessage = null;
    
    if (quotedMessage.imageMessage) {
      mediaType = "image";
      mediaMessage = quotedMessage.imageMessage;
    } else if (quotedMessage.videoMessage) {
      mediaType = "video";
      mediaMessage = quotedMessage.videoMessage;
    } else {
      await humanizedSend(client, jid, { 
        text: "🪄 [Skill Tidak Tersedia]\nTipe rahasia ini di luar jangkauan sihirku untuk saat ini, petualang." 
      });
      return;
    }
    
    try {
      const stream = await downloadContentFromMessage(mediaMessage, mediaType);
      let buffer = Buffer.from([]);
      
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      
      const caption = mediaMessage.caption || "";
      
      if (mediaType === "video") {
        await humanizedSend(client, jid, { 
          video: buffer, 
          caption: caption || "[📜 Gulungan Rahasia: Video]\nMantra berhasil diurai!", 
          mimetype: "video/mp4" 
        });
      } else {
        await humanizedSend(client, jid, { 
          image: buffer, 
          caption: caption || "[🖼️ Artefak Rahasia: Gambar]\nMantra berhasil diurai!", 
          mimetype: "image/jpeg" 
        });
      }
      
    } catch (err) {
      console.error("❌ Gagal mengunduh view once:", err.message);
      await humanizedSend(client, jid, { 
        text: "💀 [Quest Gagal]\nSihir pemanggilan gagal! Mungkin artefak ini sudah menghilang ke dimensi lain, atau waktunya telah habis..." 
      });
    }
  }
};