# Théophas Ainé

L'arbre de la famille Théophas Ainé, en volume, planté dans une prairie.
Le fût est la souche, chaque branche maîtresse est un enfant, chaque branche
seconde un petit-enfant. Trois générations, 21 membres de la lignée et 7
unions. Un fil remonte du pied jusqu'à chaque visage et montre la filiation.
On en fait le tour au doigt, on s'approche, on touche un visage ou une branche
pour ouvrir la fiche de la personne.

![L'arbre au milieu de la prairie, à midi](vues/jour.jpg)

## Démarrer

Il faut Node 18 ou plus récent.

```
npm install
npm run dev
```

La page s'ouvre sur **http://localhost:5177**. Glissez pour faire le tour de
l'arbre, molette ou deux doigts pour approcher, touchez un visage ou une
branche pour ouvrir la fiche.

Sur l'arbre il n'y a que des visages, pas de noms : vingt et une pancartes
portant chacune un nom, deux dates et un conjoint couvraient la moitié de la
couronne, et on ne voyait plus l'arbre. Le nom sort en infobulle au survol, il
est lu par un lecteur d'écran, et il s'ouvre en entier dans la fiche au
premier toucher.

Pour voir la version construite, celle qu'on met en ligne :

```
npm run build
npm run preview        # http://localhost:5178
```

`npm run build` écrit tout dans `dist/`. Ce dossier est un site complet et
autonome : il se dépose tel quel sur n'importe quel hébergement statique,
GitHub Pages, Netlify, une clé USB. Il ne demande rien à personne, ce que
`npm run tiers` vérifie.

## Ajouter quelqu'un

Tout se passe dans **`src/genealogie.ts`**. C'est le seul fichier à toucher
pour faire grandir la famille : la forme de l'arbre en découle, elle n'est pas
dessinée à part.

Un enfant de plus sur la souche fait une branche maîtresse de plus. Un
petit-enfant fait une branche seconde de plus sur la branche de son parent.

```ts
{
  id: 'kossi',                 // unique, sans accent ni espace
  prenom: 'Kossi',
  nom: 'Ainé',
  naissance: 1947,
  lieu: 'Abomey',
  metier: 'Menuisier',
  union: { prenom: 'Aké', nom: 'Dossou', naissance: 1950, origine: 'Ouidah' },
  enfants: [ /* la génération suivante, même forme */ ],
}
```

Rangez la fratrie **par âge, l'aîné en premier** : l'ordre du tableau est
l'ordre des branches. L'aîné part le plus bas sur le fût, parce qu'une branche
basse est une branche vieille, et la fratrie se lit de gauche à droite en
tournant par l'avant de l'arbre.

Le conjoint n'a pas de branche : il est écrit sous le nom de son époux. C'est
la convention d'un arbre généalogique, un couple se groupe.

Pour lui donner un visage, ajoutez sa ligne dans `outils/visages.mjs` et
relancez `npm run visages`. Sans ça, l'étiquette s'affiche sans médaillon,
et rien ne casse.

## Comment c'est fait

Aucun fichier 3D, aucune image de texture, aucun service extérieur. Tout est
une recette qui se calcule au chargement.

| fichier | ce qu'il porte |
|---|---|
| `src/genealogie.ts` | la famille, et les conventions qui commandent l'arbre |
| `src/squelette.ts` | l'ossature : le fût, puis cinq étages de fourches |
| `src/bois.ts` | le bois entier, cousu en une seule géométrie |
| `src/matieres.ts` | l'écorce et la feuille, écrites dans des nuanceurs |
| `src/feuillage.ts` | les cartes de feuillage, toutes instanciées |
| `src/fil.ts` | le fil de la généalogie, du pied jusqu'à chaque visage |
| `src/environnement.ts` | le paysage : il assemble `src/paysage/` et pose l'heure |
| `src/paysage/bruit.ts` | le bruit simplexe et la hauteur du sol |
| `src/paysage/terre.ts` | le terrain, sa rampe de couleurs, les pierres |
| `src/paysage/herbe.ts` | la prairie, une lame dessinée dans le nuanceur |
| `src/paysage/ciel.ts` | la voûte, son dégradé, le champ d'étoiles |
| `src/paysage/meteo.ts` | la pluie, la neige, les flaques, l'éclair |
| `src/paysage/heures.ts` | les quatre heures et les quatre temps |
| `src/decor.ts` | la vue, les gestes, le cadrage, le gardien de cadence |
| `src/etiquettes.ts` | les visages posés au bout des branches |

L'arbre entier, fût, branches et cinq étages de fourches, est cousu en une
seule géométrie : un appel de dessin pour mille cent treize branches. Le
feuillage en est un autre, pour douze mille cartes, et le fil un troisième.
Les visages ne sont pas dans la scène, ce sont des éléments du document : ils
restent nets à tout zoom, se lisent par un lecteur d'écran, et ne coûtent
aucun appel de dessin.

### Le fil

L'arbre dit la famille par sa forme, mais sa forme est aussi celle d'un arbre :
les rameaux, le feuillage et les fourches anonymes occupent l'œil autant que
les six branches qui portent quelqu'un. Le fil tranche. Il monte du pied, suit
le fût, se divise à chaque enfant, se divise encore à chaque petit-enfant, et
s'arrête sous chaque visage.

Il ne double pas le bois, il en suit le tracé : chaque branche qui porte
quelqu'un est parcourue, et comme une branche seconde part du bout de celle de
son parent, le fil est continu du bas vers le haut sans qu'on ait à le
recoudre. Il passe devant le feuillage, volontairement : un fil de lecture
qu'une feuille peut cacher ne se lit plus, et c'est justement quand la
couronne est dense qu'on en a besoin.

### Le paysage

La prairie, les collines, le ciel et leurs quatre heures sont repris du
composant `Landscape` de [ThreeUI](https://threeui.com/three-js/landscape/noon),
variante `noon`. Repris, pas importé : il n'y a ici **aucune dépendance à
ThreeUI**, ni paquet, ni iframe, ni fichier copié. Leur source a été lue et
réécrite en TypeScript dans `src/paysage/`, module par module, avec les mêmes
valeurs, les mêmes bruits et les mêmes nuanceurs, et tout ce qui s'en écarte
est dit en face de l'écart avec sa raison.

Les sept variantes se demandent par l'adresse :

```
?variante=noon      midi clair, celle par défaut
?variante=sunrise   ?variante=sunset   ?variante=night
?variante=rain      ?variante=storm    ?variante=snow
```

L'heure ne change pas que la scène : elle repose aussi les couleurs de la
page, qui viennent de la même table.

### Les visages

Vingt et un portraits, photographies Unsplash, rapatriés dans le dépôt par
`npm run visages` et servis par le site. Aucun n'est appelé chez un tiers à
l'affichage. Les auteurs sont crédités dans `public/visages/PORTRAITS.md`.

## Les contrôles

Ils se lancent sur la version construite, donc après `npm run build` et
pendant que `npm run preview` tourne.

```
npm run interdits      ce qui trahit une interface faite à la machine
npm run tiers          rien ne vient d un domaine tiers
npm run tiers -- --casser
npm run banc           le cout de l image sur la carte graphique
npm run banc -- --saboter
npm run banc -- --sans herbe      (ou terrain, pierres, ciel, meteo, bois, paysage, tout)
npm run gardien        le gardien de cadence se fixe et se tait
```

Chaque contrôle a sa contre-épreuve et tombe quand on la lance : un banc qui
ne peut pas échouer ne mesure rien.

### Ce que ça coûte

Mesuré le 22 septembre 2026 sur une Intel HD Graphics 4600, une carte intégrée
de 2013, en 1440 × 900, au neuvième dixième et non à la moyenne. Les durées
sont lues sur la carte graphique : le banc lit un pixel après chaque image, ce
qui l'oblige à avoir fini.

| | image | triangles |
|---|---|---|
| pleine résolution | 82,5 ms | 1 270 812 |
| au plancher du gardien | 40,0 ms | |

Ce que chaque pièce coûte, trouvé en la retirant et pas en le devinant :

| pièce | ce qu'elle coûte |
|---|---|
| le terrain | 22,3 ms |
| l'herbe, 104 000 brins | 21,2 ms |
| les pierres, 2 400 | 6,2 ms |
| l'arbre, son feuillage et sa passe d'ombre | 30,4 ms |

Le paysage est celui de ThreeUI, à ses comptes : 91 800 triangles de terrain,
192 000 de pierres, 936 000 d'herbe. Sur une carte de 2013 ça ne tient pas les
soixante images par seconde, et la page le sait : le gardien de cadence mesure
le vrai coût d'une image sur dix, baisse la résolution par paliers jusqu'à
trois cinquièmes, puis lâche la finesse de la carte d'ombre, puis la moitié de
l'herbe, puis se tait pour de bon. Il ne remonte jamais. Sur une machine qui
tient la cadence, il ne touche à rien et le paysage complet est servi.

## Ce qui reste

- Le fil est d'une épaisseur constante : au pied, où le fût est large, il se
  voit plus qu'il ne devrait ; il faudrait qu'il s'affine avec la branche
  qu'il suit.
- `ANATOMIE.md` décrit le relevé du baobab, qui commandait la silhouette avant
  que l'arbre ne soit refait à fourches. Ce qu'il dit de l'écorce reste vrai,
  ce qu'il dit du fût et de la couronne ne l'est plus.
- Sur la machine de travail, l'image tient 40 ms au plancher du gardien, soit
  vingt-cinq images par seconde, au-dessus du seuil de vingt millisecondes que
  la maison se fixe. Le banc le dit et ne le cache pas.
