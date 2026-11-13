// Funções de dados usadas pela loja (index.html) e pelo painel do vendedor (admin.html)
const DEFAULT_MENU=[
 {id:1,n:'Pizza Margherita',d:'Molho de tomate, muçarela e manjericão',p:42,c:'Pizzas',e:'🍕'},
 {id:2,n:'Pizza Calabresa',d:'Calabresa, cebola e azeitonas',p:46,c:'Pizzas',e:'🍕'},
 {id:3,n:'Pizza Quatro Queijos',d:'Muçarela, provolone, gorgonzola e parmesão',p:52,c:'Pizzas',e:'🧀'},
 {id:4,n:'Cheeseburger da Casa',d:'Blend 160g, cheddar, picles e molho especial',p:34,c:'Lanches',e:'🍔'},
 {id:5,n:'Burger Bacon',d:'Blend 160g, bacon crocante e cebola caramelizada',p:38,c:'Lanches',e:'🥓'},
 {id:6,n:'Batata frita',d:'Porção de 300g com sal e alecrim',p:19,c:'Acompanhamentos',e:'🍟'},
 {id:7,n:'Onion rings',d:'Anéis de cebola empanados',p:22,c:'Acompanhamentos',e:'🧅'},
 {id:8,n:'Refrigerante lata',d:'Cola, guaraná ou laranja',p:7,c:'Bebidas',e:'🥤'},
 {id:9,n:'Suco natural',d:'Laranja, maracujá ou acerola, 400ml',p:11,c:'Bebidas',e:'🍊'},
 {id:10,n:'Brownie com sorvete',d:'Brownie quente com bola de baunilha',p:21,c:'Sobremesas',e:'🍫'}
];

function loadMenu(){
  try{const m=JSON.parse(localStorage.getItem('delivery_menu')||'null');if(Array.isArray(m))return m}catch(e){}
  return DEFAULT_MENU.map(x=>({...x}));
}
function saveMenu(m){try{localStorage.setItem('delivery_menu',JSON.stringify(m))}catch(e){}}

function loadOrders(){
  try{const s=JSON.parse(localStorage.getItem('delivery_orders')||'null');if(s&&Array.isArray(s.orders))return s}catch(e){}
  return {orders:[],seq:1};
}
function saveOrders(orders,seq){try{localStorage.setItem('delivery_orders',JSON.stringify({orders,seq}))}catch(e){}}
