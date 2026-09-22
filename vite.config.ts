// GOD2 · Theophas Aine : le projet se construit et se sert seul.
//
//   npm run dev       developpement avec la barre GOD2, port 5177
//   npm run dev:nu    le meme sans la barre, quand on juge la scene a l oeil
//   npm run build     version construite, dans dist/
//   npm run preview   version construite servie, port 5178
//
// La barre de mesure GOD2 est posee sur le serveur de developpement, et elle
// n y gene pas la mesure de reference : le banc ne lit pas ce serveur, il lit
// la version construite servie par `preview`, ou le greffon n entre jamais
// (`apply: 'serve'`). On regarde donc la scene et ses chiffres en meme temps
// sans que le banc en herite.
//
// Elle a d abord ete mise sur un mode a part, par prudence. C etait un mode de
// trop : on lance `npm run dev`, on ne la voit pas, et un outil qu il faut
// savoir demander n est pas un outil.

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
  plugins: mode === 'nu' ? [] : await barreSiPresente(),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: { port: 5177, strictPort: true },
  preview: { port: 5178, strictPort: true },
}))
