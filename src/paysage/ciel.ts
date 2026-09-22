// GOD2 · Theophas Aine : la voute et les etoiles
//
// Porte depuis `references/paysage-threeui.md` : la sphere de rayon 900 vue
// par l interieur, son degrade peint sur une bande de 8 par 512 pixels a six
// arrets, et le champ d etoiles a trois classes de taille.
//
// Le ciel est ici dans la scene et non peint en CSS derriere la toile, comme
// il l etait tant qu il n y avait qu un degrade vertical. Ce paysage a un
// horizon : le degrade doit s enrouler autour de la camera et passer derriere
// les collines, pas rester colle a l ecran pendant qu on tourne.

import {
  AdditiveBlending,
  BackSide,
  Color,
  CanvasTexture,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  type Scene,
  SphereGeometry,
  BufferGeometry,
  sRGBEncoding,
} from 'three'

/** Une toile hors ecran, la fonction `cv` de la source. */
export function toileHorsEcran(w: number, h?: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h ?? w
  return c
}

const ARRETS = [0, 0.28, 0.46, 0.60, 0.74, 1.0]

export type Ciel = {
  peindre: (couleurs: Color[]) => void
  matiere: MeshBasicMaterial
  /** Les trois classes d etoiles, pour les eteindre au lever du jour et pour
      que le banc puisse les demonter. */
  couches: PointsMaterial[]
  combien: number
}

/** La voute et son degrade. Les couleurs recues sont deja lineaires : c est la
    texture qui est declaree en sRGB, comme dans la source, et three refait la
    conversion au moment de lire le pixel. On repasse donc par l hexadecimal
    d origine pour peindre, sans quoi le ciel sortirait delave. */
export function monterLeCiel(scene: Scene): Ciel {
  const toile = toileHorsEcran(8, 512)
  const matiere = new MeshBasicMaterial({ side: BackSide, fog: false, depthWrite: false })
  const texture = new CanvasTexture(toile)
  texture.encoding = sRGBEncoding
  matiere.map = texture

  const voute = new Mesh(new SphereGeometry(900, 32, 24), matiere)
  voute.renderOrder = -20
  scene.add(voute)

  const peindre = (couleurs: Color[]) => {
    const g = toile.getContext('2d')
    if (!g) return
    const degrade = g.createLinearGradient(0, 0, 0, 512)
    couleurs.forEach((c, i) => {
      degrade.addColorStop(ARRETS[i], '#' + ('000000' + c.getHexString()).slice(-6))
    })
    g.fillStyle = degrade
    g.fillRect(0, 0, 8, 512)
    texture.needsUpdate = true
  }

  const { couches, combien } = semerLesEtoiles(scene)
  return { peindre, matiere, couches, combien }
}

/** Le grain d une etoile : un disque fondu de 64 pixels, avec les quatre
    arrets de la source. Un point carre se voit des qu il fait plus d un pixel,
    et a la troisieme classe il en fait cinq. */
function grainDEtoile(): HTMLCanvasElement {
  const S = 64
  const c = toileHorsEcran(S, S)
  const g = c.getContext('2d')
  if (!g) return c
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.25, 'rgba(255,255,255,.85)')
  gr.addColorStop(0.55, 'rgba(255,255,255,.18)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, S, S)
  return c
}

/**
 * Le champ d etoiles : trois classes de taille, semees sur une sphere de 760.
 *
 * Le tirage est celui de la source, graine comprise : deux chargements donnent
 * le meme ciel. Une etoile sur quatre tombe dans une bande lache, la voie
 * lactee, et les autres se repartissent sur la bande d elevation que la camera
 * peut atteindre. La teinte suit un tirage : une sur huit chaude, une sur huit
 * bleue, le reste blanc casse.
 *
 * Les trois classes de la source font 39 200 points, et c est ce compte-la qui
 * est seme, sur telephone comme ailleurs.
 */
function semerLesEtoiles(scene: Scene): { couches: PointsMaterial[]; combien: number } {
  let graine = 20260809
  const tire = () => { graine = (graine * 1664525 + 1013904223) >>> 0; return graine / 4294967296 }
  const pixels = Math.min(window.devicePixelRatio || 1, 2)
  const CLASSES: [number, number][] = [
    [30000, 1.8 * pixels],
    [7500, 2.9 * pixels],
    [1700, 5.0 * pixels],
  ]
  const texture = new CanvasTexture(grainDEtoile())
  const couches: PointsMaterial[] = []
  let combien = 0

  for (const [N, px] of CLASSES) {
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    for (let i = 0; i < N; i += 1) {
      let u: number
      const th = tire() * Math.PI * 2
      if (i % 4 === 0) {
        u = Math.sin(th * 0.5 + 0.9) * 0.34 + 0.26 + (tire() - 0.5) * 0.20
      } else {
        u = -0.09 + tire() * 0.91
      }
      u = Math.max(-0.09, Math.min(0.86, u))
      const R = 760
      const s = Math.sqrt(Math.max(0, 1 - u * u))
      pos[i * 3] = Math.cos(th) * s * R
      pos[i * 3 + 1] = u * R
      pos[i * 3 + 2] = Math.sin(th) * s * R
      const w = tire()
      const c = w > 0.88 ? [1, 0.87, 0.70] : w < 0.13 ? [0.74, 0.84, 1] : [0.97, 0.97, 0.93]
      const b = 0.46 + Math.pow(tire(), 1.7) * 0.54
      col[i * 3] = c[0] * b
      col[i * 3 + 1] = c[1] * b
      col[i * 3 + 2] = c[2] * b
    }
    const geometrie = new BufferGeometry()
    geometrie.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geometrie.setAttribute('color', new Float32BufferAttribute(col, 3))
    const matiere = new PointsMaterial({
      size: px, map: texture, vertexColors: true, transparent: true,
      opacity: 0, depthWrite: false, fog: false, sizeAttenuation: false,
      blending: AdditiveBlending,
    })
    const points = new Points(geometrie, matiere)
    points.renderOrder = -15
    // Une voute n a pas de boite qui tienne : sans ca elle disparait des que
    // son centre sort du champ, et la moitie du ciel s eteint d un coup.
    points.frustumCulled = false
    scene.add(points)
    couches.push(matiere)
    combien += N
  }
  return { couches, combien }
}
