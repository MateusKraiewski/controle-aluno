# Aula em Dia — instruções do projeto

Leia `PRODUCT.md` e `docs/ux-flows.md` antes de mexer em fluxos; leia `docs/domain-model.md` e `docs/architecture.md` antes de persistência/queries. `docs/` é a fonte das decisões; não invente regras de faltas, recorrência ou vínculos com professor. Diferencie estado implementado de roadmap.

## Stack e comandos

- Next.js App Router, TypeScript, Tailwind CSS, npm, Node.js 24.
- Instalar: `npm install`
- Desenvolvimento: `npm run dev` (Webpack, necessário neste ambiente Windows porque o binding nativo do Turbopack não carregou)
- Lint: `npm run lint`
- Tipagem: `npm run typecheck`
- Regras ESLint: `npm run lint:typed` e `npm run lint:rules`
- Build: `npm run build`
- Vitest executa testes de domínio de calendário/recorrência; amplie coverage antes de anunciar regras sensíveis como completas.

## Acordos

- Faça a menor mudança completa e preserve requisitos de privacidade e acessibilidade.
- Prefira Server Components; crie fronteiras client apenas para interações que precisam de estado no navegador.
- Dados demonstrativos devem estar identificados como exemplo e não podem parecer registros salvos.
- A apresentação não acessa banco diretamente. Use `app → feature service → repository → db`; valide entradas no servidor com Zod, use consultas parametrizadas e projete apenas campos necessários.
- Não coloque credenciais em arquivos versionados, logs, erros ou propriedades `NEXT_PUBLIC_*`.
- Não implemente autenticação fictícia nem use armazenamento local para dados pessoais. Antes de dados reais, implemente autenticação e autorização no servidor.
- Consulte as skills locais aplicáveis em `.agents/skills/`. A presença de um arquivo não prova que o cliente o descobriu.
- O catálogo atual não contém skill de PMO/UX Research/QA dedicada. Registre plano, jornadas, riscos, critérios de aceite e evidências nos docs; não afirme execução de uma skill indisponível.
- Atualize o documento responsável quando comportamento, comando ou decisão mudar.
- Não publique nem conecte serviços pagos sem solicitação específica.

## Skills

Usos e estado das skills locais estão em `docs/setup.md`. Use `vercel-react-best-practices` ao escrever componentes Next/React e `web-design-guidelines` ao revisar interface.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
