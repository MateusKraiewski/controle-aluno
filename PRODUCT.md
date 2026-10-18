# Aula em Dia — visão e escopo do produto

**Estado:** descoberta e arquitetura do produto em andamento. **Nome:** provisório. **Plataforma de entrada:** web app responsivo e instalável; PWA evita a exigência de App Store e preserva acesso em desktop.

## Visão

Ser o lugar confiável onde aluno e professor entendem a trajetória de cada aula: o que foi combinado, o que aconteceu, o que cada pessoa registrou e qual é o próximo passo. O produto organiza a rotina sem transformar imprevistos em culpados nem esconder divergências de presença.

## Problema e oportunidade

Alunos conciliam várias matérias, professores, locais e horários no mesmo dia. Uma agenda comum não conecta uma ocorrência com seu conteúdo, frequência, remarcação e histórico. Professores, por outro lado, precisam organizar várias turmas/alunos sem ver informações que não lhes pertencem. O diferencial proposto é um **registro compartilhado por aula com autoria e confirmação separadas**, ligado à matéria e à série de horários.

## Públicos e necessidades

| Perfil | Necessidade central | Resultado esperado |
|---|---|---|
| Aluno | Enxergar a rotina semanal e guardar como cada matéria progride | Saber quando/onde é a próxima aula e recuperar rapidamente o que estudou |
| Professor particular | Gerir agenda de alunos e registrar a própria visão da aula | Menos conflito de horários e um histórico útil por aluno/matéria |
| Aluno e professor vinculados | Compartilhar somente aulas escolhidas, mantendo autoria individual | Cada parte confirma presença e conteúdo sem sobrescrever a outra |
| Responsável (futuro, opcional) | Acompanhar aluno menor mediante consentimento e limites explícitos | Visibilidade restrita, auditável e adequada à idade |

Um utilizador poderá ter papéis distintos por contexto no futuro (ex.: estudar uma disciplina e ensinar outra). O primeiro cadastro deve escolher contexto principal; o domínio não deve impedir papéis múltiplos.

## Princípios do produto

1. **Um dia comporta muitas aulas.** A agenda lida com qualquer número de matérias, aulas consecutivas, intervalos e aulas em locais/fusos diferentes.
2. **Aula planejada não é aula confirmada.** Planejamento, realização, presença e conteúdo efetivamente estudado são dados distintos.
3. **Cada pessoa fala por si.** Registro do aluno e registro do professor preservam autoria e horário. Divergências ficam visíveis e são conciliadas explicitamente, nunca apagadas por uma atualização silenciosa.
4. **A recorrência deve ser previsível.** Alterar uma série pergunta se vale para esta aula, esta e as próximas, ou todas; exceções e cancelamentos deixam rastros claros.
5. **Privacidade por padrão.** Professor vê os dados de um aluno só depois de vínculo aceito, e somente no escopo concedido. Convite não revela e-mail nem agenda antes da aceitação.
6. **O produto explica seus estados.** Rótulo, texto e ícone acompanham cor; cada lista diferencia agendado, aguardando confirmação, confirmado, alterado e cancelado.
7. **A ferramenta ajuda o estudo.** O histórico pode relacionar conteúdos, objetivos, materiais e revisão; sugestões nunca se passam por fatos nem avaliações oficiais.

## Proposta de valor e diferenciais

- Agenda consolidada por dia/semana com agrupamento por horário, matéria, professor, local e fuso; detecção de sobreposição antes de salvar.
- Série semanal/quinzenal com férias e exceções, sem criar duplicatas ao editar ocorrências.
- Diário da aula com plano, conteúdo realizado, notas privadas e materiais, claramente separados por autoria/visibilidade.
- Confirmação independente de frequência. “Aluno faltou” e “professor faltou” são resultados derivados das marcações das partes, e não campos que qualquer pessoa possa declarar em nome da outra.
- Fluxo de reposição que preserva a aula original, cria nova ocorrência e conecta ambas no histórico.
- Linha do tempo e progresso por matéria; tendências de aulas ocorridas, faltas, conteúdo e objetivos estudados sem score opaco.
- Experiência PWA mobile first, acessível, quatro idiomas e tema claro/escuro.

## Escopo de produto

### Fundação — em curso

Autenticação segura, conta de aluno, matérias, agenda semanal, aulas avulsas, histórico, presenças distintas, idiomas, temas, privacidade da sessão, base PostgreSQL, documentação de produto/arquitetura/UX/QA e prévia local.

### Aluno — primeira entrega completa

