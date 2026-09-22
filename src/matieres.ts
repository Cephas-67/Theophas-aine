// GOD2 · Theophas Aine : les matieres
//
// Aucune texture, aucune image : chaque matiere est une fonction, comme dans
// god2-volume. Ce qui pese dans un arbre realiste, ce ne sont pas les
// triangles, ce sont les images d ecorce et de feuilles, et il n y en a
// aucune ici.
//
// Toutes les teintes viennent de releve.json, c est-a-dire de la photographie.

import {
  Color,
  DoubleSide,
  MeshDepthMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  RGBADepthPacking,
  type IUniform,
} from 'three'
import releve from './releve.json'
import { GRAIN } from './bois'

const teintes = releve.teintes
const gros = teintes['ecorce-selous-1.jpg']
const loin = teintes['baobab-senegal.jpg']
const feuille = teintes['colatier.jpg']

/** Une teinte relevee est ecrite en sRGB, comme toute couleur lue sur une
    photographie. Le rendu, lui, calcule en lineaire et reencode a la sortie :
    sans cette conversion la couleur passe deux fois par l encodage et sort
    delavee. C est ce qui rendait la laterite beige et le fut blanc. */
export function couleur(sRGB: string): Color {
  return new Color(sRGB).convertSRGBToLinear()
}

/** Les teintes relevees, nommees une fois pour toutes. */
export const TEINTES = {
  ecorceAuSoleil: gros.ecorceLumiere.median,
  ecorceClaire: gros.ecorceOmbre.clair,
  ecorceALOmbre: gros.ecorceOmbre.median,
  fondDePli: gros.ecorcePliSombre.median,
  cicatrice: gros.ecorcePliSombre.sombre,
  lateriteNue: loin.lateriteNue.median,
  lateriteClaire: loin.lateriteNue.clair,
  herbeSeche: loin.herbeSeche.median,
  cielHaut: loin.cielHaut.median,
  cielBas: loin.cielBas.median,
  feuillageOmbre: feuille.feuillageOmbre.median,
  feuillageLumiere: feuille.feuillageLumiere.median,
  /** La bande claire du releve, celle des feuilles que le soleil traverse.
      Elle etait dans le fichier depuis le debut et n a jamais servi : le code
      partait de la mediane et la tirait vers le blanc, ce qui monte la clarte
      en retirant le vert. La couronne sortait kaki. */
  feuillageAuSoleil: feuille.feuillageOmbre.clair,
}

/** Le temps et la selection sont partages par toutes les matieres : un seul
    objet, mis a jour une fois par image. */
export const partages: Record<string, IUniform> = {
  uTemps: { value: 0 },
  uVent: { value: 1 },
  uSelection: { value: -1 },
  uSurvol: { value: -1 },
}

/** Un bruit de valeur et son fondu, ecrits une fois et partages par toutes les
    matieres du fichier.

    Le tirage se fait sans sinus et le fondu sur trois octaves : le banc a
    mesure 32 ms par image sur une carte integree, presque tout au remplissage,
    et ce bruit s evalue plusieurs fois par pixel sur la moitie de l ecran. */
const BRUIT = /* glsl */ `
  float alea(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float bruit(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(alea(i), alea(i + vec2(1.0, 0.0)), u.x),
      mix(alea(i + vec2(0.0, 1.0)), alea(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fondu(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i += 1) {
      s += a * bruit(p);
      p *= 2.03;
      a *= 0.5;
    }
    return s;
  }
`

/** La decoupe d une carte de feuillage, partagee par la couleur et par
    l ombre : ecrite deux fois, les deux auraient derive, et l ombre au sol
    n aurait plus eu la forme des feuilles. */
