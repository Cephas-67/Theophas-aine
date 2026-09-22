// GOD2 · Theophas Aine : la famille
//
// Les conventions de presentation d un arbre genealogique, qui commandent la
// forme de l arbre et pas l inverse :
//   une generation par rang de branche,
//   la fratrie rangee par age, l aine en premier,
//   le conjoint accole a son epoux, jamais sur une branche a lui,
//   pour chaque personne au moins ses prenoms, son nom et ses annees.
//
// Chaque personne porte en plus un recit d une phrase. Ce n est pas du
// remplissage : c est ce qu une famille garde d un parent quand les dates ne
// disent plus rien, et c est ce que la legende ecrit sous son visage.

export type Union = {
  /** Le conjoint, accole a la branche et non porteur d une branche a lui. */
  prenom: string
  nom: string
  naissance: number
  deces?: number
  /** D ou vient la personne qui est entree dans la famille. */
  origine: string
}

export type Personne = {
  id: string
  prenom: string
  /** Le nom de maison se transmet, celui des conjointes reste le leur. */
  nom: string
  naissance: number
  deces?: number
  lieu: string
  metier: string
  /** Une phrase : ce qu on raconte de cette personne dans la famille. */
  recit: string
  union?: Union
  /** Les enfants, deja ranges par age : l aine en tete. */
  enfants?: Personne[]
}

/**
 * La souche, et tout ce qui descend d elle : quatre generations.
 *
 * Les huit petits-enfants nes avant 1985 ont eux-memes des enfants, les plus
 * jeunes pas encore, et c est pour ca que la quatrieme generation ne pousse
 * pas partout. Un arbre genealogique n est jamais regulier ; un arbre qui
 * l est a ete arrange.
 */
