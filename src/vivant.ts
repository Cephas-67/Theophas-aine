// GOD2 · Theophas Aine : ce qui bouge dans le paysage
//
// Des nuages qui derivent, un vol d oiseaux, des papillons au-dessus de
// l herbe, un mouton qui marche. Rien de tout cela n est un fichier 3D ni une
// image : ce sont quatre geometries montees a la main.
//
// Les cadences viennent de mesures publiees, pas d une estimation a l oeil :
//
//   nuage    2,5 unites par seconde. Le cumulus derive entre 5 et 10 miles a
//            l heure selon la NOAA, soit 2,2 a 4,5 m/s ; a notre echelle une
//            unite vaut un metre.
//   oiseau   7,6 battements par seconde, la frequence mesuree en vol libre
//            pour les oiseaux qui alternent battements et plane (Journal of
//            Experimental Biology). Les oiseaux a vol bondissant montent a 14
//            et l etourneau a 13,3 : notre vol plane, donc 7,6.
//   papillon 6 battements par seconde, et 1,2 a 1,7 metre par seconde en
//            translation, les deux mesures sur Pieris.
//   mouton   1,1 unite par seconde, l allure confortable relevee sur tapis de
//            pression.
//
// Les silhouettes aussi sont relevees, et c est ce qui a change : deux
// triangles plats ne font ni un oiseau ni un papillon, quelle que soit la
// cadence a laquelle ils battent.
//
//   oiseau   allongement d aile 8, la valeur donnee pour les laridés (jusqu a
//            15 chez l albatros, 4,5 a 6 chez un passereau). L allongement est
//            le carre de l envergure divise par la surface : c est lui qui
//            decide si une aile se lit comme celle d une mouette ou comme
//            celle d un moineau. Le bout est effile et rejete en arriere, et
//            le bord de fuite rejoint le corps sans marche, comme le decrit
//            l aile de vitesse.
//            Corps : 0,41 envergure, le rapport d un goeland argente.
//   papillon allongement d aile anterieure 1,77, mesure sur les formes
//            printanieres de Pieris. L aile posterieure est un lobe plus court
//            rejete en arriere, et le noir de l apex est celui de l espece qui
//            a servi a la cadence.
//
// Les deux sont a l echelle du regard et non a celle de la nature : un
// papillon de cinq centimetres a trente metres ne fait pas un pixel. L oiseau
// est a 2,8 unites d envergure, soit le double d un goeland ; le papillon a
// 1,1, soit vingt fois nature. Les proportions, elles, sont justes.

