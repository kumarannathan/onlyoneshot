import { createPortalApp } from './app.js'

const PORT = process.env.PORT || 3001
const app = createPortalApp({ serveStatic: true })

app.listen(PORT, () => {
  console.log(`Portal API running on http://localhost:${PORT}`)
})
