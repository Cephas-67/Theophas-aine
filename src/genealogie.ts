// GOD2 · Theophas Aine : la famille
//
// Les conventions de presentation d un arbre genealogique, qui commandent la
// forme de l arbre et pas l inverse :
//   une generation par rang de branche,
//   la fratrie rangee par age, l aine en premier,
//   le conjoint accole a son epoux, jamais sur une branche a lui,
//   pour chaque personne au moins ses prenoms, son nom et ses annees.

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
  union?: Union
  /** Les enfants, deja ranges par age : l aine en tete. */
  enfants?: Personne[]
}

/** La souche, et tout ce qui descend d elle. Trois generations, vingt-huit
    personnes, dont douze par alliance. */
export const SOUCHE: Personne = {
  id: 'theophas',
  prenom: 'Théophas',
  nom: 'Ainé',
  naissance: 1921,
  deces: 2003,
  lieu: 'Abomey',
  metier: 'Tisserand, puis gardien du marché de Dantokpa',
  union: { prenom: 'Ayélé', nom: 'Zinsou', naissance: 1928, deces: 2011, origine: 'Ouidah' },
  enfants: [
    {
      id: 'setondji',
      prenom: 'Sètondji',
      nom: 'Ainé',
      naissance: 1949,
      lieu: 'Cadjèhoun',
      metier: 'Menuisier',
      union: { prenom: 'Adjovi', nom: 'Kpédékpo', naissance: 1953, origine: 'Porto-Novo' },
      enfants: [
        { id: 'kokou-s', prenom: 'Kokou', nom: 'Ainé', naissance: 1976, lieu: 'Cadjèhoun', metier: 'Charpentier' },
        { id: 'aicha-s', prenom: 'Aïcha', nom: 'Ainé', naissance: 1979, lieu: 'Cotonou', metier: 'Sage-femme' },
        { id: 'gblewa', prenom: 'Gblewa', nom: 'Ainé', naissance: 1983, lieu: 'Akpakpa', metier: 'Développeur' },
      ],
    },
    {
      id: 'ayele2',
      prenom: 'Ayélé',
      nom: 'Ainé',
      naissance: 1951,
      lieu: 'Ganvié',
      metier: 'Mareyeuse',
      union: { prenom: 'Comlan', nom: 'Agossou', naissance: 1947, deces: 2019, origine: 'Ganvié' },
      enfants: [
        { id: 'sagbo-a', prenom: 'Sagbo', nom: 'Agossou', naissance: 1974, lieu: 'Ganvié', metier: 'Pêcheur' },
        { id: 'kpedetin-a', prenom: 'Kpédétin', nom: 'Agossou', naissance: 1978, lieu: 'Grand-Popo', metier: 'Institutrice' },
      ],
    },
    {
      id: 'kokou',
      prenom: 'Kokou',
      nom: 'Ainé',
      naissance: 1954,
      lieu: 'Parakou',
      metier: 'Transporteur',
      union: { prenom: 'Fatoumata', nom: 'Baldé', naissance: 1959, origine: 'Natitingou' },
      enfants: [
        { id: 'yao-k', prenom: 'Yao', nom: 'Ainé', naissance: 1981, lieu: 'Parakou', metier: 'Mécanicien' },
        { id: 'mariam-k', prenom: 'Mariam', nom: 'Ainé', naissance: 1984, lieu: 'Parakou', metier: 'Commerçante' },
        { id: 'zinsou-k', prenom: 'Zinsou', nom: 'Ainé', naissance: 1988, lieu: 'Cotonou', metier: 'Agronome' },
      ],
    },
    {
      id: 'wassa',
      prenom: 'Wassa',
      nom: 'Ainé',
      naissance: 1957,
      lieu: 'Dantokpa',
      metier: 'Vendeuse de tissus',
      union: { prenom: 'Yao', nom: 'Amoussou', naissance: 1955, origine: 'Zongo' },
      enfants: [
        { id: 'adjovi-w', prenom: 'Adjovi', nom: 'Amoussou', naissance: 1980, lieu: 'Dantokpa', metier: 'Couturière' },
        { id: 'comlan-w', prenom: 'Comlan', nom: 'Amoussou', naissance: 1986, lieu: 'Fidjrossè', metier: 'Photographe' },
      ],
    },
    {
      id: 'zinsou',
      prenom: 'Zinsou',
      nom: 'Ainé',
      naissance: 1961,
      lieu: 'Godomey',
      metier: 'Instituteur',
      union: { prenom: 'Mariam', nom: 'Sagbo', naissance: 1966, origine: 'Abomey' },
      enfants: [
        { id: 'ake-z', prenom: 'Aké', nom: 'Ainé', naissance: 1990, lieu: 'Godomey', metier: 'Infirmière' },
        { id: 'mahouna-z', prenom: 'Mahouna', nom: 'Ainé', naissance: 1993, lieu: 'Cotonou', metier: 'Étudiante' },
      ],
    },
    {
      id: 'kofi',
      prenom: 'Kofi',
      nom: 'Ainé',
      naissance: 1965,
      lieu: 'Marina',
      metier: 'Forgeron',
      union: { prenom: 'Wassa', nom: 'Dossou', naissance: 1970, origine: 'Cadjèhoun' },
      enfants: [
        { id: 'setondji-k', prenom: 'Sètondji', nom: 'Ainé', naissance: 1992, lieu: 'Marina', metier: 'Soudeur' },
        { id: 'fatoumata-k', prenom: 'Fatoumata', nom: 'Ainé', naissance: 1996, lieu: 'Cotonou', metier: 'Comptable' },
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