const DECOUPE = /* glsl */ `
  // Une instance n est pas une feuille, c est un bouquet : deux feuilles
  // digitees dessinees dans la meme carte. A l echelle de l arbre une
  // feuille seule fait un dixieme d unite, et il en faudrait des dizaines
  // de milliers ; en bouquets, quelques centaines de cartes suffisent.
  float dedans = 0.0;
  for (int f = 0; f < 2; f += 1) {
    float rang = float(f);
    vec2 centre = vec2(0.5 + cos(rang * 2.4 + vTirage * 6.28) * 0.24,
                       0.30 + rang * 0.30);
    float tourne = rang * 1.9 + vTirage * 3.1;
    float taille = 0.30 - rang * 0.05;
    vec2 p = vUv - centre;
    // Hors du disque de la feuille, aucune foliole ne peut toucher le pixel :
    // on ne les teste pas. La plupart des pixels d une carte sont dans ce cas.
    if (dot(p, p) > taille * taille) continue;
    p = vec2(p.x * cos(tourne) - p.y * sin(tourne), p.x * sin(tourne) + p.y * cos(tourne));
    // Cinq folioles en etoile, d ou le nom digitata : la distance au
    // segment qui va du petiole au bout de chaque foliole.
    for (int i = 0; i < 5; i += 1) {
      float a = (float(i) - 2.0) * 0.52 + 1.5707963;
      vec2 axe = vec2(cos(a), sin(a));
      float leLong = clamp(dot(p, axe), 0.0, taille);
      float ecart = length(p - axe * leLong);
      float largeur = 0.30 * taille * sin(3.1416 * leLong / taille) + 0.006;
      dedans = max(dedans, step(ecart, largeur));
    }
  }
  if (dedans < 0.5) discard;
`

/** Le vent d une carte : calcule sur la place du bouquet dans le monde, pour
    que deux bouquets eloignes ne bougent pas ensemble, applique dans le repere
    de la carte. Partage par la couleur et par l ombre, pour la meme raison
    que la decoupe. */
const VENT_DES_FEUILLES = /* glsl */ `
  vTirage = aTirage;
  #ifdef USE_INSTANCING
    vec3 place = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    transformed += balancement(place, 0.075 * uVent, uTemps + aTirage * 6.28);
  #endif
`

/** Le balancement : deux sinus de periodes premieres entre elles, pour qu il
    ne se repete pas a l oeil, et une amplitude portee par le sommet. */
const VENT = /* glsl */ `
  vec3 balancement(vec3 p, float souplesse, float t) {
    float a = sin(t * 1.1 + p.y * 0.6 + p.x * 0.35);
    float b = sin(t * 0.63 + p.z * 0.5);
    return vec3(a * 0.55 + b * 0.45, b * 0.12, b * 0.5 + a * 0.3) * souplesse;
  }
`

/**
 * L ecorce.
 *
 * Trois echelles, et il faut les trois : les plis verticaux qui font la
 * silhouette du fut, le grain sept fois et demie plus fin qui le tient de
 * pres, et les taches larges sans lesquelles l ecorce est une seule teinte,
 * ce qui se lit comme du plastique. Le releve donne 80 a 110 d ecart de
 * lumiere sur une meme face : c est ca qu il faut rendre.
 */
