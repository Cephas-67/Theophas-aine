// Le releve de la reference : teintes et proportions lues sur les photographies
// de Commons, jamais nommees de memoire. Sort un JSON que la recette du baobab
// importe, pour qu aucun nombre du modele ne soit sans source.
//
//   node theophas-aine/outils/relever.mjs
//
// Le navigateur sert de decodeur d image : Edge ouvre une page vide, y charge
// chaque fichier en base64, le dessine dans un canvas et rend les pixels.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const REFS = path.join(ICI, '..', 'references')

/** Les boites de teinte, en fractions de l image, posees en regardant la photo,
    et verifiees sur la planche de controle que ce meme outil ecrit. */
const BOITES = {
  'baobab-senegal.jpg': {
    ecorceClaire: [0.458, 0.660, 0.552, 0.764],
    ecorceOmbre: [0.535, 0.700, 0.558, 0.760],
    branche: [0.430, 0.300, 0.462, 0.360],
    lateriteNue: [0.150, 0.955, 0.360, 0.990],
    herbeSeche: [0.100, 0.830, 0.310, 0.875],
    cielHaut: [0.050, 0.030, 0.250, 0.120],
    cielBas: [0.050, 0.540, 0.250, 0.600],
  },
  'ecorce-selous-1.jpg': {
    ecorceLumiere: [0.640, 0.420, 0.780, 0.560],
    ecorceOmbre: [0.290, 0.620, 0.420, 0.760],
    ecorcePliSombre: [0.860, 0.300, 0.900, 0.420],
  },
  'colatier.jpg': {
    feuillageLumiere: [0.380, 0.180, 0.520, 0.320],
    feuillageOmbre: [0.200, 0.450, 0.340, 0.580],
  },
}

/** La silhouette a mesurer : la zone de l arbre, et la ligne du fond. */
const SILHOUETTE = {
  fichier: 'baobab-senegal.jpg',
  gauche: 0.15,
  droite: 0.92,
  horizon: 0.645, // sous cette ligne commencent le mur et la vegetation du fond
  hautDuFut: 0.300, // borne de securite du balayage : la fourche se trouve seule
  piedDuFut: 0.782, // la derniere ligne ou le fut se lit encore sous les herbes
  colonneDuFut: 0.505,
}

/** La ligne du gros plan ou se compte la periode des plis verticaux. */
const PLIS = { fichier: 'ecorce-selous-1.jpg', ligne: 0.46, gauche: 0.62, droite: 0.98 }

const navigateur = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
const page = await navigateur.newPage()
await page.setContent('<canvas id="t"></canvas>')

/** Charge une image dans le canvas de la page et rend ses dimensions. */
async function poser(fichier) {
  const base64 = readFileSync(path.join(REFS, fichier)).toString('base64')
  return page.evaluate(async (donnees) => {
    const image = new Image()
    image.src = 'data:image/jpeg;base64,' + donnees
    await image.decode()
    const toile = document.getElementById('t')
    toile.width = image.naturalWidth
    toile.height = image.naturalHeight
    const pinceau = toile.getContext('2d', { willReadFrequently: true })
    pinceau.drawImage(image, 0, 0)
    window.pinceau = pinceau
    return { large: toile.width, haut: toile.height }
  }, base64)
}

/** Les quantiles d une boite : la mediane tient lieu de couleur, les bornes
    disent l ecart que la matiere doit porter. */
async function teinte(boite, large, haut) {
  return page.evaluate((b, L, H) => {
    const x0 = Math.round(b[0] * L)
    const y0 = Math.round(b[1] * H)
    const x1 = Math.round(b[2] * L)
    const y1 = Math.round(b[3] * H)
    const d = window.pinceau.getImageData(x0, y0, x1 - x0, y1 - y0).data
    const r = [], v = [], bl = [], lum = []
    for (let i = 0; i < d.length; i += 4) {
      r.push(d[i]); v.push(d[i + 1]); bl.push(d[i + 2])
      lum.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])
    }
    const q = (t, p) => { const c = [...t].sort((a, z) => a - z); return c[Math.floor(p * (c.length - 1))] }
    const hexa = (a, b2, c) => '#' + [a, b2, c].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
    return {
      pixels: r.length,
      median: hexa(q(r, 0.5), q(v, 0.5), q(bl, 0.5)),
      sombre: hexa(q(r, 0.1), q(v, 0.1), q(bl, 0.1)),
      clair: hexa(q(r, 0.9), q(v, 0.9), q(bl, 0.9)),
      ecartDeLumiere: Math.round(q(lum, 0.9) - q(lum, 0.1)),
    }
  }, boite, large, haut)
}

