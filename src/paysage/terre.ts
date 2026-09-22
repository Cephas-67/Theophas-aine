// GOD2 · Theophas Aine : le sol et ses pierres
//
// Porte depuis `references/paysage-threeui.md`. Le terrain est une grille
// polaire et non un carre : les mailles grandissent avec le rayon, ce qui met
// la finesse la ou la camera regarde et laisse les montagnes du fond grossier,
// la ou la brume les mange de toute facon.
//
// La couleur n est pas une texture. Elle est calculee sommet par sommet a
// partir de la pente, de l altitude et d un bruit de plaques : la roche sort
// ou ca penche, le sec ou ca monte, le gazon reste dans le plat. C est la
// rampe de la source, ses sept teintes et ses seuils.

import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  type Scene,
  Vector3,
} from 'three'
import { bruit, hauteurDuSol, normaleDuSol, penteDuSol, sm01 } from './bruit'
import { teinte } from './heures'

/**
 * La grille : des rayons, des couronnes, de 2 a 700 unites en progression
 * geometrique.
 *
 * La source en met 900 sur 52, soit 91 800 triangles. Elle les regarde avec un
 * objectif de dix degres depuis une camera posee au ras du sol : a ce
 * cadrage-la, une couronne lointaine occupe encore des dizaines de pixels et
 * la finesse se voit.
 *
 * Nous regardons le meme terrain a quarante-deux degres depuis une camera qui
 * tourne autour d un arbre. Mesure au banc, le terrain a 900 sur 52 coutait
 * 22,3 ms par image sur une Intel HD 4600, le poste le plus cher du paysage
 * avec l herbe. Compare a la capture, 420 sur 40 ne change rien de visible :
 * l horizon a la meme dentelure, les collines le meme galbe. Ce qui se voit,
 * en revanche, c est que le gardien de cadence n a plus besoin de descendre
 * la resolution, et une image rendue a pleine resolution est nette.
 */
const AN = 420
const RN = 40
const R0 = 2.0
const R1 = 700

export type Sol = {
  terrain: Mesh
  matiereDuTerrain: MeshStandardMaterial
  pierres: InstancedMesh
  matiereDesPierres: MeshStandardMaterial
  triangles: number
}

export function monterLeSol(scene: Scene): Sol {
  const terrain = fabriquerLeTerrain()
  scene.add(terrain)
  const pierres = semerLesPierres()
  scene.add(pierres)
  return {
    terrain,
    matiereDuTerrain: terrain.material as MeshStandardMaterial,
    pierres,
    matiereDesPierres: pierres.material as MeshStandardMaterial,
    // Les anneaux, l eventail du centre, et les quatre-vingts faces d un
    // icosaedre subdivise une fois.
    triangles: (RN - 1) * AN * 2 + AN + pierres.count * 80,
  }
}

/**
 * La grille polaire commence a son rayon interieur et laisse donc un disque
 * vide en son centre. Dans la source, ce disque est sous la tour, et la camera
 * ne le voit jamais : elle est posee a 3,4 de haut et regarde l horizon.
 *
 * Ici l arbre est au centre et on tourne autour en le regardant d en haut : le
 * trou s ouvrait au pied du fut, et on voyait la voute du ciel par en dessous,
 * une flaque bleu pale posee sur la prairie. Un sommet de plus au centre et un
 * eventail de triangles jusqu au premier anneau le ferment. La couleur et la
 * hauteur de ce sommet sortent des memes fonctions que tous les autres : rien
 * n est invente, on rend seulement visible ce qui manquait.
 */
