// GOD2 · Theophas Aine : le fil de la genealogie
//
// L arbre dit la famille par sa forme, mais sa forme est aussi celle d un
// arbre : les rameaux, le feuillage et les fourches anonymes occupent l oeil
// autant que les six branches qui portent quelqu un. Le fil tranche : il monte
// du pied, suit le fut, se divise a chaque enfant, se divise encore a chaque
// petit-enfant, et s arrete a chaque visage.
//
// Il ne double pas le bois, il en suit le trace : chaque branche qui porte
// quelqu un est parcourue, et comme une branche seconde part du bout de celle
// de son parent, le fil est continu du bas vers le haut sans qu on ait a le
// recoudre.
//
// Il passe devant tout, feuillage compris. C est voulu : un fil de lecture
// qu une feuille peut cacher ne se lit plus, et c est justement quand la
// couronne est dense qu on en a besoin.

import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three'
import { couleur } from './matieres'
import { HAUTEUR, type Segment } from './squelette'

/** L epaisseur du fil. Un trait de ligne WebGL fait un pixel et pas un de
    plus, quelle que soit la largeur demandee : sur la plupart des cartes, la
    largeur d une ligne n est tout simplement pas implementee. Le fil est donc
    un tube.

    Deux millemes de la hauteur, soit deux centimetres sur un arbre de dix
    metres. Sept millemes ont ete essayes : depuis la vue d ensemble, a quatre
    hauteurs d arbre, ca donnait des tuyaux bleus plus gros que les branches,
    qui cachaient le fut au lieu de le suivre. Un fil se suit, il ne se
    substitue pas. */
const EPAISSEUR = HAUTEUR * 0.0022
const PANS = 5

export type Fil = {
  maillage: Mesh
  triangles: number
}

/**
 * Le fil, cousu en une seule geometrie : un appel de dessin pour la lignee
 * entiere.
 */
export function tirerLeFil(segments: Segment[]): Fil {
  const places: number[] = []
  const index: number[] = []

  for (const segment of segments) {
    if (segment.personne === '') continue
    coudreUnTube(segment.ligne, places, index)
  }

  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new Float32BufferAttribute(places, 3))
  geometrie.setIndex(index)
  geometrie.computeVertexNormals()

  // Sans eclairage : le fil n est pas une matiere de la scene, c est un trait
  // pose dessus. Une lumiere qui le prendrait de biais l eteindrait d un cote,
  // et un trait de lecture a moitie eteint ne se suit plus.
  const matiere = new MeshBasicMaterial({
    color: couleur('#0f3efa'),
    transparent: true,
    opacity: 0.78,
    depthTest: false,
    fog: false,
  })

  const maillage = new Mesh(geometrie, matiere)
  maillage.renderOrder = 8
  maillage.frustumCulled = false
  return { maillage, triangles: index.length / 3 }
}

/** Un tube de section constante le long d une ligne. Le repere est transporte
    d un anneau au suivant : remis a zero en cours de route, la section tourne
    d un quart de tour entre deux anneaux et le tube se plie en virgule. */
function coudreUnTube(ligne: Vector3[], places: number[], index: number[]): void {
  const depart = places.length / 3
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
  const premier = ligne[1].clone().sub(ligne[0]).normalize()
  let droite = axes.reduce((a, b) => (Math.abs(a.dot(premier)) < Math.abs(b.dot(premier)) ? a : b)).clone()

  for (let i = 0; i < ligne.length; i += 1) {
    const avant = (i === ligne.length - 1
      ? ligne[i].clone().sub(ligne[i - 1])
      : ligne[i + 1].clone().sub(ligne[i])).normalize()
    droite.addScaledVector(avant, -droite.dot(avant)).normalize()
    const haut = new Vector3().crossVectors(avant, droite).normalize()
    droite = new Vector3().crossVectors(haut, avant).normalize()
    for (let p = 0; p < PANS; p += 1) {
      const angle = (p / PANS) * Math.PI * 2
      const point = ligne[i].clone()
        .addScaledVector(droite, Math.cos(angle) * EPAISSEUR)
        .addScaledVector(haut, Math.sin(angle) * EPAISSEUR)
      places.push(point.x, point.y, point.z)
    }
  }

  for (let i = 0; i < ligne.length - 1; i += 1) {
    for (let p = 0; p < PANS; p += 1) {
      const a = depart + i * PANS + p
      const b = depart + i * PANS + ((p + 1) % PANS)
      index.push(a, b, a + PANS, b, b + PANS, a + PANS)
    }
  }
}
