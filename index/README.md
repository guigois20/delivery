# Delivery — Lanches do Vini

Aplicação web simples de delivery para o restaurante **Lanches do Vini**. O projeto permite navegar pelo cardápio, montar um carrinho, finalizar pedidos e acompanhar o status da entrega. Também inclui um painel administrativo para gerenciar pedidos e itens do cardápio.

> Projeto totalmente front-end: os dados são armazenados no navegador por meio do `localStorage`.

## Funcionalidades

### Loja

- Visualização dos itens por categoria.
- Carrinho com controle de quantidade.
- Cálculo de subtotal, taxa de entrega e total.
- Cadastro de nome, telefone, endereço, pagamento e observações.
- Histórico dos pedidos realizados no navegador.
- Acompanhamento visual das etapas de entrega.
- Atualização automática do status a cada 3 segundos.

### Painel do vendedor

- Login administrativo.
- Visão dos pedidos por estágio:
  - Recebido
  - Em preparo
  - Saiu para entrega
  - Entregue
- Avanço ou cancelamento de pedidos.
- Estatísticas de quantidade de pedidos, pedidos ativos e faturamento.
- Cadastro e exclusão de produtos.
- Restauração do cardápio padrão.
- Atualização automática ao receber alterações feitas em outra aba.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- `localStorage` para persistência local
- Google Fonts

## Estrutura do projeto

```text
delivery/
├── README.md
└── index/
    ├── index.html       # Página da loja
    ├── admin.html       # Painel do vendedor
    ├── script.js        # Carrinho, pedidos e acompanhamento
    ├── admin.js         # Login e gerenciamento administrativo
    ├── data.js          # Cardápio padrão e funções de persistência
    └── style.css        # Estilos da aplicação
```

## Como executar

Como o projeto não possui dependências ou backend, basta abrir os arquivos HTML em um navegador.

1. Baixe ou clone o repositório:

```bash
git clone https://github.com/guigois20/delivery.git
```

2. Acesse a pasta do projeto:

```bash
cd delivery
```

3. Abra `index/index.html` no navegador.

Para uma experiência mais adequada, execute um servidor local. Exemplo usando Python:

```bash
cd delivery
python -m http.server 8000
```

Depois, acesse:

- Loja: http://localhost:8000/index/index.html
- Painel: http://localhost:8000/index/admin.html

## Acesso administrativo

A senha padrão configurada no projeto é:

```text
admin
```

A senha pode ser alterada na constante `ADMIN_PASS`, localizada em `index/admin.js`.

> ⚠️ Esta autenticação é apenas demonstrativa e funciona no navegador. Não deve ser utilizada como mecanismo real de segurança em produção.

## Persistência dos dados

Os dados são persistidos separadamente no navegador com as seguintes chaves:

- `delivery_menu`: itens do cardápio
- `delivery_orders`: pedidos e sequência dos números
- `admin_ok`: controle temporário da sessão administrativa

Os pedidos e alterações feitos em uma aba são sincronizados com outras abas abertas no mesmo navegador, por meio do evento `storage`.

## Observações de segurança

- O painel não possui autenticação real no servidor.
- A senha está armazenada no código JavaScript e pode ser visualizada por qualquer pessoa.
- Os dados podem ser alterados ou apagados pelo usuário por meio das ferramentas do navegador.
- Não há integração com pagamento, envio de mensagens ou banco de dados.

Para uso real, recomenda-se criar um backend, autenticação segura, banco de dados e integrações de pagamento e entrega.
