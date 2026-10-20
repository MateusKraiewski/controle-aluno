# Progresso de entrega — Aula em Dia Web

Atualizado em 20/10/2026. O percentual mede o avanço dos marcos planeados para o produto, com pesos de escopo. Não significa que o produto esteja pronto para produção.

**Progresso ponderado: 63%.** Fórmula: soma de (peso da etapa × conclusão estimada da etapa).

[████████████████████](#product-and-architecture-20) [█████████████████████████████░░░░░░░░░░░](#student-planner-40) [███████████░░░░░░░░░](#teacher-collaboration-20) [░░░░░░░░░░](#learning-support-10) [████░░░░░░](#quality-and-release-10)

| Etapa | Peso | Conclusão | Contribuição |
|---|---:|---:|---:|
| Product and architecture | 20% | 100% | 20 p.p. |
| Student planner | 40% | 72% | 28,8 p.p. |
| Teacher collaboration | 20% | 55% | 11 p.p. |
| Learning support | 10% | 0% | 0 p.p. |
| Quality and release | 10% | 35% | 3,5 p.p. |
| **Total** | **100%** |  | **63,3% → 63%** |

## Product and architecture (20%)

**Concluído.** Visão do produto, modelo de domínio, arquitetura, design e fluxos estão documentados em PRODUCT.md e na pasta docs/.

**Falta:** rever estas decisões quando os fluxos de professor e aprendizagem forem implementados.

## Student planner (40%)

**Parcial (72%).** Há autenticação, dados de aula persistidos por utilizador, criação de séries semanais/quinzenais, registo de presença e conteúdo estudado separado do planeado, edição/cancelamento/reativação/exclusão de aulas com escopo (somente esta, esta e as próximas, toda a série), exceções de série, estado “cancelada” distinto de falta e aviso de conflito com confirmação explícita e reposição ligada à aula original.

**Falta:** dividir série em duas regras, feriados automáticos e “restaurar padrão” de exceção; timezone de perfil e política de DST; notas privadas, tarefas/materiais e exportação.

## Teacher collaboration (20%)

**Parcial (55%).** Convite por código de uso único (hash, 7 dias), aceite com escolha de matérias, revogação por qualquer parte, área do professor com as aulas consentidas, relato de presença do próprio professor, visão desse relato pelo aluno com marca de divergência e auditoria dos eventos do vínculo. Coberto por testes de integração de autorização (IDOR, código expirado/reutilizado/próprio, revogação).

**Falta:** resolução formal de divergência com revisões, disponibilidade/agenda própria do professor e conflito entre alunos, notificações, rate limiting dos convites, perfil/papel docente explícito e aulas em grupo.

## Learning support (10%)

**Por iniciar.** Não estão implementados objetivos de aprendizagem, materiais/tarefas ou acompanhamento do progresso por matéria.

## Quality and release (10%)

**Parcial (35%).** Existem verificações locais, documentação de qualidade, testes de integração PostgreSQL de isolamento entre contas e escopos de série (`npm run test:db`), revisão de código e de segurança do incremento de 20/10/2026 e verificação manual do fluxo no navegador local.

**Falta:** testes end-to-end e de autorização, revisão final de segurança, observabilidade e configuração de produção. Não há lançamento público de produção confirmado.

## Como atualizar

Atualizar os percentuais de cada etapa quando os critérios acima forem satisfeitos; recalcular a soma ponderada e manter as lacunas explícitas. A barra do README e esta página devem continuar a apresentar o mesmo total.