export const SOUCHE: Personne = {
  id: 'theophas',
  prenom: 'Théophas',
  nom: 'Ainé',
  naissance: 1921,
  deces: 2003,
  lieu: 'Abomey',
  metier: 'Tisserand, puis gardien du marché de Dantokpa',
  recit: "Il a tissé pour le palais avant de garder la porte de Dantokpa, et connaissait chaque vendeuse par son nom.",
  union: { prenom: 'Ayélé', nom: 'Zinsou', naissance: 1928, deces: 2011, origine: 'Ouidah' },
  enfants: [
    {
      id: 'setondji',
      prenom: 'Sètondji',
      nom: 'Ainé',
      naissance: 1949,
      lieu: 'Cadjèhoun',
      metier: 'Menuisier',
      recit: "L'aîné. Il a bâti de ses mains la maison de Cadjèhoun où la famille se retrouve encore chaque août.",
      union: { prenom: 'Adjovi', nom: 'Kpédékpo', naissance: 1953, origine: 'Porto-Novo' },
      enfants: [
        {
          id: 'kokou-s',
          prenom: 'Kokou',
          nom: 'Ainé',
          naissance: 1976,
          lieu: 'Cadjèhoun',
          metier: 'Charpentier',
          recit: "Charpentier là où son père était menuisier : il pose les charpentes que son frère dessine.",
          enfants: [
            { id: 'dossa-ks', prenom: 'Dossa', nom: 'Ainé', naissance: 2003, lieu: 'Cadjèhoun', metier: 'Apprenti charpentier', recit: "Il apprend le métier sur les chantiers de son père, et dessine déjà mieux que lui." },
            { id: 'nadege-ks', prenom: 'Nadège', nom: 'Ainé', naissance: 2007, lieu: 'Cotonou', metier: 'Lycéenne', recit: "Elle veut être sage-femme comme sa tante Aïcha, et le dit depuis ses huit ans." },
          ],
        },
        {
          id: 'aicha-s',
          prenom: 'Aïcha',
          nom: 'Ainé',
          naissance: 1979,
          lieu: 'Cotonou',
          metier: 'Sage-femme',
          recit: "Sage-femme à Cotonou, elle a mis au monde deux des enfants de cet arbre.",
          enfants: [
            { id: 'elom-as', prenom: 'Elom', nom: 'Ainé', naissance: 2006, lieu: 'Cotonou', metier: 'Lycéen', recit: "Il court le huit cents mètres pour le lycée de Cotonou, et gagne souvent." },
          ],
        },
        {
          id: 'gblewa',
          prenom: 'Gblewa',
          nom: 'Ainé',
          naissance: 1983,
          lieu: 'Akpakpa',
          metier: 'Développeur',
          recit: "Développeur à Akpakpa. C'est lui qui a fait cet arbre.",
          enfants: [
            { id: 'sena-g', prenom: 'Séna', nom: 'Ainé', naissance: 2011, lieu: 'Akpakpa', metier: 'Écolière', recit: "Elle avait nommé toutes les branches de cet arbre avant qu'il ne soit fait." },
            { id: 'kossi-g', prenom: 'Kossi', nom: 'Ainé', naissance: 2014, lieu: 'Akpakpa', metier: 'Écolier', recit: "Le plus jeune de la lignée. Il ne sait pas encore qu'il est au bout d'une branche." },
          ],
        },
      ],
    },
    {
      id: 'ayele2',
      prenom: 'Ayélé',
      nom: 'Ainé',
      naissance: 1951,
      lieu: 'Ganvié',
      metier: 'Mareyeuse',
      recit: "Elle achetait le poisson à l'aube sur le lac et le revendait à Cotonou avant midi, trente ans durant.",
      union: { prenom: 'Comlan', nom: 'Agossou', naissance: 1947, deces: 2019, origine: 'Ganvié' },
      enfants: [
        {
          id: 'sagbo-a',
          prenom: 'Sagbo',
          nom: 'Agossou',
          naissance: 1974,
          lieu: 'Ganvié',
          metier: 'Pêcheur',
          recit: "Pêcheur à Ganvié comme son père, il relève les nasses avant le jour.",
          enfants: [
            { id: 'afi-sa', prenom: 'Afi', nom: 'Agossou', naissance: 2001, lieu: 'Ganvié', metier: 'Mareyeuse', recit: "Elle a repris le commerce de sa grand-mère Ayélé, sur le même ponton." },
            { id: 'edem-sa', prenom: 'Edem', nom: 'Agossou', naissance: 2004, lieu: 'Ganvié', metier: 'Pêcheur', recit: "Il sort avec son père depuis ses douze ans et connaît le lac par temps de brume." },
          ],
        },
        {
          id: 'kpedetin-a',
          prenom: 'Kpédétin',
          nom: 'Agossou',
          naissance: 1978,
          lieu: 'Grand-Popo',
          metier: 'Institutrice',
          recit: "Institutrice à Grand-Popo, elle tient la classe de CM2 depuis quinze ans.",
          enfants: [
            { id: 'lawson-ka', prenom: 'Lawson', nom: 'Agossou', naissance: 2005, lieu: 'Grand-Popo', metier: 'Étudiant', recit: "Il prépare le concours d'instituteur, ce que sa mère ne lui a jamais demandé." },
          ],
        },
      ],
    },
    {
      id: 'kokou',
      prenom: 'Kokou',
      nom: 'Ainé',
      naissance: 1954,
      lieu: 'Parakou',
      metier: 'Transporteur',
      recit: "Parti à Parakou avec un seul camion, il en avait sept quand il a passé la main à son fils.",
      union: { prenom: 'Fatoumata', nom: 'Baldé', naissance: 1959, origine: 'Natitingou' },
      enfants: [
        {
          id: 'yao-k',
          prenom: 'Yao',
          nom: 'Ainé',
          naissance: 1981,
          lieu: 'Parakou',
          metier: 'Mécanicien',
          recit: "Il a repris le garage de son père, et le premier camion roule encore.",
          enfants: [
            { id: 'togbe-yk', prenom: 'Togbé', nom: 'Ainé', naissance: 2008, lieu: 'Parakou', metier: 'Collégien', recit: "Il démonte les moteurs du garage et les remonte, presque toujours entiers." },
            { id: 'akouavi-yk', prenom: 'Akouavi', nom: 'Ainé', naissance: 2012, lieu: 'Parakou', metier: 'Écolière', recit: "Elle tient la caisse du marché le samedi, et ne se trompe jamais." },
          ],
        },
        {
          id: 'mariam-k',
          prenom: 'Mariam',
          nom: 'Ainé',
          naissance: 1984,
          lieu: 'Parakou',
          metier: 'Commerçante',
          recit: "Commerçante à Parakou, elle fournit en pagnes tout le marché du nord.",
          enfants: [
            { id: 'rachidi-mk', prenom: 'Rachidi', nom: 'Ainé', naissance: 2010, lieu: 'Parakou', metier: 'Écolier', recit: "Il accompagne sa mère au marché et porte les pagnes plus vite qu'elle." },
          ],
        },
        {
          id: 'zinsou-k',
          prenom: 'Zinsou',
          nom: 'Ainé',
          naissance: 1988,
          lieu: 'Cotonou',
          metier: 'Agronome',
          recit: "Agronome, il travaille sur les variétés de maïs qui tiennent la saison sèche.",
        },
      ],
    },
    {
      id: 'wassa',
      prenom: 'Wassa',
      nom: 'Ainé',
      naissance: 1957,
      lieu: 'Dantokpa',
      metier: 'Vendeuse de tissus',
      recit: "Son étal de tissus à Dantokpa a habillé trois générations de mariées du quartier.",
      union: { prenom: 'Yao', nom: 'Amoussou', naissance: 1955, origine: 'Zongo' },
      enfants: [
        {
          id: 'adjovi-w',
          prenom: 'Adjovi',
          nom: 'Amoussou',
          naissance: 1980,
          lieu: 'Dantokpa',
          metier: 'Couturière',
          recit: "Couturière à Dantokpa, elle coud sur l'étal où sa mère vendait le tissu.",
          enfants: [
            { id: 'colette-aw', prenom: 'Colette', nom: 'Amoussou', naissance: 2009, lieu: 'Dantokpa', metier: 'Collégienne', recit: "Elle coud à la main à côté de sa mère, sur les chutes de tissu." },
          ],
        },
        {
          id: 'comlan-w',
          prenom: 'Comlan',
          nom: 'Amoussou',
          naissance: 1986,
          lieu: 'Fidjrossè',
          metier: 'Photographe',
          recit: "Photographe à Fidjrossè. La plupart des portraits de famille sont de lui.",
        },
      ],
    },
    {
      id: 'zinsou',
      prenom: 'Zinsou',
      nom: 'Ainé',
      naissance: 1961,
      lieu: 'Godomey',
      metier: 'Instituteur',
      recit: "Instituteur à Godomey, il a appris à lire à plus d'enfants qu'il n'y a de maisons dans la rue.",
      union: { prenom: 'Mariam', nom: 'Sagbo', naissance: 1966, origine: 'Abomey' },
      enfants: [
        {
          id: 'ake-z',
          prenom: 'Aké',
          nom: 'Ainé',
          naissance: 1990,
          lieu: 'Godomey',
          metier: 'Infirmière',
          recit: "Infirmière à Godomey, elle a fait le même choix que sa tante sans le savoir.",
        },
        {
          id: 'mahouna-z',
          prenom: 'Mahouna',
          nom: 'Ainé',
          naissance: 1993,
          lieu: 'Cotonou',
          metier: 'Étudiante',
          recit: "Étudiante en droit à Cotonou, la première de la famille à l'université.",
        },
      ],
    },
    {
      id: 'kofi',
      prenom: 'Kofi',
      nom: 'Ainé',
      naissance: 1965,
      lieu: 'Marina',
      metier: 'Forgeron',
      recit: "Le benjamin. Forgeron à la Marina, il répare ce que personne d'autre n'accepte de regarder.",
      union: { prenom: 'Wassa', nom: 'Dossou', naissance: 1970, origine: 'Cadjèhoun' },
      enfants: [
        {
          id: 'setondji-k',
          prenom: 'Sètondji',
          nom: 'Ainé',
          naissance: 1992,
          lieu: 'Marina',
          metier: 'Soudeur',
          recit: "Soudeur à la Marina, il porte le prénom de son oncle aîné.",
        },
        {
          id: 'fatoumata-k',
          prenom: 'Fatoumata',
          nom: 'Ainé',
          naissance: 1996,
          lieu: 'Cotonou',
          metier: 'Comptable',
          recit: "Comptable à Cotonou, elle tient les livres de trois entreprises du quartier.",
        },
      ],
    },
  ],
}

