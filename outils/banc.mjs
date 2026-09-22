// Le banc du baobab : ce que la scene coute sur la carte graphique.
//
//   node theophas-aine/outils/banc.mjs [adresse]
//   node theophas-aine/outils/banc.mjs [adresse] --saboter
//
// Pourquoi un banc a part : celui de god2-volume compte les images par
// seconde dans un navigateur sans fenetre, et ce navigateur plafonne a trente.
// Avec et sans la scene il rendait le meme chiffre, 27 contre 25, donc il ne
// disait rien. Ici on ne compte pas les images que le navigateur veut bien
// montrer : on force cent vingt rendus d affilee et on attend que la carte ait
// fini chacun, en lisant un pixel, ce qui donne son vrai temps.
//
// Le seuil est celui de la maison, vingt millisecondes au neuvieme dixieme,
// juge a la resolution que la page tient vraiment. Et trois regles :
//   la duree se lit sur la carte graphique, jamais en rendu logiciel, et le
//   nom du rendeur s imprime avec les chiffres ;
//   on garde le neuvieme dixieme, pas la moyenne ;
//   un banc qui ne peut pas echouer ment, d ou --saboter, qui rend la scene
//   vingt-cinq fois par image et doit faire tomber le banc.
//
// Le banc lit la version construite : le serveur de developpement pose une
// barre de mesure qui tourne en continu et fausse tout.

import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const adresse = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5178/'
const saboter = process.argv.includes('--saboter')
// Retirer une piece a la fois : bois, herbe, terrain, pierres, ciel, meteo,
// paysage, tout. C est la seule facon de trouver ce qui coute, et non de le
// deviner. Depuis que le paysage de ThreeUI est monte entier, l arbre n est
// plus la piece la plus chere de sa propre scene, et c est le genre de chose
// qu on ne croit qu en retirant.
const rangSans = process.argv.indexOf('--sans')
const sans = rangSans === -1 ? '' : process.argv[rangSans + 1]

/** Les seuils, et d ou ils viennent. */
const SEUILS = {
  // Le seuil de la maison, celui de kondo/outils/controle-fluidite.mjs : vingt
  // millisecondes au neuvieme dixieme. Un premier seuil de huit avait ete pose
  // ici a la main, sans source ; il est retire plutot que garde pour faire
  // severe.
  neuviemeDixiemeMs: 20,
  // Le ciel, le terrain, les pierres, l herbe, le bois, le feuillage, les
  // nuages, les oiseaux, les papillons, le mouton et ses pattes, plus la passe
  // d ombre pour ceux qui la projettent. Mesure : onze. Le seuil laisse trois
  // de marge ; au-dela, quelqu un a decoupe une piece en morceaux.
  appels: 14,
  // Le seuil n est pas un budget choisi, c est le compte mesure de la scene
  // plus un dixieme de marge, et il est ecrit ici pour qu une piece qui
  // grossit en douce se voie. Mesure : 546 944.
  //
  // L ancien seuil, 60 000, etait celui d un arbre seul sur un fond peint. Il
  // n a pas ete relache pour faire passer le banc : la scene a change de
  // nature, et un seuil qui decrit une autre scene ne mesure rien.
  triangles: 620000,
}

const navigateur = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'],
})

