// GOD2 · Theophas Aine : l environnement
//
// Le paysage de ThreeUI, monte dans notre scene. La variante demandee par le
// brief d integration est `noon` : MIDI, temps CLAIR. Les six autres sont la
// aussi et se demandent par l adresse, `?variante=sunrise` et les suivantes,
// exactement comme le fait l adaptateur de la source avec son `?variant=`.
//
// Ce fichier n invente rien. Il assemble, dans l ordre de la source, ce que
// `src/paysage/` porte piece par piece, puis applique une heure et un temps.
// La source de tous les nombres est `references/paysage-threeui.md`, revision
// e8aab48, fichier `public/landscape.html`.
//
// Trois comptes sont ramenes sous ceux de la source : la finesse du terrain,
// le nombre de brins d herbe et celui des pierres. Chacun est dit en face du
// nombre, avec ce qu il coutait au banc et pourquoi le reduire ne se voit pas
// d ici. Ce ne sont pas des economies de principe : la source cadre son
// paysage avec un objectif de dix degres depuis le ras du sol, nous tournons
// autour d un arbre a quarante-deux degres, et ce que ce cadrage-la ne montre
// pas n a pas a etre rendu. Les teintes, les bruits et les nuanceurs, eux, ne
// bougent pas d un milleme.

import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  type PerspectiveCamera,
  type Scene,
} from 'three'
import { monterLeCiel, type Ciel } from './paysage/ciel'
import { HEURES, TEMPS, teinte, VARIANTES, type Heure, type Temps } from './paysage/heures'
import { monterLHerbe, reglagesDeLHerbe, type Herbe } from './paysage/herbe'
import { monterLaMeteo, monterLesEclaboussures, type Meteo } from './paysage/meteo'
import { monterLeSol, type Sol } from './paysage/terre'

export { teinte }

/** Le blanc vers lequel tout tire quand la neige se pose. */
const NEIGEUX = teinte(0xf2f6fa)

export type Paysage = {
  ciel: Ciel
  sol: Sol
  herbe: Herbe
  meteo: Meteo
  soleil: DirectionalLight
  voute: HemisphereLight
  ambiante: AmbientLight
  remplissage: DirectionalLight
  contre: DirectionalLight
  heure: Heure
  temps: Temps
  /** Ce que le paysage coute, pour le banc. */
  cout: { trianglesDuSol: number; brinsDHerbe: number; trianglesDHerbe: number; etoiles: number }
  choisirLaVariante: (nom: string) => void
  avancer: (dt: number, camera: PerspectiveCamera, azimut: number) => void
}

/** La variante voulue : celle de l adresse si elle existe, `noon` sinon. */
export function varianteDemandee(): string {
  const demandee = new URLSearchParams(window.location.search).get('variante')
  return demandee && demandee in VARIANTES ? demandee : 'noon'
}