- Matérias com cor/ícone, objetivo e arquivamento; várias aulas no mesmo dia.
- Aula avulsa e séries semanais/quinzenais com múltiplos dias e fuso selecionado; edição granular, feriados e exceções completam a recorrência.
- Local/link opcional, duração, professor livre/associado, lembrete e conteúdo previsto.
- Regras de conflito com aviso explícito, permitindo salvar exceção conscientemente.
- Ações de mover, cancelar com motivo, repor, duplicar e aplicar mudanças a uma ou mais ocorrências.
- Registro pós-aula: conteúdo realmente abordado, notas pessoais, tarefa/próxima revisão e anexos/metadados de material.
- Histórico filtrável, busca, exportação e revisão periódica opcional.
- Estados vazios, carregamento, falha de rede, confirmação de exclusão e recuperação de erro.

### Professor e colaboração — fase seguinte

- Conta/perfil docente, convite revogável com expiração, pedido aceito pelo aluno e encerramento de vínculo.
- Agenda docente por turma/aluno; prevenção de dupla marcação; gestão de disponibilidade e indisponibilidade.
- Compartilhamento por matéria/aula, painel do aluno vinculado, confirmação independente e reconciliação.
- Trilha de auditoria e notificações configuráveis. Não há acesso retroativo implícito nem mensagens/cobranças obrigatórias.

### Acompanhamento do aprendizado — diferencial evolutivo

- Objetivos/habilidades por matéria, associáveis a uma aula e atualizáveis ao longo do tempo.
- Visão da trajetória: aulas, conteúdos, objetivos ainda a rever, faltas e reposições.
- Recomendações explicáveis: “há 3 semanas sem rever X”, com opção de dispensar; nunca inferir desempenho, diagnóstico ou nota.
- IA é opcional e tardia: só sugerir rascunhos com consentimento, fonte identificável e confirmação humana. Dados de estudantes não vão para terceiros sem decisão explícita.

### Fora do lançamento inicial

Videochamadas, marketplace, pagamento, chat livre, gravação da aula, classificação automática de professores, ranking/score de aluno, inferência de presença por localização, sincronização bidirecional com calendário externo e app nativo de loja. Cada um requer decisão própria de segurança, custo e política.

## Metas e sinais de sucesso

Instrumentar eventos sem conteúdo escolar pessoal. Linha de base e metas numéricas ficam para uma etapa com utilizadores reais; não inventar volume nem prometer melhoria não medida.

- **Ativação:** conta criada → primeira matéria → primeira aula (avulsa ou série) → retorno para registrar o que ocorreu.
- **Confiabilidade:** divergências reportadas, duplicatas recorrentes, tentativas de conflito e falhas de gravação.
- **Valor de aprendizagem:** registros de conteúdo/revisão por matéria e retorno ao histórico.
- **Professor:** convites aceitos, confirmação em ambos os lados, reposições concluídas e carga de agenda.
- **Qualidade:** conclusão dos fluxos em mobile, teclado/leitor de tela, erros por ação, latência e crash-free sessions.

Não usar retenção ou tempo de tela como substituto de progresso educacional.

## Perguntas de política (não bloquear a estrutura)

São decisões que precisam de validação de produto/uso real antes de implementar automação: quem pode confirmar a aula realizada; diferença entre aula cancelada e ausência; como uma divergência é encerrada; aviso e prazo antes de remover vínculo; idade mínima/consentimento; retenção/eliminação e exportação; quais notificações são padrão. O modelo preservará os dois relatos e permitirá configurar as regras depois. Até lá, nenhuma pessoa pode registrar a ausência da outra como fato confirmado.

## Critérios de aceite de produto

- O calendário suporta múltiplas aulas no mesmo dia, distingue intervalos e alerta conflitos sem perder a possibilidade de exceção explícita.
- Recorrências produzem ocorrências sem duplicatas; edição/cancelamento explica o alcance e mantém histórico de exceções.
- O aluno registra plano, conteúdo realizado, presença própria e presença do professor como informação atribuída à fonte correta.
- A colaboração só começa após aceite; cada papel vê somente alunos/aulas autorizados, e a divergência nunca some silenciosamente.
- Uma reposição liga a nova data à original e mantém ambas no histórico.
- Idioma, fuso e calendário respeitam preferências de conta/dispositivo; PWA funciona por HTTPS no Safari iOS e em navegadores suportados.
- Navegação e formulários essenciais funcionam com teclado, leitor de tela, zoom e telas estreitas; erro e vazio têm próxima ação clara.
- Dados escolares não aparecem em logs; toda leitura e mutação sensível valida sessão, papel, vínculo e escopo no servidor.

## Referências canônicas

- Roadmap e gates: [`docs/roadmap.md`](docs/roadmap.md).
- Fluxos/estados e conteúdo: [`docs/ux-flows.md`](docs/ux-flows.md).
- Modelo de domínio e decisões: [`docs/architecture.md`](docs/architecture.md), [`docs/domain-model.md`](docs/domain-model.md).
- Plano de qualidade: [`docs/quality.md`](docs/quality.md).
