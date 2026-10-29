# Casa de Madeira — Fornecedores

Sistema do restaurante **Casa de Madeira** para organizar os contatos dos
fornecedores, consultar produtos e preços e acompanhar avaliações das entregas.

## Como usar o sistema

### 1. Entrar

Abra o endereço do sistema publicado no Render e informe o usuário e a senha
fornecidos pelo responsável pela instalação.

- O usuário padrão é `funcionarios`, a menos que o responsável tenha alterado `APP_USERNAME`.
- A senha é definida pelo responsável em `APP_PASSWORD`. Não existe senha padrão pronta.
- O sistema possui um acesso compartilhado, sem perfis separados de administrador e funcionário.

Após entrar, o painel mostra o total de fornecedores, o total de produtos e a
média geral das avaliações. Quando terminar, clique em **Sair**.

### 2. Cadastrar um fornecedor

Na aba **Fornecedores**:

1. Preencha **Nome do fornecedor**, **Pessoa de contato**, **Telefone principal** e **Categoria**.
2. Se necessário, informe outro telefone, e-mail e observações, como dias de entrega e condições de pagamento.
3. Clique em **Cadastrar fornecedor** e aguarde a mensagem de confirmação.

Exemplo fictício: fornecedor **Hortifruti da Serra**, contato **Ana**, categoria
**Hortifruti** e observação **Entregas às terças e quintas**.

Use a busca para encontrar fornecedores por nome, contato, telefone ou produto.
O filtro de categoria ajuda a consultar grupos como carnes, bebidas e hortifruti.
Clique em **Ver produtos** na linha de um fornecedor para abrir seus produtos.

### 3. Adicionar produtos e preços

Cadastre primeiro o fornecedor. Depois, abra a aba **Produtos e preços**:

1. Selecione o fornecedor.
2. Digite o nome do produto.
3. Escolha a unidade: kg, g, L, mL, unidade, caixa, pacote ou dúzia.
4. Informe o preço em reais correspondente à unidade escolhida.
5. Clique em **Cadastrar produto**.

Por exemplo: **Tomate italiano**, unidade **kg**, preço **R$ 8,50**.
Para comparar ofertas, busque o produto e confira os fornecedores e preços.
Compare a mesma unidade e quantidade: uma caixa e um quilo podem representar
quantidades diferentes. A tabela também mostra a data da última atualização do produto.

### 4. Registrar uma avaliação

Na aba **Avaliações**:

1. Selecione o fornecedor.
2. Preencha **Avaliado por** com o nome de quem está registrando a avaliação.
3. Confira a data da avaliação.
4. Dê uma nota para **Qualidade**, **Pontualidade** e **Atendimento**.
5. Se desejar, escreva um comentário e clique em **Registrar avaliação**.

| Nota | Significado |
| --- | --- |
| 1 | Ruim |
| 2 | Regular |
| 3 | Bom |
| 4 | Muito bom |
| 5 | Excelente |

Os três critérios têm o mesmo peso. Uma avaliação com notas 5, 4 e 3 tem média
4,0. A nota de cada fornecedor considera todas as suas avaliações; a média geral
do painel considera todas as avaliações cadastradas.

Consulte o histórico usando a busca por fornecedor, avaliador ou comentário,
ou filtre por um fornecedor específico.

### 5. Editar ou excluir registros

- Clique em **Editar** na linha desejada, altere os campos e clique em **Salvar alterações**.
- Para desistir da edição, clique em **Cancelar edição**.
- Para remover um registro, clique em **Excluir** e leia a confirmação antes de continuar.

**Excluir um fornecedor também remove todos os produtos e avaliações vinculados
a ele. Essa ação não pode ser desfeita pelo sistema.**

### 6. Exportar uma lista

Cada aba possui o botão **Exportar CSV**. Aplique os filtros desejados e clique
no botão para baixar os registros exibidos. Para exportar todos os registros
da aba, limpe a busca e os filtros primeiro.

O arquivo pode ser aberto no Excel ou em outro programa de planilhas. A
exportação serve para consulta e relatórios; o sistema não possui importação de CSV
nem restauração automática a partir desses arquivos.

### Dúvidas comuns

| Situação | O que fazer |
| --- | --- |
| O fornecedor não aparece no cadastro de produto ou avaliação | Cadastre o fornecedor primeiro e atualize a página. |
| Uma lista parece vazia | Limpe a busca e confira os filtros selecionados. |
| Outro funcionário alterou um cadastro | Atualize a página para consultar os dados mais recentes. |
| O sistema voltou para a tela de login | Entre novamente. A sessão dura até 8 horas e também termina quando o servidor reinicia. |
| Esqueci a senha | Peça ao responsável para definir uma nova `APP_PASSWORD` no Render e publicar novamente. Não há recuperação de senha por e-mail. |
| Apareceu uma mensagem de erro ao salvar | Confira os campos e a mensagem exibida. Se persistir, avise o responsável pelo sistema. |

## Instalação e publicação

As instruções abaixo são para quem vai configurar e manter o sistema.
O projeto usa Node.js com Express, publicação no Render e banco no MongoDB Atlas.
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
