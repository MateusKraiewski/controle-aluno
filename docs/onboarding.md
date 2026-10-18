# Preparação local

## Pré-requisitos

Node.js 24 e npm. Setup observado: Node.js 24.18.0, npm 11.16.0, Windows e PowerShell.

## Primeira execução

Na raiz (`E:\controle-aluno`):

```powershell
npm ci
npm run dev
```

O app abre em <http://localhost:3000>. Use `.env.example` para nomes de variáveis quando existir integração. Não grave valores secretos no repositório.
O script local usa Webpack devido à falha observada ao carregar o binding nativo do Turbopack neste Windows.
Em navegadores compatíveis, o manifesto identifica o Aula em Dia como app instalável. Instalação e comportamento offline ainda não foram conectados a um service worker.

## Banco

A base planejada é PostgreSQL com Drizzle, mas ainda não existe configuração de banco, schema ou provedor. Não é necessário banco para ver o protótipo. Antes de dados reais, escolher destino, configurar `DATABASE_URL` localmente, revisar SQL gerado e aplicar migrações apenas no destino confirmado.

## Verificação

Consulte `docs/quality.md`. Os checks só serão listados como disponíveis quando estiverem configurados; não alegue resultados que não foram executados.

## Agentes

Leia [AGENTS.md](../AGENTS.md); [CLAUDE.md](../CLAUDE.md) encaminha para as mesmas instruções. Skills locais ficam em `.agents/skills/`; `docs/setup.md` registra origem e status de descoberta.

## Problemas conhecidos

Nenhum observado além da ausência de banco, autenticação e fluxos do produto.
