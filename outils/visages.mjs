// Les visages de la famille, rapatries une fois pour toutes.
//
//   node theophas-aine/outils/visages.mjs
//
// Chaque personne de la lignee recoit un portrait. Les photographies viennent
// d Unsplash, sous licence Unsplash, et sont toutes des portraits de personnes
// noires : c est une famille beninoise, et un arbre de famille ou les visages
// ne sont pas ceux de la famille ne vaut rien.
//
// Elles sont TELECHARGEES dans le depot, pas appelees a l affichage. Deux
// raisons, et la seconde suffirait :
//   la page ne doit rien demander a un domaine tiers, ce que
//   `npm run theophas:tiers` verifie et fait tomber au premier appel sortant ;
//   une adresse distante casse le jour ou elle change, et l arbre d une
//   famille n a pas a dependre du serveur de quelqu un d autre.
//
// Elles sont rognees sur le visage a 192 pixels de cote : l avatar s affiche a
// 34 pixels, 44 sur la souche, donc 192 couvre un ecran a deux fois la densite
// avec de la marge. Les vingt et un fichiers pesent ensemble moins qu une
// seule photographie pleine.
//
// Les identifiants ont ete releves sur la recherche d Unsplash, pas devines,
// et chacun a ete verifie libre : les photographies Unsplash+ sortent sur
// plus.unsplash.com et sont ecartees.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = join(RACINE, 'public', 'visages')

/**
 * Une personne de `src/genealogie.ts`, la photographie qui lui va, et son
 * auteur. L adresse est celle du fichier, relevee une fois sur l API de
 * recherche et figee ici : le telechargement n interroge plus rien, il prend
 * ce qui est ecrit. Une table qui depend d une API est une table qui tombe le
 * jour ou l API limite les appels, ce qui est arrive.
 */