let echecs = 0
try {
  const page = await navigateur.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(adresse, { waitUntil: 'networkidle0', timeout: 45000 })
  await page.waitForFunction(() => window.theophas && window.theophas.vue, { timeout: 20000 })

  const mesurer = (echelle) => page.evaluate(async (fois, retirer, part) => {
    const { vue } = window.theophas
    // Un rendu d ombre force au depart : la page la recalcule une image sur
    // trois, et le banc doit partir d une ombre a jour.
    // La resolution est fixee par le banc et non laissee au gardien de
    // cadence : ce navigateur sans fenetre plafonne a trente images, le
    // gardien y baisserait toujours, et on mesurerait sa decision au lieu de
    // la scene.
    vue.echelle = part
    vue.rendu.domElement.dispatchEvent(new Event('reechelle'))
    // Au plancher, le gardien a aussi lache ses deux paliers d allegement : la
    // carte d ombre et la moitie de l herbe. Le banc doit mesurer l image que
    // la personne voit reellement sur cette carte, pas une image intermediaire
    // qui n existe a aucun moment.
    if (part <= 0.6 && window.theophas.alleger) {
      window.theophas.alleger(vue, 1)
      window.theophas.alleger(vue, 2)
      window.theophas.alleger(vue, 3)
    }
    const gl = vue.rendu.getContext()
    // Le plancher : une scene vide, rendue et lue de la meme facon. Ce qui
    // reste ici n est pas l arbre, c est le prix de la mesure et de la toile.
    const p = vue.paysage
    const cacher = (...objets) => objets.forEach((o) => { if (o) o.visible = false })
    if (retirer === 'tout') vue.scene.traverse((o) => { if (o !== vue.scene) o.visible = false })
    else if (retirer === 'paysage') {
      cacher(p.sol.terrain, p.sol.pierres, p.herbe.semis, p.meteo.pluie.points, p.meteo.neige.points, p.meteo.flaques)
      vue.scene.traverse((o) => { if (o.isPoints || (o.material && o.material.side === 1 && o.geometry.type === 'SphereGeometry')) o.visible = false })
    }
    else if (retirer === 'terrain') cacher(p.sol.terrain)
    else if (retirer === 'pierres') cacher(p.sol.pierres)
    else if (retirer === 'herbe') cacher(p.herbe.semis)
    else if (retirer === 'meteo') cacher(p.meteo.pluie.points, p.meteo.neige.points, p.meteo.flaques)
    else if (retirer === 'ciel') vue.scene.traverse((o) => { if (o.renderOrder <= -15) o.visible = false })
    else if (retirer === 'bois') {
      vue.scene.traverse((o) => {
        const m = o.material
        if (m && m.customProgramCacheKey && m.customProgramCacheKey() === 'ecorce-baobab') o.visible = false
      })
    }
    // Lire un pixel oblige la carte a avoir tout fini : gl.finish, sous
    // ANGLE, rendait la main avant, et le banc lisait 0,3 ms pour une image
    // qui en coutait trente.
    const pixel = new Uint8Array(4)
    const attendre = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
    const extension = gl.getExtension('WEBGL_debug_renderer_info')
    const rendeur = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)

    // Des rendus a blanc pour que les programmes soient compiles avant de
    // chronometrer : sinon la premiere image porte la compilation.
    for (let i = 0; i < 10; i += 1) window.theophas.dessiner()
    attendre()

    const durees = []
    for (let i = 0; i < 120; i += 1) {
      const debut = performance.now()
      for (let k = 0; k < fois; k += 1) window.theophas.dessiner()
      attendre()
      durees.push(performance.now() - debut)
    }
    durees.sort((a, b) => a - b)
    vue.rendu.info.autoReset = true
    vue.rendu.render(vue.scene, vue.camera)
    const info = vue.rendu.info.render
    return {
      rendeur,
      mediane: durees[60],
      neuviemeDixieme: durees[108],
      appels: info.calls,
      triangles: info.triangles,
      cout: window.theophas.cout,
      pixels: [vue.rendu.domElement.width, vue.rendu.domElement.height],
    }
  }, saboter ? 25 : 1, sans, echelle)

  // Trois passes, et la mediane de chaque chiffre : deux passes du meme code
  // se sont ecartees de 15 a 21 ms au plancher sur une machine de travail.
  const troisFois = async (echelle) => {
    const passes = [await mesurer(echelle), await mesurer(echelle), await mesurer(echelle)]
    const milieu = (cle) => passes.map((p) => p[cle]).sort((a, b) => a - b)[1]
    return { ...passes[0], mediane: milieu('mediane'), neuviemeDixieme: milieu('neuviemeDixieme') }
  }
  const mesure = await troisFois(1)
  const auPlancher = await troisFois(0.6)

  const logiciel = /swiftshader|software|llvmpipe|basic render/i.test(mesure.rendeur)
  console.log(adresse + (saboter ? '   (sabote : la scene rendue 25 fois par image)' : '') + (sans ? '   (sans : ' + sans + ')' : ''))
  console.log('rendeur   ' + mesure.rendeur)
  console.log(`toile     ${mesure.pixels[0]} x ${mesure.pixels[1]} pixels`)
  console.log('')

  const ligne = (nom, valeur, seuil, unite) => {
    const bon = valeur <= seuil
    if (!bon) echecs += 1
    console.log(`${bon ? 'bon ' : 'NON '}  ${nom.padEnd(22)} ${String(valeur).padStart(8)} ${unite.padEnd(4)} seuil ${seuil}`)
  }
  // Ce qui se juge est ce que la personne voit. Sur une carte lente, le
  // gardien de cadence baisse la resolution jusqu a trois cinquiemes : c est
  // cette image-la qui doit tenir le seuil. La pleine resolution s imprime a
  // cote, jamais cachee, pour qu on sache ce que le gardien a du rattraper.
  console.log(`      ${'pleine resolution'.padEnd(22)} ${mesure.neuviemeDixieme.toFixed(2).padStart(8)} ms   (${mesure.pixels[0]} x ${mesure.pixels[1]}, mediane ${mesure.mediane.toFixed(1)} ms)`)
  ligne('au plancher du gardien', Number(auPlancher.neuviemeDixieme.toFixed(2)), SEUILS.neuviemeDixiemeMs, 'ms')
  console.log(`      ${''.padEnd(22)} ${''.padStart(8)}      ${auPlancher.pixels[0]} x ${auPlancher.pixels[1]}, neuvieme dixieme`)
  if (mesure.neuviemeDixieme > SEUILS.neuviemeDixiemeMs) {
    console.log('      a pleine resolution cette carte ne tient pas le seuil : le gardien baisse la resolution')
  }
  ligne('appels de dessin', mesure.appels, SEUILS.appels, '')
  ligne('triangles a l ecran', mesure.triangles, SEUILS.triangles, '')
  console.log('')
  const c = mesure.cout
  console.log(`l arbre   : ${c.segments} branches dont ${c.bouts} bouts, ${c.trianglesDuBois} triangles de bois, ` +
    `${c.personnes} personnes`)
  console.log(`le paysage: ${c.variante}, ${c.trianglesDuSol} triangles de sol et de pierres, ` +
    `${c.brinsDHerbe} brins d herbe pour ${c.trianglesDHerbe} triangles, ${c.etoiles} etoiles`)

  if (logiciel) {
    console.log('\nRendu logiciel : une duree mesuree ici ne dit rien de la carte graphique. Pas de conclusion.')
    echecs += 1
  }
} finally {
  await navigateur.close()
}

console.log(echecs === 0 ? '\nle banc passe' : `\n${echecs} ligne(s) tombent`)
process.exit(echecs === 0 ? 0 : 1)
