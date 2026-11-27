/* const express = require("express");

const cors = require("cors");
const db = require("./bd.js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

app.get("/usuarios", async (req, res) => {
  try {
    [usuarios] = await db.query("SELECT * FROM usuarios");
    console.log(usuarios);
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({
      erro: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./bd.js"); // o seu bd.js continua exatamente como está
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

app.use(cors());

const SENHA_ADMIN = process.env.ADMIN_SENHA || "admin";

function soAdmin(req, res, next) {
  if (req.headers["x-admin-senha"] !== SENHA_ADMIN) {
    return res.status(401).json({ erro: "Não autorizado" });
  }
  next();
}

app.use(express.json());

// ---------- Upload de imagens ----------
const PASTA_IMG = path.join(__dirname, "uploads");
fs.mkdirSync(PASTA_IMG, { recursive: true });
app.use("/uploads", express.static(PASTA_IMG)); // fotos acessíveis em /uploads/arquivo

const EXTENSOES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: PASTA_IMG,
    // nome aleatório: ninguém sobrescreve foto de outro item nem envia nome malicioso
    filename: (req, file, cb) =>
      cb(
        null,
        crypto.randomBytes(12).toString("hex") + EXTENSOES[file.mimetype],
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB (o front já comprime bem antes disso)
  fileFilter: (req, file, cb) =>
    EXTENSOES[file.mimetype]
      ? cb(null, true)
      : cb(new Error("Envie uma imagem JPG, PNG ou WEBP")),
});

function receberImagem(req, res, next) {
  upload.single("imagem")(req, res, (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "Imagem muito grande (máx. 2 MB)"
          : err.message;
      return res.status(400).json({ erro: msg });
    }
    next();
  });
}

const PORT = 3000;
const TAXA_ENTREGA = 6;

// Etapas do pedido (a posição na lista vira o "stage" 0, 1, 2, 3 que o front usa)
const STATUS = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];
const METODOS = ["Dinheiro", "Pix", "Cartão Débito", "Cartão Crédito"];

// A tabela cardapio não tem emoji, então escolhemos pela categoria
const EMOJIS = { Hambúrguer: "🍔", Bebida: "🥤", Sobremesa: "🍰" };

// Busca pedidos (juntando com o cliente e o pagamento) e coloca os itens dentro de cada um
async function buscarPedidos(filtro, parametros) {
  const [pedidos] = await db.query(
    `SELECT p.id, u.nome, u.telefone AS tel, u.endereco AS end, u.observacao AS obs,
            p.valor_total AS total, p.status,
            DATE_FORMAT(p.data_pedido, '%H:%i') AS hora,
            (SELECT metodo FROM pagamentos WHERE pedido_id = p.id LIMIT 1) AS pag
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.status <> 'Cancelado' ${filtro}
     ORDER BY p.id DESC`,
    parametros,
  );

  for (const pedido of pedidos) {
    const [itens] = await db.query(
      `SELECT c.nome AS n, i.quantidade AS q
       FROM itens_pedido i
       JOIN cardapio c ON c.id = i.produto_id
       WHERE i.pedido_id = ?`,
      [pedido.id],
    );
    pedido.itens = itens;
    pedido.total = Number(pedido.total);
    pedido.stage = STATUS.indexOf(pedido.status); // "Em preparo" -> 1
  }

  return pedidos;
}

//  Cardápio
app.get("/produtos", async (req, res) => {
  try {
    const [linhas] = await db.query(
      "SELECT * FROM cardapio WHERE disponivel = 1",
    );

    const produtos = linhas.map((item) => ({
      id: item.id,
      n: item.nome,
      d: item.descricao || "",
      p: Number(item.preco),
      c: item.categoria,
      e: EMOJIS[item.categoria] || "🍽️",
      i: item.imagem || "",
    }));

    res.json(produtos);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

//  Criar pedido
app.post("/pedidos", async (req, res) => {
  try {
    const { nome, telefone, endereco, pagamento, observacoes, itens } =
      req.body;

    if (!nome || !telefone || !endereco || !itens || itens.length === 0) {
      return res.status(400).json({ erro: "Dados do pedido incompletos" });
    }
    if (!METODOS.includes(pagamento)) {
      return res.status(400).json({ erro: "Forma de pagamento inválida" });
    }

    // Passo 1: calcular o total com os preços DO BANCO (o navegador não decide o preço)
    let total = TAXA_ENTREGA;
    const itensDoPedido = [];

    for (const item of itens) {
      const [linhas] = await db.query(
        "SELECT * FROM cardapio WHERE id = ? AND disponivel = 1",
        [item.id],
      );

      if (linhas.length === 0 || item.quantidade < 1) {
        return res.status(400).json({ erro: "Item inválido no carrinho" });
      }

      const produto = linhas[0];
      total += Number(produto.preco) * item.quantidade;
      itensDoPedido.push({ produto, quantidade: item.quantidade });
    }
    total = Math.round(total * 100) / 100;

    // Passo 2: achar o cliente pelo telefone (ou cadastrar um novo)
    const telefoneLimpo = telefone.replace(/\D/g, "");
    const [clientes] = await db.query(
      "SELECT id FROM usuarios WHERE telefone = ?",
      [telefoneLimpo],
    );

    let usuarioId;
    if (clientes.length > 0) {
      usuarioId = clientes[0].id;
      await db.query(
        `UPDATE usuarios SET nome = ?, endereco = ?, forma_pagamento_preferida = ?, observacao = ?
         WHERE id = ?`,
        [nome, endereco, pagamento, observacoes || "", usuarioId],
      );
    } else {
      const [novo] = await db.query(
        `INSERT INTO usuarios (nome, telefone, endereco, forma_pagamento_preferida, observacao)
         VALUES (?, ?, ?, ?, ?)`,
        [nome, telefoneLimpo, endereco, pagamento, observacoes || ""],
      );
      usuarioId = novo.insertId;
    }

    // Passo 3: gravar o pedido
    const [pedido] = await db.query(
      "INSERT INTO pedidos (usuario_id, valor_total, taxa_entrega) VALUES (?, ?, ?)",
      [usuarioId, total, TAXA_ENTREGA],
    );
    const pedidoId = pedido.insertId;

    // Passo 4: gravar os itens do pedido
    for (const { produto, quantidade } of itensDoPedido) {
      await db.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?)`,
        [pedidoId, produto.id, quantidade, produto.preco],
      );
    }

    // Passo 5: gravar o pagamento (começa Pendente)
    await db.query(
      "INSERT INTO pagamentos (pedido_id, valor, metodo) VALUES (?, ?, ?)",
      [pedidoId, total, pagamento],
    );

    res.status(201).json({ id: pedidoId, total });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

//  "Meus pedidos" do cliente (busca pelo telefone)
app.get("/pedidos/telefone/:telefone", async (req, res) => {
  try {
    const telefone = req.params.telefone.replace(/\D/g, "");
    const pedidos = await buscarPedidos("AND u.telefone = ?", [telefone]);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

//  Todos os pedidos (painel da cozinha)
app.get("/pedidos", soAdmin, async (req, res) => {
  try {
    const pedidos = await buscarPedidos("", []);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Avançar o pedido para a próxima etapa
app.put("/pedidos/:id/avancar", soAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const [linhas] = await db.query("SELECT status FROM pedidos WHERE id = ?", [
      id,
    ]);
    if (linhas.length === 0) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }

    const posicao = STATUS.indexOf(linhas[0].status);
    if (posicao === -1 || posicao >= STATUS.length - 1) {
      return res.status(400).json({ erro: "Este pedido não pode avançar" });
    }

    const novoStatus = STATUS[posicao + 1];
    await db.query("UPDATE pedidos SET status = ? WHERE id = ?", [
      novoStatus,
      id,
    ]);

    // Quando sai para entrega: escolhe o entregador com menos entregas em aberto
    if (novoStatus === "Saiu para entrega") {
      const [entregadores] = await db.query(
        `SELECT e.id FROM entregadores e
         LEFT JOIN entregas en ON en.entregador_id = e.id AND en.data_entrega IS NULL
         GROUP BY e.id
         ORDER BY COUNT(en.id) LIMIT 1`,
      );
      if (entregadores.length > 0) {
        await db.query(
          "INSERT INTO entregas (pedido_id, entregador_id, data_saida) VALUES (?, ?, NOW())",
          [id, entregadores[0].id],
        );
      }
    }

    // Quando entregue: registra a hora da entrega e marca o pagamento como Pago
    if (novoStatus === "Entregue") {
      await db.query(
        "UPDATE entregas SET data_entrega = NOW() WHERE pedido_id = ?",
        [id],
      );
      await db.query(
        "UPDATE pagamentos SET status = 'Pago', data_pagamento = NOW() WHERE pedido_id = ?",
        [id],
      );
    }

    res.json({ mensagem: "Pedido atualizado", status: novoStatus });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Adicionar item ao cardápio (com foto opcional)
app.post("/produtos", soAdmin, receberImagem, async (req, res) => {
  try {
    const { nome, descricao, preco, categoria } = req.body;
    if (!nome || !categoria || !(Number(preco) > 0)) {
      if (req.file) fs.unlink(req.file.path, () => {}); // não deixa foto órfã
      return res.status(400).json({ erro: "Dados do item inválidos" });
    }
    const imagem = req.file ? req.file.filename : null;
    const [r] = await db.query(
      "INSERT INTO cardapio (nome, descricao, preco, categoria, imagem, disponivel) VALUES (?, ?, ?, ?, ?, 1)",
      [nome, descricao || "", preco, categoria, imagem],
    );
    res.status(201).json({ id: r.insertId });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ erro: error.message });
  }
});

// "Excluir" item
app.delete("/produtos/:id", soAdmin, async (req, res) => {
  try {
    await db.query("UPDATE cardapio SET disponivel = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ mensagem: "Item removido" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Cancelar/remover pedido
app.put("/pedidos/:id/cancelar", soAdmin, async (req, res) => {
  try {
    await db.query("UPDATE pedidos SET status = 'Cancelado' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ mensagem: "Pedido cancelado" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
