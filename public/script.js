"use strict";
const $ = (id) => document.getElementById(id);
let dados = { fornecedores: [], produtos: [], avaliacoes: [] },
  aba = "fornecedores";
const editing = { fornecedores: null, produtos: null, avaliacoes: null };
const names = {
  fornecedores: ["Cadastrar fornecedor", "Editar fornecedor"],
  produtos: ["Cadastrar produto", "Editar produto"],
  avaliacoes: ["Registrar avaliação", "Editar avaliação"],
};
const hoje = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
const media = (a) => (a.qualidade + a.pontualidade + a.atendimento) / 3;
const nota = (n) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const moeda = (c) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normal = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const fornecedor = (id) =>
  dados.fornecedores.find((f) => f.id === id)?.nome || "Fornecedor removido";
function mensagem(s, erro = false) {
  $("mensagem").textContent = s;
  $("mensagem").classList.toggle("erro", erro);
}
async function api(url, options) {
  const r = await fetch(url, options);
  if (r.status === 401) {
    location.replace("/login");
    throw new Error("Sessão encerrada. Entre novamente.");
  }
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw new Error(b.error || "Não foi possível concluir. Tente novamente.");
  }
  return r.status === 204 ? null : r.json();
}
function mudarAba(tab) {
  aba = tab;
  for (const k of Object.keys(names)) {
    $("sec-" + k).hidden = k !== tab;
    const btn = document.querySelector(`[data-tab="${k}"]`);
    btn.classList.toggle("secundario", k !== tab);
    if (k === tab) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  }
}
async function carregar() {
  dados = await api("/api/dados");
  for (const select of document.querySelectorAll(".select-fornecedor")) {
    const previous = select.value,
      label = select.id.startsWith("filtro")
        ? "Todos os fornecedores"
        : "Selecione um fornecedor";
    select.replaceChildren(
      new Option(label, ""),
      ...dados.fornecedores.map((f) => new Option(f.nome, f.id)),
    );
    if (dados.fornecedores.some((f) => f.id === previous))
      select.value = previous;
  }
  const cat = $("filtro-categoria"),
    previous = cat.value;
  cat.replaceChildren(
    new Option("Todas as categorias", ""),
    ...[...new Set(dados.fornecedores.map((f) => f.categoria))]
      .sort()
      .map((c) => new Option(c, c)),
  );
  cat.value = [...cat.options].some((o) => o.value === previous)
    ? previous
    : "";
  render();
}
function filtrados(k) {
  const busca = normal($("busca-" + k).value);
  return dados[k].filter((r) => {
    if (k === "fornecedores")
      return (
        normal(
          [
            r.nome,
            r.contato,
            r.telefone,
            r.telefone2,
            r.email,
            r.categoria,
            ...dados.produtos
              .filter((p) => p.fornecedor_id === r.id)
              .map((p) => p.nome),
          ].join(" "),
        ).includes(busca) &&
        (!$("filtro-categoria").value ||
          r.categoria === $("filtro-categoria").value)
      );
    return (
      normal(
        [r.nome, fornecedor(r.fornecedor_id), r.avaliador, r.comentario]
          .filter(Boolean)
          .join(" "),
      ).includes(busca) &&
      (!$("filtro-" + k).value || r.fornecedor_id === $("filtro-" + k).value)
    );
  });
}
function cell(tr, value, small) {
  const td = document.createElement("td");
  td.textContent = value;
  if (small) {
    const s = document.createElement("small");
    s.textContent = small;
    td.append(s);
  }
  tr.append(td);
  return td;
}
function botao(parent, label, fn, danger = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "secundario" + (danger ? " excluir" : "");
  b.textContent = label;
  b.onclick = fn;
  parent.append(b);
}
function limpar(k) {
  editing[k] = null;
  const form = $("form-" + k);
  form.reset();
  form.querySelector(".cancelar").hidden = true;
  form.querySelector("[type=submit]").textContent = $(
    "titulo-" + k,
  ).textContent = names[k][0];
  if (k === "avaliacoes") form.elements.data.value = hoje();
}
function editar(k, r) {
  editing[k] = r.id;
  const form = $("form-" + k);
  for (const field of form.elements)
    if (field.name && r[field.name] !== undefined) field.value = r[field.name];
  if (k === "produtos")
    form.elements.preco.value = (r.preco_centavos / 100).toFixed(2);
  form.querySelector(".cancelar").hidden = false;
  form.querySelector("[type=submit]").textContent = "Salvar alterações";
  $("titulo-" + k).textContent = names[k][1];
  form.querySelector("input,select").focus();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  mensagem("Editando registro. Altere os campos e salve.");
}
async function excluir(k, r) {
  const extra =
    k === "fornecedores"
      ? " Os produtos e as avaliações vinculados também serão excluídos."
      : "";
  if (
    !confirm(
      "Excluir " +
        (r.nome || "esta avaliação") +
        "?" +
        extra +
        " Esta ação não pode ser desfeita.",
    )
  )
    return;
  try {
    await api("/api/" + k + "/" + encodeURIComponent(r.id), {
      method: "DELETE",
    });
    if (editing[k] === r.id) limpar(k);
    await carregar();
    mensagem("Registro excluído.");
  } catch (e) {
    mensagem(e.message, true);
  }
}
function render() {
  $("total-fornecedores").textContent = dados.fornecedores.length;
  $("total-produtos").textContent = dados.produtos.length;
  $("media-geral").textContent = dados.avaliacoes.length
    ? nota(
        dados.avaliacoes.reduce((s, a) => s + media(a), 0) /
          dados.avaliacoes.length,
      ) + " / 5"
    : "—";
  for (const k of Object.keys(names)) {
    const lista = $("lista-" + k),
      rows = filtrados(k);
    lista.replaceChildren();
    $("vazio-" + k).hidden = rows.length > 0;
    if (!rows.length && dados[k].length)
      $("vazio-" + k).textContent =
        "Nenhum resultado para os filtros selecionados.";
    else if (!rows.length)
      $("vazio-" + k).textContent = {
        fornecedores:
          "Nenhum fornecedor cadastrado. Comece pelo formulário acima.",
        produtos:
          "Nenhum produto cadastrado. Cadastre um fornecedor e adicione seus produtos.",
        avaliacoes:
          "Nenhuma avaliação registrada. Avalie o primeiro fornecedor acima.",
      }[k];
    for (const r of rows) {
      const tr = document.createElement("tr");
      if (k === "fornecedores") {
        cell(tr, r.nome, r.contato);
        cell(
          tr,
          [r.telefone, r.telefone2].filter(Boolean).join(" • "),
          r.email,
        );
        cell(tr, r.categoria);
        cell(tr, dados.produtos.filter((p) => p.fornecedor_id === r.id).length);
        const avals = dados.avaliacoes.filter((a) => a.fornecedor_id === r.id);
        cell(
          tr,
          avals.length
            ? "★ " +
                nota(avals.reduce((s, a) => s + media(a), 0) / avals.length) +
                " / 5"
            : "Sem avaliação",
          avals.length ? avals.length + " avaliação(ões)" : "",
        );
      } else if (k === "produtos") {
        cell(tr, r.nome);
        cell(tr, fornecedor(r.fornecedor_id));
        cell(tr, r.unidade);
        cell(tr, moeda(r.preco_centavos));
        cell(
          tr,
          new Date(r.atualizado_em).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
        );
      } else {
        cell(tr, fornecedor(r.fornecedor_id), r.comentario);
        cell(tr, r.data.split("-").reverse().join("/"), r.avaliador);
        for (const field of ["qualidade", "pontualidade", "atendimento"])
          cell(tr, r[field] + " / 5");
        cell(tr, "★ " + nota(media(r)));
      }
      const actions = cell(tr, "");
      actions.className = "botoes-linha";
      botao(actions, "Editar", () => editar(k, r));
      botao(actions, "Excluir", () => excluir(k, r), true);
      if (k === "fornecedores")
        botao(actions, "Ver produtos", () => {
          mudarAba("produtos");
          $("filtro-produtos").value = r.id;
          $("busca-produtos").value = "";
          render();
        });
      lista.append(tr);
    }
  }
}
for (const k of Object.keys(names)) {
  const form = $("form-" + k);
  form.querySelector(".cancelar").onclick = () => {
    limpar(k);
    mensagem("Edição cancelada.");
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(form));
    if (k === "produtos") {
      b.preco_centavos = Math.round(Number(b.preco) * 100);
      delete b.preco;
    }
    if (k === "avaliacoes")
      for (const key of ["qualidade", "pontualidade", "atendimento"])
        b[key] = Number(b[key]);
    const save = form.querySelector("[type=submit]");
    save.disabled = true;
    try {
      await api(
        "/api/" + k + (editing[k] ? "/" + encodeURIComponent(editing[k]) : ""),
        {
          method: editing[k] ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(b),
        },
      );
      limpar(k);
      await carregar();
      mensagem("Registro salvo com sucesso.");
    } catch (err) {
      mensagem(err.message, true);
    } finally {
      save.disabled = false;
    }
  };
  $("busca-" + k).oninput = render;
}
for (const id of ["filtro-categoria", "filtro-produtos", "filtro-avaliacoes"])
  $(id).onchange = render;
