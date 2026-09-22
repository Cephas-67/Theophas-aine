// GOD2 · Theophas Aine : l herbe
//
// Porte depuis `references/paysage-threeui.md`. C est la piece qui fait le
// midi de ThreeUI : sans elle le terrain est un aplat vert, avec elle c est
// une prairie.
//
// Une lame est un ruban de onze sommets, le meme pour les cent quatre mille
// touffes. Tout ce qui les distingue, hauteur, phase, orientation, nuance, est
// dans quatre nombres par touffe, et la forme entiere, la courbure au repos,
// la torsion, le pincement vers la pointe et le ploiement sous le vent, est
// calculee dans le nuanceur de sommets. Rien n est anime depuis le processeur :
// une seule horloge monte a la carte par image.

import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  type Scene,
  Vector2,
} from 'three'
import { hauteurDuSol, penteDuSol, sm01 } from './bruit'

/** Les reglages du vent, partages avec le nuanceur. Ce sont les valeurs de la
    source : un vent de biais, un ploiement de trois dixiemes, des lames de
    quarante-deux millimes d epaisseur, une courbure au repos d un quart. */
export const reglagesDeLHerbe = {
  uTime: { value: 0 },
  uWind: { value: new Vector2(0.84, 0.54) },
  uWindAmp: { value: 0.30 },
  uThickness: { value: 0.042 },
  uRestBend: { value: 0.26 },
  // La couleur de la lame est melangee dans le nuanceur : la neige posee doit
  // donc l atteindre la-bas. La couleur de la matiere la multiplie et ne peut
  // pas l eclaircir.
  uSnow: { value: 0 },
}

export type Herbe = {
  semis: InstancedMesh
  matiere: MeshLambertMaterial
  combien: number
  triangles: number
}

/** Cinq segments par lame, plus la pointe : neuf triangles. */
const SEGMENTS = 5

export function monterLHerbe(scene: Scene): Herbe {
  const geometrie = fabriquerLaLame()
  const matiere = fabriquerLaMatiere()

  // Cent quatre mille, le compte de la source, et le meme partout. La lame
  // pese neuf triangles, donc le champ entier en pese neuf cent mille : c est
  // la piece la plus lourde du paysage, et de loin. Elle n est pas rabotee sur
  // telephone. Ce qui est demande ici est le paysage de ThreeUI, pas une
  // version allegee qui lui ressemble, et ce que ce compte coute se mesure au
  // banc plutot que de se deviner.
  const N = 104000
  const semis = new InstancedMesh(geometrie, matiere, N)
  semis.frustumCulled = false
  semis.receiveShadow = true

  const params = new Float32Array(N * 4)
  const m4 = new Matrix4()
  let n = 0
  let garde = 0
  while (n < N && garde < N * 12) {
    garde += 1
    const th = Math.random() * Math.PI * 2
    const r = 3 + Math.pow(Math.random(), 0.55) * 112
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    if (penteDuSol(x, z) > 0.60) continue
    // La densite tombe avec la distance, et la hauteur des lames avec elle :
    // c est ce degrade qui fait que la prairie se fond dans le terrain au lieu
    // de s arreter sur un cercle net.
    const bord = 1 - sm01((r - 34) / 74)
    if (Math.random() > 0.10 + bord * 0.86) continue
    m4.makeTranslation(x, hauteurDuSol(x, z) - 0.02, z)
    semis.setMatrixAt(n, m4)
    params[n * 4] = (0.085 + Math.pow(Math.random(), 1.5) * 0.20) * (0.42 + bord * 0.58)
    params[n * 4 + 1] = Math.random() * 6.283
    params[n * 4 + 2] = Math.random() * 6.283
    params[n * 4 + 3] = Math.random()
    n += 1
  }
  semis.count = n
  semis.instanceMatrix.needsUpdate = true
  geometrie.setAttribute('aParams', new InstancedBufferAttribute(params, 4))
  scene.add(semis)

  return { semis, matiere, combien: n, triangles: n * (SEGMENTS * 2 - 1) }
}

