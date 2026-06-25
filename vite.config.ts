import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'
import type { Plugin } from 'vite'

const RIOT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function wildRiftProxyPlugin(): Plugin {
  return {
    name: 'wildrift-proxy',
    configureServer(server) {
      server.middlewares.use('/wildrift-proxy', async (req, res, next) => {
        const targetPath = req.url ?? '/'
        const targetUrl = `https://wildrift.leagueoflegends.com${targetPath}`
        try {
          const upstream = await fetch(targetUrl, {
            headers: {
              'User-Agent': RIOT_UA,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          })
          const body = await upstream.text()
          const ct = upstream.headers.get('content-type')
          if (ct) res.setHeader('content-type', ct)
          res.statusCode = upstream.status
          res.end(body)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    wildRiftProxyPlugin(),
    tanstackRouter({ routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }),
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
