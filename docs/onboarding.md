# Onboarding local

## Requisitos

Node.js 24/npm 11 e PowerShell no setup registrado. PostgreSQL 17 local isolado já está criado em `.local/postgres-data` na cópia atual; segredo/URI estão em `.env.local` e nunca devem ser copiados para Git.

## Desenvolvimento

```powershell
npm install
npm run db:migrate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abra `http://127.0.0.1:3000`; `/` tem dados de demonstração e `/entrar` tem login/cadastro Better Auth. O cadastro grava utilizador no PostgreSQL local. Migrations futuras devem ser geradas via `npm run db:generate`, revisadas, aplicadas em banco de desenvolvimento e testadas antes de integrar.

Dev/build usam Webpack porque o binding SWC/Turbopack desta instalação Windows é inválido; Next carrega fallback WASM. Consulte `docs/setup.md` para comandos de cluster.

## Qualidade e fluxo de trabalho

Antes de submeter alteração: `npm run lint`, `npm run lint:typed`, `npm run lint:rules`, `npm run typecheck`, `npm test`, `npm run test:db` (com o PostgreSQL local ligado), `npm run build`. Em mudanças de schema, recriar banco em branco e validar migration; em auth/presença/vínculos, aplicar matriz de autorização e revisar diferencialmente.

Leia `PRODUCT.md`, `docs/roadmap.md`, `docs/ux-flows.md`, `docs/domain-model.md` e `docs/architecture.md` conforme o escopo. Escreva primeiro critérios de aceite e não transforme status futuro em promessa de feature implementada.

## Instalabilidade

O localhost não pode ser instalado em outro dispositivo como app remoto. Para iPhone, deployment HTTPS, Safari e Compartilhar → Adicionar à Tela de Início. Deployment e validação física não estão concluídos.
