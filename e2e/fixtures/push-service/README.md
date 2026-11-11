# Servizio push finto per i test e2e

Certificato autofirmato per `127.0.0.1`, **solo per i test** (`e2e/notifications.spec.ts`):
web-push invia sempre in HTTPS, quindi il "servizio push" locale del test ha bisogno di TLS.
Il server Next lo accetta tramite `NODE_EXTRA_CA_CERTS` (impostata da `playwright.config.ts`
per `pnpm dev`; con un server già avviato va passata a mano). Nessun codice dell'app lo conosce.

Rigenerazione (valido 10 anni):

```bash
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 3650 \
  -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1" \
  -keyout e2e/fixtures/push-service/key.pem -out e2e/fixtures/push-service/cert.pem
```
