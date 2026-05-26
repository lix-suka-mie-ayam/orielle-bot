###📜 ORIELLE Bot – Dokumentasi

Selamat datang di dokumentasi ORIELLE, bot WhatsApp multifungsi dengan sistem RPG, manajemen pengguna, limit harian, dan koneksi database SQLite. Bot ini dirancang untuk memberikan pengalaman bermain RPG yang seru sekaligus interaksi yang "humanis" (typing delay, random respon, dll).


📋 Daftar Isi

1. Fitur Utama
2. Persyaratan Sistem
3. Instalasi & Setup
4. Konfigurasi
5. Menjalankan Bot
6. Sistem RPG
7. Sistem Limit Harian
8. Humanized Send (Typing Delay)
9. Database & Penyimpanan
10. Struktur Direktori
11. Troubleshooting
12. Lisensi & Kredit


✨ Fitur Utama

· Sistem RPG – Level, EXP, HP, Mana, Gold, Role, Inventory
· Limit Harian – Batas penggunaan fitur berdasarkan level pemain
· Humanized Send – Simulasi mengetik dan jeda acak agar terlihat seperti manusia
· Database SQLite – Menyimpan data user, premium, dan session
· Auto-registrasi – User baru otomatis dibuat saat pertama kali interaksi
· Cache User – Mengurangi query database dengan temporary cache
· Manajemen Session – Multi-session (QR / pairing)
· Command Loader – Modular, command dimuat dari folder Vault/
· CLI Test – Mode command line untuk testing tanpa WhatsApp
· Panel Admin – Menu interaktif untuk manage session, setting, database, dll


💻 Persyaratan Sistem

· Node.js v18 atau lebih baru
· Python v3.8 atau lebih baru (untuk db_manager.py)
· npm atau yarn (manajer paket)
· Termux (Android) / Linux VPS / Windows / Docker – mendukung semua platform
· Koneksi internet stabil


🛠️ Instalasi & Setup

1. Clone atau download source code

```bash
git clone https://github.com/lix-suka-mie-ayam/orielle-bot.git
cd orielle-bot
```

2. Install dependensi Node.js

```bash
yarn install
```

3. Install dependensi Python (opsional jika hanya menggunakan database)

```bash
pip install sqlite3  # sudah built-in
```

4. Inisialisasi database

```bash
python3 database/db_manager.py init
```

5. (Opsional) Buat file konfigurasi .env – tidak wajib, semua di settings.js


⚙️ Konfigurasi

Semua konfigurasi utama berada di settings.js. Berikut variabel penting:

Variabel Deskripsi
botName Nama bot (digunakan untuk nama file database)
prefix Prefix utama (contoh: ★)
alternativePrefixes Prefix tambahan (array)
ownerNumber Nomor WhatsApp owner (tanpa @s.whatsapp.net)
connectionMode "qr" atau "pairing"
humanizedDelayMin Jeda minimal mengetik (ms)
humanizedDelayMax Jeda maksimal mengetik (ms)
levelLimits Batas limit harian per level (pemula: 5, umum: 10, dst)
expRequirements EXP yang dibutuhkan untuk naik level
rpgSystem Pengaturan RPG (HP awal, Mana, Gold, role, guild, dll)
levelCooldowns Cooldown antar level (ms)

Catatan: Ubah ownerNumber dengan nomor Anda sendiri agar mendapat akses penuh.


🚀 Menjalankan Bot

Setelah instalasi, jalankan bot dengan perintah:

```bash
npm start
```

Menu Interaktif

Saat pertama kali dijalankan, Anda akan disambut dengan menu pilihan:

1. Pakai session lama
2. Buat session baru
3. Check fitur (load semua command)
4. Health check (info sistem)
5. Bersihkan cache (hapus file sementara)
6. Jalankan test_cli (mode CLI)
7. Check modul (cek dependensi Node)
8. Check session (lihat semua folder session)
9. Check delay (lihat pengaturan humanized delay)
10. Edit delay (ubah delay min/max)
11. Check prefix (lihat prefix aktif)
12. Edit prefix (ubah prefix utama & alternatif)
13. Check settings (tampilkan isi settings.js)
14. Edit settings (ubah field penting interaktif)
15. Test database (uji koneksi SQLite)
16. Backup database (copy file .db)

