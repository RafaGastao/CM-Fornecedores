"use strict";
const express = require("express");
const path = require("node:path");
const {
  randomBytes,
  randomUUID,
  timingSafeEqual,
  createHash,
} = require("node:crypto");
const { openDatabase } = require("./database");
const publicDir = path.join(__dirname, "public");
const text = (v, max, required = true) =>
  typeof v === "string" &&
  v.trim().length <= max &&
  (!required || v.trim().length > 0);
const dateValid = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const equal = (a, b) =>
  timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
async function createApp() {
  if (
    !process.env.APP_PASSWORD ||
    process.env.APP_PASSWORD === "defina-uma-senha-forte-aqui"
  )
    throw new Error("Configure APP_PASSWORD no .env antes de iniciar.");
  const db = await openDatabase(),
    app = express(),
    sessions = new Map(),
    attempts = new Map();
  const secure =
    process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
  const cookieName = "cm_fornecedores_session";
  const token = (req) =>
    (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
  const cookie = (id, age) =>
    `${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? "; Secure" : ""}`;
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (req.headers["sec-fetch-site"] === "cross-site" ||
        (req.headers.origin &&
          req.headers.origin !== `${req.protocol}://${req.get("host")}`))
    )
      return res.status(403).json({ error: "Origem não autorizada." });
    next();
  });
  if (process.env.RENDER) app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", async (req, res) => {
    await db.health();
    res.json({ ok: true });
  });
  app.get("/style.css", (req, res) =>
    res.sendFile(path.join(publicDir, "style.css")),
  );
  app.get("/login.js", (req, res) =>
    res.sendFile(path.join(publicDir, "login.js")),
  );
  app.get("/login", (req, res) =>
    res.sendFile(path.join(publicDir, "login.html")),
  );
  app.post("/api/login", (req, res) => {
    const now = Date.now(),
      previous = attempts.get(req.ip);
    if (previous?.until > now && previous.count >= 10)
      return res
        .status(429)
        .json({ error: "Muitas tentativas. Aguarde 15 minutos." });
    const { usuario, senha } = req.body || {};
    if (
      typeof usuario !== "string" ||
      typeof senha !== "string" ||
      !equal(usuario, process.env.APP_USERNAME || "funcionarios") ||
      !equal(senha, process.env.APP_PASSWORD)
    ) {
      const a =
        previous?.until > now ? previous : { count: 0, until: now + 900000 };
      a.count++;
      attempts.set(req.ip, a);
      return res.status(401).json({ error: "Usuário ou senha incorretos." });
    }
    attempts.delete(req.ip);
    sessions.delete(token(req));
    const id = randomBytes(32).toString("hex");
    sessions.set(id, now + 28800000);
    res.set("Set-Cookie", cookie(id, 28800)).json({ ok: true });
  });
  app.post("/api/logout", (req, res) => {
    sessions.delete(token(req));
    res.set("Set-Cookie", cookie("", 0)).sendStatus(204);
  });
  const cleanup = setInterval(() => {
    for (const [k, v] of sessions) if (v <= Date.now()) sessions.delete(k);
    for (const [k, v] of attempts)
      if (v.until <= Date.now()) attempts.delete(k);
  }, 60000);
  cleanup.unref();
  app.use((req, res, next) => {
    if ((sessions.get(token(req)) || 0) > Date.now()) return next();
    if (req.path.startsWith("/api/"))
      return res.status(401).json({ error: "Entre para continuar." });
    res.redirect("/login");
  });
  app.get("/api/dados", async (req, res) => {
    const [fornecedores, produtos, avaliacoes] = await Promise.all(
      ["fornecedores", "produtos", "avaliacoes"].map((table) => db.list(table)),
    );
    res.json({ fornecedores, produtos, avaliacoes });
  });
  const specs = {
    fornecedores: {
      fields: [
        "nome",
        "contato",
        "telefone",
        "telefone2",
        "email",
        "categoria",
        "observacoes",
      ],
      valid: (b) =>
        text(b.nome, 120) &&
        text(b.contato, 100) &&
        text(b.categoria, 80) &&
        [b.telefone, b.telefone2].every(
          (v, i) =>
            text(v, 30, i === 0) &&
            (v === "" ||
              (/^[+\d\s().-]{8,30}$/.test(v) &&
                v.replace(/\D/g, "").length >= 8)),
        ) &&
        text(b.email, 160, false) &&
        (!b.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) &&
        text(b.observacoes, 1000, false),
    },
    produtos: {
      fields: ["fornecedor_id", "nome", "unidade", "preco_centavos"],
      valid: (b) =>
        text(b.fornecedor_id, 120) &&
        text(b.nome, 120) &&
        ["kg", "g", "L", "mL", "unidade", "caixa", "pacote", "dúzia"].includes(
          b.unidade,
        ) &&
        Number.isSafeInteger(b.preco_centavos) &&
        b.preco_centavos >= 0 &&
        b.preco_centavos <= 100000000,
    },
    avaliacoes: {
      fields: [
        "fornecedor_id",
        "avaliador",
        "data",
        "qualidade",
        "pontualidade",
        "atendimento",
        "comentario",
      ],
      valid: (b) =>
        text(b.fornecedor_id, 120) &&
        text(b.avaliador, 100) &&
        dateValid(b.data) &&
        ["qualidade", "pontualidade", "atendimento"].every(
          (k) => Number.isInteger(b[k]) && b[k] >= 1 && b[k] <= 5,
        ) &&
        text(b.comentario, 1000, false),
    },
  };
  for (const [table, spec] of Object.entries(specs)) {
    const save = async (req, res) => {
      const b = req.body;
      if (!b || !spec.valid(b))
        return res
          .status(400)
          .json({
            error: "Confira os campos, os limites e os valores informados.",
          });
      const id = req.params.id || randomUUID();
      if (
        req.params.id &&
        !(await db.exists(table, id))
      )
        return res
          .status(404)
          .json({ error: "Registro não encontrado. Atualize a página." });
      if (
        b.fornecedor_id &&
        !(await db.exists("fornecedores", b.fornecedor_id.trim()))
      )
        return res
          .status(400)
          .json({ error: "Selecione um fornecedor cadastrado." });
      const fields = [...spec.fields],
        values = fields.map((k) =>
          typeof b[k] === "string" ? b[k].trim() : b[k],
        );
      if (table === "produtos") {
        fields.push("atualizado_em");
        values.push(new Date().toISOString());
      }
      if (!req.params.id && table === "fornecedores") {
        fields.push("criado_em");
        values.push(new Date().toISOString());
      }
      const result = await db.save(table, id, Object.fromEntries(fields.map((k, i) => [k, values[i]])), Boolean(req.params.id));
      if (!result) return res.status(404).json({ error: "Registro não encontrado. Atualize a página." });
      res.status(req.params.id ? 200 : 201).json(result);
    };
    app.post("/api/" + table, save);
    app.put("/api/" + table + "/:id", save);
    app.delete("/api/" + table + "/:id", async (req, res) => {
      const removed = await db.remove(table, req.params.id);
      if (!removed)
        return res.status(404).json({ error: "Registro não encontrado." });
      res.sendStatus(204);
    });
  }
  app.get("/", (req, res) => res.sendFile(path.join(publicDir, "index.html")));
  app.get("/script.js", (req, res) =>
    res.sendFile(path.join(publicDir, "script.js")),
  );
  app.use((req, res) =>
    res.status(404).json({ error: "Página não encontrada." }),
  );
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed" || err.type === "entity.too.large")
      return res.status(400).json({ error: "Requisição inválida." });
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error(err.message);
    res
      .status(500)
      .json({
        error: "Não foi possível concluir a operação. Tente novamente.",
      });
  });
  return {
    app,
    db,
    close: async () => {
      clearInterval(cleanup);
      await db.close();
    },
  };
}
if (require.main === module)
  createApp()
    .then(({ app, db }) =>
      app.listen(
        Number(process.env.PORT || 3000),
        process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
        () =>
          console.log(
            `Casa de Madeira | http://localhost:${process.env.PORT || 3000} | ${db.kind}`,
          ),
      ),
    )
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
module.exports = { createApp };
