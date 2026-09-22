// GOD2 · Theophas Aine : ce qui bouge dans le paysage
//
// Des nuages qui derivent, un vol d oiseaux, quelques papillons au-dessus de
// l herbe, un mouton qui broute. Rien de tout cela n est un fichier 3D ni une
// image : ce sont des geometries montees a la main.
//
// Les nombres viennent de mesures publiees, pas d une estimation a l oeil :
//
//   nuage    2,5 unites par seconde. Le cumulus derive entre 5 et 10 miles a
//            l heure selon la NOAA, soit 2,2 a 4,5 m/s ; une unite vaut un
//            metre.
//   oiseau   2,3 battements par seconde, ceux du goeland argente, et 9,7 m/s
//            en croisiere, les 35 km/h de son vol le plus econome. C est aussi
//            le pas des oiseaux de kondo, qui battent en 0,46 s : 2,2 par
//            seconde.
//   papillon 6 battements par seconde, mesures sur Pieris ; 0,4 a 1,3 m/s en
//            vol libre ; une trajectoire erratique, qui monte a chaque
//            abattee et retombe a chaque remontee.
//   mouton   1,1 m/s au pas, l allure confortable relevee sur tapis de
//            pression.

import {
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  type Scene,
  SphereGeometry,
  Vector3,
} from 'three'
import { toileHorsEcran } from './paysage/ciel'
import { teinte } from './paysage/heures'

/** Un tirage reproductible, celui du champ d etoiles.
    Sans lui, deux chargements ne donnent pas le meme vol, et deux captures ne
    se comparent pas : on croit avoir change une silhouette alors qu on a
    seulement regarde un autre oiseau. */
function tirage(graine: number) {
  let etat = graine >>> 0
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0
    return etat / 4294967296
  }
}

const DERIVE_DU_NUAGE = 2.5
const BATTEMENTS_DE_L_OISEAU = 2.3
const VITESSE_DE_L_OISEAU = 9.7
const BATTEMENTS_DU_PAPILLON = 6
const PAS_DU_MOUTON = 1.1

const HAUT = new Vector3(0, 1, 0)
const DEUX_COTES = [1, -1]

export type Vivant = {
  /** Ce que ca coute, pour le banc. */
  cout: { nuages: number; oiseaux: number; papillons: number }
  avancer: (dt: number) => void
}

/** Les oiseaux et les papillons ont besoin de savoir ou se tient l oeil :
    les uns traversent devant lui, les autres se tournent vers lui. */
