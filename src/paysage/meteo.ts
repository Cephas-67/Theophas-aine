// GOD2 · Theophas Aine : la pluie, la neige et l eclair
//
// Porte depuis `references/paysage-threeui.md`. Les deux volumes de gouttes et
// de flocons ne couvrent pas le monde : ils tiennent dans une boite de 34 sur
// 100 posee devant la camera et tournee avec elle. Un volume qui couvrirait le
// terrain entier demanderait cent fois plus de points pour la meme densite a
// l ecran, et on ne verrait jamais les quatre-vingt-dix-neuf centiemes.
//
// La variante demandee, `noon`, est par temps clair : rien de tout cela n est
// visible. C est porte quand meme parce que ce sont les trois autres temps du
// paysage, et qu un paysage ampute de ses temps n est plus le paysage.

import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  DirectionalLight,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  BufferGeometry,
  CanvasTexture,
  Quaternion,
  type Scene,
  Vector3,
} from 'three'
import { hauteurDuSol, penteDuSol } from './bruit'
import { toileHorsEcran } from './ciel'

const BOITE_L = 17
const BOITE_P = 50
const BOITE_H = 40

type Volume = {
  points: Points
  matiere: PointsMaterial
  pos: Float32Array
  donnees: Float32Array
  n: number
}

/** La trainee d une goutte : un trait fondu aux deux bouts, parce qu une
    goutte photographiee est un segment et non un point. */
function grainDeGoutte(): HTMLCanvasElement {
  const c = toileHorsEcran(64, 128)
  const g = c.getContext('2d')
  if (!g) return c
  const gr = g.createLinearGradient(0, 0, 0, 128)
  gr.addColorStop(0, 'rgba(255,255,255,0)')
  gr.addColorStop(0.28, 'rgba(255,255,255,.90)')
  gr.addColorStop(0.74, 'rgba(255,255,255,.90)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(31, 0, 2.6, 128)
  return c
}

function grainDeFlocon(): HTMLCanvasElement {
  const c = toileHorsEcran(64, 64)
  const g = c.getContext('2d')
  if (!g) return c
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.42, 'rgba(255,255,255,.72)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return c
}

function fabriquerVolume(
  scene: Scene,
  n: number,
  grain: HTMLCanvasElement,
  taille: number,
  opacite: number,
): Volume {
  const pos = new Float32Array(n * 3)
  const donnees = new Float32Array(n * 3)
  for (let i = 0; i < n; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 2 * BOITE_L
    pos[i * 3 + 1] = Math.random() * BOITE_H
    pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * BOITE_P
    donnees[i * 3] = Math.random()
    donnees[i * 3 + 1] = Math.random() * 6.283
    donnees[i * 3 + 2] = 0.6 + Math.random() * 0.8
  }
  const geometrie = new BufferGeometry()
  // Float32BufferAttribute recopie ce qu on lui donne : il faut garder SON
  // tableau. Ecrire dans celui d origine n atteindrait jamais la carte.
  const attribut = new Float32BufferAttribute(pos, 3)
  attribut.setUsage(DynamicDrawUsage)
  geometrie.setAttribute('position', attribut)
  const matiere = new PointsMaterial({
    map: new CanvasTexture(grain), size: taille, transparent: true,
    opacity: opacite, depthWrite: false, sizeAttenuation: true, color: 0xffffff,
  })
  const points = new Points(geometrie, matiere)
  points.frustumCulled = false
  points.visible = false
  points.renderOrder = 6
  scene.add(points)
  return { points, matiere, pos: attribut.array as Float32Array, donnees, n }
}

/** Le cycle d une poudrerie : calme, montee, souffle, retombee, en secondes.
    La neige ne tombe pas au meme rythme indefiniment, elle vient par bouffees. */
const POUDRERIE = [12, 6, 15, 8]
const CYCLE = POUDRERIE.reduce((a, b) => a + b, 0)
const palier = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }

