import sqlite3
import json
import sys
import os
from datetime import datetime
import { settings } from "./core/settings.js";

db_path = os.path.join(
    os.path.dirname(__file__),
    `${settings.botName}.db`
)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS premium (
  nomor TEXT PRIMARY KEY,
  tag TEXT,
  added_by TEXT,
  date TEXT
)
""")

conn.commit()

raw = sys.stdin.read()

data = json.loads(raw)

action = data.get("action")

if action == "addPremium":
    cursor.execute(
        "INSERT OR REPLACE INTO premium VALUES (?, ?, ?, ?)",
        (
            data.get("number"),
            data.get("tag"),
            data.get("added_by"),
            datetime.utcnow().isoformat()
        )
    )

    conn.commit()

    print(json.dumps({
        "success": True
    }))

elif action == "checkPremium":
    cursor.execute(
        "SELECT * FROM premium WHERE nomor = ?",
        (data.get("number"),)
    )

    row = cursor.fetchone()

    print(json.dumps({
        "premium": bool(row)
    }))

else:
    print(json.dumps({
        "success": False
    }))

conn.close()
