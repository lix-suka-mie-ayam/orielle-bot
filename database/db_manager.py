import sqlite3
import os
import json
import sys
from datetime import datetime
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_setting(key="botName", path="./core/settings.js"):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        pattern = rf'{key}:\s*["\']?([^,"\']+)["\']?'
        match = re.search(pattern, content)
        if match:
            value = match.group(1).strip()
            return value if not value.isdigit() else int(value)
    except Exception as e:
        print(json.dumps({"error": f"Gagal baca settings.js: {e}"}))
    return None

bot_name = get_setting("botName") or "bot"
DB_PATH = os.path.join(BASE_DIR, f'{bot_name}.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA journal_mode=WAL')    
    conn.execute('PRAGMA synchronous=NORMAL')  
    conn.execute('PRAGMA cache_size=-8000')    
    conn.execute('PRAGMA mmap_size=268435456') 
    conn.execute('PRAGMA temp_store=MEMORY')   
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS premium (
            nomor TEXT PRIMARY KEY,
            tag TEXT,
            added_by TEXT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            nomor TEXT PRIMARY KEY,
            hp INTEGER DEFAULT 100,
            mana INTEGER DEFAULT 50,
            gold INTEGER DEFAULT 500,
            role TEXT DEFAULT 'Novice',
            level TEXT DEFAULT 'pemula',
            exp INTEGER DEFAULT 0,
            inventory TEXT DEFAULT '{}',
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_nomor ON users (nomor)')
    conn.commit()
    conn.close()

def fetch_user_dict(cursor, number):
    cursor.execute("SELECT * FROM users WHERE nomor = ?", (number,))
    row = cursor.fetchone()
    if row:
        user_data = dict(zip([col[0] for col in cursor.description], row))
        
        if 'inventory' in user_data and isinstance(user_data['inventory'], str):
            try:
                user_data['inventory'] = json.loads(user_data['inventory'])
            except:
                user_data['inventory'] = {}
        return user_data
    return None

def handle_request():
    raw = sys.stdin.read()
    if not raw.strip(): return
    data = json.loads(raw)
    action = data.get("action")
    number = data.get("number")
    
    conn = get_connection()
    cursor = conn.cursor()
    result = {"success": False}

    try:
        if action == "getUser":
            result = {"user": fetch_user_dict(cursor, number)}

        elif action == "createUser":
            cursor.execute(
                "INSERT OR IGNORE INTO users (nomor, hp, mana, gold, role, level, exp, inventory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (number, data.get("hp", 100), data.get("mana", 50), data.get("gold", 500), data.get("role", "Novice"), data.get("level", "pemula"), data.get("exp", 0), "{}")
            )
            conn.commit()
            result = {"success": True, "user": fetch_user_dict(cursor, number)}

        elif action == "updateUser":
            
            if "inventory" in data and isinstance(data["inventory"], dict):
                data["inventory"] = json.dumps(data["inventory"])

            keys = [k for k in data.keys() if k not in ["action", "number"]]
            if keys:
                sets = ", ".join([f"{k} = ?" for k in keys])
                vals = [data[k] for k in keys] + [number]
                cursor.execute(f"UPDATE users SET {sets}, last_update = CURRENT_TIMESTAMP WHERE nomor = ?", vals)
                conn.commit()
                result = {"success": True, "user": fetch_user_dict(cursor, number)}

        elif action == "addPremium":
            cursor.execute("INSERT OR REPLACE INTO premium (nomor, tag, added_by) VALUES (?, ?, ?)", 
                           (number, data.get("tag"), data.get("added_by")))
            conn.commit()
            result = {"success": True}
            
    except Exception as e:
        result = {"error": str(e)}
    
    print(json.dumps(result))
    conn.close()

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'init':
        init_db()
        print(json.dumps({"success": True}))
    else:
        handle_request()