/** Le ruban nu : deux sommets par etage et un seul a la pointe. Il est plat et
    droit, et il le reste : c est le nuanceur qui lui donne sa forme. */
function fabriquerLaLame(): BufferGeometry {
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i < SEGMENTS; i += 1) {
    const t = i / SEGMENTS
    pos.push(-0.5, t, 0, 0.5, t, 0)
  }
  pos.push(0, 1, 0)
  for (let i = 0; i < SEGMENTS - 1; i += 1) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  idx.push((SEGMENTS - 1) * 2, (SEGMENTS - 1) * 2 + 1, SEGMENTS * 2)
  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geometrie.setIndex(idx)
  return geometrie
}

function fabriquerLaMatiere(): MeshLambertMaterial {
  const matiere = new MeshLambertMaterial({ color: 0xffffff, side: DoubleSide })
  matiere.onBeforeCompile = (nuanceur) => {
    Object.assign(nuanceur.uniforms, reglagesDeLHerbe)
    nuanceur.vertexShader = `
      uniform float uTime,uWindAmp,uThickness,uRestBend;
      uniform vec2 uWind;
      attribute vec4 aParams;
      varying float vT; varying float vTint;
    ` + nuanceur.vertexShader
      .replace('#include <beginnormal_vertex>', `
        float gT=position.y, gH=aParams.x, gPh=aParams.y, gAng=aParams.z;
        float gCa=cos(gAng), gSa=sin(gAng);
        vT=gT; vTint=aParams.w;
        vec3 gRoot=vec3(instanceMatrix[3][0],instanceMatrix[3][1],instanceMatrix[3][2]);
        float gWave=0.5+0.5*sin(gPh*1.73);
        float gRest=uRestBend*(0.58+gWave*0.42)*pow(gT,1.42)*gH;
        float gRa=gAng+sin(gPh*0.71)*0.52;
        float w1=sin(uTime*1.7+gPh+gRoot.x*0.14+gRoot.z*0.11);
        float w2=sin(uTime*0.4+gRoot.x*0.02+gRoot.z*0.017);
        vec2 gForce=uWind*uWindAmp*(0.55+0.45*w2)*(0.55+0.45*w1);
        float gShape=pow(gT,1.55)*(0.42+gH*0.62);
        vec2 gBend=gForce*gShape+vec2(cos(gRa),sin(gRa))*gRest;
        vec3 objectNormal=normalize(
          vec3(-gSa,0.0,gCa)+vec3(gCa,0.0,gSa)*position.x*2.2
          +vec3(0.0,0.62*gT,0.0)+vec3(gBend.x,0.0,gBend.y)*0.42);
      `)
      .replace('#include <begin_vertex>', `
        float gTaper=max(0.02,1.0-gT*0.92);
        vec2 gRib=vec2(position.x*gCa-position.z*gSa,
                       position.x*gSa+position.z*gCa)*uThickness*gTaper;
        vec3 transformed=vec3(gRib.x,gT*gH,gRib.y);
        transformed.xz+=gBend;
        transformed.y-=abs(gRest)*pow(gT,1.7)*(0.24+gWave*0.08);
      `)
    nuanceur.fragmentShader = `
      uniform float uSnow;
      varying float vT; varying float vTint;
    ` + nuanceur.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 gBase=vec3(0.042,0.062,0.030)*(0.74+vTint*0.54);
      vec3 gTip =vec3(0.225,0.290,0.132)*(0.76+vTint*0.56);
      /* la neige se pose sur les pointes et descend : le pied garde un peu
         d herbe visible meme quand elle est epaisse */
      gBase=mix(gBase,vec3(0.60,0.65,0.72),uSnow*0.86);
      gTip =mix(gTip ,vec3(0.90,0.94,1.00),uSnow);
      diffuseColor.rgb*=mix(gBase,gTip,pow(vT,0.82))*1.18;
    `)
  }
  // Sans cette cle, three garde un seul programme par type de matiere et sert
  // a l herbe le nuanceur d une autre piece deja compilee.
  matiere.customProgramCacheKey = () => 'paysage-herbe'
  return matiere
}
