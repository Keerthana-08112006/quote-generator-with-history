
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const dbPath = process.env.DB_PATH || path.join(__dirname, "favorites.db");
const db = new sqlite3.Database(dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quote, author)
  )
`);

app.get("/api/quote", async (req, res) => {
  try {
    const response = await fetch("https://dummyjson.com/quotes/random");
    if (!response.ok) throw new Error("Quote API error");

    const data = await response.json();
    res.json({ quote: data.quote, author: data.author });
  } catch (error) {
    res.status(502).json({ error: "Unable to fetch quote. Try again." });
  }
});

app.get("/api/favorites", (req, res) => {
  db.all("SELECT * FROM favorites ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Unable to load favorites" });
    res.json(rows);
  });
});

app.post("/api/favorites", (req, res) => {
  const { quote, author } = req.body;

  if (
    typeof quote !== "string" ||
    typeof author !== "string" ||
    !quote.trim() ||
    !author.trim() ||
    quote.length > 2000 ||
    author.length > 200
  ) {
    return res.status(400).json({ error: "Valid quote and author are required" });
  }

  db.run(
    "INSERT INTO favorites (quote, author) VALUES (?, ?)",
    [quote.trim(), author.trim()],
    function (err) {
      if (err && err.code === "SQLITE_CONSTRAINT") {
        return res.status(409).json({ error: "Quote already saved!" });
      }
      if (err) return res.status(500).json({ error: "Unable to save favorite" });

      res.status(201).json({
        id: this.lastID,
        quote: quote.trim(),
        author: author.trim()
      });
    }
  );
});

app.delete("/api/favorites/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid favorite ID" });
  }

  db.run("DELETE FROM favorites WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Unable to delete favorite" });
    if (!this.changes) return res.status(404).json({ error: "Favorite not found" });

    res.json({ message: "Favorite removed" });
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Quote Generator running at http://localhost:${PORT}`);
});
