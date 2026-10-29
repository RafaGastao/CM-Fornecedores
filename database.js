"use strict";
const { readFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");
async function openDatabase() {
  if (process.env.MONGODB_URI) return require("./mongodb").openMongoDatabase();
  let query, close, kind;
  if (process.env.DATABASE_URL) {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    query = async (sql, values = []) => (await pool.query(sql, values)).rows;
    close = () => pool.end();
    kind = "PostgreSQL";
  } else {
    if (process.env.NODE_ENV === "production")
      throw new Error("Configure MONGODB_URI para produção.");
    const { DatabaseSync } = require("node:sqlite");
    const file =
      process.env.SQLITE_FILE ||
      path.join(__dirname, "data", "fornecedores.sqlite");
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
    query = async (sql, values = []) => {
      const ordered = [];
      const statement = db.prepare(
        sql.replace(/\$(\d+)/g, (_, n) => {
          ordered.push(values[Number(n) - 1]);
          return "?";
        }),
      );
      return statement.all(...ordered);
    };
    close = () => db.close();
    kind = "SQLite";
  }
  const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  for (const sql of schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await query(sql);
  const tables = new Set(["fornecedores", "produtos", "avaliacoes"]);
  const check = (table) => {
    if (!tables.has(table)) throw new Error("Coleção inválida.");
  };
  return {
    close, kind,
    health: () => query("SELECT 1"),
    list: (table) => {
      check(table);
      return query(`SELECT * FROM ${table} ORDER BY ${table === "avaliacoes" ? "data DESC,id" : "nome"}`);
    },
    exists: async (table, id) => {
      check(table);
      return (await query(`SELECT id FROM ${table} WHERE id=$1`, [id])).length > 0;
    },
    save: async (table, id, record, update) => {
      check(table);
      const fields = Object.keys(record), values = Object.values(record);
      const rows = update
        ? await query(`UPDATE ${table} SET ${fields.map((k, i) => `${k}=$${i + 1}`).join(",")} WHERE id=$${fields.length + 1} RETURNING *`, [...values, id])
        : await query(`INSERT INTO ${table}(id,${fields.join(",")}) VALUES(${[id, ...values].map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`, [id, ...values]);
      return rows[0];
    },
    remove: async (table, id) => {
      check(table);
      return (await query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [id])).length > 0;
    },
  };
}
module.exports = { openDatabase };