Mode Koneksi

· QR – Scan QR code di terminal (untuk perangkat dengan layar)
· Pairing – Masukkan kode pairing (untuk VPS tanpa layar)

Pengaturan mode ada di settings.js → connectionMode.


🎮 Sistem RPG

Setiap user memiliki data RPG yang tersimpan di database:

Field Tipe Deskripsi
hp integer Health points (default 100)
mana integer Mana points (default 50)
gold integer Mata uang (default 500)
role string Class (Novice, Swordsman, dll)
level string Level pemain (pemula, umum, terlatih, ahli, veteran, pensiunan)
exp integer Experience points (akumulasi)
inventory JSON Item yang dimiliki (disimpan sebagai string JSON)

Level & EXP

· Setiap kali user melakukan command (tergantung modul), EXP bertambah.
· Jika EXP mencapai expRequirements[level], user naik level.
· Naik level memberikan +500 Gold, full HP & Mana, dan mengubah level di database.

Cooldown Level

Setiap level memiliki cooldown (dalam ms) sebelum user bisa naik level lagi. Cooldown diatur di settings.levelCooldowns.

Guild

Nama guild dapat diatur di settings.rpgSystem.guildName. Pesan level-up akan menyebut guild.


⏳ Sistem Limit Harian

Bot menerapkan limit penggunaan fitur per user berdasarkan level mereka. Pengaturan ada di settings.levelLimits.

Level Limit per hari
pemula 5
umum 10
terlatih 20
ahli 25
veteran 30
pensiunan 35
premium ∞ (unlimited)

Cara kerja:

· Setiap command (kecuali menu, roast dan command gratis lainnya) akan mengurangi limit.
· Limit disimpan di database/temp/user_limits.json berdasarkan tanggal.
· Jika limit habis, user akan mendapat pesan peringatan.
· User premium dan owner tidak terpengaruh limit.


🧑‍💻 Humanized Send (Typing Delay)

Fitur ini membuat bot terlihat lebih alami dengan:

· Typing indicator (composing) selama beberapa detik
· Jeda acak sebelum mengirim pesan (diatur humanizedDelayMin / humanizedDelayMax)
· Dekorasi pesan – Pesan RPG akan dibungkus dengan gaya tertentu secara acak

Fungsi ini terdapat di human.js dan digunakan oleh semua modul melalui humanizedSend().


🗄️ Database & Penyimpanan

Database Utama (SQLite)

· Lokasi: database/{botName}.db (nama diambil dari settings.botName)
· Tabel:
  · users – data RPG user
  · premium – daftar nomor premium
· Akses melalui Python script db_manager.py (dipanggil dari Node.js via spawn)

Temporary Cache (JSON)

· Lokasi: database/temp/
· File:
  · users_cache.json – cache data user untuk mengurangi query
  · user_limits.json – limit harian user
· Digunakan oleh db_temp.js (read/write sync)

Session Data

· Lokasi: database/session_data/
· Setiap session memiliki folder sendiri (nama di-generate atau user-defined)
· Disimpan menggunakan useMultiFileAuthState dari Baileys


📁 Struktur Direktori

