# Design e acessibilidade

## Direção

Aluno como usuário inicial; interface em português, mobile first, leve e acolhedora, com leitura rápida da próxima aula e histórico. O nome “Aula em Dia” é provisório.

## Sistema existente

Tailwind CSS 4 e tokens em `src/app/globals.css`. A primeira tela usa fundo marfim, verde escuro, acentos suaves e tipografia de sistema/serifada. Não há biblioteca UI escolhida.

## Interação

Use HTML semântico, navegação por teclado, foco visível, contraste suficiente e rótulos acessíveis. Estados vazios, carregamento, validação e erros devem ser claros. Respeite `prefers-reduced-motion`. Datas e faltas devem usar texto/ícones além de cor.

## Layout e revisão

A tela usa navegação lateral em desktop e navegação inferior em celular; a agenda se ajusta para duas colunas em telas estreitas. A revisão de interface usa `web-design-guidelines`; animações respeitam movimento reduzido.

## Manutenção

Tokens e componentes devem ter uma única fonte de verdade no código. Atualize a direção visual se os padrões mudarem.