document
  .querySelectorAll("[data-tab]")
  .forEach((b) => (b.onclick = () => mudarAba(b.dataset.tab)));
document.querySelectorAll(".exportar").forEach(
  (b) =>
    (b.onclick = () => {
      const k = b.dataset.export,
        rows = filtrados(k);
      const headers = {
        fornecedores: [
          "Fornecedor",
          "Contato",
          "Telefone",
          "Outro telefone",
          "E-mail",
          "Categoria",
          "Observações",
        ],
        produtos: [
          "Produto",
          "Fornecedor",
          "Unidade",
          "Preço (R$)",
          "Atualização",
        ],
        avaliacoes: [
          "Fornecedor",
          "Data",
          "Avaliador",
          "Qualidade",
          "Pontualidade",
          "Atendimento",
          "Média",
          "Comentário",
        ],
      }[k];
      const data = rows.map((r) =>
        k === "fornecedores"
          ? [
              r.nome,
              r.contato,
              r.telefone,
              r.telefone2,
              r.email,
              r.categoria,
              r.observacoes,
            ]
          : k === "produtos"
            ? [
                r.nome,
                fornecedor(r.fornecedor_id),
                r.unidade,
                (r.preco_centavos / 100).toFixed(2).replace(".", ","),
                r.atualizado_em,
              ]
            : [
                fornecedor(r.fornecedor_id),
                r.data,
                r.avaliador,
                r.qualidade,
                r.pontualidade,
                r.atendimento,
                nota(media(r)),
                r.comentario,
              ],
      );
      const escape = (value) =>
        '"' +
        String(value)
          .replace(/^[\s]*[=+@-]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const csv =
        "\ufeff" +
        [headers, ...data].map((r) => r.map(escape).join(";")).join("\r\n");
      const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
        ),
        link = document.createElement("a");
      link.href = url;
      link.download = "cm-" + k + "-" + hoje() + ".csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      mensagem(
        rows.length + " registro(s) exportado(s), conforme os filtros atuais.",
      );
    }),
);
$("sair").onclick = async () => {
  try {
    await api("/api/logout", { method: "POST" });
    location.replace("/login");
  } catch (e) {
    mensagem(e.message, true);
  }
};
limpar("avaliacoes");
carregar().catch((e) => mensagem(e.message, true));