export function ecorce(): MeshStandardMaterial {
  const matiere = new MeshStandardMaterial({
    color: couleur(TEINTES.ecorceAuSoleil),
    roughness: 0.92,
    metalness: 0,
  })
  // Sans texture, three ne declare pas vUv : ce define le force, et c est
  // vUv qui porte le tour de la branche et sa longueur.
  matiere.defines = { USE_UV: '' }
  // fwidth n existe en WebGL1 que si les derivees sont demandees.
  // Le type de three ne declare extensions que sur un ShaderMaterial, mais le
  // rendeur la lit sur tout materiau : c est la seule facon d obtenir fwidth.
  ;(matiere as unknown as { extensions: { derivatives: boolean } }).extensions = { derivatives: true }

  matiere.onBeforeCompile = (nuanceur) => {
    Object.assign(nuanceur.uniforms, partages)
    nuanceur.uniforms.uClaire = { value: couleur(TEINTES.ecorceClaire) }
    nuanceur.uniforms.uSombre = { value: couleur(TEINTES.fondDePli) }
    nuanceur.uniforms.uCicatrice = { value: couleur(TEINTES.cicatrice) }
    nuanceur.uniforms.uGrain = { value: GRAIN }

    nuanceur.vertexShader = nuanceur.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute float aPlis;
        attribute float aSouplesse;
        attribute float aPersonne;
        uniform float uTemps;
        uniform float uVent;
        varying float vPlis;
        varying float vMoi;
        ${VENT}
        `,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vPlis = aPlis;
        vMoi = aPersonne;
        transformed += balancement(transformed, aSouplesse * uVent, uTemps);
        `,
      )

    nuanceur.fragmentShader = nuanceur.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform vec3 uClaire;
        uniform vec3 uSombre;
        uniform vec3 uCicatrice;
        uniform float uGrain;
        uniform float uSelection;
        uniform float uSurvol;
        varying float vPlis;
        varying float vMoi;
        // Calcules une fois dans la teinte, qui passe avant la normale dans
        // le nuanceur de three, et relus par la normale au lieu d etre refaits.
        float visible = 1.0;
        float grain = 0.5;
        ${BRUIT}
        `,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        #include <normal_fragment_maps>
        // Le pli se voit parce que la lumiere court dessus, pas parce qu il
        // est peint : on incline la normale au lieu d assombrir une bande.
        //
        // Un sinus seul donne des plis identiques et regulierement espaces,
        // qui se lisent comme un tuyau canele et non comme une ecorce : sur
        // aucune des photographies un pli ne garde la meme profondeur ni le
        // meme pas sur toute la hauteur. On brouille la phase et l amplitude
        // par pli, avec le meme bruit que les taches, pour que certains se
        // creusent, d autres s effacent, comme les plis d une vraie ecorce.
        float indexDuPli = floor(vUv.x * vPlis);
        float onde = fondu(vec2(indexDuPli * 0.37, vUv.y * 1.4));
        float pente = sin(vUv.x * 6.2831853 * vPlis + onde * 5.5) * (0.12 + 0.22 * onde) * visible
          + (grain - 0.5) * 0.35;
        normal = normalize(normal + vec3(pente * 0.6, pente * 0.15, pente * 0.6));
        `,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        // Un detail plus fin qu un pixel ne se rend pas, il moire, et sa
        // moyenne tire toute la surface vers le fond de pli : les branches
        // fines sortaient deux fois plus sombres que le fut, pour ce seul
        // motif. On mesure ce que le pli couvre a l ecran et on l eteint quand
        // il passe sous le pixel.
        visible = 1.0 - smoothstep(0.12, 0.45, fwidth(vUv.x * vPlis));
        float creux = (0.5 - 0.5 * cos(vUv.x * 6.2831853 * vPlis)) * visible;
        grain = (fondu(vec2(vUv.x * vPlis * 7.5, vUv.y * uGrain)) - 0.5) * visible + 0.5;
        float taches = fondu(vec2(vUv.x * 2.5, vUv.y * 0.55));
        vec3 teinte = mix(diffuseColor.rgb, uClaire, clamp(taches * 0.9 - 0.12, 0.0, 0.55));
        teinte = mix(teinte, uSombre, creux * 0.34 + grain * 0.14);
        // Les cicatrices de coupe : des bouches allongees, et seulement sur le
        // bois large, parce qu un rameau de l annee n en porte pas.
        float large = smoothstep(14.0, 26.0, vPlis);
        float marque = smoothstep(0.62, 0.78, fondu(vec2(vUv.x * 3.0, vUv.y * 0.9)));
        teinte = mix(teinte, uCicatrice, marque * large * 0.8);
        // La personne montree du doigt : sa branche s eclaire, et c est la
        // seule chose de la scene qui change sans qu on la touche.
        float designee = max(
          step(abs(vMoi - uSelection), 0.5) * 0.13,
          step(abs(vMoi - uSurvol), 0.5) * 0.08
        );
        teinte = mix(teinte, uClaire, designee);
        diffuseColor.rgb = teinte;
        `,
      )
  }

  // Deux matieres identiques ne se recompilent pas si elles portent la meme
  // cle : sans elle, chaque materiau refait son programme.
  matiere.customProgramCacheKey = () => 'ecorce-baobab'
  return matiere
}

/**
 * La feuille digitee du baobab : cinq folioles qui partent du petiole, comme
 * une main ouverte, et c est ce qui donne son nom a l espece. Elle est
 * decoupee dans le fragment et non dans une image : une carte alpha de plus
 * couterait plus cher que la fonction qui la dessine.
 *
 * La teinte est celle du colatier eclaircie d un quart, et c est declare comme
 * une approximation dans l anatomie : le feuillage du baobab est plus clair,
 * et aucune des photographies du dossier ne le montre.
 */
export function feuillage(): MeshLambertMaterial {
  // Les deux bouts de l ecart de lumiere du releve, et rien entre les deux
  // qui ne soit mesure : la bande claire des feuilles traversees par le soleil
  // pour le dessus, la mediane de l ombre pour le dessous. La photographie
  // donne 118 points d ecart sur les memes feuilles, et c est cet ecart-la
  // qu il faut rendre.
  //
  // Le code tirait la mediane vers le blanc pour eclaircir. Un melange avec du
  // blanc monte la clarte en retirant la saturation : la couronne sortait
  // kaki, et le vert du releve avait disparu en route.
  const clair = couleur(TEINTES.feuillageAuSoleil)
  const sombre = couleur(TEINTES.feuillageOmbre)

  // Lambert et non l eclairage physique : une feuille mate n a aucun reflet a
  // calculer, et c est la matiere qui se recouvre le plus a l ecran. Le banc
  // a mesure l image entiere a 41 ms sur une carte integree.
  const matiere = new MeshLambertMaterial({
    color: clair,
    side: DoubleSide,
    transparent: false,
    alphaTest: 0.5,
  })
  matiere.defines = { USE_UV: '' }

  matiere.onBeforeCompile = (nuanceur) => {
    Object.assign(nuanceur.uniforms, partages)
    nuanceur.uniforms.uSombre = { value: sombre }

    nuanceur.vertexShader = nuanceur.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute float aTirage;
        attribute float aHaut;
        uniform float uTemps;
        uniform float uVent;
        varying float vTirage;
        varying float vHaut;
        ${VENT}
        `,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        ${VENT_DES_FEUILLES}
        vHaut = aHaut;
        `,
      )

    nuanceur.fragmentShader = nuanceur.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform vec3 uSombre;
        varying float vTirage;
        varying float vHaut;
        `,
      )
      .replace(
        '#include <alphatest_fragment>',
        /* glsl */ `
        ${DECOUPE}
        // Un houppier a un dessus et un dessous.
        //
        // La teinte se tirait au hasard carte par carte, sur toute l amplitude
        // du clair au sombre : la couronne sortait mouchetee, sans volume, et
        // se lisait comme une tache verte posee sur l arbre. Elle se prend
        // maintenant sur la place de la carte dans la couronne, du pied de
        // houppier a la cime, et le tirage ne fait plus que la variation d une
        // feuille a l autre.
        float dessous = 1.0 - smoothstep(0.12, 0.92, vHaut);
        float melange = clamp(dessous * 0.86 + (fract(vTirage * 7.3) - 0.5) * 0.34, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSombre, melange);
        #include <alphatest_fragment>
        `,
      )
  }

  matiere.customProgramCacheKey = () => 'feuille-baobab'
  return matiere
}

/**
 * L ombre des feuilles.
 *
 * La passe d ombre de three dessine chaque objet avec sa propre matiere de
 * profondeur, qui ignore la decoupe ecrite dans le nuanceur de couleur : sans
 * celle-ci, chaque carte projetait un rectangle plein, et l ombre au sol etait
 * un empilement de carres. Elle recoit donc la meme decoupe et le meme vent.
 */
export function ombreDesFeuilles(): MeshDepthMaterial {
  const matiere = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, alphaTest: 0.5 })
  matiere.defines = { USE_UV: '' }
  matiere.onBeforeCompile = (nuanceur) => {
    Object.assign(nuanceur.uniforms, partages)
    nuanceur.vertexShader = nuanceur.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute float aTirage;
        uniform float uTemps;
        uniform float uVent;
        varying float vTirage;
        ${VENT}
        `,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VENT_DES_FEUILLES}`)
    nuanceur.fragmentShader = nuanceur.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTirage;')
      .replace('#include <alphatest_fragment>', `${DECOUPE}\n#include <alphatest_fragment>`)
  }
  matiere.customProgramCacheKey = () => 'ombre-feuille-baobab'
  return matiere
}
