# Fluxos UX e estados

Esta é a especificação de interação. Antes de cada fluxo acompanhar APIs finais, revisar as palavras de falta/cancelamento com pessoas que usam aulas particulares.

## Navegação proposta

- **Hoje:** próximas aulas, conflitos/alterações, ações rápidas, aulas a confirmar.
- **Agenda:** dia, semana e lista; filtros por matéria/docente; faixa horária com altura proporcional; botão “Ir para hoje”.
- **Matérias:** resumo de ocorrências, objetivos, notas e próximos horários.
- **Histórico:** linha do tempo com busca/filtros por matéria, pessoa, período, presença e série; origem da anotação visível.
- **Pessoas:** vínculos e convites com escopos (quando houver colaboração).
- **Perfil:** idiomas, tema, fuso, acessibilidade, privacidade e conta.

No celular: navegação inferior para as quatro áreas frequentes e “Mais” para perfil/pessoas; botão de ação contextual com rótulo acessível. No desktop: lateral recolhível, conteúdo central e painel lateral opcional de detalhes. Layout de lista disponível para quem não usa uma grade de horários.

## Jornada A — primeira configuração do aluno

1. Criar conta; confirmar e-mail quando essa entrega for ativada.
2. Escolher idioma/fuso detectado e confirmar calendário; permitir trocar depois.
3. Criar uma matéria e escolher uma cor com nome (não depender só da cor).
4. Adicionar aula avulsa ou recorrente; pré-visualizar datas próximas e conflitos.
5. Encerrar com visão “Hoje” e alternativa de dados demonstrativos claramente marcados.

**Evitar:** formulário inicial extenso, importação compulsória, prometer sincronização inexistente ou usar notificações sem escolha.

## Jornada B — várias matérias no mesmo dia

Dia mostra todos os blocos em ordem cronológica, intervalo/duração, matéria, docente/local e status. Aulas sobrepostas não colapsam: apresentam lado a lado na grade e em sequência com alerta na lista. O aviso identifica o conflito e oferece editar, manter excepcionalmente ou cancelar. Usuário continua podendo salvar uma exceção, com confirmação explícita.

Datas no calendário são datas civis; o horário pertence a um fuso IANA explícito. Travessia de horário de verão não muda a aula silenciosamente; ocorrências já geradas conservam seu instante, séries futuras seguem a regra documentada.

## Jornada C — rotina recorrente

No formulário, alternar “Uma vez”/“Repetir”; cadência semanal/quinzenal, dia(s), início, fim, data final ou número limite. Mostrar resumo legível (“toda terça e quinta, de 4 mai a 30 jun, fuso Lisboa”) e amostra de ocorrências. Ao editar, selecionar **apenas esta**, **esta e futuras**, **toda a série**; fora do alcance, editar cria uma exceção. Cancelamento de uma aula não cancela a série.

Exceções têm etiqueta “alteração nesta data” e ação para restaurar padrão. Alterar regra preserva o que ocorreu e o que já foi confirmado; relatório de impacto antes de afetar marcações.

## Jornada D — registrar o que aconteceu

Após a aula, abrir cartão ou notificação opcional: registrar status próprio, conteúdo realmente estudado, nota privada e próximo passo. O status da outra parte permanece “não informado” até que ela registre. Confirmação não é imediata de ausência alheia.

Se registros divergirem, mostrar duas colunas/cartões (“Você registrou” e “Professor registrou”), com autor e hora. Estado “divergência” permanece até solução acordada ou política futura. A ação de resolver solicita um novo resultado e preserva os relatos originais.

## Jornada E — reagendar e repor

Indicar ocorrência original, escolher nova data/hora e motivo; checar conflitos; decidir se mantém aula original como cancelada ou muda série futura. Tela de confirmação mostra a relação de reposição. No histórico, navegar de origem ↔ reposição; contagem não duplica aulas concluídas.

## Jornada F — compartilhar com professor

Aluno inicia por endereço/código de convite do docente ou docente envia pedido sem revelar a agenda. O aluno vê nome verificado, escopo solicitado e botão aceitar/recusar; o vínculo lista matérias/aulas compartilhadas e prazo. Revogar é disponível e explica o que deixa de ser compartilhado. Convite é opaco, de uso único e expira; jamais usar o e-mail como identificador público.

## Vocabulário e taxonomia de estado

| Conceito interno | Texto de interface inicial | Observação |
|---|---|---|
| occurrence planned | Agendada | Não implica confirmação da aula |
| lesson completed | Realizada | Execução da aula, não presença automática |
| attendance missing | Ainda não registada | Indica qual participante falta registrar |
| present | Compareceu | Registrar separadamente por participante |
| absent | Não compareceu | Só sobre quem criou o próprio relato |
| excused | Falta justificada | Se política/observação for adotada |
| cancelled | Cancelada | Motivo e autor visíveis; não é ausência |
| rescheduled | Reposta | Tem ligação com ocorrência original |
| disagreement | Registos diferentes | Preservar fontes e solicitar resolução |

Traduções devem manter distinção entre “não registrada”, “cancelada” e “faltou”. Cor, som ou posição nunca são o único indicador.

## Estados de interface por página

Toda tela deve ter: carregamento previsível, vazio com uma ação, sucesso com confirmação, erro de rede com retry sem duplicar ação, permissão negada explicada sem revelar dado, validação junto ao campo, teclado/foco após dialog, e atualização otimista apenas quando reversível. Em salvar ocorrência recorrente, usar idempotência para double-click/retry.

## Acessibilidade e mobile

- Alvos de toque adequados (preferência WCAG 2.2 AA), foco visível, ordem DOM = ordem visual, headings e landmarks.
- Inputs com label persistente, mensagens ligadas via `aria-describedby`, resumo de erros focado; não limpar valores válidos.
- Grade possui alternativa de lista e pode ser percorrida por teclado; status usa texto, ícone e cor.
- Zoom 200%, largura de 320 px, safe areas iOS, modo standalone e `prefers-reduced-motion`.
- Datas/horas via locale e fuso escolhido; formatos de 12/24h seguem plataforma/conta.
- Confirmação de exclusão/saída de vínculo; “desfazer” para edição local segura.

## Pesquisa UX planejada

Testar com alunos e professores com múltiplas disciplinas, intervalos curtos, aulas online/presenciais e faltas/reagendamentos recentes. Pedir que organizem uma semana real, registrem uma aula e encontrem o que foi estudado um mês atrás. Medir acerto de interpretação, tempo/tarefas, erros de conflito e capacidade de explicar quem registrou cada estado. Não usar dados pessoais reais sem consentimento explícito.
