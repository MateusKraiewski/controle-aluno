# Setup e evidências

## Fonte e contexto

- Data: 18/10/2026 (contexto do cliente, Europe/Lisbon).
- Toolkit: `soumatheusgomes/vibe-coding-toolkit`, revisão `de66fe3`, separado em `E:\vibe-coding-toolkit`.
- Cliente: Codex Desktop. Sem alteração de modelo, autenticação, preferências globais ou permissões.
- Runtime verificado: Node.js 24.18.0 e npm 11.16.0.
- Produto: perfil aluno primeiro; web responsivo mobile first; professor previsto para fase posterior.
- Repositório GitHub `MateusKraiewski/controle-aluno`, branch `main`; commit inicial `438897d` enviado. A cópia local acompanha `origin/main`.

## Decisões e fontes

- Bootstrap Next.js pelo toolkit. A versão instalada pelo scaffold é Next.js 16.4.2; canal estável observado no pacote, sem adoção de canary.
- PostgreSQL + Drizzle escolhido; serviço local PostgreSQL 17 está ativo. A conexão TCP local recusou autenticação sem senha (`psql -h 127.0.0.1 -U postgres -w`), e nenhuma credencial foi encontrada no projeto. Schema e migração inicial foram gerados; migração não aplicada. Nenhum serviço externo foi selecionado.
- Skills da coleção Vercel selecionadas para Codex e copiadas localmente no Windows. React Native/Expo não instalado: plataforma decidida como web responsiva nesta etapa.
- Context7 adicionado em `.codex/config.toml` por não haver servidor ativo no inventário `codex mcp list`; consulta real e aprovação de confiança do projeto continuam pendentes.
- `.graphifyignore` foi configurado. O comando `graphify`, RTK e os plugins Ponytail/Caveman/Superpowers não estão disponíveis neste ambiente e não foram instalados globalmente.

## Componentes

| Componente | Ação e motivo | Escopo | Estado/evidência |
|---|---|---|---|
| Next.js/React/TypeScript/Tailwind | Scaffold e core Drizzle, PostgreSQL, Zod, Pino, Tailwind merge, ESLint, Vitest | Projeto | Instalado; Next 16.4.2, React 19.3.0, TypeScript 5.9.3; versões exatas no lockfile |
| Vercel React Best Practices, Composition, web-design-guidelines, writing-guidelines, view-transitions, optimize, deploy-to-vercel, vercel-cli-with-tokens | Capacidades web catalogadas | `.agents/skills/`, Codex | Cópias locais; `npx skills list --agent codex --json` listou 13 skills de projeto |
| find-skills | Busca de capacidades adicionais | `.agents/skills/`, Codex | Instalado e listado pelo CLI |
| next-dev-loop | Feedback Next/dev server | `.agents/skills/`, Codex | Instalado; Next 16.4.2 e agent-browser 0.39.1; Chrome instalado; Turbopack falha nos bindings nativos do Windows, então a prévia roda com Webpack |
| next-bundle-optimizer | Auditoria de bundle | `.agents/skills/`, Codex | Instalado; nenhuma análise de bundle executada |
| supabase-postgres-best-practices | Padrões PostgreSQL independentes do provedor | `.agents/skills/`, Codex | Instalado e listado pelo CLI |
| differential-review | Revisões de diffs sensíveis | `.agents/skills/`, Codex | Instalado e listado; nenhuma revisão de segurança executada |
| gh-fix-ci | Falhas GitHub Actions em Codex | Projeto | Não aplicável agora: sem remoto/PR/workflow |
| shadcn | Sistema de componentes | Projeto | Não adotado; Tailwind customizado é suficiente para a primeira tela |
| Sentry MCP | Observabilidade remota | Projeto | Pendente/não selecionado: nenhum serviço ou projeto Sentry escolhido |
| PostgreSQL/Drizzle | Persistência futura | Projeto | Dependências e templates de acesso instalados; sem schema/provedor/servidor |
| Context7 | Consulta de documentação | Projeto | Configurado em TOML; não consultado ainda; requer confiança do projeto |
| RTK/Graphify e plugins do toolkit | Integrações cliente/máquina | Máquina/cliente | Não instalados/disponíveis; sem alteração de caches ou preferências globais |
| agent-browser | Navegador para `next-dev-loop` | Global do usuário | Versão 0.39.1 e Chrome 155 instalados; sessão `aula-em-dia-40028c40bb87` abriu a página inicial |

## Documentação criada

`PRODUCT.md`, `README.md`, `AGENTS.md`, `CLAUDE.md` e os cinco documentos em `docs/` foram preenchidos a partir da descrição recebida. O produto ainda não tem histórico legado a consolidar.

## Checks

| Item | Estado | Evidência |
|---|---|---|
| Instalação npm do scaffold | Configurado | `package-lock.json` e `node_modules` presentes |
| Prévia em desenvolvimento | Em execução | `npm run dev -- --hostname 127.0.0.1 --port 3000` (o script usa Webpack); a página `/` está aberta no navegador embutido do Codex; histórico demonstrativo ganhou filtros de busca/matéria/período e o manifesto PWA foi ligado ao layout |
| Next MCP local | Consultado | `/_next/mcp`: `get_errors` retornou sem erros de configuração/sessão; `get_routes` listou `/` e `/favicon.ico` |
| Lint/tipos/build | Pendente | Não executados nesta etapa |
| Banco/SQL | Schema/migração preparados | `src/db/schema/index.ts`; arquivo em `drizzle/`; aplicação bloqueada pela senha ainda não configurada; autenticação/autorização ainda pendentes |
| Discovery Codex de skills | Listado pelo CLI | `npx skills@latest list --agent codex --json`; nova sessão ainda não observada |
| Memory/context retrieval | Configurado sem execução | Documentação canônica em `PRODUCT.md`, `AGENTS.md` e `docs/`; Codex carrega AGENTS no projeto; retrieval de sessão limpa não observado |
| Auditoria de dependências | Validada | `npm audit`: 9 vulnerabilidades de desenvolvimento (5 altas, 4 moderadas); `npm audit --omit=dev`: 0. As correções sugeridas exigem downgrade major do `eslint-config-next`/`drizzle-kit`; não aplicadas automaticamente |

## Memória e harness

Não foi criada memória externa; decisões duráveis ficam nos documentos versionados do projeto. `AGENTS.md` aponta ao escopo canônico, e `docs/setup.md` registra origem, data e estado. A recuperação em contexto limpo e integração de skills em uma sessão nova não foram verificadas.

## Pendências e próxima entrega

Seguir iterando com a prévia local aberta. O preflight recomendado pela versão instalada difere dos nomes de ferramentas disponíveis na versão 16.4.2 do servidor Next MCP; foram consultados `get_errors` e `get_routes`. Antes de gravar dados reais, selecionar provedor, autenticação e regras de acesso. Nenhuma publicação ou integração externa foi feita.
