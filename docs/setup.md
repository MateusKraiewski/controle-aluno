# Setup e evidências do ambiente

**Última atualização:** 18/10/2026 · **Windows / Europe-Lisbon** · Node.js 24.18.0 · npm 11.16.0.

## Projeto e origem

- Diretório: `E:\controle-aluno`.
- Remoto: `https://github.com/MateusKraiewski/controle-aluno.git`, branch `main` (o push das alterações desta rodada deve ser confirmado no relatório após executar Git).
- Toolkit usado: `soumatheusgomes/vibe-coding-toolkit`, instalado antes em `E:\vibe-coding-toolkit`; cópias selecionadas em `.agents/skills/`.
- Fonte dos acordos: `AGENTS.md`, `PRODUCT.md`, este arquivo e os docs em `docs/`.

## Skill catalog realmente instalado

`skills-lock.json` lista 13 capacidades Vercel/PostgreSQL: `deploy-to-vercel`, `differential-review`, `find-skills`, `next-bundle-optimizer`, `next-dev-loop`, `supabase-postgres-best-practices`, `vercel-cli-with-tokens`, `vercel-composition-patterns`, `vercel-optimize`, `vercel-react-best-practices`, `vercel-react-view-transitions`, `web-design-guidelines` e `writing-guidelines`. **Não há skill chamada PMO, Product Management, UX Research ou QA no catálogo atual.** As atividades são estruturadas neste projeto com Product Brief, roadmap/gates, jornadas/estados UX, ADR, matriz de riscos e estratégia QA. Isso usa as capacidades disponíveis sem dizer que uma skill ausente foi executada.

Skills de React/Next, padrões de autenticação server-side, preferências/localStorage e PostgreSQL foram consultadas para as mudanças; a revisão UI segue o arquivo Vercel Web Interface Guidelines. Consumo de deployment/senhas e publicação hospedada não está autorizado por instalação de skill e não foi iniciado.

## Ambiente local

- PostgreSQL 17 isolado: `127.0.0.1:5433`, DB `aula_em_dia`, role `aula_dev`.
- Cluster: `.local/postgres-data/`; log `.local/postgres.log`; esses dados ficam locais e são excluídos pelo `.gitignore`.
- Segredos e URL: `.env.local` (não versionado); exemplo em `.env.example`. Não colocar valores no relatório, console, ticket ou variável `NEXT_PUBLIC_*`.
- As migrations Drizzle `0000`–`0008` foram aplicadas com sucesso ao cluster desta cópia, incluindo proveniência da presença, séries recorrentes, estado da aula/exceções e constraints/índices.
- PostgreSQL do Windows existente não foi alterado; esta aplicação usa porta própria.
- Desenvolvimento: `npm run dev -- --hostname 127.0.0.1 --port 3000`; URL `http://127.0.0.1:3000`.
- Conta: `/entrar` → alternar para “Criar conta”; cadastro Better Auth grava no DB local.
- Login e rota auth: Better Auth + Drizzle PostgreSQL; actions de aula avulsa/recorrente, presença e conteúdo estudado usam sessão, validação Zod e owner vindo do servidor.

### Start/stop do PostgreSQL isolado

PowerShell na raiz do projeto:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' start -D .local\postgres-data -o '-p 5433 -h 127.0.0.1' -l .local\postgres.log -w
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' stop -D .local\postgres-data -m fast
```

Não iniciar uma segunda instância com a mesma pasta. `npm run db:migrate` aplica migrations pendentes; não alterar migrations que já rodaram.

## Prévia instalada

O servidor de desenvolvimento solicitado está configurado em `127.0.0.1:3000`; confira o processo atual antes de iniciar uma segunda cópia. Abrir `/` mostra a demonstração sem conta; `/entrar` cria sessão e abre dados persistentes do próprio estudante.

## iPhone e app

O diretório tem manifesto/metadata PWA, mas localhost só está visível nesta máquina. Para instalar em dispositivo real é preciso publicar a aplicação em domínio HTTPS, acessar no Safari e usar **Compartilhar → Adicionar à Tela de Início**. A instalação direta não requer App Store; publicação remota/hospedagem ainda depende de provider, domínio, ambiente seguro e configuração de privacidade.

## Restrições observadas

- Se o servidor de desenvolvimento passar a falhar com `ReferenceError: <nome importado> is not defined` depois de editar imports, o cache do Webpack/SWC em WASM ficou desatualizado: parar o servidor, apagar `.next/dev` e `.next/cache` e iniciar de novo.

- Binding SWC nativo Next para Windows retornou “não é aplicativo Win32 válido”; Next executa via WASM. Turbopack build falha nesta plataforma; dev/build foram configurados com Webpack.
- Há limitações reais no domínio atual: divisão de série/feriados automáticos, vínculo de professor, confirmação bilateral, repositório de notas privadas, reposição ligada, timezone IANA por perfil e upload ainda não foram implementados. Edição/cancelamento por escopo e aviso de conflito já existem (ver `docs/domain-model.md`).
- Não afirmar que conta docente, app nativo, backup/restore, deploy público, iPhone físico ou QA e2e estão prontos sem evidência.

## Evidência e entrega

Saída dos comandos executados, checks, estado Git/push, servidor preview e restrições estão em [`RELATORIO-FINAL.md`](../RELATORIO-FINAL.md). Credenciais e detalhes sensíveis nunca são registrados ali.
