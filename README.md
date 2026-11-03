# job-hunter
Job Hunter é uma plataforma que utiliza IA para encontrar, analisar e classificar vagas de tecnologia com base no perfil do candidato. Automatiza a geração de mensagens de candidatura, sugere o currículo mais adequado para cada oportunidade e centraliza o acompanhamento dos processos seletivos em um único painel.

## Stack

| Camada   | Tecnologia                                   | Pasta                    |
| -------- | -------------------------------------------- | ------------------------ |
| Frontend | React 19 + Vite 8 (TypeScript)               | [frontend/](frontend/)   |
| Backend  | NestJS 12 + Swagger (`@nestjs/swagger`)      | [backend/](backend/)     |
| Infra    | Docker (multi-stage) + Docker Compose, nginx | raiz do projeto          |

## Como o front e o back se conectam

- Todas as rotas do backend ficam sob o prefixo `/api`.
- Em desenvolvimento, o servidor do Vite encaminha (proxy) toda requisição para `/api` ao backend. O destino vem da variável `API_PROXY_TARGET` (padrão: `http://localhost:3000`). Assim o frontend sempre chama caminhos relativos, como `fetch('/api/health')`, sem se preocupar com CORS ou URL do backend.
- Em produção, o nginx serve o build do frontend e faz o mesmo papel do proxy, repassando `/api` para o backend.

## Endpoints disponíveis

| Rota              | Descrição                          |
| ----------------- | ---------------------------------- |
| `GET /api`        | Mensagem de boas-vindas            |
| `GET /api/health` | Status da API (`{"status":"ok"}`)  |
| `/api/docs`       | Documentação Swagger (interativa)  |

## Rodando com Docker

### Desenvolvimento (hot reload)

```bash
docker compose up -d --build
```

- Frontend: http://localhost:5173
- Swagger (via proxy do Vite): http://localhost:5173/api/docs
- Backend direto: http://localhost:3000/api

O código-fonte é montado como volume, então alterações nos arquivos recarregam os apps automaticamente.

### Produção

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- Aplicação: http://localhost:8080
- Swagger: http://localhost:8080/api/docs

O backend roda compilado (`node dist/main`) e não é exposto diretamente; o acesso é feito pelo nginx do frontend.

Para parar: `docker compose down` (ou `docker compose -f docker-compose.prod.yml down`).

## Rodando sem Docker

Requer Node.js 24+.

```bash
# Backend (porta 3000)
cd backend
npm install
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
| `API_PROXY_TARGET`    | frontend | `http://localhost:3000` | Destino do proxy `/api` do Vite                 |
| `CHOKIDAR_USEPOLLING` | frontend | —                       | `true` para hot reload em volumes Docker        |
| `TSC_WATCHFILE`       | backend  | —                       | Modo de watch do TypeScript (polling no Docker) |

## Scripts úteis

| Comando                     | Pasta    | Descrição                     |
| --------------------------- | -------- | ----------------------------- |
| `npm run dev`               | frontend | Servidor de desenvolvimento   |
| `npm run build`             | frontend | Build de produção             |
| `npm run start:dev`         | backend  | API em modo watch             |
| `npm run build`             | backend  | Compila para `dist/`          |
| `npm test`                  | backend  | Testes unitários              |

## Estrutura

```
job-hunter/
├── backend/                 # API NestJS
│   ├── src/main.ts          # bootstrap, prefixo /api, CORS e Swagger
│   └── Dockerfile
├── frontend/                # App React + Vite
│   ├── vite.config.ts       # proxy /api -> backend
│   ├── nginx.conf           # nginx de produção
│   └── Dockerfile
├── docker-compose.yml       # ambiente de desenvolvimento
└── docker-compose.prod.yml  # ambiente de produção
```
