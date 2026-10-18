# Aula em Dia

> Nome de trabalho. App web responsivo, pensado primeiro para celular, para o aluno organizar aulas, matérias e presenças.

## Problema e objetivo

O aluno precisa lembrar quando teve aula e guardar o que estudou. Agenda, anotações e faltas podem ficar espalhadas; o produto reúne calendário e histórico por matéria e registra claramente quem faltou.

## Público e perfis

- **Aluno:** perfil inicial e foco do MVP; consulta a agenda e registra aulas e ocorrências.
- **Professor:** perfil previsto para fase posterior, com acompanhamento e confirmação de aulas.

## Fluxos da primeira versão

1. Ver próximas aulas em calendário.
2. Cadastrar ou ajustar aula com matéria, data, horário e conteúdo previsto.
3. Registrar o conteúdo estudado após a aula.
4. Marcar presença, falta do aluno ou falta do professor, com observação opcional.
5. Consultar histórico e filtrar por matéria.

## MVP

1. Agenda semanal utilizável no celular e desktop.
2. Cadastro de matérias e aulas recorrentes ou avulsas.
3. Registro do conteúdo estudado.
4. Ocorrência de presença/falta identificando quem faltou.
5. Histórico pesquisável por matéria e período.

## Fora do escopo inicial

- Perfil e painel de professor, convites e confirmação compartilhada.
- Pagamentos, cobranças, videochamadas e mensagens.
- Sincronização com calendários externos e notificações push.
- Publicação em lojas de aplicativos. A primeira entrega é web responsiva; a experiência nativa será avaliada depois.

## Requisitos

- Interface em português, mobile first, responsiva e acessível por teclado.
- Interface disponível em português do Brasil, português de Portugal, inglês e espanhol, com tema claro e escuro.
- Instalação como web app na Tela de Início do iOS sem publicação na App Store.
- Datas exibidas no fuso local; persistência deve evitar ambiguidades de fuso e recorrência.
- Dados de agenda e frequência são privados; não aparecem em logs nem em erros públicos.
- Uma falta indica explicitamente quem faltou; nunca inferir a parte ausente.

## Restrições e decisões técnicas

- Next.js App Router, TypeScript, Tailwind CSS e npm.
- PostgreSQL e Drizzle ORM; o schema inicial de matérias, aulas e presenças está versionado. O servidor local exige credenciais que ainda não estão configuradas no projeto.
- Better Auth está configurado para e-mail/senha, mas depende de variáveis locais e migrações ainda não aplicadas. A interface de aula segue demonstrativa até a autenticação e conexão ao banco serem ativadas.
- Nenhuma integração externa ou serviço pago faz parte do escopo atual.

## Hipóteses e pendências

- **Hipótese reversível:** “Aula em Dia” é o nome de trabalho.
- **Hipótese reversível:** começar como web app responsivo instalável, sem código nativo.
- **Pendente antes de dados reais:** configurar credenciais PostgreSQL, aplicar as migrações e concluir autorização nos fluxos de leitura e gravação.
- **Pendente para fase professor:** definir vínculo entre aluno e professor e como resolvem divergências de presença.
- **Pendente antes de persistir:** definir recorrência, cancelamento e remarcação a partir dos casos reais.

## Critérios de aceite do MVP

- O aluno vê a semana e distingue aulas futuras de aulas já registradas.
- Cada aula mostra matéria, data, horário e conteúdo estudado.
- Presença, falta do aluno e falta do professor são estados distintos no histórico.
- Histórico filtra por matéria e período sem perder anotações.
- Fluxos principais funcionam em telas estreitas, com foco visível e controles nomeados.
- Dados reais não ficam acessíveis sem autenticação e autorização no servidor.

## Entrega demonstrativa atual

A tela inicial do aluno apresenta agenda de 7 dias, próxima aula, matérias, histórico filtrável por texto, matéria e período, edição temporária do status e cadastro demonstrativo. A interface oferece quatro idiomas e tema claro/escuro. O manifesto PWA e metadados do iOS permitem adicionar à Tela de Início pelo Safari. Nenhum dado de aula é persistido ainda.

## Próxima entrega

Configurar credenciais de uma instância PostgreSQL, aplicar a migração e ligar os fluxos de leitura/gravação às sessões de aluno. O modelo contempla matérias, data/horário, conteúdo previsto/estudado e estados distintos de presença/falta. Recorrência segue pendente e não está modelada.

## Manutenção

Atualize este arquivo quando objetivo, escopo, restrições ou aceite mudarem. Decisões técnicas e evidências ficam em `docs/architecture.md` e `docs/setup.md`.
