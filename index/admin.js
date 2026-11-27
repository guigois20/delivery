const STAGES = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];
const $ = (s) => document.querySelector(s);
const R = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const logged = () => !!sessionStorage.getItem("admin_senha");

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 2200);
}

/* ---------- Compressão de imagem (feita no navegador) ---------- */
const MAX_LADO = 800; // maior lado da imagem, em pixels
async function comprimirImagem(file) {
  const bmp = await createImageBitmap(file); // lê JPG, PNG, WEBP...
  const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala),
    h = Math.round(bmp.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // fundo branco (evita preto em PNG transparente)
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const toBlob = (tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q));
  let blob = await toBlob("image/webp", 0.8);
  if (!blob || blob.type !== "image/webp")
    blob = await toBlob("image/jpeg", 0.8); // navegadores sem WEBP
  return blob;
}
const kb = (n) => Math.round(n / 1024) + " KB";

$("#fi").onchange = () => {
  const f = $("#fi").files[0];
  $("#fiinfo").textContent = f
    ? `Original: ${kb(f.size)} (será comprimida ao enviar)`
    : "";
};

/* ---------- Login ---------- */
function gate() {
  $("#login").hidden = logged();
  $("#panel").hidden = !logged();
  if (logged()) refresh();
}

$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  sessionStorage.setItem("admin_senha", $("#pass").value);
  try {
    await api("/pedidos"); // se a senha estiver errada, dá 401
    $("#err").textContent = "";
    $("#pass").value = "";
    gate();
  } catch (err) {
    sessionStorage.removeItem("admin_senha");
    $("#err").textContent =
      err.message === "Não autorizado" ? "Senha incorreta." : err.message;
  }
};

$("#logout").onclick = () => {
  sessionStorage.removeItem("admin_senha");
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
const itemsTxt = (o) => o.itens.map((i) => `${i.q}× ${esc(i.n)}`).join(", ");

async function renderOrders() {
  let orders;
  try {
    orders = await api("/pedidos");
  } catch (e) {
    return;
  }
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

$("#kan").onclick = async (e) => {
  if (!logged()) return;
  const adv = e.target.dataset.adv,
    del = e.target.dataset.del;
  if (!adv && !del) return;
  try {
    if (adv) await api(`/pedidos/${adv}/avancar`, { method: "PUT" });
    if (del) {
      if (!confirm("Remover este pedido?")) return;
      await api(`/pedidos/${del}/cancelar`, { method: "PUT" });
    }
    renderOrders();
  } catch (err) {
    toast(err.message);
  }
};

/* ---------- Cardápio ---------- */
async function renderMenu() {
  let menu;
  try {
    menu = await api("/produtos");
  } catch (e) {
    return;
  }
  $("#catlist").innerHTML = [...new Set(menu.map((i) => i.c))]
    .map((c) => `<option value="${esc(c)}">`)
    .join("");
  $("#menuTable").innerHTML =
    `<thead><tr><th></th><th>Item</th><th>Categoria</th><th>Preço</th><th></th></tr></thead><tbody>${
      menu
        .map(
          (
            i,
          ) => `<tr><td>${i.i ? `<img class="foto-mini" src="${API}/uploads/${encodeURIComponent(i.i)}" alt="">` : esc(i.e)}</td><td><b>${esc(i.n)}</b><br><small>${esc(i.d)}</small></td><td>${esc(i.c)}</td><td>${R(i.p)}</td>
    <td><button class="danger" data-rm="${i.id}">Excluir</button></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="5" class="empty">Cardápio vazio.</td></tr>'
    }</tbody>`;
}

$("#addForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!logged()) return;
  try {
    const fd = new FormData();
    fd.append("nome", $("#fn").value.trim());
    fd.append("descricao", $("#fd").value.trim());
    fd.append("preco", parseFloat($("#fp").value));
    fd.append("categoria", $("#fc").value.trim());
    const foto = $("#fi").files[0];
    if (foto) {
      let blob;
      try {
        blob = await comprimirImagem(foto);
      } catch (_) {
        toast("Não foi possível ler essa imagem. Use JPG, PNG ou WEBP.");
        return;
      }
      fd.append(
        "imagem",
        blob,
        "foto" + (blob.type === "image/webp" ? ".webp" : ".jpg"),
      );
    }
    await api("/produtos", { method: "POST", body: fd });
    e.target.reset();
    $("#fiinfo").textContent = "";
    renderMenu();
    toast("Item adicionado");
  } catch (err) {
    toast(err.message);
  }
};

$("#menuTable").onclick = async (e) => {
  const id = e.target.dataset.rm;
  if (!id || !logged()) return;
  if (!confirm("Excluir este item do cardápio?")) return;
  try {
    await api(`/produtos/${id}`, { method: "DELETE" });
    renderMenu();
    toast("Item excluído");
  } catch (err) {
    toast(err.message);
  }
};

/* ---------- Atualização ---------- */
function refresh() {
  renderOrders();
  renderMenu();
}

// a cada 5 segundos, o painel pergunta ao servidor se tem pedido novo
setInterval(() => {
  if (logged()) renderOrders();
}, 5000);

gate();