/** La silhouette contre le ciel : le ciel est clair et desature, l arbre non. */
async function silhouette(s, large, haut) {
  return page.evaluate((s2, L, H) => {
    const d = window.pinceau.getImageData(0, 0, L, H).data
    const estCiel = (x, y) => {
      const i = (y * L + x) * 4
      const r = d[i], v = d[i + 1], b = d[i + 2]
      const lum = 0.2126 * r + 0.7152 * v + 0.0722 * b
      const max = Math.max(r, v, b), min = Math.min(r, v, b)
      return lum > 140 && max - min < 34 && b >= r - 6
    }
    const xg = Math.round(s2.gauche * L), xd = Math.round(s2.droite * L)
    const yFond = Math.round(s2.horizon * H)
    let sommet = yFond, plusGauche = xd, plusDroite = xg
    for (let x = xg; x < xd; x += 1) {
      for (let y = 0; y < yFond; y += 1) {
        if (!estCiel(x, y)) {
          // deux voisins plus bas pour ne pas suivre le cable electrique, fin
          if (estCiel(x, y + 6) && estCiel(x, y + 12)) continue
          if (y < sommet) sommet = y
          if (x < plusGauche) plusGauche = x
          if (x > plusDroite) plusDroite = x
          break
        }
      }
    }
    return { sommet, plusGauche, plusDroite }
  }, s, large, haut)
}

/** La planche de controle : les boites dessinees sur la photo, pour qu une
    boite tombee a cote se voie au lieu de passer dans un nombre. */
async function planche(fichier, boites) {
  const donnees = await page.evaluate((b, nomFichier) => {
    const toile = document.getElementById('t')
    const p = toile.getContext('2d')
    p.lineWidth = Math.max(2, Math.round(toile.width / 320))
    p.font = `${Math.round(toile.width / 42)}px sans-serif`
    for (const [nom, r] of Object.entries(b)) {
      const x = r[0] * toile.width, y = r[1] * toile.height
      const w = (r[2] - r[0]) * toile.width, h = (r[3] - r[1]) * toile.height
      p.strokeStyle = '#C7EE30'
      p.strokeRect(x, y, w, h)
      p.fillStyle = '#C7EE30'
      p.fillText(nom, x, Math.max(24, y - 8))
    }
    return { url: toile.toDataURL('image/jpeg', 0.8), nom: nomFichier }
  }, boites, fichier)
  const base64 = donnees.url.split(',')[1]
  writeFileSync(path.join(REFS, 'controle-' + fichier), Buffer.from(base64, 'base64'))
}

/** La periode des plis verticaux de l ecorce, par autocorrelation d une ligne. */
async function periodeDesPlis(p, large, haut) {
  return page.evaluate((c, L, H) => {
    const y = Math.round(c.ligne * H)
    const x0 = Math.round(c.gauche * L), x1 = Math.round(c.droite * L)
    const d = window.pinceau.getImageData(x0, y, x1 - x0, 1).data
    const lum = []
    for (let i = 0; i < d.length; i += 4) lum.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])
    const moyenne = lum.reduce((a, b) => a + b, 0) / lum.length
    const centre = lum.map((v) => v - moyenne)
    // Deux echelles, et il faut les deux : le grain de la surface, et les plis
    // larges qui font la silhouette du tronc. Une seule recherche prenait
    // toujours le grain, qui a le pic le plus fort.
    const pic = (kMin, kMax) => {
      let meilleur = { decalage: kMin, score: -Infinity }
      for (let k = kMin; k <= kMax; k += 1) {
        let s = 0
        for (let i = 0; i + k < centre.length; i += 1) s += centre[i] * centre[i + k]
        s /= centre.length - k
        if (s > meilleur.score) meilleur = { decalage: k, score: s }
      }
      return meilleur.decalage
    }
    const large = x1 - x0
    const grain = pic(6, 30)
    const pliLarge = pic(45, Math.floor(centre.length / 2))
    return {
      largeurDeLigne: large,
      grainPixels: grain,
      pliLargePixels: pliLarge,
      plisSurLaLigne: Number((large / pliLarge).toFixed(2)),
      grainsParPli: Number((pliLarge / grain).toFixed(2)),
    }
  }, p, large, haut)
}

