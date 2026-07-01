import { createPortalApp } from './server/app.js'

export function portalApiPlugin() {
  let app

  return {
    name: 'portal-api',
    configureServer(server) {
      app = createPortalApp({ serveStatic: false })

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (url.startsWith('/api') || url.startsWith('/uploads')) {
          app(req, res, next)
          return
        }
        next()
      })
    },
  }
}
