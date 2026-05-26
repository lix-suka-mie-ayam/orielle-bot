import fs from "fs";
import path from "path";

const DATABASE_DIR = "./database/temp";

function ensureDir() {
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, {
      recursive: true
    });
  }
}

function resolveFile(feature) {
  ensureDir();

  return path.join(
    DATABASE_DIR,
    `${feature}.json`
  );
}

export function readTemp(feature) {
  try {
    const file = resolveFile(feature);

    if (!fs.existsSync(file)) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return null;
  }
}

export function writeTemp(feature, data) {
  const file = resolveFile(feature);

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

export function deleteTemp(feature) {
  const file = resolveFile(feature);

  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}