# Casa de Madeira — Fornecedores

Aplicação Node.js com Express. Produção no Render e banco no MongoDB Atlas.
Use Node.js 24 ou superior.

## MongoDB Atlas

1. Crie um projeto e um cluster em https://cloud.mongodb.com/.
2. Em **Database Access**, crie um usuário de banco (diferente do login do Atlas)
   com permissão `readWrite` no banco `cm_fornecedores`.
3. Em **Connect → Drivers → Node.js**, copie a URI de conexão e substitua os
   campos de usuário e senha. Caracteres especiais na senha precisam estar
   codificados para URL. Não publique essa URI no Git nem compartilhe a senha.
4. Em **Network Access**, autorize seu IP para testar localmente. Para produção,
   adicione as faixas de saída mostradas no serviço do Render em
   **Connect → Outbound**. Atualize a lista se mudar a região do serviço.

Exemplo ilustrativo de URI:

```text
mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

O aplicativo cria as coleções e índices automaticamente. O banco usado é
`MONGODB_DB_NAME`, cujo padrão é `cm_fornecedores`.
As exclusões de fornecedores também excluem seus produtos e avaliações,
em uma transação. O Atlas oferece o suporte necessário a transações.

## Executar localmente

1. Copie `.env.example` para `.env`.
2. Defina `APP_PASSWORD` e preencha `MONGODB_URI` e `MONGODB_DB_NAME`.
3. Execute `npm ci` e `npm start`.
4. Abra http://localhost:3000. O usuário padrão é `funcionarios`.

Sem `MONGODB_URI`, o desenvolvimento continua usando SQLite em `data/`.
O suporte anterior a PostgreSQL por `DATABASE_URL` também foi mantido.
Não configure `DATABASE_URL` no Render ao usar Atlas.
Se ambos forem preenchidos, MongoDB tem prioridade.

## Publicar no Render

1. Envie o projeto para um repositório GitHub ou GitLab, sem o arquivo `.env`.
2. No Render, escolha **New → Blueprint** e conecte o repositório.
3. Se o repositório começar nesta pasta (a que contém `package.json`),
   use `render.yaml` como caminho do Blueprint.
4. Preencha os segredos solicitados: `APP_PASSWORD` e `MONGODB_URI`.
5. Confirme o plano exibido pelo Render e crie o serviço.
6. Autorize os IPs de saída do Render no Atlas e aguarde a publicação.
7. Abra a URL do serviço, faça login e teste o cadastro de um fornecedor.
   O endereço `/health` deve responder `{"ok":true}` quando o banco estiver acessível.

Se o repositório incluir a pasta externa `CM Fornecedores`, o Blueprint estará em
`CM Fornecedores/render.yaml`. Nesse caso, adicione
`rootDir: CM Fornecedores` ao serviço do YAML antes de publicar.

Alternativa manual: crie um **Web Service** com runtime Node, pasta raiz apontando
para a pasta do `package.json`, build `npm ci`, início `npm start` e health check
`/health`. Configure estas variáveis no painel do Render:

| Variável | Valor |
| --- | --- |
| NODE_VERSION | 24 |
| NODE_ENV | production |
| HOST | 0.0.0.0 |
| APP_USERNAME | funcionarios (ou outro usuário) |
| APP_PASSWORD | Sua senha de acesso ao sistema |
| MONGODB_URI | A URI privada do Atlas |
| MONGODB_DB_NAME | cm_fornecedores |

O Render define `PORT` automaticamente. Não precisa criar um banco PostgreSQL.
As sessões de login ficam na memória: reinícios exigem novo login. Use uma única
instância do serviço enquanto as sessões não forem movidas para um armazenamento compartilhado.

## Dados existentes e validação

Alterar a conexão não transfere os dados do SQLite/PostgreSQL para o Atlas.
Se houver dados existentes, planeje uma exportação/importação antes de trocar o banco.

Execute `npm run check` para validar a sintaxe dos arquivos.
A conexão real com o Atlas precisa ser validada com suas credenciais e IP autorizado.

Referências: [Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/),
[IP Access List](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/),
[Render Blueprint](https://render.com/docs/blueprint-spec),
[IPs de saída](https://render.com/docs/outbound-ip-addresses).
