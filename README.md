# Aula em Dia

## Progresso de entrega

**Estimativa atual: 63%**. É uma estimativa ponderada por marcos do produto (visão 20%, agenda do aluno 40%, colaboração com professor 20%, apoio à aprendizagem 10%, qualidade e lançamento 10%), não uma declaração de que a aplicação está pronta para produção. O cálculo e as pendências estão detalhados em [progresso do projeto](docs/progress.md).

[████████████████████](docs/progress.md#product-and-architecture-20) [█████████████████████████████░░░░░░░░░░░](docs/progress.md#student-planner-40) [███████████░░░░░░░░░](docs/progress.md#teacher-collaboration-20) [░░░░░░░░░░](docs/progress.md#learning-support-10) [████░░░░░░](docs/progress.md#quality-and-release-10)

Cada segmento da barra abre a etapa correspondente. O roadmap também mostra o que já existe e o que falta.

Plataforma mobile first para organizar a relação entre aula planejada, aula realizada, presença, conteúdo estudado e trajetória por matéria. Aluno é a primeira experiência; o produto está sendo estruturado para colaboração com professor por vínculo consentido e autoria separada.

## Rodar localmente

Requer Node.js 24, npm e PostgreSQL. Na raiz:

```powershell
npm install
npm run db:migrate
npm run dev
```

Use `.env.example` como referência e configure secrets em `.env.local`. Em Windows, dev/build usa Webpack porque os bindings nativos do Turbopack não estão disponíveis no ambiente atual. Abrir `http://localhost:3000`. `/` mostra a demonstração; `/entrar` permite cadastro/login e a agenda persistente do usuário.

Neste checkout, um PostgreSQL 17 isolado usa `127.0.0.1:5433`; consulte o [setup](docs/setup.md) para Start/stop e localização privada dos dados. `.env.local` e `.local/` não são versionados.

## iPhone

A aplicação é PWA: com deployment em HTTPS, abrir no Safari → Compartilhar → Adicionar à Tela de Início. Não requer App Store. A prévia local não é acessível ao celular e ainda não houve validação em iPhone real.

## Produto e documentação

- [Visão, público, diferencial e escopo](PRODUCT.md)
- [Roadmap e gates por fase](docs/roadmap.md)
- [Jornadas, estados e UX](docs/ux-flows.md)
- [Arquitetura e ADRs](docs/architecture.md)
- [Modelo de domínio atual e futuro](docs/domain-model.md)
- [Design e acessibilidade](docs/design.md)
- [Plano QA, segurança e release](docs/quality.md)
- [Setup/evidências](docs/setup.md) · [instruções do projeto](AGENTS.md)

## Estado honesto

Estrutura de produto, decisões, roadmap e fluxos aluno-professor foram definidos; a base local tem autenticação, persistência de matéria/aula, séries semanais/quinzenais com múltiplos dias, edição/cancelamento/exclusão com escopo de série (somente esta, esta e as próximas, toda a série), aula cancelada distinta de falta, aviso de conflito com confirmação explícita, autoria do relato de presença pelo estudante, registro de conteúdo estudado separado do planeado, PWA, preferências de idioma/tema, testes puros de agenda e testes de integração PostgreSQL (`npm run test:db`). Também há reposição ligada à aula original e colaboração com professor por código de convite, escopo consentido por matéria, revogação e relato de presença de cada parte (`/professor` e `/vinculos`). A próxima evolução inclui divisão de série/feriados, timezone de perfil, resolução de divergências, notas privadas e release hospedado. O que está proposto e o que já roda ficam separados em `docs/domain-model.md` e `RELATORIO-FINAL.md`.

O ícone src/app/apple-icon.png prepara o atalho de ecrã inicial no iOS.
