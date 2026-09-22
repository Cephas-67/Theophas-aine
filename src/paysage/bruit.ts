// GOD2 · Theophas Aine : le bruit et le relief du paysage
//
// Porte mot pour mot depuis `references/paysage-threeui.md`, fichier
// `public/landscape.html`, revision e8aab48. Le bruit simplexe, ses deux
// accumulations et la hauteur du terrain sont recopies tels quels : la graine
// 1337, la permutation, les frequences, les seuils. Une seule de ces valeurs
// changee et ce n est plus le meme paysage, c est un paysage qui lui
// ressemble.
//
// La hauteur est analytique et non lue dans une grille : c est ce qui permet
// de semer l herbe et les pierres exactement sur le sol, a n importe quel
// endroit, sans jamais interpoler.

/** Le bruit simplexe de la source, sa graine et sa permutation comprises. */
const NZ = (() => {
  const g3 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
  const perm = new Uint8Array(512)
  const pp = new Uint8Array(256)
  let sd = 1337
  for (let i = 0; i < 256; i += 1) pp[i] = i
  for (let i = 255; i > 0; i -= 1) {
    sd = (sd * 1664525 + 1013904223) & 0xffffffff
    const j = (sd >>> 16) % (i + 1)
    const t = pp[i]
    pp[i] = pp[j]
    pp[j] = t
  }
  for (let i = 0; i < 512; i += 1) perm[i] = pp[i & 255]

  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6

  function sn(xin: number, yin: number): number {
    const sk = (xin + yin) * F2
    const i = Math.floor(xin + sk)
    const j = Math.floor(yin + sk)
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    let i1: number
    let j1: number
    if (x0 > y0) { i1 = 1; j1 = 0 } else { i1 = 0; j1 = 1 }
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    let n0 = 0
    let n1 = 0
    let n2 = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      const g = g3[perm[ii + perm[jj]] & 7]
      t0 *= t0
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0)
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      const g = g3[perm[ii + i1 + perm[jj + j1]] & 7]
      t1 *= t1
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1)
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      const g = g3[perm[ii + 1 + perm[jj + 1]] & 7]
      t2 *= t2
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2)
    }
    return 70 * (n0 + n1 + n2)
  }

  /** Le bruit accumule : chaque octave deux fois plus fine et deux fois moins
      forte. Le 2.02 n est pas un 2 arrondi, c est ce qui evite que les
      octaves se calent les unes sur les autres et fassent une grille. */
  function fbm(x: number, y: number, o: number): number {
    let s = 0
    let a = 0.5
    let f = 1
    for (let i = 0; i < o; i += 1) { s += sn(x * f, y * f) * a; a *= 0.5; f *= 2.02 }
    return s
  }

  /** L accumulation a cretes : on replie le bruit sur sa valeur absolue, ce
      qui remplace les creux arrondis par des aretes. C est elle qui donne les
      montagnes du fond, et le bruit lisse seul ne donnait que des dunes. */
  function ridged(x: number, y: number, o: number): number {
    let s = 0
    let a = 0.5
    let f = 1
    let pv = 1
    for (let i = 0; i < o; i += 1) {
      let n = 1 - Math.abs(sn(x * f, y * f))
      n *= n
      n *= pv
      pv = n
      s += n * a
      a *= 0.5
      f *= 2.03
    }
    return s
  }

  return { sn, fbm, ridged }
})()

export const bruit = NZ

/** Le palier doux de GLSL, en JavaScript : borne puis adouci aux deux bouts. */
export const sm01 = (t: number): number => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Plat jusqu au rayon de la cour, puis un renflement, puis des collines qui
    grandissent avec la distance. */
export const FLAT_R = 104
export const HILL_R = 224

/** La hauteur du sol en un point. */
export function hauteurDuSol(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const s = 0.0042
  const mid = NZ.fbm(x * s * 3.2 + 4, z * s * 3.2 + 9, 4)
  const fine = NZ.fbm(x * s * 11 + 21, z * s * 11 + 3, 3)
  const soft = sm01((r - 20) / 78) * 2.4 * (mid * 0.62 + fine * 0.38)
  const k = sm01((r - FLAT_R) / (HILL_R - FLAT_R))
  const grow = 0.30 + Math.min(1, r / 620) * 2.35
  const big = NZ.ridged(x * s + 11, z * s + 7, 5)
  const hill = (big * 20 + mid * 4.6 + fine * 1.2 - 5.6) * k * grow
  return soft + hill
}

/** La normale du sol, prise par difference finie sur un empan donne. Loin de
    l origine on elargit l empan : sur un maillage dont les mailles grandissent
    avec le rayon, une normale prise sur un empan fixe decrit un relief que le
    maillage ne rend pas, et le terrain se met a grener. */
export function normaleDuSol(x: number, z: number, e = 1.2): [number, number, number] {
  const hx = hauteurDuSol(x + e, z) - hauteurDuSol(x - e, z)
  const hz = hauteurDuSol(x, z + e) - hauteurDuSol(x, z - e)
  return [-hx / (2 * e), 1, -hz / (2 * e)]
}

/** La pente du sol en radians : c est elle qui decide ou la pierre tient et ou
    l herbe pousse. */
export function penteDuSol(x: number, z: number): number {
  const n = normaleDuSol(x, z)
  const l = Math.hypot(n[0], n[1], n[2])
  return Math.acos(n[1] / l)
}
