// GOD2 · Theophas Aine : ce qui bouge dans le paysage
//
// Des nuages qui derivent, un vol d oiseaux, des papillons au-dessus de
// l herbe, un mouton qui marche. Rien de tout cela n est un fichier 3D ni une
// image : ce sont quatre geometries montees a la main.
//
// Les quatre cadences viennent de mesures publiees, pas d une estimation a
// l oeil :
//
//   nuage    2,5 unites par seconde. Le cumulus derive entre 5 et 10 miles a
//            l heure selon la NOAA, soit 2,2 a 4,5 m/s ; a notre echelle une
//            unite vaut un metre.
//   oiseau   7,6 battements par seconde, la frequence mesuree en vol libre
//            pour les oiseaux qui alternent battements et plane (Journal of
//            Experimental Biology). Les oiseaux a vol bondissant montent a 14
//            et l etourneau a 13,3 : notre vol plane, donc 7,6.
//   papillon 6 battements par seconde, mesures sur Pieris napi.
//   mouton   1,1 unite par seconde, l allure confortable relevee sur tapis de
//            pression.
//
// Chaque piece tient en un seul appel de dessin, et les deux qui s animent le
// font en reecrivant leurs sommets depuis le processeur : a quatorze oiseaux
// et douze papillons, cela fait deux cent soixante-quatre sommets par image,
// soit moins que ce que couterait un nuanceur de plus a compiler.

import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  type Scene,
  Vector3,
} from 'three'
import { toileHorsEcran } from './paysage/ciel'
import { teinte } from './paysage/heures'

const DERIVE_DU_NUAGE = 2.5
const BATTEMENTS_DE_L_OISEAU = 7.6
const BATTEMENTS_DU_PAPILLON = 6
const PAS_DU_MOUTON = 1.1

export type Vivant = {
  /** Ce que ca coute, pour le banc. */
  cout: { nuages: number; oiseaux: number; papillons: number }
  avancer: (dt: number) => void
}

