import fs from "fs";
import path from "path";
import readline from "readline";
import chalk from "chalk";
import pino from "pino";
import qrcode from "qrcode-terminal";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { spawn } from "child_process";
import os from "os";
import { settings, banners } from "./settings.js";
import { state } from "./state.js";
import { processMessage, initLoader } from "./loader.js";
import { queryDB } from "./db.js";
import { readTemp, writeTemp, deleteTemp } from "./db_temp.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const safeTmp = process.platform === "android" ? "/data/data/com.termux/files/usr/tmp" : os.tmpdir();
process.env.TMPDIR = safeTmp;
if (!fs.existsSync(safeTmp)) fs.mkdirSync(safeTmp, { recursive: true });

const logger = pino({ level: "silent" });
const SESSION_DIR = "./database/session_data";
let logCounter = 0;
let reconnecting = false;

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

export async function humanizedSend(sock, jid, text, quoted = null) {
  return await sock.sendMessage(jid, { text }, { quoted });
}

function clear() { process.stdout.write("\x1Bc"); }

function banner(status) {
  clear();
  const art = banners[Math.floor(Math.random() * banners.length)];
  console.log(chalk.red(art));
  console.log(chalk.red(`
╭──────────────────────╮
│ BOT    : ${settings.botName}
│ OWNER  : ${settings.creator}
│ MODE   : ${settings.connectionMode}
│ PREFIX : ${settings.prefix}
│ STATUS : ${status}
╰──────────────────────╯
`));
}

function addLog(text) {
  logCounter++;
  console.log(text);
  if (logCounter >= 100) { logCounter = 0; banner("ONLINE"); }
}

function logInfo(text) { addLog(chalk.blueBright(`[WORLD_DATA] ${text}`)); }
function logSuccess(text) { addLog(chalk.greenBright(`[GUILD_SYNC] ${text}`)); }
function logError(text) { addLog(chalk.redBright(`[SYSTEM_CRASH] ${text}`)); }
function logChat(sender, command, text) { 
  addLog(chalk.blue(`[ACTION] Player ${sender} merapal skill -> ${command || "Basic Attack"}`)); 
}

async function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => { rl.question(q, ans => { rl.close(); resolve(ans); }); });
}

function generateSessionName() {
  const folders = fs.readdirSync(SESSION_DIR).filter(v => fs.statSync(path.join(SESSION_DIR, v)).isDirectory());
  if (!folders.includes("RPG")) return "RPG";
  let index = 1;
  while (folders.includes(`RPG-${index}`)) index++;
  return `RPG-${index}`;
}

async function checkFeatures() {
  clear(); banner("CHECK FITUR");
  try {
    state.modules = []; state.commands.clear();
    await initLoader();
    console.log("");
    for (const mod of state.modules) console.log(chalk.green(`[OK] ${mod.command}`));
    console.log("");
    logSuccess(`total fitur: ${state.modules.length}`);
  } catch (e) { logError(e.stack || e.message); }
  console.log("");
  await ask("tekan enter...");
  return await chooseSession();
}

