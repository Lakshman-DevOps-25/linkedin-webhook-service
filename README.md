# LinkedIn Message Archiving Service (MVC)

Compliance archiver for LinkedIn member **messages** via the DMA **Member Data
Portability (3rd Party)** changelog, with MongoDB persistence, Azure Blob media
storage, and an **internal** (non-LinkedIn) signed webhook for platform
re-emitters. Organized in a layered Express MVC architecture.

## Architecture / folder structure

```
src/
├── config/                 App configuration & loaders
│   ├── index.js              env schema + validation (fail-fast)
│   ├── logger.js             pino logger with secret redaction
│   └── database.js           Mongoose connection
├── models/                 M — data layer (Mongoose schemas + indexes)
│   ├── Message.js            silver: normalized, indexed messages
│   ├── RawEvent.js           bronze: immutable raw capture (write-once)
│   ├── MemberCursor.js       per-member encrypted token + changelog cursor
│   └── index.js              barrel export
├── views/                  V — response serializers (presentation)
│   └── message.view.js       shapes docs → API JSON, hides internal fields
├── controllers/            C — thin request handlers (req/res only)
│   ├── oauth.controller.js
│   ├── webhook.controller.js
│   ├── message.controller.js
│   └── health.controller.js
├── routes/                 HTTP routing → controllers
│   ├── oauth.routes.js
│   ├── webhook.routes.js
│   ├── message.routes.js
│   └── index.js              mounts /oauth, /internal, /api, /healthz
├── services/               Business logic (reused by controllers & jobs)
│   ├── linkedin/
│   │   ├── oauth.service.js       OAuth 2.0 (authorization-code)
│   │   └── changelog.service.js   Member Changelog client (versioned + backoff)
│   ├── storage/                   Pluggable media storage (swap by config)
│   │   ├── index.js               facade — selects driver from STORAGE_DRIVER
│   │   ├── local.driver.js        filesystem driver (development)
│   │   └── azure.driver.js        Azure Blob driver (production)
│   ├── ingest.service.js          normalize + persist bronze/silver
│   └── poller.service.js          drain changelog for one member
├── middlewares/            Cross-cutting request concerns
│   ├── verifyInternalSignature.js HMAC + replay protection (internal webhook)
│   ├── validate.js                zod validation factory
│   └── errorHandler.js            async wrapper + central error handler
├── jobs/                   Background processing
│   ├── changelog.queue.js         BullMQ queue + repeatable scheduling
│   └── changelog.worker.js        worker that runs poller.service
├── app.js                  Express app assembly (no port binding)
├── server.js               web entry: connect infra + listen
└── worker.js               worker entry: connect infra + start worker
test/
├── send-internal-webhook.js  signs & posts a sample event to the webhook
└── seed-token.js             self-serve token → encrypted MemberCursor
```

**Layering rule:** routes → controllers → services → models. Controllers never
touch the DB directly; services never touch req/res; views never contain logic.
Jobs reuse the same services as controllers, so ingestion behaves identically
whether an event arrives by poll or by internal webhook.

## ⚠ Honest scope (unchanged by the refactor)

- **No LinkedIn message-send API exists** → this service only archives.
- **LinkedIn does not push webhooks** → LinkedIn ingestion is the **changelog
  poller**; the `/internal/webhook` endpoint is for **your** re-emitters, signed
  with a secret **you** control (not a LinkedIn signature).
- **EEA/Switzerland members only, consent-based, forward-only.** US 17a-4/FINRA
  capture still needs the Sales Navigator compliance partner track.
- **28-day changelog retention** → run the worker as tier-1 infra.

## Media storage (pluggable local ⇄ azure)

Media is written through a storage **facade** (`services/storage/index.js`) that
selects a driver from `STORAGE_DRIVER`. Both drivers implement the same contract
— `initStorage()` and `archiveMedia()` returning `{ container, blobName, url,
type, contentType, sizeBytes, stored }` — so nothing else in the app knows which
backend is active.

- `STORAGE_DRIVER=local` (default): files are written under
  `{LOCAL_STORAGE_DIR}/{MEDIA_CONTAINER}/{tenant}/{conversation}/{message}/{file}`
  and served for browsing at `/media`. Good for development with zero cloud setup.
- `STORAGE_DRIVER=azure`: same paths as Azure blobs in `MEDIA_CONTAINER`, uploaded
  write-once (`If-None-Match:*`). Requires `AZURE_STORAGE_CONNECTION_STRING`
  (config fails fast without it).

**To move from local to Azure later:** set `STORAGE_DRIVER=azure` and provide the
connection string. No code changes. The `url` persisted on each message record
becomes the Azure blob URL instead of the local `/media` URL automatically.

## Required LinkedIn scopes / products

- Production: **Member Data Portability API (3rd Party)** → `r_dma_portability_3rd_party`
  (form-reviewed; requires business-email verification + verified Company Page).
- Dev/testing against your own account: **Member Data Portability API (Member)**
  → `r_dma_portability_self_serve` (mint a token with the portal's OAuth Token Generator).

## Setup

```bash
npm install
cp .env.example .env      # fill LinkedIn creds + Mongo/Redis/Azure
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"  # INTERNAL_WEBHOOK_SECRET

npm start        # web (OAuth, internal webhook, query API)
npm run worker   # poller (separate process)
```

## Testing locally

```bash
# 1) Internal webhook (no LinkedIn needed):
INTERNAL_WEBHOOK_SECRET=<same-as-.env> npm run test:webhook   # -> 202

# 2) Full pipeline against your own account (EEA member):
#    mint a self-serve token in the portal OAuth Token Generator, then:
LINKEDIN_ACCESS_TOKEN=<token> npm run seed:token
npm run worker
```

Internal webhook signature scheme (what your re-emitters send):

```
X-Internal-Timestamp: <unix ms>
X-Internal-Signature: sha256=<hex HMAC-SHA256(key=INTERNAL_WEBHOOK_SECRET,
                                              msg=`${timestamp}.` + rawBody)>
```

## Query API

```
GET /api/messages?tenantId=acme&from=urn:li:member:1&fromDate=2026-08-01&limit=50
```

Filters: `from`, `to` (URNs), `conversationId`, `q` (full-text), `fromDate`/`toDate`,
`limit`/`skip` — all validated by the `validate` middleware against a zod schema.

## Security

Secrets validated at boot and redacted from logs; LinkedIn tokens AES-256-GCM
encrypted at rest; internal webhook HMAC (constant-time) + replay protection;
helmet headers; all input zod-validated; retries use exponential backoff + jitter.

## Confirm against a live payload

The exact `resourceName`/`method` for message events on your pinned API version
(`isMessageEvent` in `services/ingest.service.js` is intentionally permissive),
whether your app is issued refresh tokens, and whether media URLs need the member
bearer token.