const VISAGES = [
  ['theophas', 'photo-1699903674163-fb7b3a06225f', 'YaRgBCIqIvA', 'Leroy Skalstad'],
  ['setondji', 'photo-1669069739900-9f60ab34ac18', 'BY-ZsQwctkc', 'Xavier Greenidge'],
  ['ayele2', 'photo-1712821125599-a2df68b6f26f', 'y9NAPnJAcwk', 'Godfred Kwakye'],
  ['kokou', 'photo-1657356217561-6ed26b47e116', 'KbIaoky4sh4', 'OverlyOlu'],
  ['wassa', 'photo-1712962263095-1190724db95e', 'hiMsDo6wfmU', 'Moon Bouy'],
  ['zinsou', 'photo-1598955682933-b9eb38181565', 'UEPDz-frXjY', 'Micheal Awala'],
  ['kofi', 'photo-1712100743761-5e20dc82c44c', 'R0ipcguzRIU', 'khalid Aminu'],
  ['kokou-s', 'photo-1560856218-79fbabe3617b', 'VyNBwoNJ_wg', 'Banjo Emerson Mathew'],
  ['aicha-s', 'photo-1783013950614-68c48055ac0d', 'XQBcBGWvxF4', 'melvin Ankrah'],
  ['gblewa', 'photo-1655313836628-af779ac11e14', 'zzI5zx2qXsE', 'Dotun S.'],
  ['sagbo-a', 'photo-1743866356150-429e62afffec', 'SkgTB1aCMxk', 'Angelo Casto'],
  ['kpedetin-a', 'photo-1694175454386-8bf459618c0a', 'nhwBooMKPD8', 'Seth Ebenezer Tetteh'],
  ['yao-k', 'photo-1518809595274-1471d16319b7', '3mMvCsW6ZYs', 'curtis powell'],
  ['mariam-k', 'photo-1764662028086-e74ce491080e', '7l5j_afULjk', 'Eze Joseph'],
  ['zinsou-k', 'photo-1625181796571-7f0d4571ab12', 'O1lbOY0H5rc', 'Divine Effiong'],
  ['adjovi-w', 'photo-1639572495229-92f12489b356', 'tA7tebJ9mnw', 'melvin Ankrah'],
  ['comlan-w', 'photo-1612720572242-fefde96650f6', 'Dl0Nd0SLJN4', 'Wadi Lissa'],
  ['ake-z', 'photo-1591634616938-1dfa7ee2e617', '1iiq1scZLfU', 'Tiry Nelson Gono'],
  ['mahouna-z', 'photo-1646457411135-37fa10a51c3d', 'XvnVGXhNV94', 'Ben Masora'],
  ['setondji-k', 'photo-1552493450-2b5ce80ed13f', '1K7yDWuamRA', 'Joshua Oluwagbemiga'],
  ['fatoumata-k', 'photo-1729021284682-8b26fef07721', 'LakFt4OtKxg', 'Trésor Kande'],
  // La quatrieme generation, nee entre 2001 et 2014 : des enfants et des
  // adolescents, pas des portraits d adultes reduits.
  ['dossa-ks', 'photo-1653017470198-cecc1a5f3a60', 'GdfxGavRlFk', 'Ronal Santana'],
  ['nadege-ks', 'photo-1744973055670-e8ebb6261541', 'vSFTvOgI2Io', 'Lisa Marie Theck'],
  ['elom-as', 'photo-1596369229153-67fab7097a1e', 'eoLC-dFIG6s', 'John Onaeko'],
  ['sena-g', 'photo-1686721800388-1c3bfea98d41', 'KqaCBwr-rJw', 'Picha HD'],
  ['kossi-g', 'photo-1693639257331-0bad8ac3913f', '1P6Py2h0WtA', 'Chidy Young'],
  ['afi-sa', 'photo-1744973004202-e49f4ffc13e5', 'vJUWnwT_Vag', 'Lisa Marie Theck'],
  ['edem-sa', 'photo-1597762117709-859f744b84c3', 'sjuLxUOEMY8', 'Ben Koorengevel'],
  ['lawson-ka', 'photo-1695131494999-7961f82afda1', 'HNyTfMv3Tk8', 'Michael Ali'],
  ['togbe-yk', 'photo-1782136660529-1f12b16e5d76', 'ORTi8PwkVJE', 'Shane Ryan Herilalaina'],
  ['akouavi-yk', 'photo-1736205360390-024ab4d248bd', '95AGS_Bb1Ng', 'Chidy Young'],
  ['rachidi-mk', 'photo-1524582046670-ba4dbe52ede2', 'p8qMRZXCLd0', 'Melissa Askew'],
  ['colette-aw', 'photo-1760808574067-27ce83df8ed6', '0HNG4yqLR3k', 'Menor Degu'],
]

const COTE = 192

mkdirSync(DOSSIER, { recursive: true })
const credits = ['# Les portraits', '',
  'Photographies Unsplash, sous licence Unsplash, rapatriees par',
  '`npm run theophas:visages`. Aucune n est appelee a l affichage : elles sont',
  'servies par le site lui-meme.', '',
  '| personne | photographie | auteur |', '|---|---|---|']

let rates = 0
for (const [personne, fichier, photo, auteur] of VISAGES) {
  const adresse = `https://images.unsplash.com/${fichier}?w=${COTE}&h=${COTE}&fit=crop&crop=faces&auto=format&q=72`
  try {
    const reponse = await fetch(adresse)
    if (!reponse.ok) throw new Error(`${reponse.status}`)
    const octets = Buffer.from(await reponse.arrayBuffer())
    writeFileSync(join(DOSSIER, `${personne}.jpg`), octets)
    credits.push(`| ${personne} | https://unsplash.com/photos/${photo} | ${auteur} |`)
    console.log(`${personne.padEnd(12)} ${String(octets.length).padStart(6)} octets   ${auteur}`)
  } catch (souci) {
    console.log(`${personne} : ${souci.message}`)
    rates += 1
  }
}

writeFileSync(join(DOSSIER, 'PORTRAITS.md'), credits.join('\n') + '\n')
console.log(rates === 0 ? `\n${VISAGES.length} visages rapatries.` : `\n${rates} manquent.`)
process.exit(rates === 0 ? 0 : 1)
