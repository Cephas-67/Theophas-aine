// Le gardien de cadence agit-il, et se tait-il ensuite ?
//
// Il doit se fixer sur un des paliers permis (1, 0,8, 0,64, 0,6) et ne plus en
// bouger pendant les six dernieres secondes. Sur une carte rapide il reste a
// un ; sur l Intel HD 4600 de la machine de travail il descend a 0,6. Une
// resolution qui oscille, ou qui descend encore apres six secondes, fait
// tomber le controle.
//
//   node theophas-aine/outils/gardien.mjs [adresse]

import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const adresse = process.argv[2] ?? 'http://localhost:5178/'
const navigateur = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--use-angle=d3d11'] })
let bon = false
try {
  const page = await navigateur.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(adresse, { waitUntil: 'networkidle0' })
  const paliers = []
  for (let s = 0; s < 16; s += 1) {
    await new Promise((f) => setTimeout(f, 1000))
    paliers.push(await page.evaluate(() => {
      const { vue } = window.theophas
      return `${vue.echelle.toFixed(2)} (${vue.rendu.domElement.width})`
    }))
  }
  console.log('echelle seconde par seconde : ' + paliers.join('  '))
  const fin = []
  for (let s = 0; s < 6; s += 1) {
    await new Promise((f) => setTimeout(f, 1000))
    fin.push(await page.evaluate(() => window.theophas.vue.echelle))
  }
  const PALIERS = [1, 0.9, 0.81, 0.8]
  const stable = fin.every((e) => e === fin[0])
  const permis = PALIERS.some((p) => Math.abs(p - fin[0]) < 0.001)
  bon = stable && permis
  console.log('six dernieres secondes : ' + fin.map((e) => e.toFixed(2)).join('  '))
  console.log(bon ? `le gardien s est fixe a ${fin[0].toFixed(2)} et s est tu` : 'le gardien ne s est pas fixe sur un palier')
} finally {
  await navigateur.close()
}
process.exit(bon ? 0 : 1)