function poudrerieA(tt: number): number {
  let u = tt % CYCLE
  if (u < 0) u += CYCLE
  if (u < POUDRERIE[0]) return 0
  u -= POUDRERIE[0]
  if (u < POUDRERIE[1]) return palier(u / POUDRERIE[1])
  u -= POUDRERIE[1]
  if (u < POUDRERIE[2]) return 1
  return 1 - palier((u - POUDRERIE[2]) / POUDRERIE[3])
}

export type Meteo = {
  pluie: Volume
  neige: Volume
  flaques: InstancedMesh
  matiereDesFlaques: MeshStandardMaterial
  eclair: DirectionalLight
  /** La neige deja posee, de 0 a 1 : elle s accumule et fond lentement. */
  posee: number
  /** L intensite de l eclair a cette image, que le ciel reprend a son compte. */
  lueur: number
  avancer: (dt: number, camera: PerspectiveCamera, azimut: number, etat: EtatDuTemps) => void
}

/** Ce que la boucle a besoin de savoir du temps qu il fait. */
export type EtatDuTemps = {
  pluie: number
  neige: number
  vitesseDeChute: number
  eclair: number
}

export function monterLaMeteo(scene: Scene): Meteo {
  // Les deux reserves sont taillees pour leur pire cas, l orage plein et la
  // poudrerie pleine, et rabotees par une plage de dessin le reste du temps.
  const pluie = fabriquerVolume(scene, 4400, grainDeGoutte(), 1.9, 0.50)
  const neige = fabriquerVolume(scene, 5200, grainDeFlocon(), 0.40, 0.88)
  const flaques = semerLesFlaques()
  scene.add(flaques)

  // L eclair n est pas dans la table des heures : il doit pouvoir flasher
  // par-dessus n importe quel ciel sans le deranger.
  const eclair = new DirectionalLight(0xe8eeff, 0)
  eclair.position.set(-46, 72, -30)
  eclair.target.position.set(0, 6, 0)
  scene.add(eclair)
  scene.add(eclair.target)

  const meteo: Meteo = {
    pluie, neige, flaques,
    matiereDesFlaques: flaques.material as MeshStandardMaterial,
    eclair, posee: 0, lueur: 0, avancer: () => {},
  }

  let horloge = 0
  let souffleK = 0
  let souffleT = 0
  let prochain = 5.5
  let age = 0
  let force = 0
  let coups: { t: number; a: number }[] = []

  const frapper = () => {
    // Un coup, c est plusieurs eclats : le traceur, puis les retours.
    const pres = Math.random()
    const s = 0.42 + pres * 0.58
    coups = [{ t: 0, a: s }]
    const n = 1 + ((Math.random() * 2.6) | 0)
    let tt = 0
    for (let i = 0; i < n; i += 1) {
      tt += 0.05 + Math.random() * 0.14
      coups.push({ t: tt, a: s * (0.30 + Math.random() * 0.65) })
    }
    age = 0
    const az = Math.random() * 6.283
    eclair.position.set(Math.sin(az) * 74, 58 + Math.random() * 34, Math.cos(az) * 74)
  }

  meteo.avancer = (dt, camera, azimut, etat) => {
    horloge += dt
    if (etat.neige > 0.02) { souffleT += dt; souffleK = poudrerieA(souffleT) }
    // Quitter la neige rembobine l horloge au debut du calme : arriver dans la
    // neige veut donc toujours dire de l air immobile d abord.
    else { souffleK = Math.max(0, souffleK - dt * 0.6); souffleT = 0 }
    const cible = etat.neige > 0.5 ? 1 : 0
    meteo.posee += (cible - meteo.posee) * (cible > meteo.posee ? dt / 24 : dt / 13)

    // L eclair
    if (etat.eclair > 0.55) {
      prochain -= dt
      if (prochain <= 0) { frapper(); prochain = 3.4 + Math.random() * 7.8 }
    } else if (coups.length === 0) {
      prochain = 2.2 + Math.random() * 4
    }
    if (coups.length > 0) {
      age += dt
      let v = 0
      for (const coup of coups) if (age >= coup.t) v += coup.a * Math.exp(-(age - coup.t) / 0.085)
      force = Math.min(1.4, v)
      if (age > 2.4) { coups.length = 0; force = 0 }
    } else if (force > 0.0005) {
      force *= Math.max(0, 1 - dt * 7)
    } else {
      force = 0
    }
    eclair.intensity = force * etat.eclair * 3.2
    meteo.lueur = force * etat.eclair

    // L objectif est court : le volume doit se tenir dans le champ, sinon les
    // gouttes tombent toutes hors cadre. On l ancre devant la camera.
    const ancrer = (o: Points | InstancedMesh) => {
      o.position.set(camera.position.x - Math.sin(azimut) * 46, 0, camera.position.z - Math.cos(azimut) * 46)
      o.rotation.y = azimut
    }

    if (pluie.points.visible) {
      ancrer(pluie.points)
      const p = pluie.pos
      const d = pluie.donnees
      const v = etat.vitesseDeChute
      // Un orage ne fait pas que tomber plus vite, il pousse plus fort.
      const biais = 2.4 * v * v
      for (let i = 0; i < pluie.n; i += 1) {
        p[i * 3 + 1] -= (34 + d[i * 3] * 26) * v * dt
        p[i * 3] -= biais * dt
        if (p[i * 3 + 1] < -2) {
          p[i * 3 + 1] = BOITE_H
          p[i * 3] = (Math.random() - 0.5) * 2 * BOITE_L
          p[i * 3 + 2] = (Math.random() - 0.5) * 2 * BOITE_P
        }
      }
      pluie.points.geometry.attributes.position.needsUpdate = true
    }

    if (neige.points.visible) {
      ancrer(neige.points)
      const p = neige.pos
      const d = neige.donnees
      // Dans une poudrerie les flocons cessent de flotter et se mettent a voyager.
      const chute = 1 + 1.9 * souffleK
      const derive = 1.1 + 7.2 * souffleK
      const rafale = 1 + 2.4 * souffleK
      for (let i = 0; i < neige.n; i += 1) {
        p[i * 3 + 1] -= (1.5 + d[i * 3] * 2.2) * chute * dt
        p[i * 3] += (Math.sin(horloge * 0.7 + d[i * 3 + 1]) * derive - 6.4 * souffleK * d[i * 3 + 2]) * dt
        p[i * 3 + 2] += Math.cos(horloge * 0.5 + d[i * 3 + 1]) * 0.8 * rafale * dt
        if (p[i * 3 + 1] < -2 || p[i * 3] < -BOITE_L * 1.6) {
          p[i * 3 + 1] = BOITE_H
          p[i * 3] = (Math.random() - 0.5) * 2 * BOITE_L
          p[i * 3 + 2] = (Math.random() - 0.5) * 2 * BOITE_P
        }
      }
      neige.points.geometry.attributes.position.needsUpdate = true
    }
  }

  return meteo
}

