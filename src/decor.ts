// GOD2 · Theophas Aine : le decor et la vue
//
// Le decor n est plus a nous : c est le paysage de ThreeUI, monte par
// `environnement.ts`, avec son ciel, son terrain, son herbe, ses pierres et
// ses cinq lumieres. Ce fichier ne garde que ce qui est du ressort de la
// page : le rendeur, la camera, les gestes autour de l arbre, le cadrage et le
// gardien de cadence.
//
// Rien ici ne retouche le paysage. Les reglages du rendeur eux-memes sont ceux
// de la source : encodage de sortie en sRGB, aucune correction de tonalite,
// carte d ombre douce. La correction ACES qu on avait de nuit a saute : elle
// redistribue toutes les couleurs, et un paysage dont on recopie les teintes
// au millieme pour les passer ensuite dans une courbe n est plus le sien.

import {
  Box3,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { monterLePaysage, type Paysage } from './environnement'
import { HAUTEUR } from './squelette'

export type Vue = {
  scene: Scene
  camera: PerspectiveCamera
  rendu: WebGLRenderer
  gestes: OrbitControls
  /** Le paysage entier, pour que la boucle l avance et que le banc le demonte. */
  paysage: Paysage
  /** Vrai sur un appareil ou il faut tenir le budget : un rapport de pixels
      borne plus bas, et l anticrenelage coupe. */
  serre: boolean
  /** La part de la resolution rendue, que le gardien de cadence baisse sur
      une carte lente. Un, au depart. */
  echelle: number
}

/** Un telephone n a ni la surface ni la carte d un ecran de bureau : on ne lui
    sert pas la meme scene en esperant que ca passe. */
export function surPetitEcran(): boolean {
  return Math.min(window.innerWidth, window.innerHeight) < 720 || window.devicePixelRatio > 2.5
}

export function monterLaVue(toile: HTMLCanvasElement): Vue {
  const serre = surPetitEcran()
  // ?lisse=0 coupe l anticrenelage : c est un reglage d essai pour le banc,
  // qui mesure ce qu il coute, pas un reglage offert a la personne.
  const lisse = !serre && new URLSearchParams(window.location.search).get('lisse') !== '0'

  const rendu = new WebGLRenderer({ canvas: toile, antialias: lisse, alpha: true, powerPreference: 'high-performance' })
  rendu.setClearColor(0x000000, 0)
  rendu.outputEncoding = sRGBEncoding
  rendu.shadowMap.enabled = true
  rendu.shadowMap.type = PCFSoftShadowMap

  const scene = new Scene()

  // Le plan lointain passe la voute, qui est a 900, et les etoiles, qui sont a
  // 760 : sinon le ciel est coupe et il ne reste qu un vide noir au-dela des
  // collines. Le plan proche reste a un demi : la camera peut venir toucher
  // une branche.
  const camera = new PerspectiveCamera(42, 1, 0.5, 1400)
  camera.position.set(HAUTEUR * 0.95, HAUTEUR * 0.62, HAUTEUR * 1.65)

  const gestes = new OrbitControls(camera, toile)
  gestes.target.set(0, HAUTEUR * 0.46, 0)
  gestes.enableDamping = true
  gestes.dampingFactor = 0.08
  gestes.minDistance = HAUTEUR * 0.6
  // Cinq hauteurs et non quatre : sur un telephone tenu droit c est la largeur
  // de la couronne qui commande le recul, et quatre hauteurs ne suffisaient pas
  // a la faire tenir. Le recul calcule etait plafonne ici meme, et les deux
  // aines sortaient de l ecran.
  gestes.maxDistance = HAUTEUR * 5
  // Jamais sous le sol, et maintenant il y en a un pour de bon : passer
  // dessous montrerait la prairie par en dessous, c est-a-dire le revers des
  // faces et un ciel qui remonte du bas de l ecran.
  gestes.maxPolarAngle = Math.PI * 0.472
  // Jamais a la verticale non plus : les branches partent toutes a peu pres
  // a la meme hauteur du fut, et vues du dessus elles s aplatissent en
  // etoile, sans plus rien montrer du tronc. Le geste reste libre, juste pas
  // jusqu au point qui casse la lecture.
  gestes.minPolarAngle = Math.PI * 0.16
  gestes.enablePan = false

  // Le paysage entier : la voute et son degrade, le champ d etoiles, le
  // terrain et sa rampe de couleurs, les pierres du champ, la prairie, les
  // volumes de pluie et de neige, et les cinq lumieres. Il porte aussi la
  // brume, qu il regle heure par heure.
  //
  // C est lui qui eclaire l arbre : aucune lumiere n est ajoutee ici pour le
  // servir. Un arbre pose dans un paysage et eclaire par une lampe qui n y
  // appartient pas se detache du fond comme un decoupage.
  const paysage = monterLePaysage(scene)

  return { scene, camera, rendu, gestes, paysage, serre, echelle: 1 }
}

/** La taille suivie : on ne reecrit jamais canvas.width sans que la valeur ait
    change, parce que l ecrire realloue le tampon et l efface, et on ignore
    toute mesure sous deux pixels, qui est une mise en page effondree et non
    une taille. Les deux pieges sont ceux de god2-volume, payes ailleurs. */
export function suivreLaTaille(vue: Vue, contenant: HTMLElement): () => void {
  const ajuster = () => {
    const large = Math.round(contenant.clientWidth)
    const haut = Math.round(contenant.clientHeight)
    if (large < 2 || haut < 2) return
    const rapport = Math.min(window.devicePixelRatio, vue.serre ? 2 : 1.75) * vue.echelle
    const pixelsLarge = Math.round(large * rapport)
    if (vue.rendu.domElement.width !== pixelsLarge) vue.rendu.setPixelRatio(rapport)
    vue.rendu.setSize(large, haut, false)
    vue.camera.aspect = large / haut
    vue.camera.updateProjectionMatrix()
  }
  ajuster()
  window.addEventListener('resize', ajuster)
  vue.rendu.domElement.addEventListener('reechelle', ajuster)
  return () => window.removeEventListener('resize', ajuster)
}

/**
 * Le gardien de cadence.
 *
 * Le banc a mesure l image a 28 ms sur une carte integree de 2013, a pleine
 * resolution : trente-cinq images par seconde. Plutot que de servir une scene
 * pauvre a tout le monde, la page regarde ce qu elle tient et lache, un
 * palier a chaque constat, la finesse de l ombre, la moitie de l herbe, le
 * flou du verre, puis la resolution d un dixieme a la fois jusqu a quatre
 * cinquiemes au plus bas. Elle ne remonte jamais : ce qui monte et descend se
 * voit.
 *
 * Ce qu elle regarde, c est le vrai cout d une image sur la carte, et non
 * l intervalle entre deux images : celui-ci ne voit pas la carte. Mesure le
 * 21 septembre 2026, une image a 27 ms laissait la page annoncer 16,8 ms
 * d intervalle, et un premier gardien fonde sur lui ne descendait jamais.
 *
 * Une image sur dix est donc lue jusqu a son dernier pixel, ce qui oblige la
 * carte a l avoir finie, et c est cette duree qui compte. Le constat porte sur
 * neuf lectures et sur leur mediane. Au-dessus de seize millisecondes, un
 * ecran a soixante images ne suit plus : la resolution baisse d un palier et
 * le constat recommence. En dessous, le gardien se tait pour de bon : une
 * lecture de pixel coute une attente, et elle ne se paie que le temps de
 * decider.
 */
/**
 * Ce que le gardien peut lacher quand baisser la resolution ne suffit plus.
 *
 * La resolution ne rattrape que ce qui coute au pixel. Mesure au banc sur une
 * Intel HD 4600, l image de cette scene coute 82,5 ms a pleine resolution et
 * encore 59,1 ms a trois cinquiemes : les deux tiers du cout ne sont pas du
 * remplissage, ce sont des triangles et une passe d ombre. Baisser la
 * resolution davantage ne les touche pas.
 *
 * Les deux leviers sont pris sur ce que le demontage a designe, dans l ordre
 * de ce qu ils coutent et de ce qu ils se voient :
 *
 *   la carte d ombre passe de 3072 a 1024, soit un neuvieme des pixels a
 *   remplir. Sur un arbre a mille branches, l ombre reste une dentelle ;
 *   elle devient seulement plus douce, et le paysage n a rien d autre a
 *   ombrer ;
 *
 *   l herbe est ramenee par une plage de dessin. Elle coute 21,2 ms mesurees,
 *   la piece la plus chere du paysage, et c est la seule dont on peut retirer
 *   la moitie sans que l image change de nature : la prairie reste une
 *   prairie, elle est juste moins drue au loin.
 *
 * Rien n est touche sur une machine qui tient la cadence. Le paysage complet
 * de ThreeUI est ce qui est servi par defaut, et ceci n arrive qu a celles qui
 * ne peuvent pas le rendre.
 */
export function alleger(vue: Vue, niveau: number): void {
  if (niveau >= 1) {
    const ombre = vue.paysage.soleil.shadow
    ombre.mapSize.set(1024, 1024)
    // Jeter la cible force three a en reallouer une a la nouvelle taille :
    // changer mapSize seul ne touche pas celle qui est deja en place.
    ombre.map?.dispose()
    ombre.map = null as unknown as typeof ombre.map
  }
  if (niveau >= 2) {
    const herbe = vue.paysage.herbe
    herbe.semis.count = Math.round(herbe.combien * 0.45)
  }
  if (niveau >= 3) {
    // Le verre des panneaux perd son flou.
    //
    // Ce flou ne coute rien a la scene : il est paye par le compositeur du
    // navigateur, pas par notre rendu. Mais les deux se partagent la meme
    // carte, et la mesure le dit sans ambiguite : a vingt-quatre pixels de
    // rayon sur trois panneaux, l image passait de 68 a 158 millisecondes, et
    // le filtre de refraction SVG la poussait a 278. La feuille de style
    // reprend alors une plaque pleine, qui se lit aussi bien et ne coute rien.
    document.documentElement.setAttribute('data-allege', 'oui')
  }
}

export function gardienDeCadence(vue: Vue): (dessiner: () => void) => void {
  const releves: number[] = []
  const pixel = new Uint8Array(4)
  let premieres = 30 // la compilation des nuanceurs tombe dans les premieres
  let images = 0
  let decide = false
  let allege = 0
  return (dessiner: () => void) => {
    if (decide || premieres > 0) {
      premieres = Math.max(0, premieres - 1)
      dessiner()
      return
    }
    images += 1
    if (images % 10 !== 0) {
      dessiner()
      return
    }
    const gl = vue.rendu.getContext()
    const debut = performance.now()
    dessiner()
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
    releves.push(performance.now() - debut)
    if (releves.length < 9) return
    releves.sort((a, b) => a - b)
    const mediane = releves[4]
    releves.length = 0
    if (mediane <= 16) {
      decide = true
      return
    }
    // D abord ce qui ne se voit presque pas : la finesse de l ombre, la moitie
    // de l herbe, le flou du verre. La resolution vient en dernier, et ne
    // descend plus qu a quatre cinquiemes.
    //
    // Elle passait en premier et jusqu a trois cinquiemes, sur l idee qu une
    // resolution qui baisse ne se voit pas. Elle se voit : Cephas a trouve
    // l arbre flou, et c etait ca. L herbe a moitie se remarque moins qu une
    // image entiere adoucie.
    if (allege < 3) {
      allege += 1
      alleger(vue, allege)
      premieres = 10 // la carte d ombre vient d etre refaite
      return
    }
    if (vue.echelle > 0.8) {
      vue.echelle = Math.max(0.8, vue.echelle * 0.9)
      vue.rendu.domElement.dispatchEvent(new Event('reechelle'))
      // Redimensionner une toile l efface. Le changement tombait juste apres
      // l image de la mesure : la toile restait vide jusqu a l image suivante,
      // et comme elle est transparente, le fond pale de la page passait a sa
      // place. C est le clignotement qu on voyait de temps en temps, une fois
      // par palier. On redessine donc tout de suite, dans la meme image.
      dessiner()
      premieres = 10 // la toile vient d etre reallouee
      return
    }
    decide = true
  }
}

/**
 * Le premier cadrage : l arbre entier, quel que soit l ecran, et l horizon
 * derriere lui.
 *
 * Le recul se prend sur la boite que le bois occupe vraiment, mesuree sur la
 * geometrie, et non sur `HAUTEUR`. Ce sont deux choses differentes : HAUTEUR
 * est l echelle de la recette, la boite est ce qu elle a produit. Cinq etages
 * de fourches qui s ajoutent bout a bout menent la cime bien plus haut que la
 * hauteur nominale, et l arbre sortait du cadre par le haut pendant que le
 * calcul, lui, se croyait juste.
 */
export function cadrerLArbre(vue: Vue, boite: Box3): void {
  const demiHauteur = (vue.camera.fov * Math.PI) / 360
  const demiLargeur = Math.atan(Math.tan(demiHauteur) * vue.camera.aspect)
  const taille = boite.getSize(new Vector3())
  const centre = boite.getCenter(new Vector3())
  // La visee se pose au milieu de la boite, un peu bas : on regarde l arbre,
  // pas le ciel au-dessus, et laisser la visee remonter avec la cime poussait
  // l horizon hors de l image.
  vue.gestes.target.set(0, centre.y * 0.86, 0)
  const demiLarge = Math.max(taille.x, taille.z) / 2
  const demiHaut = Math.max(centre.y - boite.min.y, boite.max.y - vue.gestes.target.y)
  // Deux marges et non une : sur un ecran large c est la hauteur qui commande
  // le recul, sur un telephone tenu droit c est la largeur, et une marge
  // unique servait l un en ratant l autre. Le plus exigeant des deux l emporte.
  //
  // La marge en hauteur est la plus large des deux, et volontairement : il
  // faut de la place au-dessus de la couronne pour le ciel, et en dessous pour
  // que la prairie et la ligne d horizon entrent dans l image. Un arbre cale
  // contre le bord haut du cadre perd le paysage qu on vient de monter.
  // La marge en hauteur n est plus elargie sur un ecran etroit : la liste des
  // personnes y prenait le bas de l ecran en permanence, il fallait reculer
  // pour que le pied du fut ne passe pas derriere. Elle est maintenant repliee
  // derriere son bouton, et le bas de l ecran est a l arbre.
  // Sur un telephone tenu droit, la couronne deborde et c est voulu.
  //
  // Faire tenir sa largeur entiere dans trois cent quatre-vingt-dix pixels
  // demande soixante-cinq unites de recul : l arbre y fait alors un tiers de
  // la hauteur de l ecran, les trente-trois visages se tassent en une grappe
  // ou plus personne ne se distingue, et les deux tiers restants sont du ciel
  // et de l herbe vides. On recadre plutot que de rapetisser : la marge en
  // largeur passe sous un, la couronne sort du cadre par les cotes, et les
  // visages retrouvent leur taille. Ce qui deborde, ce sont des feuilles.
  const etroit = vue.camera.aspect < 1
  const pourLaLargeur = (demiLarge * (etroit ? 0.84 : 1.16)) / Math.tan(demiLargeur)
  const pourLaHauteur = (demiHaut * 1.30) / Math.tan(demiHauteur)
  const voulu = Math.max(pourLaLargeur, pourLaHauteur)
  // La butee de recul suit le cadrage au lieu de le contrarier.
  //
  // Elle valait cinq fois la hauteur nominale, soit cinquante unites, et sur un
  // telephone tenu droit le cadrage en demandait soixante-cinq : la couronne
  // sortait du cadre des trois cotes et personne ne pouvait reculer pour la
  // voir. Le plafond est donc pose au-dessus de ce que le cadrage demande.
  vue.gestes.maxDistance = Math.max(vue.gestes.maxDistance, voulu * 1.25)
  const recul = Math.min(vue.gestes.maxDistance, voulu)
  // Une vue basse, presque a hauteur d homme, comme celle de la source.
  //
  // C est le reglage qui decide si la prairie existe. Mesure sur capture :
  // depuis une camera a vingt-sept unites de haut, une lame de vingt
  // centimetres fait quatre pixels et se voit par la tranche, et les cent
  // quatre mille brins redeviennent un aplat vert. Depuis six unites, la
  // premiere herbe est a quinze unites devant, chaque lame en fait onze, et
  // elles se recouvrent : c est la prairie de la reference.
  const direction = new Vector3(0.5, 0.055, 0.87).normalize()
  vue.camera.position.copy(vue.gestes.target).addScaledVector(direction, recul)
  vue.camera.updateProjectionMatrix()
}

/** Le point que la camera vise quand on demande a voir une personne. */
export function regarder(vue: Vue, point: Vector3, recul: number): void {
  vue.gestes.target.copy(point)
  const direction = vue.camera.position.clone().sub(point).normalize()
  vue.camera.position.copy(point).addScaledVector(direction, recul)
}
