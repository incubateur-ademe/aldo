import { existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

let root = process.cwd()

export default defineConfig({
  plugins: [{
    // Les JSON de data/ pèsent jusqu'à 120 Mo : on les lit avec fs à l'exécution
    // au lieu de les faire transiter par la transformation de vite.
    name: 'native-json',
    enforce: 'pre',
    configResolved (config) {
      root = config.root
    },
    async resolveId (source, importer) {
      if (!source.endsWith('.json')) return null
      const resolved = await this.resolve(source, importer, { skipSelf: true })
      return resolved ? resolved.id + '.native.js' : null
    },
    load (id) {
      if (!id.endsWith('.json.native.js')) return null
      let file = id.slice(0, -'.native.js'.length)
      // sur cache chaud, vite passe des identifiants relatifs à la racine (/data/...)
      if (!existsSync(file)) file = path.join(root, file)
      return `import { readFileSync } from 'node:fs'\nexport default JSON.parse(readFileSync(${JSON.stringify(file)}, 'utf8'))\n`
    }
  }],
  test: { globals: true }
})