export function monterLeVivant(scene: Scene): Vivant {
  const nuages = semerLesNuages(scene)
  const oiseaux = lacherLesOiseaux(scene)
  const papillons = lacherLesPapillons(scene)
  const mouton = poserLeMouton(scene)

  // Poses une premiere fois des le montage : tant que la boucle n a pas
  // tourne, les sommets d un vol valent tous zero et les quatorze oiseaux
  // tiennent dans un point a l origine. Une capture faite avant la premiere
  // image montrait un paysage sans rien dedans, et rien ne disait pourquoi.
  let horloge = 0
  oiseaux.avancer(0)
  papillons.avancer(0)
  mouton.avancer(0)

  return {
    cout: { nuages: nuages.combien, oiseaux: oiseaux.combien, papillons: papillons.combien },
    avancer: (dt: number) => {
      horloge += dt
      nuages.avancer(dt)
      oiseaux.avancer(horloge)
      papillons.avancer(horloge)
      mouton.avancer(horloge)
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
    opacity: 0.82,
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

  // Ils sont poses sur un cylindre autour de l arbre, chacun tourne vers le
  // centre. La hauteur a ete reprise sur la capture : a 107 unites et 346 de
  // rayon, ils tombaient a seize degres au-dessus de l horizontale, alors que
  // le bord haut du cadre est a quatorze. Ils etaient dessines, les vingt, et
  // aucun n entrait dans l image.
  // Comme la camera reste au milieu, ca suffit a les tenir de face :
  // un vrai panneau d affichage recalcule a chaque image ne changerait rien de
  // visible et couterait vingt matrices par image.
  const azimuts: number[] = []
  const rayons: number[] = []
  const hauteurs: number[] = []
  const tailles: number[] = []
  for (let i = 0; i < N; i += 1) {
    azimuts.push((i / N) * Math.PI * 2 + Math.random() * 0.3)
    rayons.push(215 + Math.random() * 165)
    hauteurs.push(26 + Math.random() * 54)
    tailles.push(95 + Math.random() * 120)
  }

  const m4 = new Matrix4()
  const place = new Vector3()
  const tour = new Quaternion()
  const taille = new Vector3()
  const haut = new Vector3(0, 1, 0)

  const poser = () => {
    for (let i = 0; i < N; i += 1) {
      const a = azimuts[i]
      place.set(Math.cos(a) * rayons[i], hauteurs[i], Math.sin(a) * rayons[i])
      tour.setFromAxisAngle(haut, -a + Math.PI / 2)
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
      // Le nuage derive le long de son cercle : la vitesse d arc se convertit
      // en vitesse d angle par son rayon, sinon les nuages proches courent et
      // les lointains semblent cloues.
      for (let i = 0; i < N; i += 1) azimuts[i] += (DERIVE_DU_NUAGE / rayons[i]) * dt
      poser()
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Les oiseaux et les papillons : deux ailes, reecrites a chaque image
 * ------------------------------------------------------------------ */

/**
 * Un vol : chaque bete est deux triangles, une aile de chaque cote, et tout le
 * vol tient dans une seule geometrie dont les sommets sont reecrits a chaque
 * image. L aile ne se plie pas, elle se releve : c est un changement de forme
 * et non de position, et une matrice d instance ne sait pas le dire.
 */
function fabriquerUnVol(combien: number, matiere: MeshBasicMaterial | MeshLambertMaterial) {
  const geometrie = new BufferGeometry()
  const attribut = new Float32BufferAttribute(new Float32Array(combien * 6 * 3), 3)
  attribut.setUsage(DynamicDrawUsage)
  geometrie.setAttribute('position', attribut)
  // On ecrit dans le tableau de l attribut, pas dans celui qu on lui a passe :
  // Float32BufferAttribute recopie son entree, et ecrire dans l original ne
  // monte jamais a la carte. Toutes les betes restaient alors empilees a
  // l origine, invisibles, sans qu aucune erreur ne soit levee.
  const sommets = attribut.array as Float32Array
  const maillage = new Mesh(geometrie, matiere)
  maillage.frustumCulled = false
  const corps = new Vector3()
  const cap = new Vector3()
  const cote = new Vector3()
  const bout = new Vector3()
  const haut = new Vector3(0, 1, 0)

  /** Poser une bete : son corps, sa direction, son envergure, sa corde et
      l angle de ses ailes, en radians au-dessus de l horizontale. */
  const poser = (i: number, place: Vector3, direction: Vector3, envergure: number, corde: number, leve: number) => {
    corps.copy(place)
    cap.copy(direction).setY(0).normalize()
    cote.crossVectors(haut, cap).normalize()
    const arriere = cap.clone().multiplyScalar(-corde)
    const monte = Math.sin(leve) * envergure * 0.55
    const ecarte = Math.cos(leve) * envergure

    let k = i * 18
    for (const sens of [1, -1]) {
      bout.copy(corps).addScaledVector(cote, ecarte * sens).addScaledVector(haut, monte)
      // le bord d attaque au corps, la pointe de l aile, le bord de fuite
      sommets[k] = corps.x; sommets[k + 1] = corps.y; sommets[k + 2] = corps.z
      sommets[k + 3] = bout.x; sommets[k + 4] = bout.y; sommets[k + 5] = bout.z
      sommets[k + 6] = corps.x + arriere.x
      sommets[k + 7] = corps.y + arriere.y
      sommets[k + 8] = corps.z + arriere.z
      k += 9
    }
  }

  return { maillage, poser, fini: () => { attribut.needsUpdate = true } }
}

function lacherLesOiseaux(scene: Scene) {
  const N = 14
  const matiere = new MeshBasicMaterial({ color: teinte(0x2b3138), side: DoubleSide, fog: true })
  const vol = fabriquerUnVol(N, matiere)
  scene.add(vol.maillage)

  // Un vol lache, pas une formation : chacun a son rayon, sa hauteur, sa
  // phase. Regles au meme pas, quatorze oiseaux battent ensemble et le vol
  // devient un mecanisme.
  const rayons: number[] = []
  const hauteurs: number[] = []
  const phases: number[] = []
  const vitesses: number[] = []
  for (let i = 0; i < N; i += 1) {
    rayons.push(46 + Math.random() * 64)
    hauteurs.push(26 + Math.random() * 20)
    phases.push(Math.random() * Math.PI * 2)
    vitesses.push(0.055 + Math.random() * 0.03)
  }

  const place = new Vector3()
  const direction = new Vector3()
  return {
    combien: N,
    avancer: (temps: number) => {
      for (let i = 0; i < N; i += 1) {
        const a = phases[i] + temps * vitesses[i]
        const r = rayons[i]
        place.set(Math.cos(a) * r, hauteurs[i] + Math.sin(temps * 0.6 + phases[i]) * 2.2, Math.sin(a) * r)
        direction.set(-Math.sin(a), 0, Math.cos(a))
        // Battement : releve au-dessus de l horizontale, jamais sous elle.
        // Une aile qui descend autant qu elle monte donne un papillonnement de
        // pigeon ; un oiseau qui plane tient l aile haute et la laisse tomber.
        const leve = 0.62 * Math.sin(temps * BATTEMENTS_DE_L_OISEAU * Math.PI * 2 + phases[i] * 3) + 0.18
        vol.poser(i, place, direction, 2.4, 1.15, leve)
      }
      vol.fini()
    },
  }
}

function lacherLesPapillons(scene: Scene) {
  const N = 12
  const matiere = new MeshBasicMaterial({ color: teinte(0xf2c15a), side: DoubleSide, fog: true })
  const vol = fabriquerUnVol(N, matiere)
  scene.add(vol.maillage)

  const rayons: number[] = []
  const phases: number[] = []
  const vitesses: number[] = []
  for (let i = 0; i < N; i += 1) {
    rayons.push(5 + Math.random() * 16)
    phases.push(Math.random() * Math.PI * 2)
    vitesses.push(0.20 + Math.random() * 0.22)
  }

  const place = new Vector3()
  const direction = new Vector3()
  return {
    combien: N,
    avancer: (temps: number) => {
      for (let i = 0; i < N; i += 1) {
        const a = phases[i] + temps * vitesses[i]
        // Un papillon ne suit pas un cercle : il monte et descend sans cesse,
        // et son rayon respire. C est ce desordre qui le distingue d une
        // mouche, qui va droit.
        const r = rayons[i] * (0.8 + 0.2 * Math.sin(temps * 0.7 + phases[i]))
        const y = 0.5 + 1.5 * (0.5 + 0.5 * Math.sin(temps * 1.6 + phases[i] * 2))
        place.set(Math.cos(a) * r, y, Math.sin(a) * r)
        direction.set(-Math.sin(a), 0, Math.cos(a))
        // Les ailes se rejoignent presque au-dessus du dos, puis s ouvrent a
        // plat : c est l amplitude d un papillon, bien plus large que celle
        // d un oiseau.
        const leve = 0.95 * Math.sin(temps * BATTEMENTS_DU_PAPILLON * Math.PI * 2 + phases[i] * 5)
        vol.poser(i, place, direction, 0.34, 0.18, leve)
      }
      vol.fini()
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Le mouton
 * ------------------------------------------------------------------ */

/**
 * Le mouton : un corps laineux et quatre pattes, deux geometries donc deux
 * appels de dessin. Le corps est un bloc arrondi, les pattes sont reecrites a
 * chaque image parce qu elles balancent, et un balancement est un changement
 * de forme du groupe entier.
 *
 * Il marche en cercle sur la prairie, a l allure confortable relevee sur tapis
 * de pression. Les pattes vont par diagonales opposees, ce qui est le pas d un
 * quadrupede au pas : anterieur gauche avec posterieur droit.
 */
function poserLeMouton(scene: Scene) {
  const groupe = new Group()
  scene.add(groupe)

  const laine = new MeshLambertMaterial({ color: teinte(0xf0ece2) })
  const corps = new Mesh(corpsDeMouton(), laine)
  corps.castShadow = true
  groupe.add(corps)

  const PATTES = 4
  const geometrieDesPattes = new BufferGeometry()
  const attribut = new Float32BufferAttribute(new Float32Array(PATTES * 6 * 3), 3)
  attribut.setUsage(DynamicDrawUsage)
  geometrieDesPattes.setAttribute('position', attribut)
  // Meme piege que pour les vols : c est le tableau de l attribut qu il faut.
  const sommetsDesPattes = attribut.array as Float32Array
  const pattes = new Mesh(geometrieDesPattes, new MeshLambertMaterial({ color: teinte(0x3b332c), side: DoubleSide }))
  pattes.frustumCulled = false
  groupe.add(pattes)

  const RAYON = 26
  const HAUTEUR_DU_GARROT = 0.62
  // Les quatre attaches, dans le repere du mouton : x vers l avant.
  const attaches = [
    [0.42, 0.24], [0.42, -0.24], [-0.38, 0.24], [-0.38, -0.24],
  ]

  return {
    avancer: (temps: number) => {
      const a = (temps * PAS_DU_MOUTON) / RAYON
      const x = Math.cos(a) * RAYON
      const z = Math.sin(a) * RAYON
      groupe.position.set(x, HAUTEUR_DU_GARROT, z)
      groupe.rotation.y = -a + Math.PI / 2

      // Une foulee par 0,9 unite parcourue : c est ce qui fait qu il avance au
      // lieu de patiner, et ce rapport-la se voit tout de suite s il est faux.
      const foulee = (temps * PAS_DU_MOUTON) / 0.9 * Math.PI * 2
      let k = 0
      for (let i = 0; i < PATTES; i += 1) {
        const diagonale = i === 0 || i === 3 ? 0 : Math.PI
        const balance = Math.sin(foulee + diagonale) * 0.34
        const [ax, az] = attaches[i]
        const hauteurEnBas = -HAUTEUR_DU_GARROT
        const piedX = ax + Math.sin(balance) * 0.5
        const piedY = hauteurEnBas + Math.max(0, Math.cos(foulee + diagonale)) * 0.12
        // Chaque patte est un ruban de deux triangles, large de six centimetres.
        const l = 0.045
        const points = [
          [ax - l, 0, az], [ax + l, 0, az], [piedX - l, piedY, az],
          [ax + l, 0, az], [piedX + l, piedY, az], [piedX - l, piedY, az],
        ]
        for (const [px, py, pz] of points) {
          sommetsDesPattes[k] = px
          sommetsDesPattes[k + 1] = py
          sommetsDesPattes[k + 2] = pz
          k += 3
        }
      }
      attribut.needsUpdate = true
    },
  }
}

/** Le corps : un bloc de laine bossele, et une tete plus sombre au bout. Pas
    une sphere : une sphere fait un ballon, et ce qui dit le mouton est le dos
    plat, la croupe ronde et l encolure basse. */
function corpsDeMouton(): BufferGeometry {
  const places: number[] = []
  const index: number[] = []
  const TOURS = 12
  const ANNEAUX = 9
  // Le profil : abscisse le long du corps, rayon a cet endroit. La tete est le
  // dernier anneau, ramene a rien.
  const profil: [number, number][] = [
    [-0.58, 0.10], [-0.50, 0.30], [-0.30, 0.40], [-0.05, 0.42],
    [0.22, 0.40], [0.42, 0.34], [0.55, 0.22], [0.70, 0.16], [0.82, 0.08],
  ]
  for (let i = 0; i < ANNEAUX; i += 1) {
    const [x, r] = profil[i]
    for (let p = 0; p < TOURS; p += 1) {
      const angle = (p / TOURS) * Math.PI * 2
      // La laine : un renflement regulier, qui donne le grain de la toison
      // sans une seule image.
      const bosse = 1 + Math.sin(angle * 5 + i * 1.7) * 0.06
      places.push(x, Math.sin(angle) * r * bosse * 0.92, Math.cos(angle) * r * bosse)
    }
  }
  for (let i = 0; i < ANNEAUX - 1; i += 1) {
    for (let p = 0; p < TOURS; p += 1) {
      const a0 = i * TOURS + p
      const a1 = i * TOURS + ((p + 1) % TOURS)
      index.push(a0, a1, a0 + TOURS, a1, a1 + TOURS, a0 + TOURS)
    }
  }
  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new Float32BufferAttribute(places, 3))
  geometrie.setIndex(index)
  geometrie.computeVertexNormals()
  return geometrie
}
