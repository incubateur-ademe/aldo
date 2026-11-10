// Health check de déploiement (Coolify) : `node healthcheck.ts`, sans guillemets.
// Sort en code 1 si le serveur ne répond pas en 2xx (ou ne répond pas du tout).
import 'dotenv/config'

const res = await fetch(`http://localhost:${process.env.PORT || 8080}/healthz`, {
  redirect: 'manual',
  signal: AbortSignal.timeout(5000),
})
process.exit(res.ok ? 0 : 1)
