# Design system e acessibilidade

## Intenção visual

Aula em Dia comunica organização e progresso sem aparência escolar infantil. A base atual usa marfim e verde profundo, contraste de acentos suaves, títulos serifados para marca/ênfase e sans-serif legível para dados. Estados de presença preservam texto e ícone; a cor é reforço e nunca significado exclusivo.

## Hierarquia da agenda

1. data/dia e sequência cronológica;
2. matéria como âncora visual reconhecível;
3. início–fim, duração e intervalo;
4. professor/local e estado de confirmação;
5. ação contextual (abrir/editar/registrar conteúdo).

Múltiplas aulas são cartões independentes agrupados pela data. Em dia concorrido, preferir lista cronológica a reduzir largura do texto. A grade semanal tem uma alternativa acessível de lista; conflito de horário mostra ambos os cartões e ação, não sobrepõe o texto.

## Tokens e temas

- `globals.css` é fonte de tokens para superfícies, texto, linhas, cores de destaque e dark theme.
- Tema escuro deriva os tokens sem inverter imagens/logos e define `color-scheme: dark`; meta theme-color acompanha a superfície atual.
- Idioma usa tag `lang` na raiz e `Intl` para data/hora/número. `locales.ts` concentra strings; não codificar timezone/datas em texto.
- Preferências locais permitidas: idioma e aparência, chave com versão e parsing defensivo. Perfil no servidor passa a ser preferência oficial quando implementado.

## Componentes e comportamento

- Navegação de desktop e mobile compartilha o mesmo contrato e item ativo sem duplicar significado.
- `LessonRow` identifica estado e autor; ao registrar conteúdo, distingue plano de estudo e conteúdo ocorrido.
- Diálogo/modal pode abrir por botão, fecha com Escape, contém foco e o devolve ao acionador; fundo não assume clique como única forma de sair.
- Botões de ícone têm nome acessível; marca gráfica e ícones decorativos levam `aria-hidden`.
- Estados de sucesso/erro são anunciados por `role=status`/live region; o foco não some em atualizações.
- Data, hora e matéria não se inferem só da cor, posição ou abreviação.

## Requisitos manuais de acessibilidade

- WCAG 2.2 AA como objetivo de trabalho (validar contraste e tamanho mínimo de alvo quando o design final estabilizar).
- landmarks/headings em ordem, link “Pular para conteúdo”, labels persistentes e foco visível.
- teclado: abrir/navegar/fechar diálogo, alternar abas sem ARIA incorreto, alterar filtros, passar por dia/lista e salvar conteúdo.
- tela estreita 320 CSS px, zoom 200%, safe-area do iPhone, orientação portrait/landscape, teclado virtual.
- leitor de tela: nome do assunto + data + hora + estado e fonte do relato; mensagem de gravação clara.
- reduced motion, modo de alto contraste/forçado, idioma longo (pt-PT/en/es) e textos grandes.

## Diretrizes de conteúdo

- “Aula agendada”, “Aula realizada”, “Ainda não registada”, “Falta relatada” e “Cancelada” nunca compartilham o mesmo conceito.
- O texto do status diz quem registra e sobre quem fala; uma falta relatada pelo aluno não se converte em confirmação do professor.
- Ação descreve resultado (“Guardar aula”, “Registar presença”, “Repor aula”), erro oferece correção, e placeholder contém exemplo sem substituir label.
- A métrica do histórico não soma aula cancelada/falta como aula assistida.

## Revisão

Checklist atualizado em `docs/quality.md`. Componentes/rotas concretos ficam no mapa em `docs/architecture.md`; fluxos em `docs/ux-flows.md`.
