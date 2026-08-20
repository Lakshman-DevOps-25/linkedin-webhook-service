# LinkedIn Webhook Archiver (webhook-only, MVC)

A slimmed, **webhook-only** archiving service: it receives message events from
your platform's internal re-emitters over a signed HTTP endpoint, verifies them,
normalizes them, stores them in MongoDB, and archives any media to local disk or
Azure Blob. No LinkedIn OAuth, no changelog poller, no Redis — those were removed.

> The webhook is **internal**. LinkedIn does not push message webhooks and does
> not sign anything; this endpoint authenticates *your own* re-emitters with an
> HMAC secret you control.

## Flow

```
re-emitter --POST /internal/webhook/messages--> [verify HMAC + timestamp]
   --> [validate envelope] --> [normalize] --> Mongo (bronze raw + silver message)
                                            --> media -> local disk / Azure Blob
```

## Folder structure (MVC)

```
src/
├── config/         index.js (env)  logger.js  database.js
├── models/         RawEvent.js (bronze, write-once)  Message.js (silver)  index.js
├── views/          message.view.js         (read-back serializer)
├── controllers/    webhook.controller.js   health.controller.js   message.controller.js
├── routes/         webhook.routes.js  message.routes.js  index.js
├── middlewares/    verifyInternalSignature.js  validate.js  errorHandler.js
├── services/       ingest.service.js
│   └── storage/    index.js (facade)  local.driver.js  azure.driver.js
├── utils/          crypto.js (HMAC verify)  backoff.js
├── app.js          server.js
test/               send-internal-webhook.js
```

Layering: routes → controllers → services → models; views serialize output;
middlewares handle signature/validation/errors. Every function has a comment and
a `logger.debug(...)` entry line.

## Setup

```bash
npm install
cp .env.example .env    # set INTERNAL_WEBHOOK_SECRET + MONGO_URL
docker compose up -d    # MongoDB only
npm start               # or: npm run dev:debug  (per-function debug logs)
```

## Send a test event

```bash
INTERNAL_WEBHOOK_SECRET=<same-as-.env> npm run test:webhook   # -> 202
curl "http://localhost:4000/api/messages?tenantId=acme-fs"    # verify it stored
```

Signature scheme your re-emitters must use:

```
X-Internal-Timestamp: <unix ms>
X-Internal-Signature: sha256=<hex HMAC-SHA256(key=INTERNAL_WEBHOOK_SECRET,
                                              msg=`${timestamp}.` + rawBody)>
```

Requests older than `INTERNAL_WEBHOOK_MAX_SKEW_MS` or with a bad signature => 401.

## Media storage (pluggable)

`STORAGE_DRIVER=local` (default) writes under `LOCAL_STORAGE_DIR/MEDIA_CONTAINER/...`
and serves files at `/media`. Set `STORAGE_DRIVER=azure` (+ `AZURE_STORAGE_CONNECTION_STRING`)
to switch to Blob Storage — no code changes.

## Going truly webhook-only

The `/api/messages` read-back (`routes/message.routes.js`, `controllers/message.controller.js`,
`views/message.view.js`) is included only to verify what was archived. Delete those
three files and the `/api` mount in `routes/index.js` if you want nothing but the
ingest endpoint.

## Security

Internal webhook: HMAC-SHA256 (constant-time) + timestamp replay protection;
helmet headers; envelope validated with zod; secrets never logged. Media fetch
uses exponential backoff with jitter. Bronze raw events are write-once.

## LinkedIn's own webhook (challenge-response)

LinkedIn's developer portal has a "Create a webhook" screen with a "Test this URL"
button. That is a DIFFERENT contract from the internal webhook above: LinkedIn
sends a GET challenge and (for this app) only offers the "member verification /
profile status change" event — NOT messages.

Endpoint provided for it:
- `GET  /linkedin/webhook?challengeCode=...` → returns `{ challengeCode, challengeResponse }`
  where `challengeResponse = hex HMAC-SHA256(challengeCode, LINKEDIN_CLIENT_SECRET)`.
- `POST /linkedin/webhook` → verifies LinkedIn's `X-LI-Signature` and logs the event.

Setup:
1. Set `LINKEDIN_CLIENT_SECRET` (Auth tab) in the environment.
2. In the portal, paste `https://<your-service>.onrender.com/linkedin/webhook`.
3. Click "Test this URL" → it should validate.
4. Tick the event type and Save.

Note: these are profile/verification events, not messages — they are intentionally
NOT routed to the message archiver.
