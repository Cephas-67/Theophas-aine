// GOD2 · Theophas Aine : le projet se construit et se sert seul.
//
//   npm run dev       developpement, port 5177
//   npm run barre     developpement avec la barre GOD2, port 5179
//   npm run build     version construite, dans dist/
//   npm run preview   version construite servie, port 5178
//
// La barre de mesure GOD2 n est pas posee sur `dev`, et c est voulu : elle
// tourne en continu, et le banc de la piece la comptait comme un cout de
// l arbre. Elle a donc son mode a elle. Ainsi on peut regarder la scene et ses
// chiffres en meme temps sans que la mesure de reference en herite.

import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'path'
import { defineConfig, type PluginOption } from 'vite'

/** La barre GOD2, si elle est la.
 *
 * Elle vit dans le depot d outils de la maison, a cote de celui-ci, et non
 * dedans : ce depot-ci se clone et s installe seul, et un import ecrit en dur
 * vers un dossier voisin le casserait chez qui ne l a pas. On la charge donc
 * si elle existe, on le dit si elle manque, et on continue sans elle. */
async function barreSiPresente(): Promise<PluginOption[]> {
  const chemin = path.resolve(__dirname, '..', 'gadgets', 'god2-barre', 'index.mjs')
  if (!existsSync(chemin)) {
    console.log("la barre GOD2 n'est pas a cote de ce depot : on sert la page sans elle")
    return []
  }
  const module = (await import(pathToFileURL(chemin).href)) as { barreGod2: () => PluginOption }
  return [module.barreGod2()]
}

export default defineConfig(async ({ mode }) => ({
  root: __dirname,
  // Le dossier public du projet, et non celui du depot parent : les polices,
  // les visages de la famille et l icone vivent ici, pour que l arbre se
  // construise et se serve sans rien emprunter a cote.
  publicDir: path.resolve(__dirname, 'public'),
  plugins: mode === 'barre' ? await barreSiPresente() : [],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: { port: mode === 'barre' ? 5179 : 5177, strictPort: true },
  preview: { port: 5178, strictPort: true },
}))
