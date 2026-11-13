// Local development server. On Vercel, api/index.ts is used instead.
import 'dotenv/config'
import { app } from './app'
import { env } from './config'

app.listen(env.port, () => {
  console.log(`API ready on http://localhost:${env.port}`)
})
