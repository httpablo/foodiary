# Banco local

Na raiz do repositório, execute `docker compose up -d postgres`. O PostgreSQL ficará disponível em `127.0.0.1:5434`, com banco e usuário `foodiary` e senha `foodiary_dev`.

Os arquivos SQL são aplicados em ordem **somente na primeira criação do volume**. Não remova o volume para aplicar mudanças futuras. Em um volume existente, aplique os arquivos novos em ordem. Para a foto de perfil, execute `docker compose exec -T postgres psql -U foodiary -d foodiary -v ON_ERROR_STOP=1 -f /dev/stdin < foodiary-api/db/004_profile_photo.sql` a partir da raiz do repositório. Se a autenticação ou a fila local ainda não foram migradas, aplique antes `002_local_auth.sql` e `003_meal_worker.sql` com o mesmo comando.

Para habilitar refeições repetidas em um volume existente, aplique `005_manual_meals.sql` com o mesmo comando. A cópia fica independente do arquivo da refeição original.

Para habilitar alimentos salvos em um volume existente, aplique `006_saved_foods.sql` depois de `005_manual_meals.sql`: `docker compose exec -T postgres psql -U foodiary -d foodiary -v ON_ERROR_STOP=1 -f /dev/stdin < foodiary-api/db/006_saved_foods.sql`. O cadastro manual de refeições usa a estrutura habilitada por `005_manual_meals.sql`.

Os repositórios, consultas e a fila da API usam PostgreSQL. Defina `DATABASE_URL` conforme o valor de `.env.example` para executá-los localmente. O worker reserva cada refeição com `FOR UPDATE SKIP LOCKED`, evitando que duas instâncias processem a mesma refeição ao mesmo tempo.

A autenticação local usa `AUTH_JWT_SECRET` (pelo menos 32 bytes). Gere um segredo para cada ambiente e mantenha-o fora do Git. Senhas são derivadas com scrypt, tokens de acesso expiram em 15 minutos e refresh tokens são rotacionados e armazenados como hash no banco. Para a recuperação de senha em desenvolvimento, o código de seis dígitos aparece no terminal da API; envio de e-mail ainda não está configurado. Em `NODE_ENV=production`, a solicitação de recuperação falha até que a entrega de e-mail seja implementada.
