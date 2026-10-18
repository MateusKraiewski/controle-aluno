# Qualidade

## Comandos atuais

- `npm run lint`: ESLint com presets Next/TypeScript e regras locais.
- `npm run lint:typed`: verifica promises sem tratamento e callbacks assíncronos problemáticos.
- `npm run lint:rules`: verifica que as regras locais carregam e atendem seus casos de contrato.
- `npm run typecheck`: gera tipos de rotas Next e executa TypeScript.
- `npm run build`: build de produção sem conexão ao banco.
- `npm test`: executa Vitest; ainda não há testes de produto.

Nenhum desses checks foi executado neste setup. O servidor de desenvolvimento será iniciado para a prévia solicitada.

## Estratégia

A validação por tipos e lint acompanha cada mudança de interface. Ao começar lógica de domínio, verificar regras de presença, datas/fusos horários e isolamento de dados com testes focados; testes de navegador entram quando os fluxos forem persistentes. Não declarar cobertura antes de criar e executar os checks.

## Segurança

A revisão reutilizável está em `E:\vibe-coding-toolkit\docs\prompts\13-security-review.md` (revisão estática e limites de escopo). Para diffs sensíveis, usar a skill local `differential-review`, definindo intervalo e relatório privado. Nenhuma revisão de segurança foi executada nesta configuração inicial.

Antes de persistir dados pessoais: autenticação, autorização em cada acesso, isolamento por aluno, validação server-side, logs sem conteúdo pessoal e revisão de caminhos de exportação/eliminação.

## Revisões

Usar `web-design-guidelines` ao revisar interface e `writing-guidelines` ao revisar prosa. Skills instaladas não significam que uma revisão foi executada. A presença do skill `next-dev-loop` também não prova preflight compatível, agente-browser ou endpoint MCP.

## Dependências e entrega

Rodar auditoria de dependências quando o MVP tiver superfície funcional. Build ou lint verdes não provam integração remota, segurança completa nem ausência de vulnerabilidades.
