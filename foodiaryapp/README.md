# Foodiary App local

O app usa Expo SDK 57. O Expo Go instalado no Android precisa oferecer suporte ao mesmo SDK; após atualizar dependências, feche um Metro antigo antes de iniciar o projeto novamente.

1. Inicie o PostgreSQL com `docker compose up -d postgres` na raiz do repositório.
2. Inicie a API em `foodiary-api` com `pnpm dev`.
3. Nesta pasta, instale as dependências com `pnpm install --frozen-lockfile`.
4. Defina `EXPO_PUBLIC_API_URL` no `.env` e execute `pnpm dev`.

Use `http://10.0.2.2:3005` para o emulador Android. Para o navegador ou um simulador que roda no mesmo computador, use `http://127.0.0.1:3005`. Em um celular físico na mesma rede, use `http://IP_LOCAL_DO_COMPUTADOR:3005` no app. Se o computador tiver mais de uma interface de rede, inicie o Expo com `REACT_NATIVE_PACKAGER_HOSTNAME=IP_LOCAL_DO_COMPUTADOR pnpm dev` para que o QR code mostre o IP correto. O endereço deve ser alcançável pelo dispositivo; `127.0.0.1` no celular aponta para o próprio celular. Se o IP mudar, atualize o `.env` e reinicie o Expo.

A API usa PostgreSQL e arquivos locais. O processamento das refeições requer `OPENAI_API_KEY` apenas no `.env` da API. Não coloque essa chave no app.

Os tokens de login ficam no SecureStore do aparelho. Na primeira abertura após a atualização, o app migra automaticamente uma sessão antiga salva no AsyncStorage.
