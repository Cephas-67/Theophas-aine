// GOD2 · Theophas Aine : le bois
//
// Toutes les branches sont cousues dans une seule geometrie : un appel de
// dessin pour l arbre entier, au lieu d un par branche. C est la lecon de
// figure.ts, et sur cent-six branches elle se paie.
//
// Chaque sommet emporte de quoi etre peint et anime sans qu on ait a le
// retrouver : combien de plis fait le tour a cet endroit, ce que le vent peut
// y prendre, et a quelle personne la branche appartient. Un attribut coute
// quatre octets par sommet et economise une recherche par image.

import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import type { Segment } from './squelette'
import { MESURES } from './squelette'

/** Les plis du fut sur son tour, converti du releve : 15,4 plis mesures sur
    une demi-face du gros plan, donc de l ordre de 30 a 60 sur le tour. */
const PLIS_DU_FUT = 34

/** Le grain de l ecorce, en periodes par unite de scene, pris sur le meme
    releve : le grain est 7,5 fois plus fin que le pli. */
export const GRAIN = (PLIS_DU_FUT * 7.5) / (2 * Math.PI * MESURES.rayonSousLaFourche)

export type Bois = {
  geometrie: BufferGeometry
  /** L ordre des personnes dans l attribut aPersonne. */
  personnes: string[]
  triangles: number
}

/** Le repere transporte le long de la ligne : sans lui, la section tourne sur
    elle-meme d une branche a l autre et l ecorce se vrille. */
function reperesDeLigne(ligne: Vector3[]): { avant: Vector3; droite: Vector3; haut: Vector3 }[] {
  const reperes = []
  // Le premier repere se prend sur l axe le moins aligne avec la branche, et
  // ensuite on ne le remet jamais a zero : une remise en cours de route
  // tournait la section d un quart de tour entre deux anneaux, et la branche
  // se pliait en virgule.
  const premier = ligne[1].clone().sub(ligne[0]).normalize()
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
  let droite = axes.reduce((a, b) => (Math.abs(a.dot(premier)) < Math.abs(b.dot(premier)) ? a : b)).clone()
  for (let i = 0; i < ligne.length; i += 1) {
    const avant = (i === ligne.length - 1 ? ligne[i].clone().sub(ligne[i - 1]) : ligne[i + 1].clone().sub(ligne[i])).normalize()
    // on retire de droite sa part le long de la branche : c est le transport
    droite.addScaledVector(avant, -droite.dot(avant)).normalize()
    const haut = new Vector3().crossVectors(avant, droite).normalize()
    droite = new Vector3().crossVectors(haut, avant).normalize()
    reperes.push({ avant, droite: droite.clone(), haut })
  }
  return reperes
}

/**
 * Le rayon a une fraction de la branche et a une distance de son depart.
 *
 * Le bourrelet : sur la photographie, aucune branche ne sort du tronc par un
 * raccord net, il y a toujours une fonte de matiere autour. Il se compte en
 * distance et non en fraction, sinon une longue branche aurait un long
 * bourrelet ; et il s etend sur un peu plus d un rayon, ce qui le fait
 * deborder du fut au lieu de mourir dedans.
 *
 * Le dome : le fut ne s arrete pas en section ouverte a la division, il se
 * ferme en masse arrondie d ou partent les branches maitresses.
 */
function rayonLeLongDeLaBranche(segment: Segment, t: number, distance: number): number {
  const fuseau = segment.rayonDepart + (segment.rayonBout - segment.rayonDepart) * t
  if (segment.rang === 0) {
    const fin = Math.max(0, (t - 0.86) / 0.14)
    // Le dome se resserre mais ne se ferme pas en pointe : une pointe est ce
    // qu on obtient en fermant un cylindre, pas ce que montre la
    // photographie, ou le fut finit en masse arrondie, epaisse encore la ou
    // partent les branches maitresses. Ferme en pointe, le dernier enfant
    // (le plus proche de la division du fut) sortait d un fut deja retombe a
    // presque rien : la branche flottait, visiblement detachee du bois.
    const creux = Math.sqrt(Math.max(0.0004, 1 - fin * fin))
    return fuseau * (0.4 + 0.6 * creux)
  }
  // Seulement la ou une branche sort d un membre plus gros qu elle : sur un
  // rameau pose au bout d une branche, le bourrelet le rendait plus gros que
  // son porteur, et la jonction se tordait en virgule.
  const force = segment.rang === 1 ? 0.55 : segment.rang === 2 ? 0.3 : 0
  const bourrelet = force * Math.exp(-distance / (segment.rayonDepart * 1.6))
  return fuseau * (1 + bourrelet)
}

