# Modelo de domínio

O schema SQL deve representar conceitos com identidade própria e preservar a fonte de cada registro. Este documento é o contrato alvo; as tabelas marcadas **proposta** ainda precisam virar migrations e endpoints antes de serem anunciadas como funcionais.

## Entidades e propriedade

| Entidade | Dono/escopo | Conteúdo e invariantes |
|---|---|---|
| Account (Better Auth) | Identidade | E-mail, senha protegida, sessões; não contém dados escolares de terceiros |
| Profile (proposta) | Uma conta | Nome de apresentação, papéis/contexto, timezone IANA, locale, preferência de calendário |
| Subject | Estudante | Nome, cor, descrição/objetivo, estado ativo/arquivado; nome pode repetir entre alunos |
| TeacherAvailability (proposta) | Professor | Intervalo indisponível/disponível, timezone, origem e validade |
| TeacherStudentLink (proposta) | Duas contas | pending/accepted/revoked/expired, scopes consentidos, solicitado/aceito/revogado em, token hash e expiração |
| LessonSeries | Estudante + matéria | Regra semanal/quinzenal limitada, horário local, timezone IANA, janela e dias; criação grava ocorrências numa transação |
| LessonOccurrence | Uma ocorrência real | Data civil, início/fim, FK opcional da série, conteúdo planeado e presença simplificada |
| ParticipantRecord (proposta) | Participante + ocorrência | Relato independente por aluno/docente: presente, ausente, justificado/não informado, autoria e data/hora; correção cria nova revisão |
| StudyEntry (proposta) | Autor + ocorrência | Conteúdo realizado, nota, visibilidade `private/shared`, editor e versões; separar rascunho do registro publicado |
| LearningObjective (proposta) | Matéria/aluno | Tópico/habilidade, origem, estado de revisão e ligação a aulas; sem inferência automática |
| LessonRelation (proposta) | Ocorrências relacionadas | reposição/substituição/cancelamento derivado; nunca apagar a origem |
| AuditEvent (proposta) | Escopo autorizado | eventos sensíveis sem payload escolar integral; ator, ação, entidade, momento e trace id |

## Modelo relacional resumido (alvo)

```mermaid
erDiagram
  USER ||--|| PROFILE : has
  USER ||--o{ SUBJECT : owns
  SUBJECT ||--o{ LESSON_SERIES : schedules
  SUBJECT ||--o{ LESSON_OCCURRENCE : categorizes
  LESSON_SERIES o|--o{ LESSON_OCCURRENCE : generates
  USER ||--o{ TEACHER_STUDENT_LINK : initiates_or_accepts
  USER ||--o{ PARTICIPANT_RECORD : authors
  LESSON_OCCURRENCE ||--o{ PARTICIPANT_RECORD : confirms
  LESSON_OCCURRENCE ||--o{ STUDY_ENTRY : documents
  USER ||--o{ STUDY_ENTRY : authors
  LESSON_OCCURRENCE o|--o{ LESSON_RELATION : connects_replacement
```

## Recorrência e horários

Armazenar a regra da série com biblioteca/parser RFC 5545 validado e versão explícita. Datas até um horizonte configurável viram ocorrências únicas (`series_id`, `original_local_date`, chave idempotente); janela mais distante pode ser calculada sem persistir. As regras suportam edição em escopo sem deslocar identificadores confirmados. Exceção move/cancela apenas uma ocorrência e conserva o horário originalmente gerado.

- `starts_at_local`/`ends_at_local` + `timezone` IANA expressam intenção da regra; `starts_at_utc`/`ends_at_utc` expressam o instante materializado.
- Aula avulsa também tem fuso explícito; não usar só `timestamp without time zone` como instante real.
- Fechar intervalo em `[início, fim)`; validação `fim > início`. Aulas imediatamente consecutivas não são overlap.
- Regras que caem no gap/fold de DST precisam de política explícita (pular/normalizar/perguntar), e evento já confirmado não muda automaticamente.
- Idempotência garante que reprocessar agenda/retentativa não cria duas ocorrências.

## Presença, autoria e histórico

Não armazenar um enum único com valores `student_absent` / `teacher_absent` como verdade compartilhada. São relatos individualizados: o aluno só registra sua presença; professor só registra a própria (admin de relação pode registrar nota, nunca em nome de outro). Ausência de relato não é ausência física. Uma apresentação consolidada é derivada dos dois registros, sem descartar a origem. Correção guarda autor, motivo e revisão anterior.

Separar **estado da aula** (planned/completed/cancelled/rescheduled) de **estado da participação** (unrecorded/present/absent/excused) e de **conteúdo estudado**. Isso evita contar aula cancelada como falta, contar presença sem a aula ocorrer e marcar tópico planejado como aprendido.

## Autorização e invariantes transacionais

- `student_id` e vínculo derivam da sessão, nunca do input do navegador.
- Toda query de objeto inclui owner/link/scope na cláusula (ID aleatório sozinho não é autorização).
- Professor só acessa vínculo aceito e scopes ativos; revogar invalida sessões de domínio relacionadas.
- Convites armazenam hash de token, têm validade e uso único; rate limit e resposta anti-enumeração.
- `lesson_occurrence` tem FK composta para matéria do mesmo estudante e FK para série dona; checks de intervalo e presença.
- `unique(series_id, original_local_date)` evita duplicata; índice `(student_id, starts_at_utc)` serve agenda; índice por participante/data atende professor; indexes cobrem FKs usados no join.
- Criar ocorrência e materializar vínculo da série em transação; conflitos podem usar advisory lock/unique constraint, com idempotency key no comando.
- Vínculo/escopo sensível é auditado; logs operacionais guardam code, trace id e latência, sem conteúdo de notas/e-mail/token.

## Modelo implementado hoje

`user`, `subjects(student_id, name, color)`, `lesson_series`, `lessons(student_id, subject_id, series_id, date, starts_at, ends_at, planned/studied_content, attendance, attendance_note, attendance_recorded_by/at)` e tabelas Better Auth; migrations `0000`–`0007`. Há criação de aulas avulsas e séries semanais/quinzenais, múltiplos dias por série, até 300 ocorrências, atomicidade, timezone da série e autoria/hora do estado aluno. `attendance_status` atual ainda não contém duas fontes independentes: no modo aluno, “Relatei falta do professor” é apenas auto-declaração do aluno, não confirmação oficial nem dado do professor. Vínculo de professor, exceção/edição por escopo, relatórios independentes e notas privadas continuam propostas. Não ampliar autoridade do professor sobre esse enum.

## Evolução de schema sem perda

Nova migration em fases: expandir para colunas/tabelas novas; backfill de `student_absent`/`teacher_absent` em relato com autor conhecido quando viável (caso contrário, autoria `legacy/unknown`); dual write/read; verificar contagens e FKs; trocar consultas; somente então marcar enum legado deprecado. Não converter estado legado para relato certificado do professor sem evidência. Nunca reescrever migrations já aplicadas.