export function monterLePaysage(scene: Scene): Paysage {
  // La brume de la source : ses deux distances sont reglees par l heure, mais
  // il en faut une des le depart, sinon les premieres images sortent sans.
  scene.fog = new Fog(0x141c30, 100, 340)

  const ciel = monterLeCiel(scene)
  const sol = monterLeSol(scene)
  const herbe = monterLHerbe(scene)
  const meteo = monterLaMeteo(scene)
  const eclaboussures = monterLesEclaboussures(scene)

  // Les cinq lumieres de la source, dans son ordre. Les trois dernieres sont
  // fixes en position : ce sont des lumieres de studio, elles tiennent la
  // scene lisible quel que soit l endroit ou le soleil se trouve.
  const voute = new HemisphereLight(0xfdf8ec, 0xd9cbb0, 0.33)
  scene.add(voute)
  const ambiante = new AmbientLight(0xfff2df, 0.07)
  scene.add(ambiante)
  const soleil = new DirectionalLight(0xfff1dc, 1.12)
  soleil.castShadow = true
  // La source demande 3072. Elle ombre une tour de trente metres avec ses
  // avant-toits ; nous ombrons un arbre, dont l ombre est une dentelle ou un
  // texel de plus ou de moins ne se lit pas. 1536 coute le quart.
  soleil.shadow.mapSize.set(1536, 1536)
  soleil.shadow.camera.near = 8
  soleil.shadow.camera.far = 110
  soleil.shadow.bias = -0.0009
  soleil.shadow.normalBias = 0.024
  soleil.target.position.set(0, 4.2, 0)
  scene.add(soleil)
  scene.add(soleil.target)
  const remplissage = new DirectionalLight(0xe6e2d6, 0.17)
  remplissage.position.set(26, 9, 15)
  scene.add(remplissage)
  const contre = new DirectionalLight(0xfff6ea, 0.09)
  contre.position.set(4, 12, -26)
  scene.add(contre)

  const cielCourant = [0, 0, 0, 0, 0, 0].map(() => new Color())
  const paysage: Paysage = {
    ciel, sol, herbe, meteo, soleil, voute, ambiante, remplissage, contre,
    heure: HEURES[1], temps: TEMPS[0],
    cout: {
      trianglesDuSol: sol.triangles,
      brinsDHerbe: herbe.combien,
      trianglesDHerbe: herbe.triangles,
      etoiles: ciel.combien,
    },
    choisirLaVariante: () => {},
    avancer: () => {},
  }

  /** Poser une heure et un temps, d un coup. La source sait les fondre l un
      dans l autre sur une seconde et quart ; ici la variante est choisie au
      chargement et ne change pas en cours de route, donc le fondu n aurait
      rien a fondre. */
  const appliquer = (heure: Heure, temps: Temps) => {
    paysage.heure = heure
    paysage.temps = temps

    // Le soleil : azimut et elevation, a 52 unites du centre.
    const D = 52
    const ce = Math.cos(heure.soleil.el)
    const se = Math.sin(heure.soleil.el)
    soleil.position.set(D * ce * Math.sin(heure.soleil.az), 4.2 + D * se, D * ce * Math.cos(heure.soleil.az))
    soleil.color.copy(teinte(heure.soleil.teinte))
    soleil.intensity = heure.soleil.force * temps.soleilK
    // La boite d ombre suit l elevation : plus le soleil est bas, plus l ombre
    // qu il jette est longue, et une boite de hauteur fixe la couperait net.
    const portee = 13 + 30 * Math.cos(heure.soleil.el)
    const boite = soleil.shadow.camera
    boite.left = -15
    boite.right = 15
    boite.top = portee
    boite.bottom = -portee
    boite.updateProjectionMatrix()

    voute.color.copy(teinte(heure.hemisphere[0]))
    voute.groundColor.copy(teinte(heure.hemisphere[1]))
    voute.intensity = heure.hemisphere[2] * temps.hemiK
    ambiante.color.copy(teinte(heure.ambiante[0]))
    ambiante.intensity = heure.ambiante[1] * temps.ambK
    remplissage.color.copy(teinte(heure.remplissage[0]))
    remplissage.intensity = heure.remplissage[1]
    contre.color.copy(teinte(heure.contre[0]))
    contre.intensity = heure.contre[1]

    const brume = scene.fog as Fog
    brume.color.copy(teinte(heure.brume))
    brume.near = heure.brumePres * temps.brumeK
    brume.far = heure.brumeLoin * temps.brumeK
    if (temps.brumeC !== null) brume.color.lerp(teinte(temps.brumeC), temps.brumeM)

    sol.matiereDuTerrain.color.copy(teinte(heure.sol))
    sol.matiereDesPierres.color.copy(teinte(heure.sol))
    herbe.matiere.color.copy(teinte(heure.herbe))
    if (temps.solC !== null) {
      const t = teinte(temps.solC)
      sol.matiereDuTerrain.color.lerp(t, temps.solM)
      sol.matiereDesPierres.color.lerp(t, temps.solM)
      herbe.matiere.color.lerp(t, temps.solM)
    }

    for (let i = 0; i < 6; i += 1) {
      cielCourant[i].setHex(heure.ciel[i])
      if (temps.cielC !== null) cielCourant[i].lerp(new Color(temps.cielC), temps.cielM)
    }
    ciel.peindre(cielCourant)

    const combienDEtoiles = heure.etoiles * temps.etoilesK
    for (const couche of ciel.couches) {
      couche.opacity = combienDEtoiles
      couche.visible = combienDEtoiles > 0.005
    }

    // Le sol mouille : plus sombre et assez luisant pour prendre le ciel.
    sol.matiereDuTerrain.roughness = 0.97 - 0.44 * temps.mouille
    sol.matiereDuTerrain.metalness = 0.16 * temps.mouille

    meteo.pluie.points.visible = temps.pluie > 0.01
    meteo.neige.points.visible = temps.neige > 0.01
    ;(meteo.pluie.points.material as { opacity: number }).opacity = 0.50 * temps.pluie
    ;(meteo.neige.points.material as { opacity: number }).opacity = 0.88 * temps.neige
    // La densite est une plage de dessin sur une reserve unique : l orage ne
    // coute pas une goutte de memoire de plus que la bruine, il cesse
    // simplement d en cacher la plupart.
    meteo.pluie.points.geometry.setDrawRange(0, Math.round(meteo.pluie.n * Math.min(1, temps.pluieN)))
    meteo.neige.points.geometry.setDrawRange(0, Math.round(meteo.neige.n * Math.min(1, temps.neigeN)))
    meteo.flaques.visible = temps.mouille > 0.02
    ;(meteo.flaques.material as { opacity: number }).opacity = 0.72 * temps.mouille
    eclaboussures.semis.visible = temps.mouille > 0.02

    // La neige deja posee blanchit le sol, puis l herbe, puis les pierres.
    const posee = meteo.posee * temps.neige
    reglagesDeLHerbe.uSnow.value = posee
    if (posee > 0.002) {
      sol.matiereDuTerrain.color.lerp(NEIGEUX, posee * 0.80)
      herbe.matiere.color.lerp(NEIGEUX, posee * 0.55)
      sol.matiereDesPierres.color.lerp(NEIGEUX, posee * 0.74)
      sol.matiereDuTerrain.roughness = Math.min(1, sol.matiereDuTerrain.roughness + 0.06 * posee)
    }

    poserLesJetons(heure)
  }

  paysage.choisirLaVariante = (nom: string) => {
    const choix = VARIANTES[nom] ?? VARIANTES.noon
    appliquer(HEURES[choix.heure], TEMPS[choix.temps])
  }

  let poseePrecedente = -1
  paysage.avancer = (dt, camera, azimut) => {
    reglagesDeLHerbe.uTime.value += dt
    meteo.avancer(dt, camera, azimut, {
      pluie: paysage.temps.pluie,
      neige: paysage.temps.neige,
      vitesseDeChute: paysage.temps.pluieV,
      eclair: paysage.temps.eclair,
    })
    eclaboussures.avancer(dt, camera, azimut, paysage.temps.pluie)
    // L eclair blanchit la voute elle-meme, et pas seulement ce qu il eclaire.
    ciel.matiere.color.setScalar(1 + meteo.lueur * 0.80)
    // Reposer les teintes coute une recoloration du terrain : on ne le refait
    // que quand la neige posee a bouge pour de bon, quelques fois par seconde
    // au plus, et jamais par temps clair.
    if (paysage.temps.neige > 0.01 && Math.abs(meteo.posee - poseePrecedente) > 0.006) {
      poseePrecedente = meteo.posee
      appliquer(paysage.heure, paysage.temps)
    }
  }

  paysage.choisirLaVariante(varianteDemandee())
  return paysage
}

/** Les jetons de la page suivent l heure : la source les declare dans son
    bloc `css`, heure par heure, et c est ce qui fait que l interface et la
    scene appartiennent au meme moment de la journee. */
function poserLesJetons(heure: Heure): void {
  const racine = document.documentElement
  for (const cle in heure.css) racine.style.setProperty('--' + cle, heure.css[cle])
  racine.setAttribute('data-heure', heure.id.toLowerCase())
}
