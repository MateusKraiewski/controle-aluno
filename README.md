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

Para ativar cadastros e login, configure `DATABASE_URL`, `BETTER_AUTH_URL` e um segredo `BETTER_AUTH_SECRET` (gere um com `npx auth secret`) no `.env.local`. Depois aplique as migrações com `npm run db:migrate`. Sem a senha do PostgreSQL, a rota de autenticação permanece indisponível.

### Instalar no iPhone

Abra o endereço publicado no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. O Aula em Dia abre em modo de app pelo manifesto PWA e não precisa ser publicado na App Store.

## Documentação

- [Escopo e critérios](PRODUCT.md)
- [Preparação local](docs/onboarding.md)
- [Arquitetura e decisões](docs/architecture.md)
- [Design e acessibilidade](docs/design.md)
- [Qualidade e limites](docs/quality.md)
- [Instruções para agentes](AGENTS.md)
- [Setup e evidências](docs/setup.md)

## Estado atual

A tela do aluno mostra agenda de 7 dias, matérias e histórico demonstrativo com busca e filtros. A interface oferece português do Brasil, português de Portugal, inglês e espanhol, além de temas claro e escuro. O manifesto configura instalação como web app no iOS e em outros dispositivos compatíveis. O código de autenticação Better Auth está preparado, mas cadastro e login dependem de configurar o banco; os dados de aula ainda são demonstrativos.

## Próxima entrega

Configurar acesso ao PostgreSQL local e concluir a persistência da agenda após ativar a autenticação.
