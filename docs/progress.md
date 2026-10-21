# Progresso de entrega — Aula em Dia Web

Atualizado em 20/10/2026. O percentual mede o avanço dos marcos planeados para o produto, com pesos de escopo. Não significa que o produto esteja pronto para produção.

**Progresso ponderado: 80%.** Fórmula: soma de (peso da etapa × conclusão estimada da etapa).

[████████████████████](#product-and-architecture-20) [██████████████████████████████████░░░░░░](#student-planner-40) [██████████████░░░░░░](#teacher-collaboration-20) [███████░░░](#learning-support-10) [█████░░░░░](#quality-and-release-10)

| Etapa | Peso | Conclusão | Contribuição |
|---|---:|---:|---:|
| Product and architecture | 20% | 100% | 20 p.p. |
| Student planner | 40% | 86% | 34,4 p.p. |
| Teacher collaboration | 20% | 70% | 14 p.p. |
| Learning support | 10% | 70% | 7 p.p. |
| Quality and release | 10% | 50% | 5 p.p. |
| **Total** | **100%** |  | **80,4% → 80%** |

## Product and architecture (20%)

**Concluído.** Visão do produto, modelo de domínio, arquitetura, design e fluxos estão documentados em PRODUCT.md e na pasta docs/.

**Falta:** rever estas decisões quando os fluxos de professor e aprendizagem forem implementados.

## Student planner (40%)

**Parcial (86%).** Há autenticação, dados de aula persistidos por utilizador, criação de séries semanais/quinzenais, registo de presença e conteúdo estudado separado do planeado, edição/cancelamento/reativação/exclusão de aulas com escopo (somente esta, esta e as próximas, toda a série), exceções de série, estado “cancelada” distinto de falta e aviso de conflito com confirmação explícita, reposição ligada à aula original, feriados e pausas com prévia de impacto, nota privada e próximo passo por aula e fuso horário do perfil.

**Falta:** feriados automáticos por calendário oficial; política explícita de DST; tarefas com prazo e materiais/anexos.

## Teacher collaboration (20%)

**Parcial (70%).** Inclui resolução formal de divergência por proposta e aceite, com os relatos originais preservados. Convite por código de uso único (hash, 7 dias), aceite com escolha de matérias, revogação por qualquer parte, área do professor com as aulas consentidas, relato de presença do próprio professor, visão desse relato pelo aluno com marca de divergência e auditoria dos eventos do vínculo. Coberto por testes de integração de autorização (IDOR, código expirado/reutilizado/próprio, revogação).

**Falta:** disponibilidade/agenda própria do professor e conflito entre alunos, notificações, perfil/papel docente explícito e aulas em grupo.

## Learning support (10%)

**Parcial (70%).** Inclui anexos privados por aula (PDF, imagem, texto). Objetivos por matéria com estado, ligação às aulas em que foram trabalhados, sugestões de revisão explicáveis e dispensáveis (sem notas nem scores) e exportação CSV do histórico.

**Falta:** adaptador de armazenamento S3 para hospedagem sem disco, tarefas com prazo, visão de evolução por período e sugestões assistidas (só com consentimento).

## Quality and release (10%)

**Parcial (50%).** Guia de deploy pronto em `docs/deploy.md`. Limite de tentativas no login, cadastro e convites (PostgreSQL), 25 testes (`npm run test:db`) e revisões de código/segurança por incremento. Existem verificações locais, documentação de qualidade, testes de integração PostgreSQL de isolamento entre contas e escopos de série (`npm run test:db`), revisão de código e de segurança do incremento de 20/10/2026 e verificação manual do fluxo no navegador local.

**Falta:** testes end-to-end e de autorização, revisão final de segurança, observabilidade e configuração de produção. Não há lançamento público de produção confirmado.

## Como atualizar

Atualizar os percentuais de cada etapa quando os critérios acima forem satisfeitos; recalcular a soma ponderada e manter as lacunas explícitas. A barra do README e esta página devem continuar a apresentar o mesmo total.
