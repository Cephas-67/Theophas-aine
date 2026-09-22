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

/** Combien de cartes par bouquet de rameaux, et leur taille. */
const PAR_BOUQUET = 14
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
      n += 1
    }
  }

  carte.setAttribute('aTirage', new InstancedBufferAttribute(tirages, 1) as unknown as BufferAttribute)
  maille.instanceMatrix.needsUpdate = true
  maille.frustumCulled = false
  return maille
}

/** Ce que le houppier coute, pour le banc. */
export function compterLeFeuillage(segments: Segment[]) {
  const cartes = segments.filter((s) => s.feuillu).length * PAR_BOUQUET
  return { cartes, triangles: cartes * 2 }
}
