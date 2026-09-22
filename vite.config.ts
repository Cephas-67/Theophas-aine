// GOD2 · Theophas Aine : le projet se construit et se sert seul.
//
//   npm run dev       developpement, port 5177
//   npm run build     version construite, dans dist/
//   npm run preview   version construite servie, port 5178
//
// Sans barre de mesure GOD2 : celle-ci tourne en continu et le banc de la
// piece la comptait comme un cout de l arbre.

import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: __dirname,
  // Le dossier public du projet, et non celui du depot parent : les polices,
  // les visages de la famille et l icone vivent ici, pour que l arbre se
  // construise et se serve sans rien emprunter a cote.
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: { port: 5177, strictPort: true },
  preview: { port: 5178, strictPort: true },
})