/** Les flaques : des disques presque plats, poses seulement la ou le terrain
    ne penche pratiquement pas. L eau ne tient pas sur une pente. */
function semerLesFlaques(): InstancedMesh {
  const geometrie = new CircleGeometry(1, 18)
  geometrie.rotateX(-Math.PI / 2)
  const matiere = new MeshStandardMaterial({
    color: 0x2b2f2c, roughness: 0.10, metalness: 0.34, transparent: true, opacity: 0,
  })
  const N = 90
  const semis = new InstancedMesh(geometrie, matiere, N)
  const m4 = new Matrix4()
  const place = new Vector3()
  const tour = new Quaternion()
  const taille = new Vector3()
  let n = 0
  let garde = 0
  while (n < N && garde < N * 20) {
    garde += 1
    const th = Math.random() * Math.PI * 2
    const r = 7 + Math.pow(Math.random(), 0.7) * 74
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    if (penteDuSol(x, z) > 0.12) continue
    const echelle = 0.7 + Math.pow(Math.random(), 1.6) * 2.6
    place.set(x, hauteurDuSol(x, z) + 0.035, z)
    taille.set(echelle * (1 + Math.random() * 0.5), 1, echelle * (0.7 + Math.random() * 0.6))
    tour.setFromAxisAngle(new Vector3(0, 1, 0), Math.random() * 6.283)
    m4.compose(place, tour, taille)
    semis.setMatrixAt(n, m4)
    n += 1
  }
  semis.count = n
  semis.instanceMatrix.needsUpdate = true
  semis.visible = false
  semis.receiveShadow = true
  return semis
}

