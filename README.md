# Aula em Dia

App web responsivo para o aluno organizar calendário de aulas, matérias, conteúdo estudado e registros de presença ou falta.

## Rodar localmente

Requer Node.js 24 e npm. Na raiz do projeto:

```powershell
npm install
npm run dev
```

Abra <http://localhost:3000>. O protótipo ainda usa dados de demonstração e não salva informações pessoais.
O script de desenvolvimento já usa Webpack: os bindings nativos do Turbopack não carregaram neste Windows.

## Documentação

- [Escopo e critérios](PRODUCT.md)
- [Preparação local](docs/onboarding.md)
- [Arquitetura e decisões](docs/architecture.md)
- [Design e acessibilidade](docs/design.md)
- [Qualidade e limites](docs/quality.md)
- [Instruções para agentes](AGENTS.md)
- [Setup e evidências](docs/setup.md)

## Estado atual

A primeira tela de aluno mostra agenda de 7 dias, resumo da próxima aula, matérias e histórico demonstrativo com busca por conteúdo/professor e filtros por matéria e período. O manifesto permite instalar o web app em dispositivos compatíveis; os dados ainda não persistem e a autenticação ainda não foi conectada.

## Próxima entrega

Definir o modelo de dados e o provedor de PostgreSQL antes de implementar registros persistentes e autenticação.
