// La vue de l arbre, prise au navigateur.
//
//   node theophas-aine/outils/voir.mjs [adresse] [nom] [largeur] [hauteur]
//
// Elle attend que la scene ait rendu au moins trente images avant de prendre
// la photo : une capture prise trop tot montre un ciel vide et fait croire
// que la piece ne s affiche pas.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const VUES = path.join(ICI, '..', 'vues')

const adresse = process.argv[2] ?? 'http://localhost:5178/'
const nom = process.argv[3] ?? 'arbre'
const large = Number(process.argv[4] ?? 1440)
const haut = Number(process.argv[5] ?? 900)

mkdirSync(VUES, { recursive: true })

const navigateur = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-unsafe-swiftshader'],
})
const page = await navigateur.newPage()
await page.setViewport({ width: large, height: haut, deviceScaleFactor: 1 })

const plaintes = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') plaintes.push(m.text()) })
page.on('pageerror', (e) => plaintes.push('page : ' + e.message))

await page.goto(adresse, { waitUntil: 'networkidle0', timeout: 45000 })

// Trente images rendues, et pas une attente en secondes : sur une machine
// lente, deux secondes ne suffisent pas, et sur une machine rapide elles sont
// perdues.
await page.evaluate(() => new Promise((fini) => {
  let n = 0
  const compter = () => { n += 1; if (n >= 30) fini(); else requestAnimationFrame(compter) }
  requestAnimationFrame(compter)
}))

// Une vue rapprochee, quand on juge la matiere et non la silhouette : la
// camera se pose depuis la page, avec les memes gestes que la personne.
const pres = process.argv.includes('--pres')
if (pres) {
  await page.evaluate(() => {
    const { vue } = window.theophas
    vue.gestes.target.set(0, 3.2, 0)
    vue.camera.position.set(3.4, 3.6, 5.2)
    vue.gestes.update()
  })
  await page.evaluate(() => new Promise((f) => {
    let n = 0
    const c = () => { n += 1; if (n >= 12) f(); else requestAnimationFrame(c) }
    requestAnimationFrame(c)
  }))
}

const cout = await page.evaluate(() => (window.theophas ? window.theophas.cout : null))
const image = await page.screenshot({ type: 'jpeg', quality: 90 })
writeFileSync(path.join(VUES, nom + '.jpg'), image)
await navigateur.close()

console.log('vue : ' + path.relative(process.cwd(), path.join(VUES, nom + '.jpg')))
console.log('cout : ' + JSON.stringify(cout))
if (plaintes.length > 0) {
  console.log('plaintes du navigateur :')
  for (const p of plaintes.slice(0, 12)) console.log('  ' + p)
} else {
  console.log('aucune plainte du navigateur')
}