const releve = { source: 'Wikimedia Commons, images citees dans ANATOMIE.md', teintes: {}, proportions: {}, ecorce: {} }

for (const [fichier, boites] of Object.entries(BOITES)) {
  const { large, haut } = await poser(fichier)
  releve.teintes[fichier] = { taille: `${large}x${haut}` }
  for (const [nom, boite] of Object.entries(boites)) {
    releve.teintes[fichier][nom] = await teinte(boite, large, haut)
  }
  if (fichier === PLIS.fichier) releve.ecorce.plis = await periodeDesPlis(PLIS, large, haut)
  await planche(fichier, boites)
}

const { large, haut } = await poser(SILHOUETTE.fichier)
const s = await silhouette(SILHOUETTE, large, haut)

// Le fut ne se detecte pas : il se lit. Trois detecteurs de bord ont rendu des
// largeurs qui sautaient du simple au double d une ligne a l autre, parce que
// les branches basses touchent le tronc et qu une face du fut porte le meme
// gris neutre que le mur du fond. Les lectures sont faites a l oeil sur la
// planche quadrillee que quadriller.mjs ecrit, et cette meme planche les
// retrace pour qu une lecture fausse se voie.
const lectures = JSON.parse(readFileSync(path.join(REFS, 'releve-a-la-main.json'), 'utf8'))
const sol = lectures.sol.derniereLigneDuFut
const hauteurArbre = sol - s.sommet
const envergure = s.plusDroite - s.plusGauche
const profilDuFut = lectures.fut.map((l) => ({
  hauteur: Number(((sol - l.y) / hauteurArbre).toFixed(3)),
  largeur: Number(((l.droite - l.gauche) / hauteurArbre).toFixed(3)),
}))
const auPied = profilDuFut[profilDuFut.length - 1]
const sousLaFourche = profilDuFut[0]

releve.proportions = {
  fichier: SILHOUETTE.fichier,
  taille: `${large}x${haut}`,
  lecture: lectures.methode,
  pixels: {
    sommet: s.sommet,
    sol,
    hauteurArbre,
    envergure,
    futAuPied: lectures.fut[lectures.fut.length - 1].droite - lectures.fut[lectures.fut.length - 1].gauche,
  },
  envergureSurHauteur: Number((envergure / hauteurArbre).toFixed(3)),
  futAuPiedSurHauteur: auPied.largeur,
  conicite: Number((sousLaFourche.largeur / auPied.largeur).toFixed(3)),
  premiereBrancheSurHauteur: Number(((sol - lectures.fourche.premiereBranche) / hauteurArbre).toFixed(3)),
  divisionDuFutSurHauteur: Number(((sol - lectures.fourche.divisionDuFut) / hauteurArbre).toFixed(3)),
  profilDuFut,
}

// La planche de la silhouette : le cadre trouve et les lectures du fut sur la
// meme image. Un cadre qui rate le sommet ou une lecture posee a cote se voit.
await poser(SILHOUETTE.fichier)
const plancheSilhouette = await page.evaluate((mesure, lues, solY) => {
  const toile = document.getElementById('t')
  const p = toile.getContext('2d')
  p.strokeStyle = '#FF3B30'
  p.lineWidth = 3
  for (const l of lues.fut) {
    p.beginPath(); p.moveTo(l.gauche, l.y); p.lineTo(l.droite, l.y); p.stroke()
  }
  p.strokeStyle = '#0F3EFA'
  p.strokeRect(mesure.plusGauche, mesure.sommet, mesure.plusDroite - mesure.plusGauche, solY - mesure.sommet)
  return toile.toDataURL('image/jpeg', 0.85).split(',')[1]
}, s, lectures, sol)
writeFileSync(path.join(REFS, 'controle-silhouette.jpg'), Buffer.from(plancheSilhouette, 'base64'))

await navigateur.close()

const sortie = path.join(ICI, '..', 'src', 'releve.json')
writeFileSync(sortie, JSON.stringify(releve, null, 2) + '\n')
console.log(JSON.stringify(releve.proportions, null, 2))
for (const [fichier, mesures] of Object.entries(releve.teintes)) {
  console.log('\n' + fichier)
  for (const [nom, m] of Object.entries(mesures)) {
    if (typeof m === 'string') continue
    console.log(`  ${nom.padEnd(16)} ${m.median}  sombre ${m.sombre}  clair ${m.clair}  ecart ${m.ecartDeLumiere}`)
  }
}
console.log('\nreleve ecrit dans ' + path.relative(process.cwd(), sortie))
