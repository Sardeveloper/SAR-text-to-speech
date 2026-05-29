const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "sar_secret_key_2026",
  resave: false,
  saveUninitialized: false
}));

// ---------------- STATIC FRONTEND ----------------
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

// ---------------- REGISTER ----------------
app.post("/register", async (req, res) => {

  console.log("REGISTER REQUEST:", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ error: "Missing email or password" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hashedPassword],
    function (err) {

      if (err) {
        console.log(err.message);
        return res.json({ error: "User already exists" });
      }

      res.json({ success: true });
    }
  );
});

// ---------------- LOGIN ----------------
app.post("/login", (req, res) => {

  console.log("LOGIN REQUEST:", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ error: "Missing email or password" });
  }

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {

      if (err) {
        console.log(err);
        return res.json({ error: "Database error" });
      }

      if (!user) {
        return res.json({ error: "User not found" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.json({ error: "Wrong password" });
      }

      req.session.user = user;

      console.log("LOGIN SUCCESS:", email);

      res.json({ success: true });
    }
  );
});

// ---------------- TEXT TO SPEECH ----------------
app.post("/speak", (req, res) => {
  const text = req.body.text;

  if (!text) {
    return res.json({ error: "No text provided" });
  }

  // send text back (no file system needed)
  res.json({
    text: text
  });
});
  }

  const fileName = "speech_" + Date.now() + ".wav";
  const filePath = path.join(__dirname, "public", fileName);

  // Linux TTS engine
  const command = `espeak "${text.replace(/"/g, "")}" -w "${filePath}"`;

  exec(command, (err) => {

    if (err) {
      console.log(err);
      return res.json({ error: "Speech generation failed" });
    }

    res.json({
      success: true,
      audio: "/" + fileName
    });
  });
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});
app.post("/speak", async (req, res) => {

  const text = req.body.text;

  if (!text) {
    return res.json({
      error: "No text provided"
    });
  }

  // Browser speech cannot generate real MP3
  // So we create a downloadable text file for now

  const fs = require("fs");
  const path = require("path");

  const fileName = "speech.txt";

  const filePath = path.join(__dirname, "public", fileName);

  fs.writeFileSync(filePath, text);

  res.json({
    audio: "/" + fileName
  });

});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 SAR Text-to-Speech running on http://localhost:${PORT}`);
});
