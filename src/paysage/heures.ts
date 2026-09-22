// GOD2 · Theophas Aine : les heures et les temps du paysage
//
// La table entiere de `references/paysage-threeui.md` : quatre heures et
// quatre temps, dans leur ordre et a leurs valeurs. Rien n est recalcule,
// rien n est moyenne, rien n est choisi a l oeil. Les sept variantes que
// ThreeUI propose sont des croisements de ces deux tables, et c est ce
// croisement qui est repris ici.
//
//   sunrise = MATIN  + CLAIR      rain  = MIDI    + PLUIE
//   noon    = MIDI   + CLAIR      storm = COUCHER + ORAGE
//   sunset  = COUCHER+ CLAIR      snow  = MIDI    + NEIGE
//   night   = NUIT   + CLAIR
//
// La variante demandee dans `src/environnement.ts` est `noon`, celle du brief
// d integration : MIDI et CLAIR.

import { Color } from 'three'

/**
 * Une teinte de la table, prete a servir.
 *
 * Toutes les valeurs ci-dessous sont des hexadecimaux sRGB, ceux qu on lit
 * dans une palette. Three r149, ou la source tourne, les convertit seul : sa
 * gestion des couleurs est active par defaut. Le projet tourne en r134, ou
 * elle n existe pas : sans cette conversion les couleurs repassent par
 * l encodage une seconde fois a l affichage, et tout sort delave, la prairie
 * en kaki pale et le ciel en bleu de lessive.
 */
export function teinte(hexa: number): Color {
  return new Color(hexa).convertSRGBToLinear()
}

/** Les jetons de page que chaque heure declare. La scene et l interface
    changent ensemble, sinon une plaque de nuit flotte sur un ciel de midi. */
export type JetonsDeLHeure = Record<string, string>

export type Heure = {
  id: string
  css: JetonsDeLHeure
  /** Combien d etoiles sont visibles, de 0 a 1. */
  etoiles: number
  /** Les six arrets du degrade du ciel, du zenith vers l horizon. */
  ciel: number[]
  brume: number
  brumePres: number
  brumeLoin: number
  sol: number
  herbe: number
  soleil: { az: number; el: number; teinte: number; force: number }
  hemisphere: [number, number, number]
  ambiante: [number, number]
  remplissage: [number, number]
  contre: [number, number]
  ombre: number
  /** L opacite du disque d ombre de contact sous un objet pose. */
  tache: number
  /** Ce qui s allume tout seul quand le jour tombe. */
  braise: number
}

export const HEURES: Heure[] = [
  {
    id: 'MATIN',
    css: {
      paper: '#ecdcbc', w0: '#fdf1d6', w1: '#f6e5c6', w2: '#ebd9b6',
      ink: '#2e2515', ink2: '#8b7c5c', ink3: '#3f3520', accent: '#a8621f',
      line: '#d6c39c', rule2: '#c0ac82',
      'pl-a': '#fdf8e8', 'pl-b': '#f0e6cc', 'pl-br': '#ddceac', 'pl-fg': '#3f3520',
    },
    etoiles: 0,
    ciel: [0x7ba4d6, 0xa9c3de, 0xd8c9a8, 0xf2d3a2, 0xffd79a, 0xe0b27c],
    brume: 0xf0d6a8, brumePres: 60, brumeLoin: 560,
    sol: 0xf0dcb8, herbe: 0xfff0d2,
    soleil: { az: -0.80, el: 0.235, teinte: 0xffb245, force: 1.46 },
    hemisphere: [0xffe0a2, 0xd6bc82, 0.24],
    ambiante: [0xffdca0, 0.06],
    remplissage: [0xf6e4bc, 0.14],
    contre: [0xffd89a, 0.12],
    ombre: 0.42, tache: 0.62, braise: 0.00,
  },
  {
    id: 'MIDI',
    css: {
      paper: '#dfe3e2', w0: '#f6f8f8', w1: '#e9eeef', w2: '#dde3e4',
      ink: '#232a2c', ink2: '#7f8788', ink3: '#333c3e', accent: '#9a5a2c',
      line: '#c8cfd0', rule2: '#b2babb',
      'pl-a': '#fbfcfc', 'pl-b': '#eaeeef', 'pl-br': '#d3d9da', 'pl-fg': '#333c3e',
    },
    etoiles: 0,
    ciel: [0x2f76c8, 0x5f9cdb, 0x95c0e6, 0xbcd8ee, 0xd8e7f0, 0xcdcfc6],
    brume: 0xdde7ec, brumePres: 60, brumeLoin: 560,
    sol: 0xe6e2d6, herbe: 0xffffff,
    soleil: { az: -0.40, el: 0.80, teinte: 0xfff4e4, force: 1.06 },
    hemisphere: [0xdcecff, 0xcfc6ae, 0.32],
    ambiante: [0xeef4ff, 0.06],
    remplissage: [0xdce8f4, 0.17],
    contre: [0xfff6ea, 0.09],
    ombre: 0.40, tache: 0.70, braise: 0.00,
  },
  {
    id: 'COUCHER',
    css: {
      paper: '#e2a468', w0: '#ffd7a0', w1: '#f3b478', w2: '#dd9455',
      ink: '#2c1608', ink2: '#8a5730', ink3: '#3d2010', accent: '#8d2f0c',
      line: '#c98e55', rule2: '#b87c46',
      'pl-a': '#ffe6c4', 'pl-b': '#f4cb9c', 'pl-br': '#d29c62', 'pl-fg': '#3d2010',
    },
    etoiles: 0.10,
    ciel: [0x3c3a72, 0x7e4f74, 0xc96450, 0xff9a3d, 0xffc169, 0xc8722f],
    brume: 0xef9a52, brumePres: 60, brumeLoin: 560,
    sol: 0xd69c66, herbe: 0xffdcb2,
    soleil: { az: 0.92, el: 0.135, teinte: 0xff8a34, force: 1.62 },
    hemisphere: [0xffb877, 0x6a3a22, 0.30],
    ambiante: [0xffb27a, 0.09],
    remplissage: [0xd9a074, 0.10],
    contre: [0xffa050, 0.20],
    ombre: 0.36, tache: 0.60, braise: 0.30,
  },
  {
    id: 'NUIT',
    css: {
      paper: '#0e1016', w0: '#1b2029', w1: '#13171f', w2: '#0b0d12',
      ink: '#e9e2d2', ink2: '#847e72', ink3: '#cdc6b6', accent: '#d08a4a',
      line: '#2a2d36', rule2: '#3f434e',
      'pl-a': '#1c2028', 'pl-b': '#14171d', 'pl-br': '#343943', 'pl-fg': '#e4ddcd',
    },
    etoiles: 1.0,
    ciel: [0x05070e, 0x080d18, 0x0e1728, 0x141f36, 0x1a2740, 0x0b111c],
    brume: 0x131c2e, brumePres: 60, brumeLoin: 560,
    sol: 0x353c4c, herbe: 0x8ea0c4,
    soleil: { az: 0.50, el: 0.72, teinte: 0x9fb6de, force: 0.50 },
    hemisphere: [0x2e3a54, 0x0d0f14, 0.22],
    ambiante: [0x5c6a8c, 0.05],
    remplissage: [0x7286ac, 0.07],
    contre: [0x9fb6d8, 0.06],
    ombre: 0.52, tache: 0.42, braise: 0.95,
  },
]

