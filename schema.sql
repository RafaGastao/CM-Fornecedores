CREATE TABLE IF NOT EXISTS fornecedores (
 id TEXT PRIMARY KEY,
 nome VARCHAR(120) NOT NULL,
 contato VARCHAR(100) NOT NULL,
 telefone VARCHAR(30) NOT NULL,
 telefone2 VARCHAR(30) NOT NULL DEFAULT '',
 email VARCHAR(160) NOT NULL DEFAULT '',
 categoria VARCHAR(80) NOT NULL,
 observacoes VARCHAR(1000) NOT NULL DEFAULT '',
 criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS produtos (
 id TEXT PRIMARY KEY,
 fornecedor_id TEXT NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
 nome VARCHAR(120) NOT NULL,
 unidade VARCHAR(20) NOT NULL,
 preco_centavos INTEGER NOT NULL CHECK(preco_centavos >= 0),
 atualizado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS avaliacoes (
 id TEXT PRIMARY KEY,
 fornecedor_id TEXT NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
 avaliador VARCHAR(100) NOT NULL,
 data VARCHAR(10) NOT NULL,
 qualidade INTEGER NOT NULL CHECK(qualidade BETWEEN 1 AND 5),
 pontualidade INTEGER NOT NULL CHECK(pontualidade BETWEEN 1 AND 5),
 atendimento INTEGER NOT NULL CHECK(atendimento BETWEEN 1 AND 5),
 comentario VARCHAR(1000) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS produtos_fornecedor_idx ON produtos(fornecedor_id);
CREATE INDEX IF NOT EXISTS avaliacoes_fornecedor_idx ON avaliacoes(fornecedor_id);
