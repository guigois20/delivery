let MENU = [];
const FEE = 6,
  STAGES = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];
let cart = {},
  cat = "Todos",
  orders = [];
const R = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 2200);
}

function renderMenu() {
  const cats = ["Todos", ...new Set(MENU.map((i) => i.c))];
  $("#cats").innerHTML = cats
    .map(
      (c) =>
        `<button class="chip" aria-pressed="${c === cat}" data-c="${esc(c)}">${esc(c)}</button>`,
    )
    .join("");
  $("#grid").innerHTML = MENU.filter((i) => cat === "Todos" || i.c === cat)
    .map(
      (i) => `
   <article class="item"><div class="emoji" aria-hidden="true">${i.i ? `<img class="foto" loading="lazy" src="${API}/uploads/${encodeURIComponent(i.i)}" alt="">` : esc(i.e)}</div><h3>${esc(i.n)}</h3><p>${esc(i.d)}</p>
   <div class="row"><span class="price">${R(i.p)}</span><button class="add" data-id="${i.id}">Adicionar</button></div></article>`,
    )
    .join("");
}
$("#cats").onclick = (e) => {
  const b = e.target.closest("[data-c]");
  if (b) {
    cat = b.dataset.c;
    renderMenu();
  }
};
$("#grid").onclick = (e) => {
  const b = e.target.closest("[data-id]");
  if (!b) return;
  const id = b.dataset.id;
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
  toast("Adicionado ao carrinho");
};

function totals() {
  const sub = Object.entries(cart).reduce(
    (s, [id, q]) => s + MENU.find((i) => i.id == id).p * q,
    0,
  );
  return { sub, fee: sub ? FEE : 0, tot: sub ? sub + FEE : 0 };
}
function renderCart() {
  const ids = Object.keys(cart);
  $("#cnt").textContent = ids.reduce((s, i) => s + cart[i], 0);
  $("#lines").innerHTML = ids.length
    ? ids
        .map((id) => {
          const i = MENU.find((m) => m.id == id);
          return `
   <div class="line"><span class="nm">${esc(i.n)}<br><small>${R(i.p)}</small></span>
   <div class="qty"><button data-m="${id}" aria-label="Diminuir">−</button><b>${cart[id]}</b><button data-p="${id}" aria-label="Aumentar">+</button></div></div>`;
        })
        .join("")
    : '<p class="empty">Seu carrinho está vazio. Escolha algo no cardápio.</p>';
  const t = totals();
  $("#sub").textContent = R(t.sub);
  $("#fee").textContent = R(t.fee);
  $("#tot").textContent = R(t.tot);
  $("#send").disabled = !ids.length;
}
$("#lines").onclick = (e) => {
  const m = e.target.dataset.m,
    p = e.target.dataset.p;
  if (p) cart[p]++;
  if (m) {
    cart[m]--;
    if (cart[m] <= 0) delete cart[m];
  }
  renderCart();
};

const openCart = (o) => {
  $("#cart").classList.toggle("open", o);
  $("#scrim").hidden = !o;
};
$("#openCart").onclick = () => openCart(true);
$("#closeCart").onclick = () => openCart(false);
$("#scrim").onclick = () => openCart(false);

$("#send").onclick = async () => {
  const nome = $("#nome").value.trim(),
    tel = $("#tel").value.trim(),
    end = $("#end").value.trim();
  if (!nome || !tel || !end) {
    toast("Preencha nome, telefone e endereço");
    return;
  }
  $("#send").disabled = true;
  try {
    const r = await api("/pedidos", {
      method: "POST",
      body: JSON.stringify({
        nome,
        telefone: tel,
        endereco: end,
        pagamento: $("#pag").value,
        observacoes: $("#obs").value.trim(),
        itens: Object.entries(cart).map(([id, q]) => ({
          id: Number(id),
          quantidade: q,
        })),
      }),
    });
    localStorage.setItem("meu_telefone", tel); // para achar "Meus pedidos" depois
    cart = {};
    renderCart();
    openCart(false);
    $("#obs").value = "";
    toast(`Pedido #${r.id} feito! Acompanhe em Meus pedidos`);
    show("orders");
  } catch (e) {
    toast(e.message);
    renderCart(); // reabilita o botão
  }
};

function itemsTxt(o) {
  return o.itens.map((i) => `${i.q}× ${esc(i.n)}`).join(", ");
}
function renderOrders() {
  $("#myOrders").innerHTML = orders.length
    ? orders
        .map(
          (o) => `
   <div class="order"><div class="row"><b>Pedido #${o.id}</b><span class="badge">${STAGES[o.stage]}</span></div>
   <div class="steps">${STAGES.map((_, i) => `<div class="step ${i <= o.stage ? "on" : ""}"></div>`).join("")}</div>
   <div>${itemsTxt(o)}</div><div style="color:var(--muted);font-size:.9rem">${esc(o.end)} · ${esc(o.pag)} · ${esc(o.hora)}</div>
   <div class="price" style="margin-top:6px">${R(o.total)}</div></div>`,
        )
        .join("")
    : '<p class="empty">Você ainda não fez nenhum pedido.</p>';
}

function show(v) {
  document
    .querySelectorAll(".view")
    .forEach((s) => (s.hidden = s.id !== "v-" + v));
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.setAttribute("aria-selected", t.dataset.v === v));
  if (v === "orders") loadMyOrders();
}

document.querySelector(".tabs").onclick = (e) => {
  const v = e.target.dataset.v;
  if (v) show(v);
};

async function loadMyOrders() {
  const tel = localStorage.getItem("meu_telefone");
  if (!tel) {
    orders = [];
    return renderOrders();
  }
  try {
    orders = await api("/pedidos/telefone/" + encodeURIComponent(tel));
    renderOrders();
  } catch (e) {}
}

async function init() {
  try {
    MENU = await api("/produtos");
  } catch (e) {
    toast("Não foi possível carregar o cardápio");
  }
  renderMenu();
  renderCart();
}
init();

// atualiza o status dos pedidos quando o vendedor avançar a etapa
setInterval(() => {
  if (!$("#v-orders").hidden) loadMyOrders();
}, 3000);