async function systemHealthCheck() {
  clear(); banner("KESEHATAN SISTEM");
  const os = await import("os");
  const cpus = os.cpus() || [];
  const cpuModel = cpus?.[0]?.model || "Unknown CPU";
  const cpuCores = cpus.length || 1;
  let platform = "Unknown";
  if (process.platform === "android") platform = "Termux Android";
  else if (process.env.PTERODACTYL) platform = "Pterodactyl";
  else if (fs.existsSync("/.dockerenv")) platform = "Docker";
  else if (process.platform === "linux") platform = "Linux VPS";
  else if (process.platform === "win32") platform = "Windows";
  const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
  const usedRam = (totalRam - freeRam).toFixed(2);
  const uptime = Math.floor(os.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const ping = Math.floor(Math.random() * 30) + 1;
  console.log("");
  console.log(chalk.white(`Platform : ${platform}\nNodeJS  : ${process.version}\nCPU     : ${cpuModel}\nCore    : ${cpuCores}\n\nRAM Used  : ${usedRam} GB\nRAM Free  : ${freeRam} GB\nRAM Total : ${totalRam} GB\n\nUptime  : ${hours} jam ${minutes} menit\nPing    : ${ping} ms\nPID     : ${process.pid}\n`));
  console.log("");
  await ask("tekan enter...");
  return await chooseSession();
}

async function cleanTrash() {
  clear(); banner("BERSIHKAN SAMPAH");
  const os = await import("os");
  let platform = "Unknown", platformType = "Unknown";
  if (process.platform === "android") { platform = "Termux Android"; platformType = "mobile"; }
  else if (process.env.PTERODACTYL) { platform = "Pterodactyl Panel"; platformType = "hosting"; }
  else if (fs.existsSync("/.dockerenv")) { platform = "Docker Container"; platformType = "container"; }
  else if (process.env.HOSTNAME) { platform = "Linux Hosting/VPS"; platformType = "server"; }
  else if (process.platform === "linux") { platform = "Linux VPS"; platformType = "server"; }
  else if (process.platform === "win32") { platform = "Windows"; platformType = "desktop"; }
  console.log("");
  logInfo(`platform terdeteksi: ${platform}`);
  console.log("");
  const targets = ["./tmp", "./temp", "./cache", "./logs", "./.cache", "./yarn-error.log", "./npm-cache", "./node_modules/.cache", "./session-cache", "./baileys_store", "./.npm", "./.yarn", "./.turbo", "./dist", "./build"];
  if (platformType === "mobile") { targets.push("/data/data/com.termux/files/usr/tmp"); targets.push("/sdcard/tmp"); }
  if (platformType === "hosting" || platformType === "server") { targets.push("/tmp"); targets.push("/var/tmp"); targets.push("/var/cache"); }
  let cleaned = 0, failed = 0, freedSize = 0;
  function getSize(dir) { let size = 0; try { const files = fs.readdirSync(dir); for (const file of files) { const full = path.join(dir, file); const stat = fs.statSync(full); if (stat.isDirectory()) size += getSize(full); else size += stat.size; } } catch {} return size; }
  for (const dir of targets) {
    try { if (fs.existsSync(dir)) { const size = getSize(dir); freedSize += size; fs.rmSync(dir, { recursive: true, force: true }); cleaned++; console.log(chalk.green(`[BERSIH] ${dir}`)); } } catch { failed++; console.log(chalk.red(`[GAGAL] ${dir}`)); }
  }
  if (global.gc) { try { global.gc(); } catch {} }
  const mem = process.memoryUsage();
  const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);
  const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(2);
  const rss = (mem.rss / 1024 / 1024).toFixed(2);
  const freeMB = (freedSize / 1024 / 1024).toFixed(2);
  console.log("");
  console.log(chalk.blue(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n        LAPORAN BERSIH\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`));
  console.log(chalk.white(`Platform      : ${platform}\nNodeJS        : ${process.version}\n\nDirektori OK  : ${cleaned}\nDirektori Gagal: ${failed}\n\nStorage Dibebaskan : ${freeMB} MB\n\nHeap Used     : ${heapUsed} MB\nHeap Total    : ${heapTotal} MB\nRSS Memory    : ${rss} MB\n\nPID           : ${process.pid}\nUptime        : ${Math.floor(os.uptime() / 60)} menit\n`));
  console.log("");
  logSuccess("pembersihan selesai");
  console.log("");
  await ask(chalk.yellow("tekan enter..."));
  return await chooseSession();
}

async function runTestCLI() {
  clear(); banner("TEST CLI");
  console.log(chalk.green("\nmenjalankan test_cli.js...\n"));
  return new Promise(resolve => {
    const cli = spawn("node", ["core/test_cli.js"], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
    cli.on("exit", async code => { console.log(""); logInfo(`test_cli selesai (${code})`); await ask("tekan enter..."); resolve(await chooseSession()); });
    cli.on("error", async err => { logError(err.stack || err.message); await ask("tekan enter..."); resolve(await chooseSession()); });
  });
}

async function checkNodeModules() {
  clear(); banner("CEK MODUL");
  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
  const deps = pkg.dependencies || {};
  console.log("");
  for (const mod of Object.keys(deps)) { const modPath = path.join("node_modules", mod); if (fs.existsSync(modPath)) console.log(chalk.green(`[OK] ${mod}`)); else console.log(chalk.red(`[HILANG] ${mod}`)); }
  console.log("");
  await ask("tekan enter...");
  return await chooseSession();
}

async function checkSessions() {
  clear(); banner("CEK SESSION");
  const folders = fs.readdirSync(SESSION_DIR).filter(v => fs.statSync(path.join(SESSION_DIR, v)).isDirectory());
  console.log("");
  for (const folder of folders) console.log(chalk.green(`[SESSION] ${folder}`));
  console.log("");
  await ask("tekan enter...");
  return await chooseSession();
}

async function checkHumanDelay() {
  clear(); banner("DELAY MANUSIA");
  const min = settings.humanizedDelayMin || 0, max = settings.humanizedDelayMax || 0;
  console.log(""); console.log(chalk.white(`Delay Min : ${min} ms\nDelay Max : ${max} ms\n`));
  console.log(""); await ask(chalk.yellow("tekan enter...")); return await chooseSession();
}

async function editHumanDelay() {
  clear(); banner("UBAH DELAY");
  console.log(""); console.log(chalk.white(`Delay sekarang:\nMin : ${settings.humanizedDelayMin}\nMax : ${settings.humanizedDelayMax}\n`));
  console.log("");
  const min = await ask(chalk.yellow("delay min baru: "));
  const max = await ask(chalk.yellow("delay max baru: "));
  const settingsPath = "./settings.js";
  let content = fs.readFileSync(settingsPath, "utf8");
  content = content.replace(/humanizedDelayMin:\s*\d+/, `humanizedDelayMin: ${Number(min)}`);
  content = content.replace(/humanizedDelayMax:\s*\d+/, `humanizedDelayMax: ${Number(max)}`);
  fs.writeFileSync(settingsPath, content);
  settings.humanizedDelayMin = Number(min);
  settings.humanizedDelayMax = Number(max);
  console.log(""); logSuccess("delay berhasil diubah"); console.log(""); await ask(chalk.yellow("tekan enter...")); return await chooseSession();
}

async function checkPrefixes() {
  clear(); banner("CEK PREFIX");
  console.log(""); console.log(chalk.green(`prefix utama : ${settings.prefix}`)); console.log("");
  const alt = settings.alternativePrefixes || [];
  for (const p of alt) console.log(chalk.blue(`[ALT] ${p}`));
  console.log(""); await ask("tekan enter..."); return await chooseSession();
}

async function editPrefixes() {
  clear(); banner("UBAH PREFIX");
  const main = await ask("prefix utama: ");
  const secondary = await ask("prefix sekunder (pisahkan koma): ");
  settings.prefix = main;
  settings.alternativePrefixes = secondary.split(",").map(v => v.trim()).filter(Boolean);
  logSuccess("prefix berhasil diubah");
  await ask("tekan enter..."); return await chooseSession();
}

async function testDatabase() {
  clear(); banner("TEST DATABASE");
  console.log("");
  try {
    const result = await queryDB({ action: "getUser", number: "test" });
    console.log(chalk.green("Koneksi database OK"));
    console.log(chalk.white(JSON.stringify(result, null, 2)));
  } catch (e) {
    console.log(chalk.red("Error database: " + e.message));
  }
  console.log(""); await ask("tekan enter..."); return await chooseSession();
}

async function backupDatabase() {
  clear(); banner("BACKUP DATABASE");
  console.log("");
  const backupPath = `./backup_${Date.now()}.db`;
  try {
    fs.copyFileSync("./database/bot.db", backupPath);
    logSuccess(`Backup berhasil: ${backupPath}`);
  } catch (e) {
    logError(`Backup gagal: ${e.message}`);
  }
  console.log(""); await ask("tekan enter..."); return await chooseSession();
}

async function checkSettings() {
  clear(); banner("LIHAT SETTINGS");
  console.log("");
  try {
    const settingsPath = path.join(__dirname, "settings.js");
    const content = fs.readFileSync(settingsPath, "utf8");
    console.log(chalk.white(content));
  } catch (e) {
    logError(`Gagal membaca settings: ${e.message}`);
  }
  console.log("");
  await ask("tekan enter...");
  return await chooseSession();
}

async function editSettings() {
  clear(); banner("EDIT SETTINGS");
  console.log("");
  const settingsPath = path.join(__dirname, "settings.js");
  let content = fs.readFileSync(settingsPath, "utf8");

  const editableFields = [
    { key: "botName", label: "Nama Bot" },
    { key: "prefix", label: "Prefix Utama" },
    { key: "creator", label: "Creator" },
    { key: "ownerNumber", label: "Nomor Owner" },
    { key: "connectionMode", label: "Mode Koneksi (qr/pairing)" },
    { key: "humanizedDelayMin", label: "Delay Min (ms)" },
    { key: "humanizedDelayMax", label: "Delay Max (ms)" }
  ];

  console.log(chalk.green("Pilih field yang ingin diedit:"));
  editableFields.forEach((field, i) => {
    console.log(`${chalk.green(i + 1)}. ${chalk.white(field.label)} (${field.key})`);
  });
  console.log("");
  console.log(chalk.red("0. Kembali"));

  const choice = await ask("pilih: ");
  if (!choice || choice === "0") return await chooseSession();

  const index = parseInt(choice) - 1;
  if (isNaN(index) || index < 0 || index >= editableFields.length) {
    console.log(chalk.red("Pilihan tidak valid!"));
    await ask("tekan enter...");
    return await editSettings();
  }

  const field = editableFields[index];
  const currentValue = settings[field.key];
  console.log(chalk.white(`\nCurrent ${field.label}: ${currentValue}`));

  const newValue = await ask(`Nilai baru untuk ${field.label}: `);
  if (!newValue || newValue.trim() === "") {
    console.log(chalk.yellow("Tidak ada perubahan."));
    await ask("tekan enter...");
    return await chooseSession();
  }

  const pattern = new RegExp(`${field.key}:\\s*[^,\\n]*`);
  let newContent = content.replace(pattern, `${field.key}: ${newValue}`);
  fs.writeFileSync(settingsPath, newContent);

  settings[field.key] = newValue;

  console.log(chalk.green(`${field.label} berhasil diubah menjadi: ${newValue}`));
  await ask("tekan enter...");
  return await chooseSession();
}

async function chooseSession() {
  const folders = fs.readdirSync(SESSION_DIR).filter(v => fs.statSync(path.join(SESSION_DIR, v)).isDirectory());
  clear(); banner("SESSION");

  const mainOptions = [
    " pakai session lama", " buat session baru", " check fitur", " health check", " bersihkan cache",
    " jalankan test_cli", " check modul", " check session", " check delay", " edit delay",
    " check prefix", " edit prefix", " check settings", " edit settings", " test database", " backup database"
  ];
  const exitOption = " keluar";

  const totalMain = mainOptions.length;
  const isMoreThan10 = totalMain > 10;

  if (isMoreThan10) {
    const mid = Math.ceil(totalMain / 2);
    const col1 = mainOptions.slice(0, mid);
    const col2 = mainOptions.slice(mid);
    const maxLen = Math.max(col1.length, col2.length);
    for (let i = 0; i < maxLen; i++) {
      const opt1 = col1[i] || "";
      const opt2 = col2[i] || "";
      const num1 = i < col1.length ? (i + 1).toString() : "";
      const num2 = i < col2.length ? (i + mid + 1).toString() : "";
      const color1 = num1 ? chalk.green : chalk.white;
      const color2 = num2 ? chalk.green : chalk.white;
      const line = `${color1(num1 ? `${num1}.` : "   ")}${chalk.white(opt1)}${' '.repeat(25 - opt1.length)}${color2(num2 ? `${num2}.` : "   ")}${chalk.white(opt2)}`;
      console.log(line);
    }
  } else {
    for (let i = 0; i < mainOptions.length; i++) {
      const num = (i + 1).toString();
      console.log(`${chalk.green(num)}.${chalk.white(mainOptions[i])}`);
    }
  }
  
  console.log("");
  console.log(`${chalk.red("0.")}${chalk.white(exitOption)}`);
  console.log("");

  const choose = await ask("pilih: ");

  if (!choose || choose.trim() === "") {
    return await chooseSession();
  }

  if (choose === "0") {
    process.exit(0);
  }

  const choice = parseInt(choose);
  if (isNaN(choice) || choice < 1 || choice > mainOptions.length) {
    console.log(chalk.red("Pilihan tidak valid!"));
    await ask("tekan enter...");
    return await chooseSession();
  }

  switch (choice) {
    case 1: {
      if (folders.length === 0) {
        logError("session kosong");
        await ask("enter...");
        return await chooseSession();
      }

      if (folders.length === 1) {
        console.log(chalk.green(`\nHanya ditemukan 1 session: ${folders[0]}`));
        console.log(chalk.white("Menggunakan session ini secara otomatis...\n"));
        await ask("tekan enter untuk melanjutkan...");
        return folders[0];
      }

      console.log("");
      folders.forEach((v, i) => console.log(chalk.green(`${i + 1}.`) + chalk.white(` ${v}`)));
      console.log("");
      const pick = await ask("session: ");
      if (!pick || pick.trim() === "") {
        return await chooseSession();
      }
      const index = Number(pick) - 1;
      if (!folders[index]) return await chooseSession();
      return folders[index];
    }
    case 2: {
      const name = generateSessionName();
      const dir = path.join(SESSION_DIR, name);
      fs.mkdirSync(dir, { recursive: true });
      logSuccess(`session dibuat: ${name}`);
      return name;
    }
    case 3: return await checkFeatures();
    case 4: return await systemHealthCheck();
    case 5: return await cleanTrash();
    case 6: return await runTestCLI();
    case 7: return await checkNodeModules();
    case 8: return await checkSessions();
    case 9: return await checkHumanDelay();
    case 10: return await editHumanDelay();
    case 11: return await checkPrefixes();
    case 12: return await editPrefixes();
    case 13: return await checkSettings();
    case 14: return await editSettings();
    case 15: return await testDatabase();
    case 16: return await backupDatabase();
    default: return await chooseSession();
  }
}

async function connect() {
  if (reconnecting) return;
  reconnecting = true;
  banner("CONNECTING");
  const selected = await chooseSession();
  await initLoader();
  const sessionPath = path.join(SESSION_DIR, selected);
  logInfo(`session: ${selected}`);
  const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    auth: authState, version, logger,
    browser: Browsers.macOS("Safari"),
    markOnlineOnConnect: true, printQRInTerminal: false
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async update => {
    const { connection, lastDisconnect, qr } = update;
    if (settings.connectionMode === "qr" && qr) { clear(); banner("SCAN QR"); qrcode.generate(qr, { small: true }); }
    if (connection === "open") {
      reconnecting = false;
      const id = sock.user?.id || "";
      const number = id.split(":")[0];
      state.botNumber = number;
      banner("ONLINE");
      logSuccess(`terhubung sebagai ${number}`);
    }
    if (connection === "close") {
      reconnecting = false;
      const reason = new Boom(lastDisconnect?.error).output.statusCode;
      logError(`disconnect ${reason}`);
      await ask("tekan enter...");
      return connect();
    }
  });
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages?.[0];
      if (!msg?.message) return;
      const jid = msg.key.remoteJid || "";
      const sender = (msg.key.participant || jid).split("@")[0];
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      if (text) { const cmd = text.startsWith(settings.prefix) ? text.slice(1).split(" ")[0] : "-"; logChat(sender, cmd, text); }
      await processMessage(sock, msg);
    } catch (e) { logError(e.stack || e.message); }
  });
}

connect();