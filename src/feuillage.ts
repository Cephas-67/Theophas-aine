// GOD2 · Theophas Aine : le feuillage
//
// Les cartes de feuillage sont des copies instanciees : un seul appel de
// dessin pour tout le houppier, et aucune image. La carte n est pas une
// feuille mais un bouquet, parce qu a l echelle de l arbre une feuille de
// baobab fait un dixieme d unite et qu il en faudrait des dizaines de milliers.

import {
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  Material,
  Object3D,
  PlaneGeometry,
} from 'three'
import type { Segment } from './squelette'
import { MESURES } from './squelette'

/** Combien de cartes par bouquet de rameaux, et leur taille.
    Treize et non quatorze : le feuillage descend maintenant d un etage de
    fourche, ce qui fait un huitieme de bouquets en plus, et le houppier doit
    rester au meme prix. */
const PAR_BOUQUET = 13
const TAILLE = MESURES.rayonDeCouronne * 0.085

export function fabriquerLeFeuillage(segments: Segment[], matiere: Material): InstancedMesh {
  const feuillus = segments.filter((s) => s.feuillu)
  const combien = feuillus.length * PAR_BOUQUET
  const carte = new PlaneGeometry(1, 1)
  const maille = new InstancedMesh(carte, matiere, combien)
  maille.castShadow = true
  maille.receiveShadow = true

  const pose = new Object3D()
  const tirages = new Float32Array(combien)
  // La place de chaque carte dans la couronne, du pied de houppier a la cime.
  // Elle sert a peindre : un houppier est clair dessus, ou le soleil entre, et
  // sombre dessous, ou il n entre plus. Sans elle la teinte se tire au hasard
  // carte par carte, et la couronne sort mouchetee, sans dessus ni dessous.
  const hauteurs = new Float32Array(combien)
  let bas = Infinity
  let haut = -Infinity
  let n = 0

  for (const rameau of feuillus) {
    const axe = rameau.bout.clone().sub(rameau.ligne[0]).normalize()
    for (let i = 0; i < PAR_BOUQUET; i += 1) {
      // Le tirage est fait ici et pas dans le nuanceur : il sert deux fois, a
      // poser la carte et a la peindre, et les deux doivent s accorder.
      const t = (i + 0.5) / PAR_BOUQUET
      const angle = i * 2.399 // l angle d or, pour que les cartes ne s alignent pas
      const rayon = TAILLE * (0.4 + 0.95 * t)
      pose.position.copy(rameau.ligne[0]).addScaledVector(axe, rameau.bout.distanceTo(rameau.ligne[0]) * (0.35 + t * 0.75))
      pose.position.x += Math.cos(angle) * rayon
      pose.position.z += Math.sin(angle) * rayon
      pose.position.y += Math.sin(angle * 1.7) * rayon * 0.9
      pose.rotation.set(
        Math.sin(angle * 2.7) * 0.9,
        angle * 1.31,
        Math.cos(angle * 1.9) * 0.8,
      )
      const echelle = TAILLE * (0.7 + ((i * 37) % 13) / 11)
      pose.scale.setScalar(echelle)
      pose.updateMatrix()
      maille.setMatrixAt(n, pose.matrix)
      tirages[n] = ((i * 53 + n * 17) % 97) / 97
      hauteurs[n] = pose.position.y
      if (pose.position.y < bas) bas = pose.position.y
      if (pose.position.y > haut) haut = pose.position.y
      n += 1
    }
  }

  const empan = Math.max(0.001, haut - bas)
  for (let i = 0; i < combien; i += 1) hauteurs[i] = (hauteurs[i] - bas) / empan

  carte.setAttribute('aTirage', new InstancedBufferAttribute(tirages, 1) as unknown as BufferAttribute)
  carte.setAttribute('aHaut', new InstancedBufferAttribute(hauteurs, 1) as unknown as BufferAttribute)
  maille.instanceMatrix.needsUpdate = true
  maille.frustumCulled = false
  return maille
}

/** Ce que le houppier coute, pour le banc. */
export function compterLeFeuillage(segments: Segment[]) {
  const cartes = segments.filter((s) => s.feuillu).length * PAR_BOUQUET
  return { cartes, triangles: cartes * 2 }
}
