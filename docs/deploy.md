# Deploy — guia pronto para usar

Nada foi publicado. Este guia descreve o que já está pronto no código e os passos que dependem de uma conta do responsável (hospedagem, banco gerenciado, domínio e e-mail). `AGENTS.md` proíbe publicar ou ligar serviços pagos sem pedido explícito.

## O que o código já suporta

- Next.js 16 com build de produção (`npm run build`, Webpack) e `npm start`.
- PostgreSQL via `DATABASE_URL` (pool de 5 conexões por instância); migrations Drizzle `0000`–`0015` aplicadas por `npm run db:migrate`, que usa `DATABASE_URL_UNPOOLED` quando existir.
- Better Auth com segredo de 32+ caracteres em `BETTER_AUTH_SECRET` e URL pública em `BETTER_AUTH_URL` (é também a única origem confiável).
- Limite de tentativas guardado no PostgreSQL (tabela `rate_limit`), sem Redis.
- Logs JSON via pino, com campos sensíveis removidos; nível em `LOG_LEVEL`.
- PWA: manifest e ícones; instalar no iPhone exige o domínio HTTPS.

## Variáveis de ambiente (produção)

| Variável | Obrigatória | Observação |
|---|---|---|
| `DATABASE_URL` | sim | Conexão com pooler, se o provedor tiver |
| `DATABASE_URL_UNPOOLED` | recomendada | Conexão direta para migrations |
| `BETTER_AUTH_URL` | sim | `https://<domínio>` exato, sem barra final |
| `BETTER_AUTH_SECRET` | sim | `npx auth secret`; nunca reutilizar o de desenvolvimento |
| `LOG_LEVEL` | não | `info` por padrão |

Nunca usar `NEXT_PUBLIC_*` para estes valores.

## Passos (exemplo com Vercel + PostgreSQL gerenciado)

1. Criar o banco gerenciado (Neon, Supabase, RDS ou equivalente) na região mais próxima dos alunos e copiar as duas URLs.
2. Rodar as migrations contra o banco novo a partir de uma máquina confiável: `DATABASE_URL_UNPOOLED=... npm run db:migrate`.
3. Criar o projeto na hospedagem a partir do repositório, comando de build `npm run build`, Node 24.
4. Configurar as variáveis acima no ambiente de produção (e um conjunto separado para preview, com outro banco).
5. Ligar o domínio com HTTPS e atualizar `BETTER_AUTH_URL`.
6. Confirmar que o proxy da hospedagem **sobrescreve** `x-forwarded-for`/`x-real-ip`; o limite de tentativas usa o IP desses cabeçalhos. Em hospedagem própria, colocar o app atrás de um proxy que faça isso.
7. Teste de fumaça: `/`, `/entrar`, cadastro, login, criar aula, `/vinculos`, `/professor`, `/aprendizagem`, `/api/exportar` (com sessão) e `/manifest.webmanifest`.
8. Ativar backups automáticos e testar um restauro antes de convidar utilizadores reais.

## Antes de abrir ao público (pendente)

- Verificação de e-mail e recuperação de senha: exigem um provedor de envio (Resend, SES, Postmark…). O Better Auth recebe as funções `sendVerificationEmail`/`sendResetPassword`; nenhuma credencial de e-mail existe no projeto.
- Política de privacidade, termos, idade mínima e eliminação de conta (ver `PRODUCT.md`).
- Monitorização de erros sem conteúdo escolar e alerta de falhas de migration.
- Teste no Safari do iPhone instalado como PWA.
