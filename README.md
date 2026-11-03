# job-hunter
Job Hunter é uma plataforma que utiliza IA para encontrar, analisar e classificar vagas de tecnologia com base no perfil do candidato. Automatiza a geração de mensagens de candidatura, sugere o currículo mais adequado para cada oportunidade e centraliza o acompanhamento dos processos seletivos em um único painel.

## Stack

| Camada    | Tecnologia                                         | Pasta                  |
| --------- | -------------------------------------------------- | ---------------------- |
| Frontend  | React 19 + Vite 8 (TypeScript) + Material UI       | [frontend/](frontend/) |
| Backend   | NestJS 12 + Swagger + TypeORM + JWT                | [backend/](backend/)   |
| Banco     | PostgreSQL 17                                      | serviço `db` no Docker |
| Infra     | Docker (multi-stage) + Docker Compose, nginx       | raiz do projeto        |

## Como o front e o back se conectam

- Todas as rotas do backend ficam sob o prefixo `/api`.
- Em desenvolvimento, o servidor do Vite encaminha (proxy) toda requisição para `/api` ao backend. O destino vem da variável `API_PROXY_TARGET` (padrão: `http://localhost:3000`). Assim o frontend sempre chama caminhos relativos, como `fetch('/api/health')`, sem se preocupar com CORS ou URL do backend.
- Em produção, o nginx serve o build do frontend e faz o mesmo papel do proxy, repassando `/api` para o backend.

### O que já está integrado

| Tela        | Situação                                                                 |
| ----------- | ------------------------------------------------------------------------ |
| Criar conta | `POST /api/auth/register`                                                |
| Entrar      | `POST /api/auth/login`; a sessão (JWT) é revalidada em `GET /api/users/me` ao abrir o app e expira para o login se o token for inválido |
| Currículos  | listar, enviar (com progresso), definir principal, baixar e remover via `/api/resumes` |
| Dashboard   | ainda usa dados simulados (vagas, métricas e kanban)                     |

O cliente HTTP fica em [frontend/src/api/](frontend/src/api/).

### Onde ficam os currículos

Os arquivos são gravados em **`backend/storage/curriculos/<id do usuário>/<uuid>.<ext>`**. O nome original fica só no banco (tabela `resumes`). A pasta do usuário é apagada quando ele exclui a conta. O conteúdo da pasta não vai para o git.

## Banco de dados e migrations

O schema é criado **somente** por migrations (`synchronize` está desligado). Elas ficam em [backend/src/database/migrations/](backend/src/database/migrations/):

| Migration                       | Tabela    | Conteúdo                                                                 |
| ------------------------------- | --------- | ------------------------------------------------------------------------ |
| `1793750400000-CreateUsers`     | `users`   | nome de usuário, e-mail e hash da senha; ambos únicos (nome sem diferenciar maiúsculas) |
| `1793750400001-CreateResumes`   | `resumes` | metadados do arquivo enviado; no máximo **um** currículo principal por usuário |
| `1793750400002-CreateJobs`      | `jobs`    | empresa, cargo, local, modalidade, aderência (0–100), tags e etapa do kanban |

Currículos e vagas pertencem a um usuário e são apagados junto com ele (`ON DELETE CASCADE`).

Executar (com o `docker compose` de desenvolvimento rodando):

```bash
docker compose exec backend npm run migration:run      # aplica as pendentes
docker compose exec backend npm run migration:show     # lista o status
docker compose exec backend npm run migration:revert   # desfaz a última
```