export function monterLeVivant(scene: Scene, oeil: Vector3): Vivant {
  const nuages = semerLesNuages(scene)
  const oiseaux = lacherLesOiseaux(scene, oeil)
  const papillons = lacherLesPapillons(scene, oeil)
  const mouton = poserLeMouton(scene)

  // Poses une premiere fois des le montage : une capture faite avant la
  // premiere image montrait un paysage sans rien dedans.
  let horloge = 0
  oiseaux.avancer(0, 0)
  papillons.avancer(0, 0)
  mouton.avancer(0, 0)

  return {
    cout: { nuages: nuages.combien, oiseaux: oiseaux.combien, papillons: papillons.combien },
    avancer: (dt: number) => {
      horloge += dt
      nuages.avancer(dt)
      oiseaux.avancer(dt, horloge)
      papillons.avancer(dt, horloge)
      mouton.avancer(dt, horloge)
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Les nuages
 * ------------------------------------------------------------------ */

/** Un nuage : trois taches floues superposees sur une toile. Un seul disque
    donne une bulle ; c est le recouvrement decale qui donne un contour de
    cumulus, plat dessous et bombe dessus. */
function grainDeNuage(): CanvasTexture {
  const L = 256
  const H = 128
  const c = toileHorsEcran(L, H)
  const g = c.getContext('2d')
  if (g) {
    const tache = (x: number, y: number, r: number, force: number) => {
      const d = g.createRadialGradient(x, y, 0, x, y, r)
      d.addColorStop(0, `rgba(255,255,255,${force})`)
      d.addColorStop(0.55, `rgba(255,255,255,${force * 0.45})`)
      d.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = d
      g.fillRect(0, 0, L, H)
    }
    tache(L * 0.36, H * 0.62, H * 0.46, 0.95)
    tache(L * 0.58, H * 0.52, H * 0.54, 0.88)
    tache(L * 0.76, H * 0.66, H * 0.38, 0.8)
  }
  return new CanvasTexture(c)
}

function semerLesNuages(scene: Scene) {
  const N = 20
  const geometrie = new PlaneGeometry(1, 1)
  const matiere = new MeshBasicMaterial({
    map: grainDeNuage(),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    fog: false,
    side: DoubleSide,
  })
  const semis = new InstancedMesh(geometrie, matiere, N)
  // Devant la voute, derriere tout le reste. Sans boite de recadrage : un
  // nuage dont le centre sort du champ doit continuer a couvrir le bord.
  semis.renderOrder = -18
  semis.frustumCulled = false
  scene.add(semis)

  // La hauteur se calcule depuis l angle sous lequel on veut voir le nuage.
  // Tires entre 26 et 80 unites, les plus bas passaient derriere les collines,
  // qui se levent a trois degres au-dessus de l horizontale : le nuage etait
  // dessine et n arrivait jamais a l ecran. Sept degres passent au-dessus des
  // collines, quinze restent sous le bord haut du cadre.
  const OEIL = 12 // la camera se tient a peu pres a cette hauteur
  const tire = tirage(70412)
  const azimuts: number[] = []
  const rayons: number[] = []
  const hauteurs: number[] = []
  const tailles: number[] = []
  for (let i = 0; i < N; i += 1) {
    const rayon = 240 + tire() * 190
    const angle = (7 + tire() * 7) * (Math.PI / 180)
    azimuts.push((i / N) * Math.PI * 2 + tire() * 0.3)
    rayons.push(rayon)
    hauteurs.push(OEIL + rayon * Math.tan(angle))
    tailles.push(95 + tire() * 120)
  }

  const m4 = new Matrix4()
  const place = new Vector3()
  const tour = new Quaternion()
  const taille = new Vector3()

  // Chacun est tourne vers le centre. Comme la camera reste au milieu, ca
  // suffit a les tenir de face.
  const poser = () => {
    for (let i = 0; i < N; i += 1) {
      const a = azimuts[i]
      place.set(Math.cos(a) * rayons[i], hauteurs[i], Math.sin(a) * rayons[i])
      tour.setFromAxisAngle(HAUT, -a + Math.PI / 2)
      taille.set(tailles[i], tailles[i] * 0.5, 1)
      m4.compose(place, tour, taille)
      semis.setMatrixAt(i, m4)
    }
    semis.instanceMatrix.needsUpdate = true
  }
  poser()

  return {
    combien: N,
    avancer: (dt: number) => {
      // La vitesse d arc se convertit en vitesse d angle par le rayon, sinon
      // les nuages proches courent et les lointains semblent cloues.
      for (let i = 0; i < N; i += 1) azimuts[i] += (DERIVE_DU_NUAGE / rayons[i]) * dt
      poser()
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Les oiseaux : le vol de kondo, en volume
 * ------------------------------------------------------------------ */

type Point = readonly [number, number]

/** Une courbe de Bezier cubique echantillonnee, dans le repere du dessin de
    kondo : quarante de large, seize de haut, y vers le bas. */
function bezier(a: Point, b: Point, c: Point, d: Point, pas: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= pas; i += 1) {
    const t = i / pas
    const u = 1 - t
    points.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ])
  }
  return points
}

/** Du repere du dessin a celui de l oiseau : centre sur le corps, une
    demi-envergure pour unite, y vers le haut. */
function versLOiseau(points: Point[]): Point[] {
  return points.map(([x, y]) => [(x - 20) / 18, (8 - y) / 18] as Point)
}

/**
 * Les deux poses de l oiseau de kondo, reprises trait pour trait.
 *
 * Ailes hautes :  M2 11 C 8 4, 13 2, 19 8 C 25 2, 30 4, 38 11
 * Ailes basses :  M2 6 C 8 9, 13 11, 19 8 C 25 11, 30 9, 38 6
 * Le corps :      M17 8 C 18 10, 20 10, 21 8
 *
 * C est un trait et non une surface : un « M » sombre de 1,6 d epaisseur sur
 * quarante de large. C est ce qui faisait tenir l oiseau de kondo a trente
 * pixels, et c est ce qui manquait aux silhouettes pleines d ici, qui se
 * lisaient comme des boomerangs. Les deux poses ont le meme nombre de points :
 * on passe de l une a l autre point par point.
 */
const AILES_HAUTES = versLOiseau([
  ...bezier([2, 11], [8, 4], [13, 2], [19, 8], 6),
  ...bezier([19, 8], [25, 2], [30, 4], [38, 11], 6).slice(1),
])
const AILES_BASSES = versLOiseau([
  ...bezier([2, 6], [8, 9], [13, 11], [19, 8], 6),
  ...bezier([19, 8], [25, 11], [30, 9], [38, 6], 6).slice(1),
])
const CORPS_DE_L_OISEAU = versLOiseau(bezier([17, 8], [18, 10], [20, 10], [21, 8], 4))
const EPAISSEUR_DU_TRAIT = 1.6 / 18

/** Le vol de kondo : cinq oiseaux en V lache, chacun un peu decale, un peu
    plus ou moins vite que le premier, et qui battent a 0,11 s d intervalle,
    jamais ensemble. Les ecarts sont ceux de kondo, en largeurs et hauteurs
    d ecran, ramenes ici en metres a la distance ou le vol passe. */
const VOL_DE_KONDO = [
  { devant: 0, dessous: 0, vitesse: 1, taille: 1 },
  { devant: -0.06, dessous: 0.03, vitesse: 0.95, taille: 0.9 },
  { devant: -0.12, dessous: 0.07, vitesse: 0.9, taille: 0.8 },
  { devant: 0.05, dessous: 0.045, vitesse: 1.04, taille: 0.85 },
  { devant: -0.03, dessous: 0.1, vitesse: 0.97, taille: 0.7 },
]

function lacherLesOiseaux(scene: Scene, oeil: Vector3) {
  const VOLS = 2
  const N = VOLS * VOL_DE_KONDO.length
  const segments = (AILES_HAUTES.length - 1) + (CORPS_DE_L_OISEAU.length - 1)
  const parOiseau = segments * 6
  const attribut = new Float32BufferAttribute(new Float32Array(N * parOiseau * 3), 3)
  attribut.setUsage(DynamicDrawUsage)
  // On ecrit dans le tableau de l attribut : Float32BufferAttribute recopie
  // son entree, et ecrire dans l original ne monterait jamais a la carte.
  const sommets = attribut.array as Float32Array
  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', attribut)
  const maillage = new Mesh(
    geometrie,
    new MeshBasicMaterial({ color: teinte(0x1c1c1c), side: DoubleSide, fog: true }),
  )
  maillage.frustumCulled = false
  scene.add(maillage)

  const tire = tirage(19211)

  /**
   * Une traversee : une ligne droite derriere l arbre, en travers de la vue,
   * qui monte un peu et s eloigne, comme le vol de kondo qui passe de droite a
   * gauche en rapetissant.
   *
   * Les oiseaux tournaient en rond autour du fut. Aucun oiseau ne fait ca : un
   * vol passe, il ne patrouille pas. La ligne est tiree au moment ou le vol
   * part, depuis l endroit ou se tient l oeil a cet instant : si on a tourne
   * autour de l arbre, le vol suivant passe quand meme devant nous.
   */
  type Traversee = { depart: Vector3; sens: Vector3; cote: Vector3; debut: number; duree: number }
  const traversees: Traversee[] = []

  const lancer = (horloge: number, attente: number): Traversee => {
    const azimut = Math.atan2(oeil.z, oeil.x)
    const loin = 60 + tire() * 30
    // Le milieu de la traversee : de l autre cote de l arbre, a une
    // soixantaine de metres, a la hauteur ou le ciel commence.
    const milieu = new Vector3(-Math.cos(azimut) * loin, 16 + tire() * 9, -Math.sin(azimut) * loin)
    const travers = new Vector3(-Math.sin(azimut), 0, Math.cos(azimut))
    if (tire() < 0.5) travers.negate()
    const fuite = new Vector3(-Math.cos(azimut), 0, -Math.sin(azimut))
    // Un peu de fuite et un peu de montee : le vol s eloigne en passant, et
    // c est ce qui le fait rapetisser, comme chez kondo.
    const sens = travers.clone().addScaledVector(fuite, 0.3).addScaledVector(HAUT, 0.05).normalize()
    const demiLongueur = 95
    return {
      depart: milieu.clone().addScaledVector(sens, -demiLongueur),
      sens,
      cote: new Vector3().crossVectors(HAUT, sens).normalize(),
      debut: horloge + attente,
      duree: (demiLongueur * 2) / VITESSE_DE_L_OISEAU,
    }
  }
  for (let v = 0; v < VOLS; v += 1) traversees.push(lancer(0, v * 9))

  const place = new Vector3()
  const versLOeil = new Vector3()
  const droite = new Vector3()
  const dessus = new Vector3()
  // Les points de la pose du moment, reutilises d une image a l autre.
  const pose: [number, number][] = AILES_HAUTES.map(() => [0, 0])

  /** Un trait : des quads le long de la ligne, chacun large de l epaisseur,
      avec une normale moyennee a chaque point pour que les segments se
      rejoignent sans fente aux coudes.

      Sans aucun tableau cree en route : la premiere version en fabriquait
      six par segment et par image, soit pres de mille par image pour dix
      oiseaux, et le ramasse-miettes finissait par prendre une image entiere.
      Le banc le montrait en neuvieme dixieme, a 120 ms, la mediane restant a
      50. Les bords sont maintenant ecrits dans un tableau fixe. */
  const bords = new Float32Array(AILES_HAUTES.length * 4)
  const tracer = (k: number, points: readonly Point[], taille: number) => {
    const n = points.length
    const e = EPAISSEUR_DU_TRAIT * 0.5
    for (let j = 0; j < n; j += 1) {
      const avant = points[Math.max(0, j - 1)]
      const apres = points[Math.min(n - 1, j + 1)]
      let nx = -(apres[1] - avant[1])
      let ny = apres[0] - avant[0]
      const l = Math.hypot(nx, ny) || 1
      nx = (nx / l) * e
      ny = (ny / l) * e
      bords[j * 4] = points[j][0] + nx
      bords[j * 4 + 1] = points[j][1] + ny
      bords[j * 4 + 2] = points[j][0] - nx
      bords[j * 4 + 3] = points[j][1] - ny
    }
    const sommet = (bx: number, by: number) => {
      sommets[k] = place.x + (droite.x * bx + dessus.x * by) * taille
      sommets[k + 1] = place.y + (droite.y * bx + dessus.y * by) * taille
      sommets[k + 2] = place.z + (droite.z * bx + dessus.z * by) * taille
      k += 3
    }
    for (let i = 0; i < n - 1; i += 1) {
      const a = i * 4
      const b = a + 4
      // deux triangles : a+ a- b+, puis a- b- b+
      sommet(bords[a], bords[a + 1]); sommet(bords[a + 2], bords[a + 3]); sommet(bords[b], bords[b + 1])
      sommet(bords[a + 2], bords[a + 3]); sommet(bords[b + 2], bords[b + 3]); sommet(bords[b], bords[b + 1])
    }
    return k
  }

  return {
    combien: N,
    avancer: (_dt: number, horloge: number) => {
      for (let v = 0; v < VOLS; v += 1) {
        let vol = traversees[v]
        if (horloge > vol.debut + vol.duree * 1.12) {
          // Le vol est sorti du cadre : le suivant partira apres un blanc de
          // huit a vingt secondes. Un ciel qui n est jamais vide d oiseaux
          // devient un decor qu on ne regarde plus.
          vol = lancer(horloge, 8 + tire() * 12)
          traversees[v] = vol
        }
        const ecoule = horloge - vol.debut

        for (let r = 0; r < VOL_DE_KONDO.length; r += 1) {
          const oiseau = VOL_DE_KONDO[r]
          const i = v * VOL_DE_KONDO.length + r
          let k = i * parOiseau * 3
          if (ecoule < 0) {
            // Pas encore parti : ses sommets tombent tous au meme point, et un
            // triangle sans surface ne se dessine pas.
            sommets.fill(0, k, k + parOiseau * 3)
            continue
          }
          // Les ecarts de kondo sont en fraction d ecran ; a cette distance un
          // ecran fait environ cent trente metres de large et quatre-vingts
          // de haut.
          const parcouru = ecoule * VITESSE_DE_L_OISEAU * oiseau.vitesse
          place.copy(vol.depart)
            .addScaledVector(vol.sens, parcouru + oiseau.devant * 130)
            .addScaledVector(HAUT, -oiseau.dessous * 48)

          // Le trait se tourne vers l oeil, comme le dessin de kondo est vu de
          // face : c est un signe d oiseau, pas une maquette.
          versLOeil.copy(oeil).sub(place).normalize()
          droite.crossVectors(HAUT, versLOeil).normalize()
          dessus.crossVectors(versLOeil, droite).normalize()

          // Les deux poses de kondo, en fondu et non en saut : a 2,3 battements
          // par seconde, un saut se voit en volume la ou il passait sur une
          // planche dessinee. La pose s attarde en haut et en bas, comme une
          // aile qui change de sens.
          const phase = (horloge - r * 0.11) * BATTEMENTS_DE_L_OISEAU * Math.PI * 2
          const haut = 0.5 + 0.5 * Math.sin(phase)
          for (let p = 0; p < pose.length; p += 1) {
            pose[p][0] = AILES_BASSES[p][0] + (AILES_HAUTES[p][0] - AILES_BASSES[p][0]) * haut
            pose[p][1] = AILES_BASSES[p][1] + (AILES_HAUTES[p][1] - AILES_BASSES[p][1]) * haut
          }
          // Kondo fait 3,6 % de la largeur d ecran ; a la distance du vol,
          // c est une envergure de quatre metres et demi.
          const taille = 2.3 * oiseau.taille
          k = tracer(k, pose, taille)
          tracer(k, CORPS_DE_L_OISEAU, taille)
        }
      }
      attribut.needsUpdate = true
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Les papillons
 * ------------------------------------------------------------------ */

type Facette = { a: Point; b: Point; c: Point; ton: number }

/**
 * Le papillon.
 *
 * La forme est mesuree : l aile anterieure fait 0,81 demi-envergure du pied a
 * l apex pour 0,46 de large, soit un allongement de 1,77, la valeur relevee
 * sur les formes printanieres de Pieris. L aile posterieure est un lobe plus
 * court, rejete en arriere.
 *
 * La livree est celle du petit monarque, Danaus chrysippus, qui vole au Benin :
 * fauve, le bout d aile noir. Le corps est sombre et fin, et c est lui qui
 * tient les quatre ailes ensemble.
 */
const PAPILLON = {
  clair: 0xe8832c,
  sombre: 0x231c14,
  corps: [
    { a: [0.26, 0], b: [0.12, 0.05], c: [0.12, -0.05], ton: 0.94 },
    { a: [0.12, 0.05], b: [-0.50, 0], c: [0.12, -0.05], ton: 1.0 },
  ] as Facette[],
  aile: [
    { a: [0.20, 0.05], b: [0.16, 0.58], c: [-0.12, 0.60], ton: 0.04 },
    { a: [0.20, 0.05], b: [-0.12, 0.60], c: [-0.04, 0.06], ton: 0.0 },
    { a: [0.16, 0.58], b: [0.28, 0.86], c: [-0.12, 0.60], ton: 0.88 },
    { a: [-0.04, 0.06], b: [-0.16, 0.54], c: [-0.40, 0.32], ton: 0.06 },
    { a: [-0.04, 0.06], b: [-0.40, 0.32], c: [-0.28, 0.04], ton: 0.16 },
  ] as Facette[],
}

/** L etat d un papillon : il ne suit pas une courbe calculee d avance, il
    avance pas a pas, et c est ce qui rend sa trajectoire imprevisible. */
type Papillon = {
  x: number
  z: number
  y: number
  cap: number
  /** Ou il revient toujours : une fleur, un coin de prairie. */
  foyerX: number
  foyerZ: number
  /** L altitude qu il cherche en ce moment, qui change de temps en temps. */
  visee: number
  /** Temps restant dans l etat courant, battre ou planer. */
  reste: number
  plane: boolean
  phase: number
  graine: number
}

function lacherLesPapillons(scene: Scene, oeil: Vector3) {
  // Cinq et non quatorze. Quatorze papillons dans le champ de l arbre, c etait
  // une eclosion, et une prairie a midi en montre deux ou trois a la fois.
  const N = 5
  const facettes = [...PAPILLON.corps, ...PAPILLON.aile, ...PAPILLON.aile]
  const parBete = facettes.length * 3
  const attribut = new Float32BufferAttribute(new Float32Array(N * parBete * 3), 3)
  attribut.setUsage(DynamicDrawUsage)
  const sommets = attribut.array as Float32Array

  const couleurs = new Float32Array(N * parBete * 3)
  const clair = teinte(PAPILLON.clair)
  const sombre = teinte(PAPILLON.sombre)
  const ton = new Color()
  let c = 0
  for (let i = 0; i < N; i += 1) {
    for (const f of facettes) {
      ton.copy(clair).lerp(sombre, f.ton)
      for (let s = 0; s < 3; s += 1) {
        couleurs[c] = ton.r
        couleurs[c + 1] = ton.g
        couleurs[c + 2] = ton.b
        c += 3
      }
    }
  }
  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', attribut)
  geometrie.setAttribute('color', new Float32BufferAttribute(couleurs, 3))
  const maillage = new Mesh(geometrie, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, fog: true }))
  maillage.frustumCulled = false
  scene.add(maillage)

  const tire = tirage(60815)
  const betes: Papillon[] = []
  for (let i = 0; i < N; i += 1) {
    const a = tire() * Math.PI * 2
    const r = 7 + tire() * 13
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    betes.push({
      x, z, y: 0.8 + tire() * 1.5,
      cap: tire() * Math.PI * 2,
      foyerX: x, foyerZ: z,
      visee: 0.8 + tire() * 2,
      reste: tire() * 1.5,
      plane: false,
      phase: tire() * Math.PI * 2,
      graine: tire() * 100,
    })
  }

  const place = new Vector3()
  const direction = new Vector3()
  const vers = new Vector3()
  const cote = new Vector3()

  const poser = (i: number, taille: number, leve: number) => {
    cote.crossVectors(vers, direction).normalize()
    let k = i * parBete * 3
    const ecrire = (p: Point, sens: number, bat: boolean) => {
      const u = p[0] * taille
      const v = p[1] * taille * sens
      const plie = bat ? leve * (0.34 + 0.66 * Math.abs(p[1])) : 0
      const large = Math.cos(plie)
      const haute = Math.sin(plie)
      sommets[k] = place.x + direction.x * u + cote.x * v * large + vers.x * v * haute
      sommets[k + 1] = place.y + direction.y * u + cote.y * v * large + vers.y * v * haute
      sommets[k + 2] = place.z + direction.z * u + cote.z * v * large + vers.z * v * haute
      k += 3
    }
    for (const f of PAPILLON.corps) { ecrire(f.a, 1, false); ecrire(f.b, 1, false); ecrire(f.c, 1, false) }
    for (const sens of DEUX_COTES) {
      for (const f of PAPILLON.aile) { ecrire(f.a, sens, true); ecrire(f.b, sens, true); ecrire(f.c, sens, true) }
    }
  }

  return {
    combien: N,
    avancer: (dt: number, horloge: number) => {
      for (let i = 0; i < N; i += 1) {
        const b = betes[i]

        // Battre, puis planer, puis battre. Un papillon ne bat pas sans
        // arret : il alterne une rafale de battements et un court plane ailes
        // ouvertes, pendant lequel il se laisse descendre.
        b.reste -= dt
        if (b.reste <= 0) {
          b.plane = !b.plane
          const r = Math.abs(Math.sin(b.graine + horloge * 3.7))
          b.reste = b.plane ? 0.25 + r * 0.45 : 0.6 + r * 1.2
          if (!b.plane && r > 0.6) b.visee = 0.7 + r * 2.4
        }

        // Le cap derive sans cesse, par deux sinus de periodes etrangeres : la
        // trajectoire erratique qu on mesure sur tous les papillons en vol
        // libre. Loin de son foyer, il y revient.
        const derive = Math.sin(horloge * 1.7 + b.graine) * Math.sin(horloge * 0.63 + b.graine * 2) * 3.2
        const versFoyer = Math.atan2(b.foyerZ - b.z, b.foyerX - b.x)
        const loin = Math.hypot(b.foyerX - b.x, b.foyerZ - b.z)
        let ecartDeCap = versFoyer - b.cap
        ecartDeCap = Math.atan2(Math.sin(ecartDeCap), Math.cos(ecartDeCap))
        b.cap += (derive + ecartDeCap * Math.min(1, loin / 6) * 1.4) * dt

        // 0,4 a 1,3 m/s, la plage mesuree en vol libre.
        const vitesse = 0.85 + 0.42 * Math.sin(horloge * 0.9 + b.graine)
        b.x += Math.cos(b.cap) * vitesse * dt
        b.z += Math.sin(b.cap) * vitesse * dt

        let leve: number
        let sautille = 0
        if (b.plane) {
          // Ailes ouvertes, un peu relevees, et il descend.
          leve = 0.22
          b.y -= 0.35 * dt
        } else {
          b.phase += dt * BATTEMENTS_DU_PAPILLON * Math.PI * 2
          leve = 0.8 * Math.sin(b.phase)
          // Le corps monte pendant l abattee et retombe pendant la remontee :
          // il est au plus bas quand les ailes sont hautes. C est ce
          // sautillement a chaque battement qui fait qu on reconnait un
          // papillon de loin, bien avant sa couleur.
          sautille = -0.09 * Math.sin(b.phase)
          b.y += (b.visee - b.y) * Math.min(1, dt * 1.2)
        }
        b.y = Math.max(0.35, b.y)

        place.set(b.x, b.y + sautille, b.z)
        // Il se tourne vers l oeil : pose a plat, il etait vu depuis dix-huit
        // degres au-dessus de lui, ecrase en flechette.
        vers.copy(oeil).sub(place).normalize()
        direction.set(Math.cos(b.cap), 0, Math.sin(b.cap))
        direction.addScaledVector(vers, -direction.dot(vers))
        if (direction.lengthSq() < 0.04) direction.crossVectors(vers, HAUT)
        direction.normalize()
        poser(i, 0.55, leve)
      }
      attribut.needsUpdate = true
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Le mouton
 * ------------------------------------------------------------------ */

/** Ajoute une forme a un corps en cours de montage, deja placee, avec sa
    couleur ecrite sur chaque sommet : un corps de vingt morceaux reste un seul
    appel de dessin. */
function ajouter(
  places: number[], normales: number[], tons: number[],
  forme: BufferGeometry, placement: Matrix4, couleur: Color,
): void {
  const morceau = (forme.index ? forme.toNonIndexed() : forme).applyMatrix4(placement)
  morceau.computeVertexNormals()
  const p = morceau.getAttribute('position')
  const n = morceau.getAttribute('normal')
  for (let i = 0; i < p.count; i += 1) {
    places.push(p.getX(i), p.getY(i), p.getZ(i))
    normales.push(n.getX(i), n.getY(i), n.getZ(i))
    tons.push(couleur.r, couleur.g, couleur.b)
  }
}

function assembler(places: number[], normales: number[], tons: number[]): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(places, 3))
  g.setAttribute('normal', new Float32BufferAttribute(normales, 3))
  g.setAttribute('color', new Float32BufferAttribute(tons, 3))
  return g
}

function placement(x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0): Matrix4 {
  return new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
    new Vector3(sx, sy, sz),
  )
}

/**
 * La toison : une grappe de boules de laine sur un volume de corps.
 *
 * L ancien corps etait un fuseau tourne, une piece de tour a bois : ni
 * toison, ni cou, et quatre pattes plates comme des rubans. On le lisait comme
 * une gelule. Un mouton se reconnait a trois choses : une masse de laine
 * bosselee plus large que haute, une tete sombre et nue qui en sort par
 * l avant, et quatre pattes minces et droites dessous.
 */
function toisonDeMouton(): BufferGeometry {
  const places: number[] = []
  const normales: number[] = []
  const tons: number[] = []
  const laine = teinte(0xeae3d2)
  const laineOmbree = teinte(0xd9d0bc)
  // Deux subdivisions et non une : a une, chaque boule est un polyedre de
  // quatre-vingts faces, et la toison se lisait taillee a la serpe.
  const boule = new IcosahedronGeometry(1, 2)
  // Le volume du corps d abord, puis les boules qui le bossellent : sans ce
  // volume, les boules laissent voir le jour entre elles.
  ajouter(places, normales, tons, boule, placement(0, 0.82, 0, 0.52, 0.32, 0.3), laine)
  const bosses: [number, number, number, number][] = [
    [0.34, 0.9, 0.12, 0.2], [0.34, 0.9, -0.12, 0.2], [0.1, 0.98, 0.14, 0.22],
    [0.1, 0.98, -0.14, 0.22], [-0.16, 0.97, 0.13, 0.22], [-0.16, 0.97, -0.13, 0.22],
    [-0.38, 0.88, 0, 0.22], [0.12, 0.72, 0.2, 0.19], [0.12, 0.72, -0.2, 0.19],
    [-0.2, 0.72, 0.2, 0.19], [-0.2, 0.72, -0.2, 0.19], [0.0, 1.06, 0, 0.18],
  ]
  bosses.forEach(([x, y, z, r], i) => {
    ajouter(places, normales, tons, boule, placement(x, y, z, r, r * 0.92, r), i % 3 === 2 ? laineOmbree : laine)
  })
  // La queue : une courte touffe basse a l arriere.
  ajouter(places, normales, tons, boule, placement(-0.56, 0.78, 0, 0.09, 0.12, 0.08), laine)
  // Tout le corps descend de douze centimetres : perche sur des pattes aussi
  // longues que lui, le mouton se lisait comme une araignee. Chez un mouton
  // la patte fait a peine plus du tiers de la hauteur au garrot.
  return assembler(places, normales, tons).translate(0, -0.12, 0)
}

/** La tete, a part : c est elle qui s abaisse quand il broute. Son repere a
    pour origine la nuque, donc la faire tourner la penche vers l herbe. */
function teteDeMouton(): BufferGeometry {
  const places: number[] = []
  const normales: number[] = []
  const tons: number[] = []
  const face = teinte(0x2b2521)
  const laine = teinte(0xeae3d2)
  const rond = new SphereGeometry(1, 10, 8)
  // L encolure, en laine : c est elle qui porte la tete jusqu a l herbe. Sans
  // elle, tete baissee, le museau restait a trente centimetres du sol.
  ajouter(places, normales, tons, new IcosahedronGeometry(1, 1), placement(0.1, 0, 0, 0.17, 0.14, 0.13), laine)
  // Le chanfrein, long et etroit, descend en avant : une tete de mouton est
  // plus longue que haute, et c est ce qui la separe d une tete de chien.
  ajouter(places, normales, tons, rond, placement(0.38, -0.02, 0, 0.19, 0.12, 0.1, 0, 0, -0.35), face)
  ajouter(places, normales, tons, rond, placement(0.52, -0.08, 0, 0.1, 0.075, 0.075, 0, 0, -0.35), face)
  // Les oreilles tombent de cote, a l horizontale.
  for (const cote of [1, -1]) {
    ajouter(places, normales, tons, rond, placement(0.28, 0.04, 0.13 * cote, 0.09, 0.025, 0.04, 0.35 * cote, 0.4 * cote, 0), face)
  }
  // Le toupet de laine sur le front.
  ajouter(places, normales, tons, new IcosahedronGeometry(1, 1), placement(0.25, 0.08, 0, 0.09, 0.07, 0.09), laine)
  return assembler(places, normales, tons)
}

/**
 * Le mouton, en trois appels de dessin : la toison, la tete, les quatre
 * pattes instanciees.
 *
 * Il ne tourne plus en rond. Il marche quelques pas au pas mesure, s arrete,
 * baisse la tete et broute, puis repart dans une autre direction, sans
 * s eloigner de son coin de prairie : c est ce que fait un mouton seul dans un
 * pre, et c est ce qui manquait pour qu il ait l air vivant.
 */
function poserLeMouton(scene: Scene) {
  const groupe = new Group()
  scene.add(groupe)

  const matiere = new MeshLambertMaterial({ vertexColors: true })
  const corps = new Mesh(toisonDeMouton(), matiere)
  corps.castShadow = true
  groupe.add(corps)

  const nuque = new Group()
  nuque.position.set(0.36, 0.78, 0)
  groupe.add(nuque)
  const tete = new Mesh(teteDeMouton(), matiere)
  nuque.add(tete)

  // Une patte : un fuseau mince, son origine en haut pour qu elle pivote a la
  // hanche.
  const fuseau = new CylinderGeometry(0.045, 0.036, 0.46, 6)
  fuseau.translate(0, -0.23, 0)
  const pattes = new InstancedMesh(fuseau, new MeshLambertMaterial({ color: teinte(0x2b2521) }), 4)
  groupe.add(pattes)
  const hanches = [[0.3, 0.14], [0.3, -0.14], [-0.3, 0.14], [-0.3, -0.14]]
  const patte = new Object3D()

  // Son coin de prairie : a gauche de l arbre dans la vue de depart, la ou le
  // pre est vide. Devant l arbre il finissait sous le titre, en bas de l ecran.
  const FOYER = { x: -9, z: 8 }
  let x = FOYER.x
  let z = FOYER.z
  let cap = -2.2
  let broute = true
  let reste = 2.5
  let baisse = 1
  let foulee = 0
  let graine = 3

  return {
    avancer: (dt: number, horloge: number) => {
      reste -= dt
      if (reste <= 0) {
        broute = !broute
        graine += 1.37
        const r = Math.abs(Math.sin(graine * 12.9898) * 43758.5453) % 1
        reste = broute ? 4 + r * 4 : 3 + r * 4
        if (!broute) {
          // Il repart vers un point de son coin, jamais au-dela.
          const a = r * Math.PI * 2
          const cible = { x: FOYER.x + Math.cos(a) * 4, z: FOYER.z + Math.sin(a) * 4 }
          cap = Math.atan2(cible.z - z, cible.x - x)
        }
      }

      // La tete descend en une seconde environ, et remonte avant qu il marche.
      const voulu = broute ? 1 : 0
      baisse += (voulu - baisse) * Math.min(1, dt * 2.2)
      // En marche il porte la tete un peu haute ; en broutant il la plonge
      // jusqu a l herbe et la remue a peine.
      nuque.rotation.z = 0.22 - 1.42 * baisse + 0.05 * Math.sin(horloge * 2.1) * baisse

      let vitesse = 0
      if (!broute && baisse < 0.3) vitesse = PAS_DU_MOUTON
      x += Math.cos(cap) * vitesse * dt
      z += Math.sin(cap) * vitesse * dt
      // Une foulee tous les 0,9 m parcourus : c est ce rapport qui le fait
      // avancer au lieu de patiner.
      foulee += (vitesse * dt) / 0.9 * Math.PI * 2

      groupe.position.set(x, 0.03 + Math.abs(Math.sin(foulee)) * 0.02 * (vitesse > 0 ? 1 : 0), z)
      groupe.rotation.y = -cap

      // Les pattes par diagonales : anterieure gauche avec posterieure
      // droite, le pas de tout quadrupede au pas.
      for (let i = 0; i < 4; i += 1) {
        const diagonale = i === 0 || i === 3 ? 0 : Math.PI
        patte.position.set(hanches[i][0], 0.48, hanches[i][1])
        patte.rotation.set(0, 0, vitesse > 0 ? Math.sin(foulee + diagonale) * 0.38 : 0)
        patte.updateMatrix()
        pattes.setMatrixAt(i, patte.matrix)
      }
      pattes.instanceMatrix.needsUpdate = true
    },
  }
}
