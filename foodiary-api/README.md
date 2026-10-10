# Foodiary API local

A API local usa Node.js, PostgreSQL e o disco local para os arquivos das refeições. Cadastro, login, perfil, metas, criação, upload, listagem, detalhe e processamento de refeições funcionam sem AWS.

## Iniciar

1. Na raiz do repositório: `docker compose up -d postgres`.
2. Nesta pasta: `pnpm install --frozen-lockfile`.
3. Confira `DATABASE_URL` e `AUTH_JWT_SECRET` em `.env`. Use `.env.example` como referência. O segredo deve ter pelo menos 32 bytes; não o coloque no app Expo.
4. Nesta pasta: `pnpm dev`. A API escuta na porta 3005 e fica acessível ao celular na mesma rede.
5. Verifique `GET http://127.0.0.1:3005/health`.

Os arquivos enviados ficam em `foodiary-api/data/meals` por padrão, e as fotos de perfil em `foodiary-api/data/profile-photos`. Essas pastas são ignoradas pelo Git. Você pode mudar os locais com `LOCAL_MEALS_DIR` e `LOCAL_PROFILE_PHOTOS_DIR` no `.env`; mantenha os diretórios em um volume persistente se usar contêiner. A API aceita JPEG e M4A de até 10 MB para refeições e JPEG de até 10 MB para o perfil. O app recebe URLs temporárias de leitura. Para processar refeições, configure `OPENAI_API_KEY` no `.env`; a API da OpenAI é cobrada conforme o uso.

Para acessar a API por um celular na mesma rede, use o IP local do computador em `EXPO_PUBLIC_API_URL` no `foodiaryapp/.env`. No emulador Android, use `http://10.0.2.2:3005`; em um simulador iOS no mesmo computador, use `http://127.0.0.1:3005`.

## Rotas disponíveis

| Método | Caminho | Autenticação |
| --- | --- | --- |
| GET | `/health` | Não |
| POST | `/auth/sign-up` | Não |
| POST | `/auth/sign-in` | Não |
| POST | `/auth/refresh-token` | Não |
| POST | `/auth/sign-out` | Token de renovação no corpo |
| POST | `/auth/forgot-password` | Não |
| POST | `/auth/forgot-password/confirm` | Não |
| GET | `/me` | Bearer token |
| PUT | `/profiles` | Bearer token |
| PUT | `/profile-photo` | Bearer token, multipart JPEG |
| GET | `/profile-photos/:accountId/:filename` | Assinatura temporária na URL |
| PUT | `/goals` | Bearer token |
| GET | `/meals?date=YYYY-MM-DD` | Bearer token |
| POST | `/meals` | Bearer token |
| POST | `/meal-uploads/:mealId` | Bearer token |
| GET | `/meals/:mealId` | Bearer token |
| PATCH | `/meals/:mealId` | Bearer token; corrige nome e alimentos de refeição concluída |
| DELETE | `/meals/:mealId` | Bearer token; exclui refeição concluída |
| POST | `/meals/:mealId/repeat` | Bearer token; cria cópia revisada para o momento atual, sem arquivo ou IA |
| GET | `/meal-files/:accountId/:filename` | Assinatura temporária na URL |

Após o upload, a refeição fica em `QUEUED`. Com `OPENAI_API_KEY` configurada, o servidor local inicia um worker que busca trabalhos no PostgreSQL, processa um por vez, tenta novamente após 30 segundos em caso de falha e marca `FAILED` após duas tentativas. Trabalhos interrompidos há mais de 15 minutos voltam à fila. Os códigos de recuperação de senha aparecem no terminal **apenas em desenvolvimento**. Não há entrega de e-mail configurada para produção. Os detalhes do banco e das migrações estão em [db/README.md](db/README.md).

Na listagem de refeições, o app envia `timezoneOffsetMinutes` com a data para consultar o dia local do celular. Sem esse parâmetro, a API usa UTC.

## Verificação

Com o PostgreSQL ativo, execute `pnpm typecheck`, `pnpm verify:postgres`, `pnpm verify:auth`, `pnpm verify:http` e `pnpm verify:queue`. Os scripts de integração criam registros temporários e os removem ao terminar. `verify:queue` usa uma IA simulada e não consome créditos da OpenAI.
