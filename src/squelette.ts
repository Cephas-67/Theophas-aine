// GOD2 · Theophas Aine : l ossature
//
// L arbre ne decore pas la genealogie, il l est : le fut est la souche, chaque
// branche maitresse est un enfant, chaque branche seconde un petit-enfant. Ce
// qui pousse au-dela ne porte personne et fait la silhouette.
//
// La silhouette est celle de l image que Cephas a envoyee : un arbre nu, fut
// mince et droit sur un peu plus du tiers de sa hauteur, puis une suite de
// fourches qui se divisent jusqu a un filet tres fin, et une couronne en dome
// large. Ce n est plus un baobab, dont le fut est un tonneau et dont les
// branches partent etagees le long du tronc : c est un arbre a fourches, ou
// tout part d un seul point et se divise par deux.
//
// Les proportions sont relevees sur cette image, sur ses pixels : le fut
// occupe 0,37 de la hauteur totale jusqu a la premiere fourche, la couronne
// est large de 0,85 hauteur, et le fut mesure a son pied un vingt-cinquieme de
// la hauteur. Elles remplacent celles de `releve.json`, qui decrivaient les
// photographies de baobab. Le releve, lui, sert toujours : il donne l ecorce,
// ses plis et ses teintes, dans `matieres.ts` et `bois.ts`.

import { Vector3 } from 'three'
import { SOUCHE, type Personne } from './genealogie'

/**
 * La hauteur de l arbre, en unites de scene. Tout le reste en decoule.
 *
 * Dix, ce qui place l arbre a l echelle reelle du paysage : une lame d herbe y
 * fait entre 0,085 et 0,28 unite, une pierre entre 0,13 et 0,65, le plat va
 * jusqu a 104 et les collines commencent la. Dix metres d arbre, vingt
 * centimetres d herbe, cent metres de plaine : le rapport est juste.
 *
 * Trente-quatre a ete essaye, la valeur de `UNITS_TALL` dans
 * `scripts/generate-landscape.mjs`. C etait une fausse piste : ce nombre est
 * la hauteur que le cadrage de ThreeUI fait tenir dans l ecran, pas la taille
 * d un sujet, et la variante paysage n a justement aucun sujet, sa tour etant
 * masquee. Mesure sur la capture, un arbre de trente-quatre obligeait la
 * camera a monter a vingt-sept unites pour le tenir entier, et de la-haut une
 * lame d herbe de vingt centimetres fait quatre pixels vue par la tranche :
 * la prairie redevenait un aplat.
 */
export const HAUTEUR = 10

/** Les proportions lues sur l image de reference, en hauteurs d arbre. */
const P = {
  /** Du pied a la premiere fourche. */
  futSurHauteur: 0.37,
  /** La demi-envergure de la couronne. */
  demiCouronneSurHauteur: 0.54,
  rayonAuPiedSurHauteur: 0.021,
  rayonSousLaFourcheSurHauteur: 0.017,
}

export const MESURES = {
  hauteur: HAUTEUR,
  rayonAuPied: P.rayonAuPiedSurHauteur * HAUTEUR,
  rayonSousLaFourche: P.rayonSousLaFourcheSurHauteur * HAUTEUR,
  fourche: P.futSurHauteur * HAUTEUR,
  rayonDeCouronne: P.demiCouronneSurHauteur * HAUTEUR,
}

export type Segment = {
  /** L identifiant de la personne portee, vide pour un rameau. */
  personne: string
  /** La generation portee : 0 la souche, 1 un enfant, 2 un petit-enfant,
      3 un arriere-petit-enfant. 9 pour un rameau, qui ne porte personne. */
  rang: number
  ligne: Vector3[]
  rayonDepart: number
  rayonBout: number
  pans: number
  /** Ce que le vent peut prendre : nul sur le fut, plein sur un rameau. */
  souplesse: number
  /** Le bout, ou se pose l etiquette. */
  bout: Vector3
  /** Vrai si le bout est une extremite de l arbre. */
  feuillu: boolean
}

/** Un tirage reproductible : deux chargements donnent le meme arbre, sinon un
    arbre se redessine a chaque rendu et plus rien ne se compare. */