import {
  BufferGeometry,
  CanvasTexture,
  Color,
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
const BATTEMENTS_DE_L_OISEAU = 7.6
const BATTEMENTS_DU_PAPILLON = 6
const VOL_DU_PAPILLON = 1.45 // la moyenne des deux formes mesurees
const PAS_DU_MOUTON = 1.1

export type Vivant = {
  /** Ce que ca coute, pour le banc. */
  cout: { nuages: number; oiseaux: number; papillons: number }
  avancer: (dt: number) => void
}

/** Les papillons ont besoin de savoir ou se tient l oeil : ils se tournent
    vers lui. Rien d autre dans ce fichier ne regarde la camera. */
export function monterLeVivant(scene: Scene, oeil: Vector3): Vivant {
  const nuages = semerLesNuages(scene)
  const oiseaux = lacherLesOiseaux(scene)
  const papillons = lacherLesPapillons(scene, oeil)
  const mouton = poserLeMouton(scene)

  // Poses une premiere fois des le montage : tant que la boucle n a pas
  // tourne, les sommets d un vol valent tous zero et les oiseaux tiennent dans
  // un point a l origine. Une capture faite avant la premiere image montrait un
  // paysage sans rien dedans, et rien ne disait pourquoi.
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

  // La hauteur ne se tire plus au hasard, elle se calcule depuis l angle sous
  // lequel on veut voir le nuage.
  //
  // Tires entre 26 et 80 unites, les plus bas passaient derriere les collines :
  // le terrain monte avec la distance, et une colline a six cents unites se
  // leve a trois degres au-dessus de l horizontale. Le nuage etait dessine et
  // n arrivait jamais a l ecran, et la capture ne montrait qu un ciel vide.
  // Sept degres passent au-dessus des collines, quinze restent sous le bord
  // haut du cadre : c est cette bande-la qu on vise, et la hauteur suit du
  // rayon.
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
  const haut = new Vector3(0, 1, 0)

  // Chacun est tourne vers le centre. Comme la camera reste au milieu, ca
  // suffit a les tenir de face : un vrai panneau d affichage recalcule a chaque
  // image ne changerait rien de visible et couterait vingt matrices par image.
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
 *  Les vols : une silhouette relevee, reecrite a chaque image
 * ------------------------------------------------------------------ */

/**
 * Un point du plan de la bete.
 *
 *   u  le long du corps, positif vers l avant
 *   v  vers l exterieur, positif a droite, 1 au bout de l aile
 *
 * Les deux sont en demi-envergures : une forme se decrit une fois et se pose a
 * n importe quelle taille.
 */
type Point = readonly [number, number]

/** Une facette, et le ton qu elle porte : 0 la teinte claire de la bete, 1 sa
    teinte sombre. C est ce qui donne le bout d aile noir du goeland et l apex
    noir de la pieride, sans une seule image. */
type Facette = { a: Point; b: Point; c: Point; ton: number }

type Forme = {
  /** Ce qui ne bat pas : dessine tel quel, v signe. */
  corps: Facette[]
  /** Une aile, cote droit. Elle est recopiee a gauche et pivotee autour de
      l axe du corps par le battement. */
  aile: Facette[]
  clair: number
  sombre: number
}

/** Le panneau d aile entre deux stations : deux triangles, le bord d attaque
    devant, le bord de fuite derriere. Une aile se decrit par ses stations,
    comme un plan de voilure, et non triangle par triangle. */
function panneau(
  v0: number, attaque0: number, fuite0: number,
  v1: number, attaque1: number, fuite1: number,
  ton: number,
): Facette[] {
  const a0: Point = [attaque0, v0]
  const f0: Point = [fuite0, v0]
  const a1: Point = [attaque1, v1]
  const f1: Point = [fuite1, v1]
  return [
    { a: a0, b: a1, c: f0, ton },
    { a: a1, b: f1, c: f0, ton },
  ]
}

/**
 * L oiseau.
 *
 * Quatre stations, trois panneaux : emplanture, coude, main, bout. Les cordes
 * valent 0,40 / 0,32 / 0,20 / 0,09 demi-envergure, ce qui donne une surface de
 * 0,49 pour une envergure de 2, soit un allongement de 8,1. C est la valeur
 * donnee pour les laridés, et c est elle qui separe une mouette d un moineau.
 *
 * Le bord de fuite recule regulierement jusqu au bout, donc le bout part en
 * arriere : c est ce que decrit l aile de vitesse, plate et effilee, dont le
 * bord de fuite rejoint le corps sans marche.
 */
const OISEAU: Forme = {
  clair: 0x59636e,
  sombre: 0x161a20,
  corps: [
    // la tete et le poitrail
    { a: [0.40, 0], b: [0.15, 0.095], c: [0.15, -0.095], ton: 0.62 },
    // le tronc
    { a: [0.15, 0.095], b: [-0.20, 0.080], c: [0.15, -0.095], ton: 0.58 },
    { a: [0.15, -0.095], b: [-0.20, 0.080], c: [-0.20, -0.080], ton: 0.58 },
    // La queue, echancree et large : deux pointes et un creux profond, la
    // queue d un milan noir, qui est ce qui plane au-dessus d une prairie
    // ouest-africaine. Elle porte autant que les ailes dans la lecture de la
    // silhouette : sans elle il reste un croissant.
    { a: [-0.20, 0.080], b: [-0.44, 0.175], c: [-0.30, 0], ton: 0.74 },
    { a: [-0.20, -0.080], b: [-0.30, 0], c: [-0.44, -0.175], ton: 0.74 },
    { a: [-0.20, 0.080], b: [-0.30, 0], c: [-0.20, -0.080], ton: 0.68 },
  ],
  aile: [
    // L emplanture part du flanc et non du milieu du dos : posee a 0,06 elle
    // recouvrait le corps entier, et la tete comme la queue disparaissaient
    // sous elle des que les ailes se relevaient.
    ...panneau(0.10, 0.19, -0.21, 0.40, 0.17, -0.15, 0.16),
    ...panneau(0.40, 0.17, -0.15, 0.72, 0.07, -0.13, 0.40),
    // les remiges primaires : c est la partie sombre de l aile, chez presque
    // tout ce qui plane au-dessus d une prairie.
    ...panneau(0.72, 0.07, -0.13, 1.00, -0.10, -0.19, 0.86),
  ],
}

/**
 * Le papillon.
 *
 * La forme est mesuree : l aile anterieure fait 0,81 demi-envergure du pied a
 * l apex pour 0,46 de large, soit un allongement de 1,77, la valeur relevee
 * sur les formes printanieres de Pieris, celles-la memes dont viennent les six
 * battements et le metre et demi par seconde. L aile posterieure est un lobe
 * plus court, rejete en arriere.
 *
 * La livree, elle, n est pas celle de Pieris : c est celle du petit monarque,
 * Danaus chrysippus, qui vole au Benin. Le blanc creme de la pieride se perdait
 * sur l herbe pale de midi, et douze papillons blancs sur une prairie verte se
 * lisaient comme des papiers emportes par le vent. Le fauve et le bout d aile
 * noir se detachent. La forme vient d une mesure, la couleur d un choix, et
 * les deux sont dits.
 *
 * Le corps est sombre et fin, et c est lui qui tient les quatre ailes
 * ensemble : sans corps, quatre taches qui battent ne font pas un papillon.
 */
const PAPILLON: Forme = {
  clair: 0xe8832c,
  sombre: 0x231c14,
  corps: [
    { a: [0.26, 0], b: [0.12, 0.05], c: [0.12, -0.05], ton: 0.94 },
    { a: [0.12, 0.05], b: [-0.50, 0], c: [0.12, -0.05], ton: 1.0 },
  ],
  aile: [
    // l aile anterieure, en deux morceaux pour que l apex puisse etre noir
    { a: [0.20, 0.05], b: [0.16, 0.58], c: [-0.12, 0.60], ton: 0.04 },
    { a: [0.20, 0.05], b: [-0.12, 0.60], c: [-0.04, 0.06], ton: 0.0 },
    { a: [0.16, 0.58], b: [0.28, 0.86], c: [-0.12, 0.60], ton: 0.88 },
    // l aile posterieure, bordee de sombre sur sa tranche exterieure
    { a: [-0.04, 0.06], b: [-0.16, 0.54], c: [-0.40, 0.32], ton: 0.06 },
    { a: [-0.04, 0.06], b: [-0.40, 0.32], c: [-0.28, 0.04], ton: 0.16 },
  ],
}

/**
 * Un vol : toutes les betes dans une seule geometrie, dont les sommets sont
 * reecrits a chaque image. L aile ne se deplace pas, elle pivote autour de
 * l axe du corps : c est un changement de forme, et une matrice d instance ne
 * sait pas le dire.
 *
 * Les couleurs, elles, sont ecrites une fois pour toutes : la silhouette ne
 * change pas de livree en vol.
 */
function fabriquerUnVol(combien: number, forme: Forme) {
  const facettes = [...forme.corps, ...forme.aile, ...forme.aile]
  const parBete = facettes.length * 3
  const attribut = new Float32BufferAttribute(new Float32Array(combien * parBete * 3), 3)
  attribut.setUsage(DynamicDrawUsage)
  // On ecrit dans le tableau de l attribut, pas dans celui qu on lui a passe :
  // Float32BufferAttribute recopie son entree, et ecrire dans l original ne
  // monte jamais a la carte. Toutes les betes restaient alors empilees a
  // l origine, invisibles, sans qu aucune erreur ne soit levee.
  const sommets = attribut.array as Float32Array

  const couleurs = new Float32Array(combien * parBete * 3)
  const clair = teinte(forme.clair)
  const sombre = teinte(forme.sombre)
  const ton = new Color()
  let c = 0
  for (let i = 0; i < combien; i += 1) {
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
  const maillage = new Mesh(
    geometrie,
    new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, fog: true }),
  )
  maillage.frustumCulled = false

  const cote = new Vector3()

  /**
   * Poser une bete.
   *
   *   place    ou est son corps
   *   cap      l axe du corps, vers l avant, deja normalise
   *   normale  l axe autour duquel les ailes se relevent, perpendiculaire au
   *            cap : le haut du monde pour un oiseau, le rayon vers l oeil
   *            pour un papillon
   *   taille   sa demi-envergure
   *   leve     l angle des ailes, en radians, au bout de l aile
   */
  const poser = (
    i: number, place: Vector3, cap: Vector3, normale: Vector3, taille: number, leve: number,
  ) => {
    cote.crossVectors(normale, cap).normalize()

    let k = i * parBete * 3
    const ecrire = (p: Point, sens: number, bat: boolean) => {
      const u = p[0] * taille
      const v = p[1] * taille * sens
      // L aile plie au poignet, pas a l epaule.
      //
      // Relevee d un seul bloc, elle donnait un arc regulier d un bout a
      // l autre, et l oiseau se lisait comme un boomerang. Une aile d oiseau
      // garde son bras presque a plat et leve sa main : l angle suit donc la
      // place le long de l envergure, un tiers a l emplanture et tout au bout.
      // C est ce coude-la qui fait la difference entre un oiseau et un accent
      // circonflexe.
      const plie = bat ? leve * (0.34 + 0.66 * Math.abs(p[1])) : 0
      const large = Math.cos(plie)
      const haute = bat ? Math.sin(plie) : 0
      sommets[k] = place.x + cap.x * u + cote.x * v * large + normale.x * v * haute
      sommets[k + 1] = place.y + cap.y * u + cote.y * v * large + normale.y * v * haute
      sommets[k + 2] = place.z + cap.z * u + cote.z * v * large + normale.z * v * haute
      k += 3
    }

    for (const f of forme.corps) {
      ecrire(f.a, 1, false)
      ecrire(f.b, 1, false)
      ecrire(f.c, 1, false)
    }
    for (const sens of [1, -1]) {
      for (const f of forme.aile) {
        ecrire(f.a, sens, true)
        ecrire(f.b, sens, true)
        ecrire(f.c, sens, true)
      }
    }
  }

  return { maillage, poser, fini: () => { attribut.needsUpdate = true } }
}

function lacherLesOiseaux(scene: Scene) {
  const N = 16
  const vol = fabriquerUnVol(N, OISEAU)
  scene.add(vol.maillage)

  // Un vol lache, pas une formation : chacun a son rayon, sa hauteur, sa
  // phase. Regles au meme pas, seize oiseaux battent ensemble et le vol
  // devient un mecanisme.
  //
  // La hauteur a ete descendue de vingt unites. A trente-cinq, le vol entier
  // passait au-dessus du bord haut du cadre : la sonde le montrait centre a
  // trois cent quatre-vingt-dix pixels au-dessus de l ecran, dessine, jamais
  // vu. A une douzaine d unites il croise l horizon, se detache sur les
  // collines, et sa silhouette se lit.
  const tire = tirage(19211)
  const rayons: number[] = []
  const hauteurs: number[] = []
  const phases: number[] = []
  const vitesses: number[] = []
  const tailles: number[] = []
  for (let i = 0; i < N; i += 1) {
    rayons.push(40 + tire() * 40)
    hauteurs.push(11 + tire() * 8)
    phases.push(tire() * Math.PI * 2)
    vitesses.push(0.055 + tire() * 0.03)
    tailles.push(1.35 + tire() * 0.4)
  }

  const place = new Vector3()
  const direction = new Vector3()
  const haut = new Vector3(0, 1, 0)
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
        vol.poser(i, place, direction, haut, tailles[i], leve)
      }
      vol.fini()
    },
  }
}

