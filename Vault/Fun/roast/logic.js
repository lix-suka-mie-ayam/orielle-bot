import fs from "fs";
import path from "path";

import { humanizedSend } from "../../../core/human.js";

const dbPath = path.resolve(
  "./Vault/Fun/roast/data.json"
);

function getRoasts() {
  try {
    return JSON.parse(
      fs.readFileSync(
        dbPath,
        "utf8"
      )
    );
  } catch {
    return [
      "roast gagal dimuat"
    ];
  }
}

function random(list) {
  return list[
    Math.floor(
      Math.random() *
      list.length
    )
  ];
}

function ascii() {
  const arts = [
`
╔══════════════════════╗
║      🔥 ROAST 🔥     ║
╚══════════════════════╝
`,
`
╭━━━━━━━━━━━━━━━━━━╮
┃ ⚔️  ROAST  ⚔️ ┃
╰━━━━━━━━━━━━━━━━━━╯
`
  ];

  return random(arts);
}

export default {
  command: "roast",

  shortcuts: [
    "ejek",
    "hina",
    "bacot"
  ],

  category: "fun",

  description:
    "roasting ala RPG",

  minLevel: "pemula",

  expReward: 8,

  async execute(
    client,
    message,
    args
  ) {
    const jid =
      message.key.remoteJid;

    const sender =
      message.key.participant ||
      jid;

    const senderNum =
      sender.split("@")[0];

    let target =
      `@${senderNum}`;

    let mention =
      [sender];

    const mentioned =
      message.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.mentionedJid;

    if (
      mentioned &&
      mentioned.length
    ) {
      target =
        `@${
          mentioned[0]
            .split("@")[0]
        }`;

      mention =
        [mentioned[0]];
    }

    const roast =
      random(
        getRoasts()
      );

    const text = `
${ascii()}

⚔️ TARGET :
${target}

💀 DAMAGE :
*_"${roast}"_*

╭───────────────╮
│ *_🎲 EFFECT_*
├───────────────┤
│ *_HP TARGET : -99_*
│ *_MENTAL    : CRITICAL_*
│ *_STATUS    : STUNNED_*
╰───────────────╯

> ketik ★roast lagi
`;

    await humanizedSend(
      client,
      jid,
      text,
      message
    );
  }
};
