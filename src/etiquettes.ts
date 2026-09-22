// GOD2 · Theophas Aine : les noms sur l arbre
//
// Une etiquette par personne qui porte une branche, posee au bout de sa
// branche. Le conjoint est ecrit sous l epoux et non sur une branche a lui :
// c est la convention genealogique, un couple se groupe.
//
// Les etiquettes sont du texte du document, pas des images dans la scene :
// elles restent nettes a tout zoom, elles se lisent par un lecteur d ecran, et
// elles ne coutent aucun appel de dessin.

import { Vector3 } from 'three'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { annees, aPlat, type Personne } from './genealogie'
import type { Segment } from './squelette'
import type { Vue } from './decor'

export type Etiquette = {
  personne: Personne
  objet: CSS2DObject
  element: HTMLElement
  rang: number
  place: Vector3
}

export type Plaques = {
  rendu: CSS2DRenderer
  liste: Etiquette[]
  /** Les etiquettes rangees par identifiant, pour repondre a un clic sur le bois. */
  parId: Map<string, Etiquette>
}

const parId = new Map<string, Personne>()
for (const p of aPlat()) parId.set(p.id, p)

export function poserLesEtiquettes(vue: Vue, segments: Segment[], contenant: HTMLElement): Plaques {
  const rendu = new CSS2DRenderer()
  rendu.domElement.className = 'plaques'
  contenant.appendChild(rendu.domElement)

  const liste: Etiquette[] = []
  const table = new Map<string, Etiquette>()
  // Deux freres et soeurs voisins partent souvent presque au meme endroit du
  // fut : leurs etiquettes se touchent a l ecran des le premier cadrage,
  // avant meme qu on tourne l arbre. On les decale en quinconce, comme sur
  // un arbre dessine a la main ou les freres ne s alignent jamais pile.
  let rangDesAines = 0

  for (const segment of segments) {
    if (segment.personne === '') continue
    const personne = parId.get(segment.personne)
    if (!personne) continue

    const element = document.createElement('button')
    element.type = 'button'
    element.className = `plaque plaque-${segment.rang}`
    if (segment.rang === 1) {
      element.classList.add(rangDesAines % 2 === 0 ? 'plaque-decalee-haut' : 'plaque-decalee-bas')
      rangDesAines += 1
    }
    element.dataset.personne = personne.id

    // Le visage, en medaillon rond, avant le nom. C est ce qu on reconnait en
    // premier sur un arbre de famille : un nom se lit, un visage se voit.
    // L image est servie par le site, jamais appelee ailleurs, et elle est
    // rapatriee par `npm run theophas:visages`.
    //
    // Elle ne coute aucun appel de dessin : les etiquettes sont du document,
    // pas de la scene. Vingt et un medaillons de 192 pixels pesent 224 ko en
    // tout, decodes une fois par le navigateur et jamais retouches ensuite.
    const visage = document.createElement('img')
    visage.className = 'plaque-visage'
    visage.src = `visages/${personne.id}.jpg`
    visage.alt = ''
    visage.width = 192
    visage.height = 192
    // Rien ne doit attendre une image pour s afficher, et un medaillon qui
    // arrive en retard ne derange personne.
    visage.loading = 'lazy'
    visage.decoding = 'async'
    element.appendChild(visage)

    const textes = document.createElement('span')
    textes.className = 'plaque-textes'
    element.appendChild(textes)

    const nom = document.createElement('span')
    nom.className = 'plaque-nom'
    nom.textContent = `${personne.prenom} ${personne.nom}`
    textes.appendChild(nom)

    const dates = document.createElement('span')
    dates.className = 'plaque-annees'
    dates.textContent = annees(personne)
    textes.appendChild(dates)

    if (personne.union) {
      const couple = document.createElement('span')
      couple.className = 'plaque-union'
      couple.textContent = `avec ${personne.union.prenom} ${personne.union.nom}`
      textes.appendChild(couple)
    }

    // Le tronc porte son nom a mi-hauteur et non a sa cime, ou il serait
    // cache par les branches maitresses.
    const place = segment.rang === 0
      ? segment.ligne[Math.floor(segment.ligne.length * 0.55)].clone()
      : segment.bout.clone()

    const objet = new CSS2DObject(element)
    objet.position.copy(place)
    vue.scene.add(objet)

    const etiquette: Etiquette = { personne, objet, element, rang: segment.rang, place }
    liste.push(etiquette)
    table.set(personne.id, etiquette)
  }

  return { rendu, liste, parId: table }
}

/**
 * Ce qui se voit a cette distance.
 *
 * De loin on lit la souche et ses enfants, de pres la troisieme generation
 * apparait : vingt-huit noms affiches ensemble sur un arbre large comme
 * l ecran ne se lisent pas, ils se superposent. La regle est celle d une
 * carte : ce qui est montre depend de l echelle.
 */
export function trierParDistance(plaques: Plaques, vue: Vue): void {
  const distance = vue.camera.position.distanceTo(vue.gestes.target)
  for (const etiquette of plaques.liste) {
    const visible = etiquette.rang <= 1 || distance < 17
    etiquette.element.classList.toggle('plaque-effacee', !visible)
  }
}