Fora do Docker, rode os mesmos `npm run migration:*` dentro de `backend/` (lê o `.env`). Em produção a imagem já vem compilada:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run migration:run:prod
```

## API

Documentação interativa em **`/api/docs`** (Swagger). Faça login, clique em **Authorize** e cole o `accessToken`. Todas as rotas exigem `Authorization: Bearer <token>`, exceto as marcadas como públicas.

| Método e rota                        | Descrição                                                   |
| ------------------------------------ | ----------------------------------------------------------- |
| `GET /api/health` *(pública)*        | Status da API                                               |
| `POST /api/auth/register` *(pública)*| Cria a conta (`username`, `email`, `password`) e retorna o token |
| `POST /api/auth/login` *(pública)*   | Login com `email` e `password`; retorna o token             |
| `GET /api/users/me`                  | Dados do usuário logado                                     |
| `PATCH /api/users/me`                | Altera nome, e-mail ou senha (e-mail/senha exigem `currentPassword`) |
| `DELETE /api/users/me`               | Exclui a conta, os currículos (inclusive arquivos) e as vagas |
| `GET /api/resumes`                   | Lista os currículos (principal primeiro)                    |
| `POST /api/resumes`                  | Upload `multipart/form-data`, campo `file` (PDF/DOC/DOCX, até 5 MB) |
| `GET /api/resumes/:id`               | Dados de um currículo                                       |
| `GET /api/resumes/:id/download`      | Baixa o arquivo                                             |
| `PATCH /api/resumes/:id/primary`     | Define como principal                                       |
| `DELETE /api/resumes/:id`            | Remove (se era o principal, o mais recente assume)          |
| `GET /api/jobs?stage=&search=`       | Lista as vagas ordenadas por aderência, com filtro e busca  |
| `GET /api/jobs/stats`                | Números dos cards do Dashboard                              |
| `POST /api/jobs`                     | Cria uma vaga                                               |
| `GET /api/jobs/:id`                  | Dados de uma vaga                                           |
| `PATCH /api/jobs/:id`                | Atualiza; para mover no kanban/“Aplicar” envie `{ "stage": "applied" }` |
| `DELETE /api/jobs/:id`               | Remove a vaga                                               |

Valores usados pela API: `workMode` = `remote` \| `hybrid` \| `onsite`; `stage` = `found` \| `applied` \| `interview` \| `offer`.

## Rodando com Docker

### Desenvolvimento (hot reload)

```bash
docker compose up -d --build
docker compose exec backend npm run migration:run   # na primeira vez
```

- Frontend: http://localhost:5173
- Swagger (via proxy do Vite): http://localhost:5173/api/docs
- Backend direto: http://localhost:3000/api
- PostgreSQL: `localhost:5432` (usuário, senha e banco: `jobhunter`)

O código-fonte é montado como volume, então alterações nos arquivos recarregam os apps automaticamente. Ao adicionar dependências, recrie o container com `docker compose up -d --build -V <serviço>`.

### Produção

```bash
cp .env.prod.example .env   # e preencha DB_PASSWORD e JWT_SECRET
docker compose -f docker-compose.prod.yml -p job-hunter-prod up -d --build
docker compose -f docker-compose.prod.yml -p job-hunter-prod exec backend npm run migration:run:prod
```

- Aplicação: http://localhost:8080
- Swagger: http://localhost:8080/api/docs

O backend roda compilado (`node dist/main`) e não é exposto diretamente; o acesso é feito pelo nginx do frontend. Os currículos enviados ficam no volume `curriculos` (montado em `/app/storage/curriculos`). Use `-p job-hunter-prod` para que as imagens de produção não sobrescrevam as de desenvolvimento.

Para parar: `docker compose down` (ou `docker compose -f docker-compose.prod.yml -p job-hunter-prod down`).

## Rodando sem Docker

Requer Node.js 24+ e um PostgreSQL acessível.

```bash
# Backend (porta 3000)
cd backend
cp .env.example .env        # ajuste o banco e defina JWT_SECRET
npm install
npm run migration:run
npm run start:dev

# Frontend (porta 5173), em outro terminal
cd frontend
npm install
npm run dev
```

## Variáveis de ambiente

| Variável              | App      | Padrão                  | Descrição                                       |
| --------------------- | -------- | ----------------------- | ----------------------------------------------- |
| `PORT`                | backend  | `3000`                  | Porta da API                                    |
| `CORS_ORIGIN`         | backend  | `http://localhost:5173` | Origens permitidas (separadas por vírgula)      |
| `DB_HOST` / `DB_PORT` | backend  | `localhost` / `5432`    | Endereço do PostgreSQL                          |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | backend | `jobhunter`  | Credenciais e nome do banco                     |
| `JWT_SECRET`          | backend  | **obrigatório**         | Segredo para assinar os tokens                  |
| `JWT_EXPIRES_IN`      | backend  | `1d`                    | Validade do token                               |
| `UPLOAD_DIR`          | backend  | `storage/curriculos`    | Pasta onde os currículos são gravados           |
| `API_PROXY_TARGET`    | frontend | `http://localhost:3000` | Destino do proxy `/api` do Vite                 |
| `CHOKIDAR_USEPOLLING` | frontend | —                       | `true` para hot reload em volumes Docker        |
| `TSC_WATCHFILE`       | backend  | —                       | Modo de watch do TypeScript (polling no Docker) |

## Scripts úteis

| Comando                     | Pasta    | Descrição                                           |
| --------------------------- | -------- | --------------------------------------------------- |
| `npm run dev`               | frontend | Servidor de desenvolvimento                         |
| `npm run build`             | frontend | Build de produção                                   |
| `npm run start:dev`         | backend  | API em modo watch                                   |
| `npm run build`             | backend  | Compila para `dist/`                                |
| `npm run migration:run`     | backend  | Aplica as migrations pendentes                      |
| `npm run migration:revert`  | backend  | Desfaz a última migration                           |
| `npm run migration:show`    | backend  | Mostra quais migrations já foram aplicadas          |
| `npm test`                  | backend  | Testes unitários                                    |
| `npm run test:e2e`          | backend  | Testa todas as APIs contra um banco **de teste** já migrado |

## Estrutura

```
job-hunter/
├── backend/                     # API NestJS
│   ├── src/
│   │   ├── main.ts / setup.ts   # bootstrap, prefixo /api, validação, CORS e Swagger
│   │   ├── database/            # configuração do TypeORM e migrations
│   │   ├── auth/                # registro, login e guard JWT
│   │   ├── users/               # /users/me
│   │   ├── resumes/             # upload e gestão de currículos
│   │   └── jobs/                # vagas e estatísticas
│   ├── test/api.e2e-spec.ts     # testes de ponta a ponta das APIs
│   └── Dockerfile
├── frontend/                    # App React + Vite
│   ├── vite.config.ts           # proxy /api -> backend
│   ├── nginx.conf               # nginx de produção
│   └── Dockerfile
├── docker-compose.yml           # ambiente de desenvolvimento
└── docker-compose.prod.yml      # ambiente de produção
```
