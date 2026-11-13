const MENU=loadMenu();
const FEE=6, STAGES=['Recebido','Em preparo','Saiu para entrega','Entregue'];
const R=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const $=s=>document.querySelector(s);
let cart={}, cat='Todos', {orders,seq}=loadOrders();

const save=()=>saveOrders(orders,seq);

function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2200)}

function renderMenu(){
  const cats=['Todos',...new Set(MENU.map(i=>i.c))];
  $('#cats').innerHTML=cats.map(c=>`<button class="chip" aria-pressed="${c===cat}" data-c="${c}">${c}</button>`).join('');
  $('#grid').innerHTML=MENU.filter(i=>cat==='Todos'||i.c===cat).map(i=>`
   <article class="item"><div class="emoji" aria-hidden="true">${i.e}</div><h3>${i.n}</h3><p>${i.d}</p>
   <div class="row"><span class="price">${R(i.p)}</span><button class="add" data-id="${i.id}">Adicionar</button></div></article>`).join('');
}
$('#cats').onclick=e=>{const b=e.target.closest('[data-c]');if(b){cat=b.dataset.c;renderMenu()}};
$('#grid').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;const id=b.dataset.id;cart[id]=(cart[id]||0)+1;renderCart();toast('Adicionado ao carrinho')};

function totals(){const sub=Object.entries(cart).reduce((s,[id,q])=>s+MENU.find(i=>i.id==id).p*q,0);return{sub,fee:sub?FEE:0,tot:sub?sub+FEE:0}}
function renderCart(){
  const ids=Object.keys(cart);
  $('#cnt').textContent=ids.reduce((s,i)=>s+cart[i],0);
  $('#lines').innerHTML=ids.length?ids.map(id=>{const i=MENU.find(m=>m.id==id);return `
   <div class="line"><span class="nm">${i.n}<br><small>${R(i.p)}</small></span>
   <div class="qty"><button data-m="${id}" aria-label="Diminuir">−</button><b>${cart[id]}</b><button data-p="${id}" aria-label="Aumentar">+</button></div></div>`}).join('')
   :'<p class="empty">Seu carrinho está vazio. Escolha algo no cardápio.</p>';
  const t=totals();$('#sub').textContent=R(t.sub);$('#fee').textContent=R(t.fee);$('#tot').textContent=R(t.tot);
  $('#send').disabled=!ids.length;
}
$('#lines').onclick=e=>{const m=e.target.dataset.m,p=e.target.dataset.p;
  if(p)cart[p]++;if(m){cart[m]--;if(cart[m]<=0)delete cart[m]}renderCart()};

const openCart=o=>{$('#cart').classList.toggle('open',o);$('#scrim').hidden=!o};
$('#openCart').onclick=()=>openCart(true);$('#closeCart').onclick=()=>openCart(false);$('#scrim').onclick=()=>openCart(false);

$('#send').onclick=()=>{
  ({orders,seq}=loadOrders());
  const nome=$('#nome').value.trim(),tel=$('#tel').value.trim(),end=$('#end').value.trim();
  if(!nome||!tel||!end){toast('Preencha nome, telefone e endereço');return}
  const t=totals();
  orders.unshift({id:seq++,nome,tel,end,pag:$('#pag').value,obs:$('#obs').value.trim(),
    itens:Object.entries(cart).map(([id,q])=>({n:MENU.find(m=>m.id==id).n,q})),total:t.tot,stage:0,hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  save();cart={};renderCart();openCart(false);$('#obs').value='';
  toast('Pedido feito! Acompanhe em Meus pedidos');show('orders');
};

function itemsTxt(o){return o.itens.map(i=>`${i.q}× ${i.n}`).join(', ')}
function renderOrders(){
  $('#myOrders').innerHTML=orders.length?orders.map(o=>`
   <div class="order"><div class="row"><b>Pedido #${o.id}</b><span class="badge">${STAGES[o.stage]}</span></div>
   <div class="steps">${STAGES.map((_,i)=>`<div class="step ${i<=o.stage?'on':''}"></div>`).join('')}</div>
   <div>${itemsTxt(o)}</div><div style="color:var(--muted);font-size:.9rem">${o.end} · ${o.pag} · ${o.hora}</div>
   <div class="price" style="margin-top:6px">${R(o.total)}</div></div>`).join('')
   :'<p class="empty">Você ainda não fez nenhum pedido.</p>';
}

function show(v){
  document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='v-'+v);
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.v===v));
  if(v==='orders'){({orders,seq}=loadOrders());renderOrders()}
}
document.querySelector('.tabs').onclick=e=>{const v=e.target.dataset.v;if(v)show(v)};

renderMenu();renderCart();

// atualiza o status dos pedidos quando o vendedor avançar a etapa
setInterval(()=>{if(!$('#v-orders').hidden){({orders,seq}=loadOrders());renderOrders()}},3000);