function lacherLesPapillons(scene: Scene, oeil: Vector3) {
  const N = 14
  const vol = fabriquerUnVol(N, PAPILLON)
  scene.add(vol.maillage)

  const tire = tirage(60815)
  const rayons: number[] = []
  const phases: number[] = []
  for (let i = 0; i < N; i += 1) {
    // Huit a vingt-huit unites, et non cinq a vingt : entre cinq et huit ils
    // passaient entre l oeil et le fut, ou un papillon d une unite et demie
    // couvre autant d ecran qu un visage. Une prairie n a pas de papillons
    // colles a la figure.
    rayons.push(8 + tire() * 20)
    phases.push(tire() * Math.PI * 2)
  }

  const place = new Vector3()
  const direction = new Vector3()
  const vers = new Vector3()
  const haut = new Vector3(0, 1, 0)
  return {
    combien: N,
    avancer: (temps: number) => {
      for (let i = 0; i < N; i += 1) {
        // La vitesse est celle qui a ete mesuree, en unites par seconde ; elle
        // se convertit en vitesse d angle par le rayon, sinon un papillon
        // proche du fut tourne trois fois plus vite qu un papillon du bord.
        const r0 = rayons[i]
        const a = phases[i] + (temps * VOL_DU_PAPILLON) / r0
        // Un papillon ne suit pas un cercle : il monte et descend sans cesse,
        // et son rayon respire. C est ce desordre qui le distingue d une
        // mouche, qui va droit.
        const r = r0 * (0.8 + 0.2 * Math.sin(temps * 0.7 + phases[i]))
        const y = 0.6 + 3.2 * (0.5 + 0.5 * Math.sin(temps * 1.6 + phases[i] * 2))
        place.set(Math.cos(a) * r, y, Math.sin(a) * r)

        // Le papillon se tourne vers l oeil, l oiseau non.
        //
        // Les deux etaient poses a plat, dans le plan horizontal. Un oiseau a
        // vingt unites de haut est vu de dessous, donc presque de face, et sa
        // silhouette tient. Un papillon a deux unites du sol est vu depuis une
        // camera qui se tient a douze : dix-huit degres au-dessus de
        // l horizontale, donc ecrase a trois dixiemes dans le sens de la
        // marche. Il ne restait qu une flechette orange, et aucun battement
        // n y changeait rien.
        //
        // On garde donc son axe de vol mais rabattu dans le plan de l ecran,
        // et les ailes se relevent vers l oeil : le papillon montre son dessus
        // quoi qu il arrive, ce qui est aussi la seule facon de voir un
        // papillon dans la nature.
        vers.copy(oeil).sub(place).normalize()
        direction.set(-Math.sin(a), 0, Math.cos(a))
        direction.addScaledVector(vers, -direction.dot(vers))
        // Quand il vole droit sur l oeil, sa direction n a plus de projection :
        // on lui donne alors le haut de l ecran comme axe de corps.
        if (direction.lengthSq() < 0.04) direction.crossVectors(vers, haut)
        direction.normalize()

        // Quarante-trois degres de part et d autre du plat, et non soixante.
        // Un papillon ferme vraiment ses ailes au-dessus du dos, mais une aile
        // a soixante degres ne montre plus que la moitie de sa largeur : a
        // cette taille-la il ne restait qu une lame blanche qui tourne, et la
        // silhouette ne se lisait a aucun moment du battement. A quarante-trois
        // degres l aile garde les trois quarts de sa largeur vue de dessus, et
        // le papillon reste un papillon pendant tout le cycle.
        const leve = 0.75 * Math.sin(temps * BATTEMENTS_DU_PAPILLON * Math.PI * 2 + phases[i] * 5)
        // Une envergure de 1,24 unite : vingt-cinq fois nature, ce qu il faut
        // pour tenir quarante pixels a trente unites. A 1,9 la prairie tournait
        // a la nuee de phalenes.
        vol.poser(i, place, direction, vers, 0.62, leve)
      }
      vol.fini()
    },
  }
}

