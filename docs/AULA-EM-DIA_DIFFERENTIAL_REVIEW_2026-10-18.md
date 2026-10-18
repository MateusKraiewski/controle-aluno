# Revisão diferencial — Aula em Dia

**Base:** `6b95fb8` (`Add authentication, localization, and appearance settings`) → working tree desta rodada · **Data:** 18/10/2026 · **Escopo:** autenticação, leitura/escrita de aulas, autoria de presença, migrações e fronteiras de dados. **Recomendação:** CONDICIONAL — aceitar como base local em desenvolvimento; não abrir a rede nem publicar dados de alunos até fechar os gates abaixo.

## Resumo executivo

| Severidade | Achados |
|---|---:|
| Crítica | 0 |
| Alta | 0 |
| Média / release gate | 3 |
| Baixa | 0 |

Arquivos de lógica de alto risco focados: 4. Blast radius direto das actions: 1 chamada de UI por action (3 actions); leituras de aula passam por 1 repository e a página raiz. Não houve remoção de verificação de segurança no diff; `git blame` confirma que a configuração base de Better Auth já existia em `6b95fb8`. Esta revisão é análise estática: não é pentest, não prova cobertura de todos os caminhos nem substitui teste de integração/e2e.

## Controles que passaram na leitura

- [`lessons.ts`](../src/app/actions/lessons.ts#L18): cada action consulta sessão Better Auth. Mutação deriva `studentId` da sessão; não aceita owner do cliente.
- [`repository.ts`](../src/features/lessons/repository.ts#L6): leitura usa projeção mínima e filtra por estudante; updates filtram `lessonId` **e** `studentId`.
- Inputs validados por Zod: UUID, datas ISO, horários, limites de conteúdo e estado permitido; falhas da DB viram mensagens genéricas.
- Aula única e série criam matéria/aula dentro de transação; recorrência usa chave única por `series_id + lesson_date`; FK composta impede cruzar aluno/matéria/série.
- Migration `0005` atribui registos de presença legados ao aluno que os escreveu; novo estado guarda `attendance_recorded_by` e `attendance_recorded_at`.
- Preferências de browser guardam apenas idioma/tema; `.env.local` e `.local/` constam no ignore.

## Achados e gates

### [MÉDIO] Ausência de rate limit e cota nos comandos de gravação

**Local:** [`lessons.ts:23`](../src/app/actions/lessons.ts#L23), [`lessons.ts:32`](../src/app/actions/lessons.ts#L32), [`lessons.ts:43`](../src/app/actions/lessons.ts#L43) · **Cobertura:** não há teste de integração dessas actions.

Um utilizador autenticado pode enviar repetidamente dados válidos para criar séries de até 300 ocorrências cada. O owner check impede acesso cruzado, mas não impede crescer `lesson_series`, `lessons` e `subjects` até consumir DB/IO/backup se as actions ficarem públicas sem rate limit/cotas. Exploração exige uma conta; impacto plausível é indisponibilidade/custo no ambiente compartilhado.

**Gate de lançamento:** rate-limit por conta/IP, limite de criação/por período e tamanho/horizonte de séries; verificar autenticação de e-mail, monitorar consumo sem conteúdo pessoal e testar limite concorrente. Restrito ao loopback neste checkout.

### [MÉDIO] Política de identidade não está pronta para contas docentes

**Local:** [`auth.ts:16`](../src/lib/auth.ts#L16) · **Base:** Better Auth e-mail/senha sem fluxo de verificação/reset visível nesta versão. **Cobertura:** nenhuma integração de e-mail configurada.

O registro atual aceita identidades de e-mail não verificadas e não existe `profile.role`, convite ou relacionamento docente. Isso não permite a uma conta obter os registos de outra no código atual, mas é insuficiente para apresentar a conta como professor e enviar/aceitar convites de vínculo. Não reutilizar este cadastro como “professor verificado”.

**Gate:** verificar endereço e recuperação de conta, definir papel/contexto, convite expirá­vel de uso único e matriz de permissões antes da fase docente. Sem implementação de links, o caminho de exploração não alcança dados de outros estudantes hoje.

### [MÉDIO] O significado de “falta do professor” continua sendo um campo único

**Local:** [`lessons.ts:16`](../src/app/actions/lessons.ts#L16), [`repository.ts:28`](../src/features/lessons/repository.ts#L28), [`student-dashboard.tsx:20`](../src/components/student-dashboard.tsx#L20) · **Mitigação atual:** rótulo “Relatei falta do professor”, autoria/horário guardados e apenas perfil aluno disponível.

O estado legado `teacher_absent` é armazenado na mesma coluna de presença da aula. O UI deixa claro que é relato do aluno e o banco preserva autor; a modelagem não comporta ainda a resposta independente do professor nem divergência. Se a tela futura remover esse rótulo de relato ou reinterpretar a coluna como verdade confirmada, apagará a distinção da fonte.

**Gate:** antes de liberar colaboração, migrar para `ParticipantRecord` por participante, separar estado da aula de estado de participação, manter versões/autoria e testar cenários contraditórios. Não conceder escrita docente neste enum.

## Lacunas de teste/cobertura

- Passaram testes puros de agenda/recorrência (`7`); esses testes não exercitam ações, Better Auth, transações ou constraints PostgreSQL.
- Não foi criado utilizador E2E neste banco local; rotas `/`, `/entrar`, manifest e `get-session` responderam HTTP 200. Isso é smoke test, não confirmação de inscrição/gravação/autorização por navegador.
- Integração necessária: owner-A não lê/altera owner-B, ação anónima é recusada, rollback sujeito/aula, constraint de duplicata concurrent, autor da presença, migration/backfill legado.
- A renderização usa data civil/horário local; timezone de perfil e conversão completa de DST ainda não fechadas. Não prometer sincronização cross-zone até o gate de fuso.

## Ataque analisado e resultado

**Ator:** estudante autenticado. **Superfície:** Server Actions públicas de Next. **Tentativa:** enviar `lessonId` de outro estudante a `updateAttendance`/`updateStudyRecord` ou `studentId` inventado ao criar. **Resultado no código revisado:** ID e status são parseados; a sessão define `studentId`; ambos updates filtram `id + studentId`. Nenhum sucesso nem conteúdo do outro owner é retornado. **Confiança:** média; reforçar com integração HTTP/DB e revisar rate limit/CSRF na preparação de hospedagem.

## Fontes e método

Triagem focused de codebase médio, leitura de baseline no commit `6b95fb8`, `git blame` da auth existente, leitura do diff atual, callers, repository e schema/migrations. Ferramentas de verificação executadas: `npm run lint`, `npm run lint:typed`, `npm run lint:rules`, `npm run typecheck`, `npm test`, `npm run build`, `npm run db:migrate`; resultados ficam no [`relatório da rodada`](../RELATORIO-FINAL.md). Não houve revisão adversarial independente ou pentest. Skills de auditoria são auxiliares, não certificação.
