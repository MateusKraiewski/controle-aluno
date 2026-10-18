# Relatório de entrega — Aula em Dia

**Data:** 18 de outubro de 2026 · **Projeto:** `E:\controle-aluno` · **Estado:** base de produto e fundação de domínio concluídas nesta rodada; implementação integral do produto ainda em evolução. **Destino solicitado:** `MateusKraiewski/controle-aluno`.

## Resumo do trabalho

Reformulei a entrega para estruturar um produto completo para alunos e professores, em vez de tratar o escopo como uma tela simples de calendário. O pacote agora documenta problema, públicos, diferencial, políticas de privacidade/autoria, jornadas, estados, domínio, decisões arquiteturais, roadmap por fases, riscos, métricas e gates de qualidade. Em código, concluí a persistência autenticada do aluno, o registo do que foi estudado e a criação de aulas avulsas e séries semanais/quinzenais com várias ocorrências.

O desenho central do produto é um diário rastreável por aula: o plano, o que aconteceu, presença de cada pessoa, conteúdo e reposições ficam separados. O aluno e o professor devem registar a própria visão; divergências não se transformam silenciosamente em “verdade”.

## Implementado e verificado

- Cadastro/login Better Auth ligado ao PostgreSQL local; página inicial serve demonstração sem sessão e dados reais filtrados pela identidade autenticada.
- Matéria/aula persistidas; múltiplas aulas independentes podem coexistir no mesmo dia.
- Formulário de aula com data, início/fim, conteúdo planeado, opção avulsa, repetição semanal ou quinzenal, vários dias, data limite e timezone IANA.
- Séries/ocorrências criadas atomicamente; restrição única por série/data para evitar duplicatas.
- Histórico aceita aulas agendadas e permite registar presença/falta; rótulo deixa claro que a falta do professor é relato do aluno. A autoria e o momento da alteração são guardados.
- Campo de conteúdo realmente estudado é separado do conteúdo planeado e pode ser editado no histórico.
- Quatro idiomas, temas claro/escuro, preferências locais defensivas, responsividade PWA, link para saltar ao conteúdo e foco/teclado no diálogo.
- PostgreSQL 17 de desenvolvimento isolado em `127.0.0.1:5433`; migrations `0000`–`0007` aplicadas. Os dados e credenciais locais estão ignorados pelo Git.
- Estrutura por feature: actions autenticadas → serviço/repository → PostgreSQL. Entrada validada no servidor por Zod; queries de escrita incluem a conta derivada da sessão.

## Desenho completo do produto

O produto foi organizado em quatro etapas de entrega: (0) base confiável, (1) planner do aluno, (2) conta/vínculos/professor com consentimento e confirmação independente, (3) acompanhamento por matéria e revisão, (4) lançamento/observabilidade e extensões. A etapa 1 cobre série com edição por escopo, exceções e feriados, conflitos explícitos, cancelamento/reposição ligada à origem e timezone de perfil.

O diferencial proposto combina agenda com diário de cada ocorrência, autoria por participante, histórico por matéria e reposição que preserva a aula original. O roadmap também delimita o que não deve ser lançado por suposição: ranking de alunos, score opaco, inferência automática de falta, gravação de aulas ou IA sem consentimento/revisão.

## Documentação do projeto

- Visão e escopo: [PRODUCT.md](PRODUCT.md)
- Roadmap, dependências, riscos e gates: [docs/roadmap.md](docs/roadmap.md)
- Jornadas e estados UX: [docs/ux-flows.md](docs/ux-flows.md)
- Arquitetura/ADRs: [docs/architecture.md](docs/architecture.md)
- Modelo de domínio, invariantes e migrations: [docs/domain-model.md](docs/domain-model.md)
- Design e acessibilidade: [docs/design.md](docs/design.md)
- Estratégia QA, segurança e release: [docs/quality.md](docs/quality.md)
- Revisão diferencial de segurança: [docs/AULA-EM-DIA_DIFFERENTIAL_REVIEW_2026-10-18.md](docs/AULA-EM-DIA_DIFFERENTIAL_REVIEW_2026-10-18.md)
- Setup/restrições reais: [docs/setup.md](docs/setup.md)

