// La planche graduee du tronc : un recadrage de la photographie avec une
// grille chiffree, pour relever le profil du fut a la main.
//
//   node theophas-aine/outils/quadriller.mjs
//
// Pourquoi a la main : trois detecteurs de bord ont rendu des largeurs qui
// sautaient du simple au double d une ligne a l autre, parce que les branches
// basses touchent le tronc et qu une face du fut est un gris neutre que le mur
// du fond porte aussi. Un nombre lu sur une grille chiffree se verifie ; un
// nombre sorti d un detecteur qu on n arrive pas a faire tenir, non.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const REFS = path.join(ICI, '..', 'references')

const CADRE = { fichier: 'baobab-senegal.jpg', x0: 760, y0: 540, x1: 1200, y1: 1230, zoom: 2, pas: 25 }

const navigateur = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
const page = await navigateur.newPage()
await page.setContent('<canvas id="t"></canvas>')

const base64 = readFileSync(path.join(REFS, CADRE.fichier)).toString('base64')
const sortie = await page.evaluate(async (donnees, c) => {
  const image = new Image()
  image.src = 'data:image/jpeg;base64,' + donnees
  await image.decode()
  const toile = document.getElementById('t')
  toile.width = (c.x1 - c.x0) * c.zoom
  toile.height = (c.y1 - c.y0) * c.zoom
  const p = toile.getContext('2d')
  p.drawImage(image, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 0, 0, toile.width, toile.height)
  p.font = '18px monospace'
  p.lineWidth = 1
  for (let x = c.x0; x <= c.x1; x += c.pas) {
    const xe = (x - c.x0) * c.zoom
    const cent = x % 100 === 0
    p.strokeStyle = cent ? 'rgba(199,238,48,0.95)' : 'rgba(199,238,48,0.38)'
    p.beginPath(); p.moveTo(xe, 0); p.lineTo(xe, toile.height); p.stroke()
    if (cent) { p.fillStyle = '#C7EE30'; p.fillText(String(x), xe + 4, 20) }
  }
  for (let y = c.y0; y <= c.y1; y += c.pas) {
    const ye = (y - c.y0) * c.zoom
    const cent = y % 100 === 0
    p.strokeStyle = cent ? 'rgba(15,62,250,0.95)' : 'rgba(15,62,250,0.35)'
    p.beginPath(); p.moveTo(0, ye); p.lineTo(toile.width, ye); p.stroke()
    if (cent) { p.fillStyle = '#0F3EFA'; p.fillText(String(y), 6, ye - 5) }
  }
  // Les lectures deja faites, retracees sur la planche : une lecture fausse se
  // voit tout de suite, un nombre dans un fichier ne se voit pas.
  if (c.lectures) {
    p.lineWidth = 3
    for (const l of c.lectures.fut) {
      const y = (l.y - c.y0) * c.zoom
      p.strokeStyle = '#FF3B30'
      p.beginPath(); p.moveTo((l.gauche - c.x0) * c.zoom, y); p.lineTo((l.droite - c.x0) * c.zoom, y); p.stroke()
      p.fillStyle = '#FF3B30'
      p.fillText(`${l.droite - l.gauche}`, (l.droite - c.x0) * c.zoom + 6, y + 6)
    }
    const yf = (c.lectures.fourche.y - c.y0) * c.zoom
    p.strokeStyle = '#FFD60A'
    p.beginPath(); p.moveTo(0, yf); p.lineTo(toile.width, yf); p.stroke()
  }
  return toile.toDataURL('image/jpeg', 0.92).split(',')[1]
}, base64, { ...CADRE, lectures: JSON.parse(readFileSync(path.join(REFS, 'releve-a-la-main.json'), 'utf8')) })

writeFileSync(path.join(REFS, 'grille-tronc.jpg'), Buffer.from(sortie, 'base64'))
await navigateur.close()
console.log('grille-tronc.jpg ecrite : ' + JSON.stringify(CADRE))