```
orielle-bot/
├── README.md                      # Dokumentasi utama
├── Vault/                         # Modul command (setiap subfolder berisi logic.js)
│   ├── Fun/                       # Command hiburan
│   │   └── roast/                 # Command roast
│   │       ├── data.json          # Data untuk command roast
│   │       └── logic.js           # Logika command roast
│   ├── Games/                     # Command game
│   │   └── susun_kata/            # Game susun kata
│   │       ├── data.json          # Data kata-kata
│   │       └── logic.js           # Logika permainan
│   ├── RPG/                       # Command RPG
│   │   ├── inventory/             # Lihat inventory
│   │   │   └── logic.js
│   │   ├── shop/                  # Beli item
│   │   │   └── logic.js
│   │   └── use/                   # Gunakan item
│   │       └── logic.js
│   ├── System/                    # Command sistem
│   │   ├── addprem/               # Tambah premium user
│   │   │   └── logic.js
│   │   ├── botmode/               # Ubah mode bot
│   │   │   └── logic.js
│   │   ├── menu/                  # Tampilkan menu
│   │   │   └── logic.js
│   │   └── utility/               # Utilitas umum
│   │       └── logic.js
│   └── profile/                   # Lihat profil user
│       └── logic.js
├── core/                          # Kode inti bot
│   ├── db.js                      # Antarmuka database (query via Python)
│   ├── db_temp.js                 # Manajemen file JSON temporary
│   ├── human.js                   # Humanized send (typing, delay)
│   ├── limit.js                   # Sistem limit harian
│   ├── loader.js                  # Loader modul dari Vault/
│   ├── main.js                    # Entry point bot
│   ├── safe.js                    # Validasi modul, rate limit
│   ├── settings.js                # Konfigurasi utama
│   ├── state.js                   # State global (botNumber, modules, dll)
│   └── test_cli.js                # CLI untuk testing tanpa WhatsApp
├── database/                      # Data dan penyimpanan
│   ├── db_manager.js              # (Opsional) Manajer database JavaScript
│   ├── db_manager.py              # Manajer database Python (SQLite)
│   ├── item_data/                 # Data item RPG (JSON)
│   │   └── potion.json            # Contoh data item (Health Potion)
│   ├── session_data/              # **Penyimpanan session Baileys** (multi-session)
│   └── temp/                      # **Data temporary** (cache user, limit harian, dll)
└── package.json                   # Dependensi Node.js
```

Penjelasan Penting:

Folder Fungsi
database/session_data/ Penyimpanan session – Menyimpan data autentikasi Baileys (multi-session). Setiap session memiliki folder sendiri.
database/temp/ Data temporary – Menyimpan file JSON sementara seperti users_cache.json (cache data user) dan user_limits.json (limit harian). Data ini dapat dihapus kapan saja tanpa merusak database utama.
Vault/ Modul command – Setiap subfolder mewakili satu command dengan logic.js dan data.json (jika diperlukan). Struktur modular memudahkan penambahan command baru.
database/item_data/ Data item RPG – Menyimpan definisi item dalam format JSON untuk digunakan dalam command RPG (shop, inventory, use).

🔧 Troubleshooting

1. Bot tidak merespon / koneksi putus

· Cek koneksi internet
· Hapus folder session database/session_data/ lalu buat session baru
· Pastikan connectionMode sesuai (QR untuk perangkat dengan layar, pairing untuk VPS)

2. Database error "no such table"

· Jalankan inisialisasi database: python3 database/db_manager.py init
· Pastikan botName di settings.js tidak mengandung karakter aneh

3. Command tidak muncul

· Pastikan folder Vault/ berisi subfolder dengan logic.js
· Jalankan menu "Check fitur" (pilihan 3) untuk melihat modul yang terload

4. Limit tidak berkurang / selalu habis

· Cek settings.levelLimits – pastikan level user sesuai
· Cek database/temp/user_limits.json – hapus file jika ingin reset semua limit

5. Humanized delay terlalu lama

· Ubah humanizedDelayMin dan humanizedDelayMax di settings.js (atau via menu Edit delay)

6. Masalah Python (db_manager.py)

· Pastikan Python 3 terinstall dan di PATH
· Jika error ModuleNotFoundError, install modul yang diperlukan (biasanya hanya built-in)

7. Bot mati sendiri (crash)

· Lihat log error di terminal
· Periksa memory usage (gunakan menu Health check)
· Hapus cache dengan menu Bersihkan cache


📄 Lisensi & Kredit

Proyek ini adalah Open Source dan dirilis di bawah Lisensi MIT. Anda bebas menggunakan, memodifikasi, dan mendistribusikan ulang kode ini selama menyertakan atribusi yang sesuai.

· Creator: ×‿×
· Lisensi: MIT
· Sumber: https://github.com/lix-suka-mie-ayam

Dengan lisensi MIT, Anda dapat:

· Menggunakan kode ini untuk keperluan pribadi atau komersial
· Memodifikasi dan mendistribusikan ulang
· Tidak perlu membayar royalti
· Namun, Anda harus menyertakan lisensi asli dan pemberitahuan hak cipta
