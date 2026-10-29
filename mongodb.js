"use strict";
const { MongoClient } = require("mongodb");

async function openMongoDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || "cm_fornecedores");
    const tables = new Set(["fornecedores", "produtos", "avaliacoes"]);
    const collection = (table) => {
      if (!tables.has(table)) throw new Error("Coleção inválida.");
      return db.collection(table);
    };
    for (const table of tables)
      await collection(table).createIndex({ id: 1 }, { unique: true });
    await db.collection("produtos").createIndex({ fornecedor_id: 1 });
    await db.collection("avaliacoes").createIndex({ fornecedor_id: 1 });
    return {
      kind: "MongoDB",
      close: () => client.close(),
      health: () => db.command({ ping: 1 }),
      list: (table) => collection(table)
        .find({}, { projection: { _id: 0, _revision: 0 } })
        .sort(table === "avaliacoes" ? { data: -1, id: 1 } : { nome: 1 })
        .toArray(),
      exists: async (table, id) => Boolean(await collection(table).findOne({ id }, { projection: { _id: 1 } })),
      save: async (table, id, record, update) => {
        // A transação mantém o vínculo com o fornecedor mesmo em operações simultâneas.
        return client.withSession((session) => session.withTransaction(async () => {
          if (record.fornecedor_id) {
            const parent = await db.collection("fornecedores").updateOne(
              { id: record.fornecedor_id }, { $inc: { _revision: 1 } }, { session },
            );
            if (!parent.matchedCount) {
              const error = new Error("Selecione um fornecedor cadastrado.");
              error.status = 400;
              throw error;
            }
          }
          if (update) {
            const result = await collection(table).findOneAndUpdate(
              { id }, { $set: record },
              { session, returnDocument: "after", projection: { _id: 0, _revision: 0 } },
            );
            return result;
          }
          await collection(table).insertOne({ id, ...record }, { session });
          return { id, ...record };
        }));
      },
      remove: (table, id) => client.withSession((session) => session.withTransaction(async () => {
        const result = await collection(table).deleteOne({ id }, { session });
        if (result.deletedCount && table === "fornecedores") {
          await db.collection("produtos").deleteMany({ fornecedor_id: id }, { session });
          await db.collection("avaliacoes").deleteMany({ fornecedor_id: id }, { session });
        }
        return result.deletedCount > 0;
      })),
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}
module.exports = { openMongoDatabase };
