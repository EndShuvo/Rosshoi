import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { supabase } from "./src/supabase.ts";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
let db: any;

const app = express();

app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  next();
});

app.get("/api/state/:key", async (req, res) => {
  try {
    if (isProduction) {
      const { data, error } = await supabase
        .from("app_state")
        .select("value")
        .eq("key", req.params.key)
        .single();
      if (error) throw error;
      res.json(JSON.parse(data.value));
    } else {
      const row = db.prepare("SELECT value FROM app_state WHERE key = ?").get(req.params.key) as { value: string } | undefined;
      if (row) {
        res.json(JSON.parse(row.value));
      } else {
        res.status(404).json({ error: "Not found" });
      }
    }
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/state/:key", express.text({ limit: '50mb', type: '*/*' }), async (req, res) => {
  try {
    let value;
    try {
      value = JSON.parse(req.body);
    } catch (e) {
      value = req.body;
    }
    
    const valueToSave = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (isProduction) {
      const { error } = await supabase
        .from("app_state")
        .upsert({ key: req.params.key, value: valueToSave });
      if (error) throw error;
    } else {
      db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)").run(req.params.key, valueToSave);
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Error in POST /api/state/:key", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/export", async (req, res) => {
  try {
    let rows: { key: string, value: string }[] = [];
    if (isProduction) {
      const { data, error } = await supabase.from("app_state").select("*");
      if (error) throw error;
      rows = data as any;
    } else {
      rows = db.prepare("SELECT * FROM app_state").all() as { key: string, value: string }[];
    }
    const data = rows.reduce((acc, row) => {
      acc[row.key] = JSON.parse(row.value);
      return acc;
    }, {} as any);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/import", express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const data = req.body;
    if (isProduction) {
      const items = Object.entries(data).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
      const { error } = await supabase.from("app_state").upsert(items);
      if (error) throw error;
    } else {
      const insert = db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)");
      const transaction = db.transaction((items: any) => {
        for (const [key, value] of Object.entries(items)) {
          insert.run(key, JSON.stringify(value));
        }
      });
      transaction(data);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

function log(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync("server.log", `[${timestamp}] ${msg}\n`);
  console.log(msg);
}

async function startServer() {
  log("Starting startServer function...");
  
  if (!isProduction) {
    try {
      log("Initializing SQLite database...");
      const Database = (await import("better-sqlite3")).default;
      db = new Database("database.sqlite");
      log("Database initialized.");
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);
    } catch (err: any) {
      log(`Failed to initialize SQLite: ${err.message}`);
      const Database = (await import("better-sqlite3")).default;
      db = new Database(":memory:");
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    log("Creating Vite server...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    log("Vite server created, adding middleware...");
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  log(`Attempting to listen on port ${PORT}...`);
  app.listen(PORT, "0.0.0.0", () => {
    log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