export function fabriquerLeBois(segments: Segment[]): Bois {
  const personnes: string[] = []
  const positions: number[] = []
  const normales: number[] = []
  const uvs: number[] = []
  const plis: number[] = []
  const souplesses: number[] = []
  const quiEstCe: number[] = []
  const indices: number[] = []

  for (const segment of segments) {
    if (segment.personne !== '' && !personnes.includes(segment.personne)) personnes.push(segment.personne)
    const index = segment.personne === '' ? -1 : personnes.indexOf(segment.personne)
    const reperes = reperesDeLigne(segment.ligne)
    const premierSommet = positions.length / 3
    let longueur = 0

    for (let i = 0; i < segment.ligne.length; i += 1) {
      const t = i / (segment.ligne.length - 1)
      if (i > 0) longueur += segment.ligne[i].distanceTo(segment.ligne[i - 1])
      const rayon = rayonLeLongDeLaBranche(segment, t, longueur)
      // Les plis gardent la meme taille reelle sur une branche que sur le fut :
      // leur nombre suit donc le rayon, et il est entier pour qu il n y ait pas
      // de couture la ou le tour se referme.
      const plisIci = Math.max(6, Math.round((PLIS_DU_FUT * rayon) / MESURES.rayonSousLaFourche))
      const { droite, haut } = reperes[i]
      for (let j = 0; j <= segment.pans; j += 1) {
        const angle = (j / segment.pans) * Math.PI * 2
        const normale = droite.clone().multiplyScalar(Math.cos(angle)).addScaledVector(haut, Math.sin(angle))
        // Les bourrelets du fut : une section de baobab n est pas un cercle,
        // elle est bosselee, et ce sont ces bosses qui accrochent la lumiere
        // rasante. Trois lobes larges, sept petits, et rien sur les rameaux,
        // qui sont ronds.
        const bosse = segment.rang === 0
          ? 1 + 0.028 * Math.cos(3 * angle + longueur * 0.35) + 0.014 * Math.cos(7 * angle - longueur * 0.8)
          : segment.rang === 1
            ? 1 + 0.03 * Math.cos(3 * angle + longueur * 0.6)
            : 1
        const point = segment.ligne[i].clone().addScaledVector(normale, rayon * bosse)
        positions.push(point.x, point.y, point.z)
        normales.push(normale.x, normale.y, normale.z)
        uvs.push(j / segment.pans, longueur)
        plis.push(plisIci)
        // Le vent ne prend rien a la base d une branche et tout a son bout.
        souplesses.push(segment.souplesse * t * t)
        quiEstCe.push(index)
      }
    }

    const parAnneau = segment.pans + 1
    for (let i = 0; i < segment.ligne.length - 1; i += 1) {
      for (let j = 0; j < segment.pans; j += 1) {
        const a = premierSommet + i * parAnneau + j
        const b = a + parAnneau
        // L ordre des trois sommets decide de quel cote la face regarde. Dans
        // l autre ordre, avant x tangente donne la normale rentrante : chaque
        // tube etait retourne, et on voyait la paroi du fond par l interieur,
        // en voiles et en cornets autour des departs de branches.
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }

  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometrie.setAttribute('normal', new BufferAttribute(new Float32Array(normales), 3))
  geometrie.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometrie.setAttribute('aPlis', new BufferAttribute(new Float32Array(plis), 1))
  geometrie.setAttribute('aSouplesse', new BufferAttribute(new Float32Array(souplesses), 1))
  geometrie.setAttribute('aPersonne', new BufferAttribute(new Float32Array(quiEstCe), 1))
  geometrie.setIndex(indices)
  // Les bourrelets ont deplace la surface : une normale radiale ne colle plus
  // a la vraie pente. Elle se recalcule une fois, au chargement.
  geometrie.computeVertexNormals()
  geometrie.computeBoundingSphere()

  return { geometrie, personnes, triangles: indices.length / 3 }
}
