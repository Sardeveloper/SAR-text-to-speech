const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "sar_secret_key",
  resave: false,
  saveUninitialized: false
}));

// Static files
app.use(express.static("public"));

// ---------------- DATABASE ----------------
const db = new sqlite3.Database("users.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
});

// ---------------- HOME ROUTE ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------- REGISTER ----------------
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hashed],
    (err) => {
      if (err) {
        return res.json({ error: "User already exists" });
      }
      res.json({ success: true });
    }
  );
});

// ---------------- LOGIN ----------------
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {
      if (!user) {
        return res.json({ error: "User not found" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.json({ error: "Wrong password" });
      }

      req.session.user = user;
      res.json({ success: true });
    }
  );
});

// ---------------- TTS (TEXT TO SPEECH) ----------------
app.post("/speak", (req, res) => {
  const text = req.body.text;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  const fileName = "voice_" + Date.now() + ".wav";
  const filePath = path.join(__dirname, "public", fileName);

  // Linux TTS engine (safe + simple)
  const command = `espeak "${text.replace(/"/g, "")}" -w "${filePath}"`;

  exec(command, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Speech generation failed" });
    }

    res.json({
      audio: "/" + fileName
    });
  });
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 SAR Text-to-Speech running on http://localhost:${PORT}`);
});