/** Toutes les personnes portees par une branche, la souche comprise, a plat. */
export function aPlat(racine: Personne = SOUCHE): Personne[] {
  const liste: Personne[] = []
  const pile: Personne[] = [racine]
  while (pile.length > 0) {
    const personne = pile.shift() as Personne
    liste.push(personne)
    if (personne.enfants) pile.push(...personne.enfants)
  }
  return liste
}

/** La generation d une personne : zero pour la souche, un pour ses enfants. */
export function generationDe(id: string, racine: Personne = SOUCHE): number {
  const pile: { personne: Personne; rang: number }[] = [{ personne: racine, rang: 0 }]
  while (pile.length > 0) {
    const { personne, rang } = pile.shift() as { personne: Personne; rang: number }
    if (personne.id === id) return rang
    for (const enfant of personne.enfants ?? []) pile.push({ personne: enfant, rang: rang + 1 })
  }
  return 0
}

/** Le nombre de vivants et de disparus, pour la legende de la page. */
export function compter(racine: Personne = SOUCHE) {
  let personnes = 0
  let unions = 0
  for (const p of aPlat(racine)) {
    personnes += 1
    if (p.union) unions += 1
  }
  return { personnes, unions, total: personnes + unions }
}

/** Les annees d une personne, comme une fiche genealogique les ecrit. */
export function annees(p: Personne | Union): string {
  if (p.deces) return `${p.naissance}-${p.deces}`
  return `depuis ${p.naissance}`
}
