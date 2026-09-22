// Rien de l arbre ne vient d ailleurs.
//
//   node theophas-aine/outils/tiers.mjs [adresse]
//   node theophas-aine/outils/tiers.mjs [adresse] --casser
//
// Le controle charge la page comme une personne, fait le tour de l arbre au
// glisser, ouvre une fiche, et releve toute requete qui sort de l adresse de
// la page. Un releve du code ne suffit pas : une adresse peut se construire a
// l execution.
//
// --casser pose une image venue d un domaine tiers apres le chargement : le
// controle doit la voir et tomber, sinon il ne voit rien.

import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const adresse = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5178/'
const casser = process.argv.includes('--casser')
const origine = new URL(adresse).origin

const navigateur = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--use-angle=d3d11'] })
const dehors = []
let requetes = 0
try {
  const page = await navigateur.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  page.on('request', (r) => {
    requetes += 1
    const url = r.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (new URL(url).origin !== origine) dehors.push(url)
  })
  await page.goto(adresse, { waitUntil: 'networkidle0' })

  // Le tour de l arbre, au glisser, comme une personne.
  await page.mouse.move(700, 450)
  await page.mouse.down()
  for (let x = 700; x < 1100; x += 20) await page.mouse.move(x, 450)
  await page.mouse.up()
  await page.click('.plaque-1')
  await new Promise((f) => setTimeout(f, 800))

  if (casser) {
    await page.evaluate(() => {
      const image = new Image()
      image.src = 'https://images.unsplash.com/photo-1?w=10'
      document.body.appendChild(image)
    })
    await new Promise((f) => setTimeout(f, 1500))
  }
} finally {
  await navigateur.close()
}

console.log(`${requetes} requetes, ${dehors.length} hors de ${origine}`)
for (const url of dehors) console.log('  ' + url)
console.log(dehors.length === 0 ? 'rien ne vient d ailleurs' : 'des octets viennent d un domaine tiers')
process.exit(dehors.length === 0 ? 0 : 1)