/* ------------------------------------------------------------------ *
 *  Le mouton
 * ------------------------------------------------------------------ */

/**
 * Le mouton : un corps laineux a tete sombre et quatre pattes, deux geometries
 * donc deux appels de dessin. Le corps est un bloc arrondi, les pattes sont
 * reecrites a chaque image parce qu elles balancent, et un balancement est un
 * changement de forme du groupe entier.
 *
 * Il marche en cercle sur la prairie, a l allure confortable relevee sur tapis
 * de pression. Les pattes vont par diagonales opposees, ce qui est le pas d un
 * quadrupede au pas : anterieur gauche avec posterieur droit.
 */
function poserLeMouton(scene: Scene) {
  const groupe = new Group()
  scene.add(groupe)

  const laine = new MeshLambertMaterial({ vertexColors: true })
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
  const pattes = new Mesh(geometrieDesPattes, new MeshLambertMaterial({ color: teinte(0x2f2823), side: DoubleSide }))
  pattes.frustumCulled = false
  groupe.add(pattes)

  // Vingt-six unites le faisaient passer hors du cadre de depart, derriere
  // l arbre une fois sur deux. A quinze il traverse la prairie devant, la ou
  // elle est vide.
  const RAYON = 15
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

/**
 * Le corps : un bloc de laine bossele, un cou, une tete sombre et deux
 * oreilles. Pas une sphere : une sphere fait un ballon, et ce qui dit le
 * mouton est le dos plat, la croupe ronde, l encolure basse et la face noire.
 *
 * La tete est sombre par la couleur des sommets et non par une seconde
 * matiere : un mouton a tete noire sur un corps clair, c est une livree
 * courante, et ca ne coute pas un appel de dessin de plus.
 */
function corpsDeMouton(): BufferGeometry {
  const places: number[] = []
  const tons: number[] = []
  const index: number[] = []
  const TOURS = 12
  // Le profil : abscisse le long du corps, rayon a cet endroit, et le ton de
  // l anneau. Les quatre derniers anneaux font le cou et la tete.
  const profil: [number, number, number][] = [
    [-0.58, 0.10, 0], [-0.50, 0.30, 0], [-0.30, 0.40, 0], [-0.05, 0.42, 0],
    [0.22, 0.40, 0], [0.42, 0.33, 0], [0.54, 0.20, 0.35],
    [0.68, 0.14, 1], [0.84, 0.15, 1], [0.98, 0.07, 1],
  ]
  const ANNEAUX = profil.length
  const toison = teinte(0xf0ece2)
  const face = teinte(0x2a2420)
  const ton = new Color()

  for (let i = 0; i < ANNEAUX; i += 1) {
    const [x, r, sombre] = profil[i]
    ton.copy(toison).lerp(face, sombre)
    for (let p = 0; p < TOURS; p += 1) {
      const angle = (p / TOURS) * Math.PI * 2
      // La laine : un renflement regulier, qui donne le grain de la toison
      // sans une seule image. La tete, elle, est lisse.
      const bosse = 1 + Math.sin(angle * 5 + i * 1.7) * 0.06 * (1 - sombre)
      places.push(x, Math.sin(angle) * r * bosse * 0.92, Math.cos(angle) * r * bosse)
      tons.push(ton.r, ton.g, ton.b)
    }
  }
  for (let i = 0; i < ANNEAUX - 1; i += 1) {
    for (let p = 0; p < TOURS; p += 1) {
      const a0 = i * TOURS + p
      const a1 = i * TOURS + ((p + 1) % TOURS)
      index.push(a0, a1, a0 + TOURS, a1, a1 + TOURS, a0 + TOURS)
    }
  }

  // Les oreilles : deux languettes plantees de part et d autre de la tete.
  // Sans elles la tete est un museau, et un museau seul se lit comme un chien.
  for (const cote of [1, -1]) {
    const base = places.length / 3
    const pointes: [number, number, number][] = [
      [0.74, 0.12, 0.09 * cote],
      [0.66, 0.20, 0.26 * cote],
      [0.78, 0.22, 0.24 * cote],
    ]
    for (const [x, y, z] of pointes) {
      places.push(x, y, z)
      tons.push(face.r, face.g, face.b)
    }
    index.push(base, base + 1, base + 2)
  }

  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new Float32BufferAttribute(places, 3))
  geometrie.setAttribute('color', new Float32BufferAttribute(tons, 3))
  geometrie.setIndex(index)
  geometrie.computeVertexNormals()
  return geometrie
}
