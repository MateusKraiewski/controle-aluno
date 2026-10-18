# Arquitetura

## Stack observada

Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind CSS 4, Node.js 24.18.0 e npm. Versões completas das dependências em `package-lock.json`.

## Mapa atual

- `src/app/`: App Router, metadados e tokens/layout responsivo.
- `src/app/manifest.ts` e `public/icon.svg`: identidade e manifesto para instalar o web app em dispositivos compatíveis.
- `src/components/student-dashboard.tsx`: navegação, agenda, matérias, histórico e formulário de demonstração.
- `src/db/`: ponto de acesso Drizzle/PostgreSQL sem tabelas de domínio.
- `src/lib/`: validação de ambiente, logger server-only e helper de classes.
- `public/`: arquivos estáticos gerados pelo scaffold.
- `.agents/skills/`: instruções locais de skills e `skills-lock.json`.
- `docs/`: documentação de produto, arquitetura e operação.

## Fronteiras e fluxo

A interface demonstrativa mantém estado no navegador durante a sessão; não persiste dados. Quando o fluxo real for implementado, a fronteira prevista é UI → validação/ação no servidor → serviço da feature → repositório Drizzle. Componentes client devem limitar-se a controles interativos. Acesso ao banco permanece no servidor.

## Dados e migrações

PostgreSQL com Drizzle é a escolha de base para o produto, ainda sem schema de domínio ou provedor. Nenhuma tabela fictícia será criada no setup. O pool é limitado, reutilizável e inicializado sob demanda. Migrações só serão aplicadas após revisão e escolha de um destino autorizado.

## Decisões

- **Web primeiro, mobile first:** a descrição permite web ou app. Um web app responsivo reduz barreira de instalação e atende celular/desktop; app nativo fica para avaliação posterior. Decisão reversível.
- **PostgreSQL + Drizzle:** dados de agenda e histórico precisam persistir. Padrão do toolkit para projetos novos; provedor e conexão continuam pendentes.
- **Sem autenticação nesta etapa:** dados ainda são demonstrativos. Autenticação e isolamento no servidor são pré-requisitos para dados reais.
- **Sem banco no protótipo:** evita dependência de credenciais até selecionar serviço e definir modelo com o primeiro fluxo real.

## Manutenção

Atualize este mapa quando diretórios, dependências ou limites de dados mudarem. Separe planos de implementação observada.
