// ⚠️ TROQUE ESTA SENHA. Veja o aviso de segurança na explicação.
const ADMIN_PASS = "admin";

const STAGES = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];
const $ = (s) => document.querySelector(s);
const R = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const logged = () => sessionStorage.getItem("admin_ok") === "1";

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 2200);
}

/* ---------- Login ---------- */
function gate() {
  $("#login").hidden = logged();
  $("#panel").hidden = !logged();
  if (logged()) refresh();
}
$("#loginForm").onsubmit = (e) => {
  e.preventDefault();
  if ($("#pass").value === ADMIN_PASS) {
    sessionStorage.setItem("admin_ok", "1");
    $("#err").textContent = "";
    $("#pass").value = "";
    gate();
  } else $("#err").textContent = "Senha incorreta.";
};
$("#logout").onclick = () => {
  sessionStorage.removeItem("admin_ok");
  gate();
};

/* ---------- Abas ---------- */
document.querySelector(".tabs").onclick = (e) => {
  const t = e.target.dataset.t;
  if (!t) return;
  document
    .querySelectorAll(".view")
    .forEach((v) => (v.hidden = v.id !== "t-" + t));
  document
    .querySelectorAll(".tab")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.t === t));
};

/* ---------- Pedidos ---------- */
const itemsTxt = (o) => o.itens.map((i) => `${i.q}× ${i.n}`).join(", ");

function renderOrders() {
  const { orders } = loadOrders();
  const ativos = orders.filter((o) => o.stage < 3).length;
  const fat = orders.reduce((s, o) => s + o.total, 0);
  $("#stats").innerHTML =
    `<div class="stat"><b>${orders.length}</b>pedidos</div><div class="stat"><b>${ativos}</b>em andamento</div><div class="stat"><b>${R(fat)}</b>faturamento</div>`;
  $("#kan").innerHTML = STAGES.map(
    (s, i) =>
      `<div class="col"><h3>${s}</h3>${
        orders
          .filter((o) => o.stage === i)
          .map(
            (o) => `
      <div class="mini"><b>#${o.id} · ${esc(o.nome)}</b> <small>${esc(o.hora)}</small><br>
      ${itemsTxt(o)}<br>${esc(o.end)} · ${esc(o.tel)}<br>${esc(o.pag)} · <b>${R(o.total)}</b>
      ${o.obs ? `<br><i>Obs: ${esc(o.obs)}</i>` : ""}
      <div class="acts">
        ${i < 3 ? `<button data-adv="${o.id}">Avançar → ${STAGES[i + 1]}</button>` : ""}
        <button class="danger" data-del="${o.id}">${i === 3 ? "Remover" : "Cancelar"}</button>
      </div></div>`,
          )
          .join("") ||
        '<p class="empty" style="padding:10px 0">Nenhum pedido</p>'
      }</div>`,
  ).join("");
}
$("#kan").onclick = (e) => {
  if (!logged()) return;
  const adv = e.target.dataset.adv,
    del = e.target.dataset.del;
  if (!adv && !del) return;
  const s = loadOrders();
  if (adv) {
    const o = s.orders.find((x) => x.id == adv);
    if (o && o.stage < 3) o.stage++;
  }
  if (del) {
    if (!confirm("Remover este pedido?")) return;
    s.orders = s.orders.filter((x) => x.id != del);
  }
  saveOrders(s.orders, s.seq);
  renderOrders();
};

/* ---------- Cardápio ---------- */
function renderMenu() {
  const menu = loadMenu();
  $("#catlist").innerHTML = [...new Set(menu.map((i) => i.c))]
    .map((c) => `<option value="${c}">`)
    .join("");
  $("#menuTable").innerHTML =
    `<thead><tr><th></th><th>Item</th><th>Categoria</th><th>Preço</th><th></th></tr></thead><tbody>${
      menu
        .map(
          (
            i,
          ) => `<tr><td>${i.e}</td><td><b>${i.n}</b><br><small>${i.d}</small></td><td>${i.c}</td><td>${R(i.p)}</td>
    <td><button class="danger" data-rm="${i.id}">Excluir</button></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="5" class="empty">Cardápio vazio.</td></tr>'
    }</tbody>`;
}
$("#addForm").onsubmit = (e) => {
  e.preventDefault();
  if (!logged()) return;
  const menu = loadMenu();
  const p = parseFloat($("#fp").value);
  if (!(p > 0)) {
    toast("Preço inválido");
    return;
  }
  menu.push({
    id: Math.max(0, ...menu.map((x) => x.id)) + 1,
    n: esc($("#fn").value.trim()),
    d: esc($("#fd").value.trim()),
    p: Math.round(p * 100) / 100,
    c: esc($("#fc").value.trim()),
    e: esc($("#fe").value.trim() || "🍽️"),
  });
  saveMenu(menu);
  e.target.reset();
  renderMenu();
  toast("Item adicionado");
};
$("#menuTable").onclick = (e) => {
  const id = e.target.dataset.rm;
  if (!id || !logged()) return;
  if (!confirm("Excluir este item do cardápio?")) return;
  saveMenu(loadMenu().filter((i) => i.id != id));
  renderMenu();
  toast("Item excluído");
};
$("#resetMenu").onclick = () => {
  if (!confirm("Voltar ao cardápio padrão? Seus itens serão perdidos.")) return;
  saveMenu(DEFAULT_MENU.map((x) => ({ ...x })));
  renderMenu();
};

/* ---------- Atualização ---------- */
function refresh() {
  renderOrders();
  renderMenu();
}
// quando a loja (em outra aba) gravar um novo pedido, o painel atualiza sozinho
window.addEventListener("storage", () => {
  if (logged()) refresh();
});

gate();
