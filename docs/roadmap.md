# Roadmap e plano de entrega

Este é o plano de produto (não uma estimativa em datas). Cada fase tem um gate verificável; a seguinte não deve depender de interpretação de presença feita em segredo.

**Estado agora:** base (auth, leitura/gravação autenticada, notas e autoria) + cadastro avulso e séries semanais/quinzenais com dias selecionados, timezone e criação transacional de ocorrências. **Em aberto para fechar o Planner:** conflito e exceção explícitos, edição por escopo, cancelar/repor, timezone de perfil, tarefas/materiais, testes de integração/e2e e critérios de deploy.

## Fase 0 — Base confiável (agora)

**Objetivo:** mover de protótipo para uma base de produto revisável.

- Contratos de domínio, fluxos aluno/professor, privacidade e política de estados documentados.
- Módulos isolados por feature, PostgreSQL/Drizzle, autenticação, validação server-side, migrações repetíveis e tratamento de falhas.
- Linguagem de interface pt-BR/pt-PT/en/es, tema claro/escuro, instalabilidade PWA, tokens/estados acessíveis.
- Banco de desenvolvimento isolado e segredos não versionados; lint, tipos, testes unitários de regras e build.

**Gate:** repetir instalação/migrações em banco vazio, autenticar, salvar/ler usuário próprio e confirmar ausência de vazamento entre usuários; checks verdes.

## Fase 1 — Planner do aluno

- Perfil e fuso, matérias, calendário dia/semana, várias aulas por dia e criação/edição/exclusão.
- Completar as séries semanais/quinzenais: exceções, feriados, alteração desta/próximas/todas e detecção de colisão (a criação e materialização inicial já existem).
- Plano de aula; diário com conteúdo ocorrido, notas privadas, anexos via storage ainda a escolher.
- Estados de presença independentes, motivo/nota, filtros, linha do tempo e reposição ligada à origem.
- Offline leve somente para leitura ou rascunho explicitamente sinalizado; nunca falsa confirmação de gravação.

**Gate:** jornada completa de uma série, exceção por feriado, duas aulas no mesmo dia, falta e reposição testadas em fuso local/DST e teclado/mobile.

## Fase 2 — Conta e espaço do professor

- Papel/perfil docente e onboarding distintos; disponibilidade e bloqueio de horário.
- Solicitação de vínculo com token aleatório de uso único, validade, aceite explícito, revogação, escopos e auditoria.
- Listas e calendário do professor, aulas com múltiplos alunos (decidir aula individual/grupo), conflito de agenda.
- Relatos assinados por cada parte; estado “a confirmar”, divergência e solução, sem apagar versão anterior.

**Gate:** matriz de autorização aluno↔docente, tentativa de acessar outro aluno (IDOR), convite expirado/reutilizado, revogação, mudança de papel e divergência cobertos por testes.

## Fase 3 — Aprendizado acompanhado

- Objetivos/habilidades por matéria e por aula, revisão futura e materiais.
- Histórico pesquisável e exportável, visão de evolução transparente e configurações de retenção.
- Sugestão explicável e desligável (primeiro regras locais simples; IA só após revisão de privacidade, custo e consentimento).

**Gate:** todas as métricas mostram origem, período e limitações; sem score oculto ou inferência de competência.

## Fase 4 — Lançamento e extensões

- Ambiente hospedado gerenciado com TLS, backups testados, migrações coordenadas, monitoramento sem payload pessoal, restauração e incident response.
- Notificações transacionais/configuráveis; ICS de saída, só depois avaliar sincronização de escrita.
- Revisão de acessibilidade por teclado/leitor de tela, navegadores, iOS PWA, Android Chrome e desktop; política de privacidade/termos e fluxo de eliminação.
- Decidir app nativo/loja com dados de uso e necessidade de capacidades realmente indisponíveis na PWA.

## Dependências e riscos de caminho crítico

1. Política de presença/autoria precede o compartilhamento professor-aluno.
2. Regras de recorrência e fusos precedem materialização de várias ocorrências.
3. Vínculos e permissões precedem painel docente e notificações que revelem atividade.
4. Storage e política de retenção precedem anexos, exportação completa e exclusão de conta.
5. Escolha de hospedagem e domínio HTTPS precede PWA instalável fora do computador local.

## Risco e mitigação

| Risco | Mitigação no desenho | Gate de validação |
|---|---|---|
| Registros contraditórios aluno/professor | relatos independentes, autoria e histórico append-only | testes de conflito e UI mostra os dois |
| Recorrência cria ou perde aulas | série + ocorrências + exceções estáveis | testes DST/edição por escopo/idempotência |
| Horário muda entre dispositivos | timezone IANA por perfil/série; datas civis preservadas | testes de mudança de fuso e horário de verão |
| Professor vê dados a mais | consentimento, RLS/políticas da aplicação e autorização por query | matriz de acesso e testes de IDOR |
| Abandono por configuração inicial | onboarding curto, calendário vazio com ação de uma etapa, demo separada | observação de tarefa com aluno real |
| PWA parece app mas não instala | HTTPS, manifest/icons, Safari e instruções no produto | teste físico em iOS suportado |
| Escopo cresce sem aprendizagem | fases com gates e feedback antes de avançar | review de roadmap a cada fase |

## Gestão do trabalho (PMO leve)

Cada item no backlog deve declarar: problema/persona, resultado observável, fronteira de dados, critérios de aceite, casos negativos, dependência, métrica de sucesso e plano de reversão/migração. Agrupar entregas por fluxo de ponta a ponta; manter ADR para decisões caras de reverter; registrar estado real em `RELATORIO-FINAL.md` sem confundir plano com funcionalidade pronta.