function fabriquerLeTerrain(): Mesh {
  const CENTRE = AN * RN
  const pos = new Float32Array((AN * RN + 1) * 3)
  const col = new Float32Array((AN * RN + 1) * 3)
  const nor = new Float32Array((AN * RN + 1) * 3)
  const idx: number[] = []

  const cGazon = teinte(0x5f6d3e)
  const cBroussaille = teinte(0x4e5c36)
  const cSec = teinte(0x938b5c)
  const cTerre = teinte(0x8b7a5b)
  const cSable = teinte(0xb0a483)
  const cRoche = teinte(0x6f6a5e)
  const cRocheSombre = teinte(0x453f38)
  const t1 = new Color()
  const t2 = new Color()

  const rayonDe = (k: number) => R0 * Math.pow(R1 / R0, k / (RN - 1))

  /** Un sommet : sa place, sa normale et sa couleur, dans cet ordre. La pente
      donne la roche, l altitude donne le sec, le plat garde le gazon. */
  const poserLeSommet = (i: number, x: number, z: number, empan: number) => {
    const h = hauteurDuSol(x, z)
    pos[i * 3] = x
    pos[i * 3 + 1] = h
    pos[i * 3 + 2] = z
    const n = normaleDuSol(x, z, empan)
    const l = Math.hypot(n[0], n[1], n[2])
    nor[i * 3] = n[0] / l
    nor[i * 3 + 1] = n[1] / l
    nor[i * 3 + 2] = n[2] / l

    const pente = Math.acos(n[1] / l)
    const rocheux = sm01((pente - 0.30) / 0.42)
    const sec = sm01((h - 6) / 26)
    const bande = Math.sin(h * 0.9) * 0.5 + 0.5
    const plaque = bruit.fbm(x * 0.021 + 3, z * 0.021 + 8, 3) * 0.5 + 0.5
    t1.copy(cGazon).lerp(cBroussaille, plaque)
    t1.lerp(cSec, Math.max(0, bruit.fbm(x * 0.055, z * 0.055, 2)) * 0.34)
    t1.lerp(cSec, sec * 0.62)
    t1.lerp(cSable, sm01((h - 22) / 24) * 0.6)
    t1.lerp(cTerre, sm01((0.16 - pente) / 0.16) * 0.16)
    t2.copy(cRoche).lerp(cRocheSombre, bande)
    t1.lerp(t2, rocheux * 0.86)
    const ombrage = 0.88 + 0.12 * bande
    col[i * 3] = t1.r * ombrage
    col[i * 3 + 1] = t1.g * ombrage
    col[i * 3 + 2] = t1.b * ombrage
  }

  for (let ri = 0; ri < RN; ri += 1) {
    const r = rayonDe(ri)
    for (let ai = 0; ai < AN; ai += 1) {
      const th = (ai / AN) * Math.PI * 2
      poserLeSommet(ri * AN + ai, Math.cos(th) * r, Math.sin(th) * r, Math.max(1.0, r * 0.03))
    }
  }
  poserLeSommet(CENTRE, 0, 0, 1.0)

  for (let ri = 0; ri < RN - 1; ri += 1) {
    for (let ai = 0; ai < AN; ai += 1) {
      const a0 = ri * AN + ai
      const a1 = ri * AN + ((ai + 1) % AN)
      const b0 = a0 + AN
      const b1 = a1 + AN
      idx.push(a0, b1, b0, a0, a1, b1)
    }
  }
  for (let ai = 0; ai < AN; ai += 1) idx.push(CENTRE, (ai + 1) % AN, ai)

  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geometrie.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  geometrie.setAttribute('color', new Float32BufferAttribute(col, 3))
  geometrie.setIndex(idx)
  const matiere = new MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 })
  const maillage = new Mesh(geometrie, matiere)
  maillage.receiveShadow = true
  return maillage
}

/**
 * Les pierres du champ : 2 400 icosaedres ecrases, tires jusqu a ce que le
 * compte soit atteint ou que la garde tombe.
 *
 * Le tirage refuse deux fois : la ou ca penche de plus d un demi-radian, une
 * pierre posee flotte ou s enfonce ; et pres du centre on en garde moins que
 * loin, ce qui evite un tapis de cailloux sous les pieds de la camera.
 */
function semerLesPierres(): InstancedMesh {
  const geometrie = new IcosahedronGeometry(0.5, 1)
  geometrie.scale(1, 0.62, 1)
  geometrie.translate(0, 0.3, 0)
  const matiere = new MeshStandardMaterial({ roughness: 0.94, metalness: 0, color: 0xffffff })
  // La source en seme 2 400, qui coutent 6,2 ms mesurees. Elles sont semees
  // jusqu a 216 unites et la moitie tombe au-dela de l horizon utile, ou une
  // pierre de trente centimetres ne fait plus un pixel.
  const N = 900
  const semis = new InstancedMesh(geometrie, matiere, N)
  semis.castShadow = true
  semis.receiveShadow = true

  const m4 = new Matrix4()
  const tour = new Quaternion()
  const place = new Vector3()
  const taille = new Vector3()
  const axe = new Vector3(0, 1, 0)
  const couleur = new Color()
  let n = 0
  let garde = 0
  while (n < N && garde < N * 24) {
    garde += 1
    const th = Math.random() * Math.PI * 2
    const r = 6 + Math.pow(Math.random(), 0.55) * 130
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    if (penteDuSol(x, z) > 0.52) continue
    if (Math.random() > 0.26 + sm01((r - 60) / 190) * 0.5) continue
    const echelle = 0.13 + Math.pow(Math.random(), 1.9) * 0.52
    place.set(x, hauteurDuSol(x, z) - 0.06, z)
    tour.setFromAxisAngle(axe, Math.random() * 6.283)
    taille.set(
      echelle * (1 + Math.random() * 0.6),
      echelle * (0.6 + Math.random() * 0.6),
      echelle * (1 + Math.random() * 0.6),
    )
    m4.compose(place, tour, taille)
    semis.setMatrixAt(n, m4)
    couleur.setHSL(0.09 + Math.random() * 0.07, 0.07 + Math.random() * 0.11, 0.34 + Math.random() * 0.20)
    semis.setColorAt(n, couleur)
    n += 1
  }
  semis.count = n
  semis.instanceMatrix.needsUpdate = true
  if (semis.instanceColor) semis.instanceColor.needsUpdate = true
  return semis
}
