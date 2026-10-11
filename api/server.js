const os = require("os");
const express = require("express");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

const app = express();
app.use(express.json());

// Visar vilken containerinstans som svarade (bra vid --scale api=3)
app.use((req, res, next) => {
  res.set("X-Served-By", os.hostname());
  next();
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", instance: os.hostname() });
  } catch (err) {
    res.status(503).json({ status: "db-unavailable" });
  }
});

app.get("/api/todos", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM todos ORDER BY id");
  res.json({ instance: os.hostname(), todos: rows });
});

app.post("/api/todos", async (req, res) => {
  const title = (req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const { rows } = await pool.query(
    "INSERT INTO todos (title) VALUES ($1) RETURNING *",
    [title]
  );
  res.status(201).json(rows[0]);
});

app.patch("/api/todos/:id", async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE todos SET done = NOT done WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

app.delete("/api/todos/:id", async (req, res) => {
  await pool.query("DELETE FROM todos WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

async function init() {
  for (let i = 1; i <= 30; i++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT false
      )`);
      return;
    } catch (err) {
      console.log(`Väntar på databasen (${i}/30): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Kunde inte nå databasen");
}

init()
  .then(() => app.listen(3000, () => console.log("API lyssnar på :3000")))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