export type Temps = {
  id: string
  /** Ce que le temps fait a la brume : un facteur sur la distance, plus une
      teinte a melanger et la part de ce melange. */
  brumeK: number
  brumeC: number | null
  brumeM: number
  soleilK: number
  hemiK: number
  ambK: number
  cielC: number | null
  cielM: number
  solC: number | null
  solM: number
  etoilesK: number
  pluie: number
  pluieN: number
  pluieV: number
  neige: number
  neigeN: number
  /** Le sol mouille : plus sombre et assez luisant pour prendre le ciel. */
  mouille: number
  /** La poudrerie, qui ne concerne que la neige. */
  poudrerie: number
  eclair: number
}

export const TEMPS: Temps[] = [
  {
    id: 'CLAIR',
    brumeK: 1.00, brumeC: null, brumeM: 0,
    soleilK: 1.00, hemiK: 1.00, ambK: 1.00,
    cielC: null, cielM: 0, solC: null, solM: 0, etoilesK: 1.00,
    pluie: 0, pluieN: 0, pluieV: 1, neige: 0, neigeN: 0,
    mouille: 0, poudrerie: 0, eclair: 0,
  },
  {
    id: 'PLUIE',
    brumeK: 0.52, brumeC: 0x6a7480, brumeM: 0.55,
    soleilK: 0.30, hemiK: 1.15, ambK: 1.55,
    cielC: 0x717c88, cielM: 0.52, solC: 0x59594e, solM: 0.52, etoilesK: 0,
    pluie: 1, pluieN: 0.60, pluieV: 1.00, neige: 0, neigeN: 0,
    mouille: 1, poudrerie: 0, eclair: 0,
  },
  // L orage est la pluie poussee au-dela du confortable : le soleil presque
  // parti, la brume tiree tout pres, et la reserve entiere de gouttes en l air.
  {
    id: 'ORAGE',
    brumeK: 0.38, brumeC: 0x515a67, brumeM: 0.72,
    soleilK: 0.14, hemiK: 1.00, ambK: 1.30,
    cielC: 0x4b535f, cielM: 0.74, solC: 0x43443e, solM: 0.62, etoilesK: 0,
    pluie: 1, pluieN: 1.00, pluieV: 1.42, neige: 0, neigeN: 0,
    mouille: 1, poudrerie: 0, eclair: 1,
  },
  {
    id: 'NEIGE',
    brumeK: 0.58, brumeC: 0xdfe4ea, brumeM: 0.60,
    soleilK: 0.52, hemiK: 1.30, ambK: 1.45,
    cielC: 0xc9d2dc, cielM: 0.46, solC: 0xf4f8fc, solM: 0.40, etoilesK: 0.30,
    pluie: 0, pluieN: 0, pluieV: 1, neige: 1, neigeN: 0.52,
    mouille: 0, poudrerie: 1, eclair: 0,
  },
]

/** Les sept variantes de ThreeUI, chacune un couple heure/temps. */
export const VARIANTES: Record<string, { heure: number; temps: number }> = {
  sunrise: { heure: 0, temps: 0 },
  noon: { heure: 1, temps: 0 },
  sunset: { heure: 2, temps: 0 },
  night: { heure: 3, temps: 0 },
  rain: { heure: 1, temps: 1 },
  storm: { heure: 2, temps: 2 },
  snow: { heure: 1, temps: 3 },
}
