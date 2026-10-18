# Qualidade, validação e segurança

## Automação local disponível

- `npm run lint` — ESLint base e regras locais de limites de camada.
- `npm run lint:typed` — regras tipadas para promises/callbacks.
- `npm run lint:rules` — contrato dos plugins locais.
- `npm run typecheck` — tipos/rotas Next e TypeScript.
- `npm test` — Vitest; regras puras de intervalo e geração semanal.
- `npm run build` — build de produção Webpack (binding Turbopack indisponível no Windows atual).
- `npm run db:generate` / `npm run db:migrate` — migrações Drizzle.

Todo PR deve rodar lint, lint tipado, regras, tipos, testes, build, geração/migração em PostgreSQL vazio e uma atualização de DB anterior suportada. Não declarar gate verde sem guardar saída/código de retorno no relatório.

## Pirâmide de testes

### Unidade (rápidos)

Regra de overlap com intervalos semiabertos, fusos/weekday/recorrência, escopo de edição, idempotência, autor/visibilidade, máquina de estados de presença e cálculo de contagens. Testes determinísticos com relógio/fuso fixos; não usar timezone da máquina por acidente.

### Integração PostgreSQL real

- Migração limpa e update desde release anterior; FK/check/unique constraints e concorrência em `create series`.
- Queries por owner e professor vinculado, IDOR, vínculo pendente/revogado, escopo por matéria/aula.
- Retentativa de requests, double-submit, correção de relato, transação abortada e rollback.
- Backfill legado `student_absent`/`teacher_absent` sem inventar autor; verificação de contagens.

### Fluxo navegador/e2e

- Registro/login/logout, sessão expirada, recuperar erro sem duplicar.
- Aluno cria 4 matérias e duas/três aulas no mesmo dia, uma sobreposta; confere aviso e mantém exceção explicitamente.
- Série semanal e quinzenal; editar somente ocorrência/futuras/toda série; pular feriado; reagendar e navegar entre origem/reposição.
- Grava plano e conteúdo estudado em campos distintos; aluno confirma presença; professor registra a dele; divergência permanece visível.
- Docente tenta acessar aluno sem vínculo, vínculo revogado, convite vencido/reutilizado; acesso negado sem side-channel de busca.
- Filtros, URL/deep link, estados vazios, tema escuro, trocar 4 idiomas e fuso.
- Rede offline/intermitente, retry/idempotência, desktop, 320/375/768/1280 px, zoom 200%, teclado, NVDA/VoiceOver.

## Matriz de risco

| Área | Severidade | Verificação obrigatória |
|---|---:|---|
| Privacidade acadêmica/IDOR | Crítica | teste de permissão para cada leitura, escrita e exportação |
| Divergência de presença | Alta | autoria invariável, registro ausente separado de falta, versões preservadas |
| DST/recorrência | Alta | datas de transição, fold/gap, intervalo de série e exceção |
| Duplicidade/concorrência | Alta | chave idempotente e constraint única sob requests simultâneos |
| Erro de agenda/fuso | Alta | comparar tempo local escolhido, fuso armazenado e instante exibido |
| Acessibilidade | Alta | auditoria automatizada + teclado/leitor de tela manual |
| Backup/eliminação | Alta | exercício de restauração e verificação de políticas antes do lançamento |
| Custo/abuso de convites | Média | rate limiting, token one-time hash, expiração, logs sem token |

## Checklist de segurança

- Autenticar **e** autorizar em cada action/API; verificar papel, owner, vínculo aceito e recurso/escopo no servidor.
- Rejeitar mass assignment; parsear com Zod/limites; nomes do banco não derivados de identifiers de URL sem autorização.
- Consultas parametrizadas, FK/constraints, timeout/max pool, transações curtas e queries com projeção mínima.
- Session cookie seguro em produção, origins/CSRF, política de senha, verificação de e-mail e reset antes do público.
- Convite com token de entropia alta armazenado como hash, expirado e uma utilização; neutralizar enumeração.
- Redigir logs, alertas e analytics; não registrar notas, presença, e-mail, credencial, session cookie ou token.
- Limites de conteúdo/texto/anexos, rate limit, upload validado, CSP/headers e revisões de dependência.
- `differential-review` antes de auth, autorização, vínculo, exportação e migrations de dados pessoais. Uma skill disponível não é prova de revisão executada.

## Revisão de UX/design

Aplicar `web-design-guidelines` (fonte: [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)) em foco/labels, erros, headings, teclado, placeholder, locale de data, safe area, zoom, theme e reduced motion. Revalidar visualmente em viewport estreito e largo. Automatização não substitui tarefa com utilizadores.

## Critério de release

Release candidato precisa: build/CI verdes, migração ensaiada, backup/restore comprovado, matriz de autorização testada, review de dependências/segurança, a11y manual, domínio HTTPS, termos/privacidade, suporte e rollback. Nada é lançado para público apenas porque roda em localhost.

## Evidências desta rodada

Descrever comandos realmente executados, data e resultados em [`RELATORIO-FINAL.md`](../RELATORIO-FINAL.md); lacunas são marcadas como pendência e nunca convertidas em “passou”.