function tirage(graine: number) {
  let etat = graine >>> 0
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dedans = tirage(1921) // l annee de naissance de la souche, pour la graine

const HAUT = new Vector3(0, 1, 0)

/**
 * Une branche, tracee a partir d une direction et non d un cap horizontal.
 *
 * Sur cet arbre une branche peut partir presque verticale, et une direction
 * decrite par un cap au sol plus une pente ne sait pas dire cela : au ras de
 * la verticale, le cap n existe plus et la branche partait n importe ou. On
 * avance donc le long d un vecteur, qu on fait tourner d un peu vers le haut a
 * chaque section.
 *
 * `redressement` est la part de verticale reprise sur la longueur entiere.
 * C est lui qui donne le galbe : une fourche qui s ouvre et dont les deux
 * moities se relevent dessine le vase de l image, alors que deux droites qui
 * s ecartent dessinent un compas.
 */
function brancher(
  depart: Vector3,
  direction: Vector3,
  longueur: number,
  sections: number,
  redressement: number,
  desordre: number,
): Vector3[] {
  const ligne = [depart.clone()]
  const sens = direction.clone().normalize()
  for (let i = 0; i < sections; i += 1) {
    sens.lerp(HAUT, redressement / sections)
    sens.x += (dedans() - 0.5) * desordre
    sens.y += (dedans() - 0.5) * desordre * 0.5
    sens.z += (dedans() - 0.5) * desordre
    sens.normalize()
    ligne.push(ligne[ligne.length - 1].clone().addScaledVector(sens, longueur / sections))
  }
  return ligne
}

/** Le fut : droit, mince, a peine incline. Sur l image il ne s evase pas et ne
    se tord pas ; il monte, et toute la vie de l arbre est au-dessus. */
function fut(): Segment {
  const ligne: Vector3[] = []
  const sections = 12
  for (let i = 0; i <= sections; i += 1) {
    const t = i / sections
    // Une derive d un demi-rayon sur toute la hauteur : un fut parfaitement
    // droit se lit comme un poteau, et aucun arbre n est d aplomb.
    ligne.push(new Vector3(-0.010 * HAUTEUR * t * t, -0.3 + t * (MESURES.fourche + 0.3), 0.005 * HAUTEUR * t))
  }
  return {
    personne: SOUCHE.id,
    rang: 0,
    ligne,
    rayonDepart: MESURES.rayonAuPied,
    rayonBout: MESURES.rayonSousLaFourche,
    pans: 20,
    souplesse: 0,
    bout: ligne[ligne.length - 1].clone(),
    feuillu: false,
  }
}

/** Le point du fut ou part le i-eme enfant : du sept-huitieme de sa hauteur a
    son sommet. */
function surLeFut(tronc: Segment, part: number): Vector3 {
  const ligne = tronc.ligne
  const place = (0.875 + part * 0.125) * (ligne.length - 1)
  const i = Math.min(ligne.length - 2, Math.floor(place))
  return ligne[i].clone().lerp(ligne[i + 1], place - i)
}

/** La direction d une ligne a son extremite, prise sur son dernier cinquieme :
    entre deux sommets voisins, deux points presque confondus donnent une
    direction qui saute. */
function capDuBout(ligne: Vector3[]): Vector3 {
  const arriere = ligne[Math.max(0, ligne.length - 3)]
  const bout = ligne[ligne.length - 1]
  const ecart = bout.clone().sub(arriere)
  return ecart.lengthSq() < 1e-8 ? HAUT.clone() : ecart.normalize()
}

/**
 * Les enfants d une fourche.
 *
 * Chacun s ecarte du porteur du meme angle, mais autour d un axe tire au sort
 * perpendiculairement a lui : c est ce tirage qui rend la fourche
 * tridimensionnelle. Toutes les fourches ouvertes dans le meme plan donnent un
 * arbre en carton decoupe, qui disparait des qu on tourne autour.
 */
function ouvrirLaFourche(cap: Vector3, combien: number, ecart: number): Vector3[] {
  // Deux perpendiculaires au porteur, pour pouvoir viser dans toutes les
  // directions autour de lui.
  const appui = Math.abs(cap.y) > 0.95 ? new Vector3(1, 0, 0) : HAUT
  const u = new Vector3().crossVectors(cap, appui).normalize()
  const v = new Vector3().crossVectors(cap, u).normalize()
  const depart = dedans() * Math.PI * 2
  const sorties: Vector3[] = []
  for (let i = 0; i < combien; i += 1) {
    const autour = depart + (i / combien) * Math.PI * 2
    const cote = u.clone().multiplyScalar(Math.cos(autour)).addScaledVector(v, Math.sin(autour))
    const angle = ecart * (0.78 + dedans() * 0.44)
    sorties.push(cap.clone().multiplyScalar(Math.cos(angle)).addScaledVector(cote, Math.sin(angle)).normalize())
  }
  return sorties
}

/**
 * Les etages de fourches au-dela des petits-enfants.
 *
 * Chaque etage prend un peu moins des trois quarts de la longueur du
 * precedent et les deux tiers de son epaisseur. C est ce resserrement regulier
 * qui fait qu un arbre se lit du gros vers le fin ; un rapport constant de 1
 * donne un buisson de baguettes, et un rapport trop dur arrete la couronne
 * net a mi-distance.
 *
 * Le dernier etage s ouvre en trois et non en deux : sur l image, ce qui
 * remplit le ciel entre les branches est un semis de pousses courtes, plus
 * serre que ce qu une simple division par deux peut donner.
 */
const ETAGES = [
  { combien: 2, ecart: 0.50, longueur: 0.76, rayon: 0.70, sections: 3, pans: 7 },
  { combien: 2, ecart: 0.48, longueur: 0.75, rayon: 0.68, sections: 3, pans: 6 },
  { combien: 2, ecart: 0.46, longueur: 0.74, rayon: 0.66, sections: 2, pans: 5 },
  { combien: 2, ecart: 0.44, longueur: 0.73, rayon: 0.64, sections: 2, pans: 5 },
  { combien: 3, ecart: 0.52, longueur: 0.70, rayon: 0.60, sections: 2, pans: 4 },
]

function fourcher(
  depart: Vector3,
  cap: Vector3,
  etage: number,
  longueur: number,
  rayon: number,
  segments: Segment[],
): void {
  if (etage >= ETAGES.length) return
  const regle = ETAGES[etage]
  for (const sens of ouvrirLaFourche(cap, regle.combien, regle.ecart)) {
    const longueurIci = longueur * regle.longueur * (0.82 + dedans() * 0.36)
    const rayonIci = rayon * regle.rayon
    const brin: Segment = {
      personne: '',
      rang: 9,
      // Le redressement faiblit avec l etage : les grosses branches font le
      // vase, les pousses du bout partent a peu pres droit devant elles.
      ligne: brancher(depart, sens, longueurIci, regle.sections, 0.26 - etage * 0.04, 0.10),
      rayonDepart: rayonIci,
      rayonBout: rayonIci * 0.62,
      pans: regle.pans,
      // Le vent prend d autant plus que le brin est fin : une pousse de l annee
      // plie, une maitresse ne bouge pas.
      souplesse: Math.min(1, 0.35 + etage * 0.18),
      bout: new Vector3(),
      feuillu: etage >= ETAGES.length - 2,
    }
    brin.bout = brin.ligne[brin.ligne.length - 1].clone()
    segments.push(brin)
    fourcher(brin.bout, capDuBout(brin.ligne), etage + 1, longueurIci, rayonIci, segments)
  }
}

/**
 * L ossature entiere.
 *
 * Elle descend autant de generations que la genealogie en porte, sans savoir
 * combien il y en a : chaque personne est une branche, ses enfants sont la
 * fourche de sa branche, et on recommence. Ajouter une cinquieme generation
 * dans `genealogie.ts` ne demande pas une ligne ici.
 *
 * L ordre de la fratrie suit la convention genealogique : l aine a gauche, le
 * benjamin a droite, en tournant par l avant de l arbre. Les six enfants
 * s etagent sur le dernier huitieme du fut, l aine le plus bas, parce qu une
 * branche basse est une branche vieille.
 */
export function ossature(): Segment[] {
  const segments: Segment[] = []
  const tronc = fut()
  segments.push(tronc)

  const enfants = SOUCHE.enfants ?? []
  enfants.forEach((enfant: Personne, i: number) => {
    const part = i / Math.max(1, enfants.length)
    // Le tour complet et non les cinq sixiemes : les six departs sont presque
    // au meme endroit, et laisser un secteur vide ouvrirait un trou franc.
    const azimut = Math.PI - part * Math.PI * 2
    // Quarante-six degres d ecart a la verticale. Plus ferme, les six branches
    // montaient en gerbe serree et les visages se touchaient a l ecran ; c est
    // l ouverture qui aere la couronne, pas la longueur.
    const ecart = 0.80 + dedans() * 0.18
    const sens = new Vector3(Math.cos(azimut) * Math.sin(ecart), Math.cos(ecart), Math.sin(azimut) * Math.sin(ecart))
    const longueur = MESURES.rayonDeCouronne * (0.78 + dedans() * 0.14)
    const maitresse: Segment = {
      personne: enfant.id,
      rang: 1,
      ligne: brancher(surLeFut(tronc, part), sens, longueur, 6, 0.34, 0.055),
      rayonDepart: MESURES.rayonSousLaFourche * 0.58,
      rayonBout: MESURES.rayonSousLaFourche * 0.40,
      pans: 14,
      souplesse: 0.10,
      bout: new Vector3(),
      feuillu: false,
    }
    maitresse.bout = maitresse.ligne[maitresse.ligne.length - 1].clone()
    segments.push(maitresse)
    pousserLaSuite(maitresse, enfant, 2, longueur, segments)
  })

  return segments
}

/**
 * Ce qui pousse au bout d une branche qui porte quelqu un.
 *
 * Ses enfants sont sa fourche : ils ne se greffent pas sur son flanc, ils sont
 * ce en quoi elle se divise. C est la regle de cet arbre, et c est aussi la
 * verite genealogique. Quand la personne n a pas d enfants, la branche finit
 * en rameaux qui ne portent personne : un arbre dont les branches s arretent
 * net la ou la famille s arrete n est pas un arbre, c est un diagramme.
 */
function pousserLaSuite(
  parent: Segment,
  personne: Personne,
  rang: number,
  longueur: number,
  segments: Segment[],
): void {
  const enfants = personne.enfants ?? []
  if (enfants.length === 0) {
    fourcher(parent.bout, capDuBout(parent.ligne), 0, longueur, parent.rayonBout, segments)
    return
  }
  // L ouverture s elargit d une generation a l autre : les branches y sont
  // plus courtes, et une fourche qui garderait le meme angle donnerait des
  // bouts de plus en plus serres, donc des visages colles.
  const sorties = ouvrirLaFourche(capDuBout(parent.ligne), enfants.length, 0.52 + rang * 0.07)
  enfants.forEach((enfant: Personne, j: number) => {
    const longueurIci = longueur * (0.70 + dedans() * 0.12)
    const branche: Segment = {
      personne: enfant.id,
      rang,
      ligne: brancher(parent.bout, sorties[j], longueurIci, 5, 0.26, 0.075),
      rayonDepart: parent.rayonBout * 0.86,
      rayonBout: parent.rayonBout * 0.58,
      pans: Math.max(6, 12 - rang * 2),
      souplesse: Math.min(0.6, 0.12 * rang),
      bout: new Vector3(),
      feuillu: false,
    }
    branche.bout = branche.ligne[branche.ligne.length - 1].clone()
    segments.push(branche)
    pousserLaSuite(branche, enfant, rang + 1, longueurIci, segments)
  })
}

/** Ce que l ossature coute, pour le banc et pour la fiche technique. */
export function compterLOssature(segments: Segment[]) {
  let triangles = 0
  let bouts = 0
  for (const s of segments) {
    triangles += (s.ligne.length - 1) * s.pans * 2
    if (s.feuillu) bouts += 1
  }
  return { segments: segments.length, triangles, bouts }
}
