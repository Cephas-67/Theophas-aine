// GOD2 · Theophas Aine : l arbre de la famille
//
// L ordre de montage : l ossature vient de la genealogie, le bois de
// l ossature, le feuillage du bois, les noms des personnes. Rien n est pose
// en decor : chaque branche est quelqu un.

import { type Box3, Mesh, Raycaster, Vector2 } from 'three'
import { alleger, cadrerLArbre, gardienDeCadence, monterLaVue, suivreLaTaille, regarder, type Vue } from './decor'
import { compterLOssature, ossature, type Segment } from './squelette'
import { fabriquerLeBois } from './bois'
import { ecorce, feuillage, ombreDesFeuilles, partages } from './matieres'
import { compterLeFeuillage, fabriquerLeFeuillage } from './feuillage'
import { poserLesEtiquettes, trierParDistance } from './etiquettes'
import { annees, aPlat, compter, SOUCHE, type Personne } from './genealogie'

const toile = document.getElementById('arbre') as HTMLCanvasElement
const contenant = document.getElementById('scene') as HTMLElement
const fiche = document.getElementById('fiche') as HTMLElement
// Le bouton de fermeture vit dans le panneau : la fiche ecrit dans son propre
// bloc, sinon elle effacerait le bouton a chaque personne choisie.
const ficheContenu = document.getElementById('fiche-contenu') as HTMLElement

const vue: Vue = monterLaVue(toile)
suivreLaTaille(vue, contenant)

const segments: Segment[] = ossature()
const bois = fabriquerLeBois(segments)
const bosquet = new Mesh(bois.geometrie, ecorce())
vue.scene.add(bosquet)

// L arbre porte son ombre sur la prairie, et recoit celle des autres : c est
// ce qui le pose au sol au lieu de le faire flotter devant un decor.
bosquet.castShadow = true
bosquet.receiveShadow = true

// Le feuillage : une carte par bouquet, toutes instanciees, donc un seul appel
// de dessin pour le houppier entier et aucune image. Il est monte sur les
// derniers bouts de rameau, ceux que `squelette.ts` marque feuillus, et nulle
// part ailleurs : des feuilles sur une maitresse cacheraient la branche qui
// porte quelqu un.
const houppier = fabriquerLeFeuillage(segments, feuillage())
// La passe d ombre ignore une decoupe ecrite dans le nuanceur de couleur :
// sans cette matiere-la, chaque carte projetait un rectangle plein au sol.
houppier.customDepthMaterial = ombreDesFeuilles()
vue.scene.add(houppier)

// Le cadrage vient apres le bois : il se prend sur la boite que l arbre occupe
// pour de vrai, pas sur la hauteur nominale de la recette.
bois.geometrie.computeBoundingBox()
cadrerLArbre(vue, bois.geometrie.boundingBox as Box3)

const plaques = poserLesEtiquettes(vue, segments, contenant)

// Les personnes, par identifiant, pour ecrire une fiche sans la rechercher.
const gens = new Map<string, Personne>()
const parents = new Map<string, Personne>()
for (const personne of aPlat()) {
  gens.set(personne.id, personne)
  for (const enfant of personne.enfants ?? []) parents.set(enfant.id, personne)
}

/** La place d une personne dans l attribut du bois : c est ce nombre que le
    nuanceur compare, pas une chaine. */
function rangDansLeBois(id: string): number {
  return bois.personnes.indexOf(id)
}

let choisie = ''

function ecrireLaFiche(id: string): void {
  const personne = gens.get(id)
  if (!personne) return
  const parent = parents.get(id)
  const lignes: string[] = []
  lignes.push(`<h2>${personne.prenom} ${personne.nom}</h2>`)
  lignes.push(`<p class="fiche-annees">${annees(personne)}</p>`)
  lignes.push(`<dl>`)
  lignes.push(`<dt>Lieu</dt><dd>${personne.lieu}</dd>`)
  lignes.push(`<dt>Métier</dt><dd>${personne.metier}</dd>`)
  if (personne.union) {
    lignes.push(`<dt>Union</dt><dd>${personne.union.prenom} ${personne.union.nom}, ${annees(personne.union)}, de ${personne.union.origine}</dd>`)
  }
  if (parent) lignes.push(`<dt>Enfant de</dt><dd>${parent.prenom} ${parent.nom}</dd>`)
  const enfants = personne.enfants ?? []
  if (enfants.length > 0) {
    const noms = enfants.map((e) => `${e.prenom} (${e.naissance})`).join(', ')
    lignes.push(`<dt>${enfants.length > 1 ? 'Enfants' : 'Enfant'}</dt><dd>${noms}</dd>`)
  }
  lignes.push(`</dl>`)
  ficheContenu.innerHTML = lignes.join('')
  fiche.hidden = false
}

function choisir(id: string, bouger = true): void {
  choisie = id
  partages.uSelection.value = rangDansLeBois(id)
  for (const etiquette of plaques.liste) {
    etiquette.element.classList.toggle('plaque-choisie', etiquette.personne.id === id)
  }
  ecrireLaFiche(id)
  // Au premier affichage la camera ne bouge pas : on montre l arbre entier
  // avant de montrer quelqu un. Une vue qui s ouvre deja recadree sur une
  // branche fait croire que l arbre est coupe.
  if (!bouger) return
  const etiquette = plaques.parId.get(id)
  if (etiquette) regarder(vue, etiquette.place, vue.camera.position.distanceTo(vue.gestes.target))
}

