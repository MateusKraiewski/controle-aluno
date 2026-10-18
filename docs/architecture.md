# Arquitetura

## Stack observada

Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind CSS 4, Node.js 24.18.0 e npm. Versões completas das dependências em `package-lock.json`.

## Mapa atual

- `src/app/`: App Router, metadados e tokens/layout responsivo.
- `src/app/manifest.ts`, metadados iOS e `public/icon.svg`: identidade e manifesto standalone para instalar o web app na Tela de Início.
- `src/components/student-dashboard.tsx`: navegação, agenda, matérias, histórico e formulário de demonstração.
- `src/db/`: pool server-only e schema Drizzle para autenticação, matérias e aulas; SQL versionado em `drizzle/`.
- `src/lib/`: validação de ambiente, cliente/configuração Better Auth, traduções e preferências leves de interface.
- `public/`: arquivos estáticos gerados pelo scaffold.
- `.agents/skills/`: instruções locais de skills e `skills-lock.json`.
- `docs/`: documentação de produto, arquitetura e operação.

## Fronteiras e fluxo

A interface demonstrativa mantém estado no navegador durante a sessão; não persiste dados. Quando o fluxo real for implementado, a fronteira prevista é UI → validação/ação no servidor → serviço da feature → repositório Drizzle. Componentes client devem limitar-se a controles interativos. Acesso ao banco permanece no servidor.

## Dados e migrações

PostgreSQL com Drizzle é a base escolhida. Better Auth fornece cadastro/sessão por e-mail e senha e tem schema gerado no próprio projeto. As matérias e aulas referenciam a conta do aluno; a chave composta da aula impede associá-la à matéria de outra conta. Índices cobrem as chaves estrangeiras e a busca por aluno/data. As migrações estão versionadas, mas não foram aplicadas: a instância local exige senha e a interface de aula continua em demonstração.

## Decisões

- **Web primeiro, mobile first:** a descrição permite web ou app. Um web app responsivo reduz barreira de instalação e atende celular/desktop; app nativo fica para avaliação posterior. Decisão reversível.
- **PostgreSQL + Drizzle:** dados de agenda e histórico são relacionais e o toolkit já fornece a base. A instância local está disponível, mas exige credenciais ainda ausentes no projeto.
- **Better Auth + PostgreSQL:** provê sessões e armazenamento de credenciais com tabela de conta. O cliente e a rota estão preparados; dependem de variáveis locais e da aplicação das migrações.
- **Preferências locais:** apenas idioma e tema são salvos no navegador, com chave versionada. Dados de aula não usam armazenamento local.
- **Web app no iOS:** manifesto `standalone` e metadados Apple permitem adicionar a app à Tela de Início no Safari sem App Store.
- **Sem banco no protótipo:** evita dependência de credenciais até selecionar serviço e definir modelo com o primeiro fluxo real.

## Manutenção

Atualize este mapa quando diretórios, dependências ou limites de dados mudarem. Separe planos de implementação observada.