## Skills usadas

Foram consultadas as skills instaladas `vercel-react-best-practices`, `supabase-postgres-best-practices`, `web-design-guidelines`, `differential-review` e as regras locais de arquitetura/qualidade. O catálogo do toolkit contém skills de implementação web/PostgreSQL, otimização e revisão, mas **não traz skills de PMO, UX Research ou QA com esses nomes**. Para cobrir essa lacuna, criei governança PMO leve, roadmap, critérios de aceite, jornadas, matriz de risco e pirâmide de testes em `docs/`.

## QA executado nesta cópia

| Verificação | Resultado |
|---|---|
| `npm run lint` | passou, sem erros/avisos na execução final |
| `npm run lint:typed` | passou |
| `npm run lint:rules` | passou: max-lines, no-direct-console e no-direct-data-access |
| `npm run typecheck` | passou; Next gerou tipos de rota e TypeScript terminou sem erro |
| `npm test` | passou: 7 testes em 1 arquivo, cobrindo intervalos/overlap, recorrência semanal/quinzenal, datas, weekdays e limites |
| `npm run db:migrate` | passou no PostgreSQL local, migrations `0000`–`0007` aplicadas |
| `npm run build` | passou: build Next de produção com Webpack, rotas listadas e TypeScript compilado |
| Smoke HTTP | `/`, `/entrar`, `/manifest.webmanifest` e `/api/auth/get-session` responderam HTTP 200 |
| Prévia visual/acessibilidade | dashboard e login observados no navegador embutido; árvore de acessibilidade mostrou navegação, formulário, seletor semanal/quinzenal, dias e término da série |

Next carrega fallback WebAssembly porque o binding SWC nativo do Windows é inválido neste ambiente; Turbopack não funciona aqui. Por isso os scripts de dev e build usam Webpack.

## Limites atuais — não anunciar como prontos

- **O produto completo ainda não está lançado.** O escopo está estruturado, mas falta concluir o roadmap e validar com alunos/professores reais.
- **Professor:** perfil, disponibilidade, convites, vínculo, escopos e painel docente ainda não implementados.
- **Presença bilateral:** o aluno guarda o próprio registo/relato. A resposta do professor, divergências e resolução precisam do modelo de registros por participante descrito no domínio.
- **Séries:** criação funciona; edição “esta/próximas/todas”, feriados, exceções e sobreposição confirmada ainda faltam.
- **Estudo:** notas/materiais privados, objetivos por matéria, tarefa/revisão, reposição ligada e exportação são próximos incrementos.
- **Timezone:** a série conserva a zona escolhida; política de DST, timezone de perfil e comportamento ao viajar ainda não foram validados.
- **QA:** testes unitários de domínio passaram, porém ainda não há teste de integração de Better Auth/actions/isolamento entre contas ou fluxo E2E. Smoke HTTP não prova login/cadastro/escrita real por navegador.
- **iOS:** há manifestação PWA e instrução, mas o app só está em localhost. Para instalar no iPhone, é necessário deployment HTTPS e validação no Safari/dispositivo físico; não está hospedado nem foi publicado.
- **Operação pública:** ainda requer rate limiting/cotas, verificação e recuperação de e-mail, backup/restore, revisão completa de dependências, política de privacidade/eliminação e observabilidade sem dados escolares.

A revisão de segurança recomenda **não expor à internet** até cumprir esses gates; os achados estão documentados no relatório diferencial.

## Uso local

O PostgreSQL isolado usa `.local/postgres-data` e a conexão/segredos estão em `.env.local`; nenhum segredo aparece neste documento. O cluster do PostgreSQL do Windows existente não foi alterado. A prévia permanece em `http://127.0.0.1:3000`; entre em `/entrar` para criar uma conta local e testar a gravação. Para conferir instalação em iPhone, primeiro será necessário um endereço HTTPS hospedado.

**Git:** branch `main`, remoto `origin` (`https://github.com/MateusKraiewski/controle-aluno.git`). O commit desta entrega e o resultado do push serão informados na mensagem final.