function survoler(id: string): void {
  partages.uSurvol.value = id === '' ? -1 : rangDansLeBois(id)
  toile.style.cursor = id === '' ? 'grab' : 'pointer'
}

// Les etiquettes sont des boutons : elles repondent au clic, au doigt et au
// clavier sans qu on ait a les viser dans la scene.
for (const etiquette of plaques.liste) {
  etiquette.element.addEventListener('click', () => choisir(etiquette.personne.id))
  etiquette.element.addEventListener('pointerenter', () => survoler(etiquette.personne.id))
  etiquette.element.addEventListener('pointerleave', () => survoler(choisie))
}

// Et le bois lui-meme repond : on touche une branche, on touche quelqu un.
const rayon = new Raycaster()
const pointeur = new Vector2()

function qui(evenement: PointerEvent): string {
  const cadre = toile.getBoundingClientRect()
  pointeur.x = ((evenement.clientX - cadre.left) / cadre.width) * 2 - 1
  pointeur.y = -((evenement.clientY - cadre.top) / cadre.height) * 2 + 1
  rayon.setFromCamera(pointeur, vue.camera)
  const touches = rayon.intersectObject(bosquet, false)
  if (touches.length === 0) return ''
  const face = touches[0].face
  if (!face) return ''
  const attribut = bois.geometrie.getAttribute('aPersonne')
  const index = Math.round(attribut.getX(face.a))
  return index < 0 ? '' : bois.personnes[index]
}

toile.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return
  survoler(qui(e) || choisie)
})

let departDuGeste = { x: 0, y: 0 }
toile.addEventListener('pointerdown', (e) => { departDuGeste = { x: e.clientX, y: e.clientY } })
toile.addEventListener('pointerup', (e) => {
  // Un glisser fait tourner l arbre, il ne choisit personne : au-dela de six
  // pixels, le geste etait un deplacement de vue.
  const bouge = Math.hypot(e.clientX - departDuGeste.x, e.clientY - departDuGeste.y)
  if (bouge > 6) return
  const id = qui(e)
  if (id !== '') choisir(id)
})

document.getElementById('fermer-fiche')?.addEventListener('click', () => {
  fiche.hidden = true
  choisie = ''
  partages.uSelection.value = -1
  for (const etiquette of plaques.liste) etiquette.element.classList.remove('plaque-choisie')
})

// Ce qui bouge tout seul se coupe : le vent s arrete si la personne a demande
// moins de mouvement, et la boucle entiere s arrete si l arbre n est pas a
// l ecran ou si l onglet passe au fond.
const calme = window.matchMedia('(prefers-reduced-motion: reduce)')
const reglerLeVent = () => { partages.uVent.value = calme.matches ? 0 : 1 }
reglerLeVent()
calme.addEventListener('change', reglerLeVent)

let aLEcran = true
const observateur = new IntersectionObserver((entrees) => {
  aLEcran = entrees.some((e) => e.isIntersecting)
}, { threshold: 0 })
observateur.observe(toile)
window.addEventListener('resize', () => { observateur.unobserve(toile); observateur.observe(toile) })

/** Une image. Le banc appelle cette meme fonction : il mesure le code de la
    page, pas une copie. */
function dessiner(): void {
  vue.rendu.render(vue.scene, vue.camera)
}

/** L azimut de la camera autour de l arbre. Le paysage en a besoin : les
    volumes de pluie et de neige sont des boites posees devant l objectif, et
    elles doivent tourner avec lui pour rester dans le champ. */
function azimutDeLaVue(): number {
  return Math.atan2(
    vue.camera.position.x - vue.gestes.target.x,
    vue.camera.position.z - vue.gestes.target.z,
  )
}

const surveiller = gardienDeCadence(vue)
let horloge = performance.now()
function boucle(maintenant: number): void {
  requestAnimationFrame(boucle)
  const ecoule = Math.min(0.05, (maintenant - horloge) / 1000)
  horloge = maintenant
  if (!aLEcran || document.hidden) return
  partages.uTemps.value += ecoule
  vue.gestes.update()
  vue.paysage.avancer(ecoule, vue.camera, azimutDeLaVue())
  trierParDistance(plaques, vue)
  surveiller(dessiner)
  plaques.rendu.render(vue.scene, vue.camera)
}

const ajusterLesPlaques = () => plaques.rendu.setSize(contenant.clientWidth, contenant.clientHeight)
ajusterLesPlaques()
window.addEventListener('resize', ajusterLesPlaques)
requestAnimationFrame(boucle)

// La legende : le compte des personnes se calcule, il ne s ecrit pas a la main.
const compte = compter()
const legende = document.getElementById('compte')
if (legende) {
  legende.textContent = `${compte.personnes} membres de la lignée et ${compte.unions} unions, sur trois générations`
}

// Sur un grand ecran la fiche de la souche s ouvre d office, a cote de
// l arbre. Sur un telephone elle couvrirait le tiers bas de l arbre : on la
// garde pour le premier toucher.
if (!vue.serre) choisir(SOUCHE.id, false)

// Ce que la scene coute, lu par le banc. Les nombres sortent du modele
// lui-meme : un chiffre affiche ailleurs viendrait d ici.
const cout = {
  ...compterLOssature(segments),
  trianglesDuBois: bois.triangles,
  ...compterLeFeuillage(segments),
  ...vue.paysage.cout,
  variante: vue.paysage.heure.id + ' / ' + vue.paysage.temps.id,
  personnes: compte.total,
}
Object.assign(window as unknown as Record<string, unknown>, { theophas: { cout, vue, dessiner, alleger } })