/** L anneau d un impact de goutte, additif : il s ouvre et s eteint. */
export function grainDEclaboussure(): CanvasTexture {
  const S = 64
  const c = toileHorsEcran(S, S)
  const g = c.getContext('2d')
  if (g) {
    g.clearRect(0, 0, S, S)
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.lineWidth = 5
    g.beginPath()
    g.arc(S / 2, S / 2, S * 0.34, 0, 6.283)
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.35)'
    g.lineWidth = 9
    g.beginPath()
    g.arc(S / 2, S / 2, S * 0.34, 0, 6.283)
    g.stroke()
  }
  return new CanvasTexture(c)
}

/** Les anneaux d impact, poses a plat devant la camera et recycles. */
export function monterLesEclaboussures(scene: Scene): {
  semis: InstancedMesh
  avancer: (dt: number, camera: PerspectiveCamera, azimut: number, combien: number) => void
} {
  const geometrie = new PlaneGeometry(1, 1)
  geometrie.rotateX(-Math.PI / 2)
  const matiere = new MeshBasicMaterial({
    map: grainDEclaboussure(), transparent: true, depthWrite: false,
    blending: AdditiveBlending, color: 0xffffff,
  })
  const N = 150
  const semis = new InstancedMesh(geometrie, matiere, N)
  semis.frustumCulled = false
  semis.visible = false
  scene.add(semis)

  const age = new Float32Array(N)
  const vie = new Float32Array(N)
  const px = new Float32Array(N)
  const pz = new Float32Array(N)
  for (let i = 0; i < N; i += 1) { age[i] = Math.random(); vie[i] = 0.42 + Math.random() * 0.34 }
  const m4 = new Matrix4()
  const couleur = new Color()

  const avancer = (dt: number, camera: PerspectiveCamera, azimut: number, combien: number) => {
    if (!semis.visible) return
    const ax = camera.position.x - Math.sin(azimut) * 40
    const az2 = camera.position.z - Math.cos(azimut) * 40
    for (let i = 0; i < N; i += 1) {
      age[i] += dt
      if (age[i] >= vie[i]) {
        age[i] = 0
        vie[i] = 0.42 + Math.random() * 0.34
        const lx = (Math.random() - 0.5) * 44
        const lz = (Math.random() - 0.5) * 90
        px[i] = ax + lx * Math.cos(azimut) + lz * Math.sin(azimut)
        pz[i] = az2 - lx * Math.sin(azimut) + lz * Math.cos(azimut)
      }
      const t = age[i] / vie[i]
      const echelle = 0.16 + t * 1.15
      m4.makeScale(echelle, 1, echelle)
      m4.setPosition(px[i], hauteurDuSol(px[i], pz[i]) + 0.06, pz[i])
      semis.setMatrixAt(i, m4)
      const f = Math.pow(1 - t, 1.9) * combien * 0.42
      couleur.setRGB(f, f * 1.02, f * 1.05)
      semis.setColorAt(i, couleur)
    }
    semis.instanceMatrix.needsUpdate = true
    if (semis.instanceColor) semis.instanceColor.needsUpdate = true
  }

  return { semis, avancer }
}
