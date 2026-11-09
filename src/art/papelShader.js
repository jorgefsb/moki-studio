// P6a PRIMER SHADER: papel del atardecer del nivel 1 (skills moki-shaders y shader-art-coding, gokayfem/shader-skills MIT).
// Ruta A de moki-shaders, HORNEAR: cada shader se pinta UNA vez en un WebGL suelto, se copia a un lienzo 2D y el juego solo dibuja
// imágenes. Costo 0 en FPS. GLSL ES 1.00 (WebGL1, como Phaser 3): sin uint ni bits; fBm de ruido de gradiente con octavas giradas
// (noise.glsl de la librería) pero periódico, para que el mosaico empate; viñeta cos^4 de post.glsl.
// Si el navegador no da WebGL o el shader no compila, regresa null y el juego se queda con el papel de siempre.

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

// Comunes: hash sin enteros y ruido de gradiente periódico (rejilla mod per)
const COMUN = `
precision highp float;
uniform vec2 resolution;
vec2 hash22(vec2 p){
  vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
  q+=dot(q,q.yzx+33.33);
  return fract((q.xx+q.yz)*q.zy)*2.-1.;
}
float hash12(vec2 p){
  vec3 q=fract(vec3(p.xyx)*.1031);
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float gnoise(vec2 p,vec2 per){
  vec2 i=floor(p);vec2 f=fract(p);
  vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  vec2 a=mod(i,per),b=mod(i+vec2(1.,0.),per),c=mod(i+vec2(0.,1.),per),d=mod(i+1.,per);
  float va=dot(hash22(a),f),vb=dot(hash22(b),f-vec2(1.,0.));
  float vc=dot(hash22(c),f-vec2(0.,1.)),vd=dot(hash22(d),f-1.);
  return mix(mix(va,vb,u.x),mix(vc,vd,u.x),u.y);
}
// fBm periódico: cada octava dobla la frecuencia y el periodo (sigue empatando) y se corre en vez de girar (girar rompe el mosaico)
float fbm(vec2 p,vec2 per){
  float s=0.,a=.5;
  for(int k=0;k<5;k++){
    s+=a*gnoise(p,per);
    p=p*2.+vec2(17.3,9.1);per*=2.;a*=.5;
  }
  return s;
}
`;

// Grano y fibra: mosaico de papel. Salida para MULTIPLY: blanco = no toca; las motas tiran a café cálido, nunca a gris.
const GRANO = `${COMUN}
uniform float fuerza;
uniform vec3 tinta;
void main(){
  vec2 uv=gl_FragCoord.xy/resolution;
  float nube=fbm(uv*6.,vec2(6.));                       // manchas anchas de la pulpa
  float fx=fbm(vec2(uv.x*40.,uv.y*3.),vec2(40.,3.));    // fibras largas horizontales
  float fy=fbm(vec2(uv.x*3.,uv.y*40.),vec2(3.,40.));    // y verticales
  float fib=smoothstep(.18,.42,abs(fx))*.55+smoothstep(.2,.44,abs(fy))*.45;
  float gr=hash12(mod(gl_FragCoord.xy,resolution))-.5;  // grano fino, un valor por píxel
  float o=clamp(.22+nube*.9+fib*.6+gr*.55,0.,1.);
  gl_FragColor=vec4(mix(vec3(1.),tinta,o*fuerza),1.);
}
`;

// Viñeta cos^4 (post.glsl) con borde cálido: multiplica hacia un kraft claro, el naranja se hace más hondo y no se agrisa.
// Vuelta B: misma forma que la viñeta de siempre (textures.js lightLayer: blanco puro hasta 0.30 del lado, cae hasta 0.78, centro en
// x .5, y .42 desde arriba). Antes el centro blanco era chico y la capa (depth 30, encima de Moki) le pintaba el casco durazno.
const LUZ = `${COMUN}
uniform vec3 borde;
uniform float fuerza;
void main(){
  vec2 uv=gl_FragCoord.xy/resolution;
  float r=length(uv-vec2(.5,.58));                     // y de WebGL sube: .58 aquí = .42 desde arriba
  float t=clamp((r-.30)/.48,0.,1.);                    // 0 = centro neutro (blanco: no toca a Moki), 1 = borde
  float c=cos(t*1.5707963);
  float a=(1.-c*c*c*c)*fuerza;                         // caída cos^4: arranca suave y se carga en la orilla
  float d=hash12(gl_FragCoord.xy)/255.*step(.001,a);   // tramado solo donde hay degradado; el centro queda blanco exacto
  gl_FragColor=vec4(mix(vec3(1.),borde,a)+d,1.);
}
`;

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function pinta(frag, W, H, unis) {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = sh(gl.VERTEX_SHADER, VERT);
  const f = sh(gl.FRAGMENT_SHADER, frag);
  const pr = gl.createProgram();
  if (v && f) {
    gl.attachShader(pr, v);
    gl.attachShader(pr, f);
    gl.linkProgram(pr);
  }
  let out = null;
  if (v && f && gl.getProgramParameter(pr, gl.LINK_STATUS)) {
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(ap);
    gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, W, H);
    gl.uniform2f(gl.getUniformLocation(pr, 'resolution'), W, H);
    Object.entries(unis).forEach(([n, val]) => {
      const loc = gl.getUniformLocation(pr, n);
      if (Array.isArray(val)) gl.uniform3fv(loc, val);
      else gl.uniform1f(loc, val);
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    out.getContext('2d').drawImage(cv, 0, 0);
  }
  const lose = gl.getExtension('WEBGL_lose_context'); // suelta el contexto ya: el navegador tiene un tope de contextos vivos
  if (lose) lose.loseContext();
  return out;
}

// PAPEL: perillas del horneado (aquí y no en config.js, para no crecer el JS inicial: este módulo va en el chunk del atardecer)
export const PAPEL = {
  on: true, // en false, el atardecer vuelve al papel y la viñeta gris de siempre
  grano: { tam: 512, fuerza: 0.16, tinta: '#8A4A22', alfa: 1 }, // fuerza: cuánto llega la mota más oscura hacia la tinta café (vuelta B: 0.12 → 0.16, que se note a 660)
  luz: { tam: 256, borde: '#E9C49C', fuerza: 0.65 }, // borde: kraft claro (no tinta); fuerza: cuánto llega la orilla al kraft (vuelta B: 1 → 0.65, más suave)
};

export function hornearPapel() {
  if (!PAPEL.on) return null;
  const G = PAPEL.grano;
  const L = PAPEL.luz;
  try {
    const grano = pinta(GRANO, G.tam, G.tam, { fuerza: G.fuerza, tinta: rgb(G.tinta) });
    const luz = pinta(LUZ, L.tam, L.tam, { borde: rgb(L.borde), fuerza: L.fuerza });
    return grano && luz ? { grano, luz } : null;
  } catch {
    return null;
  }
}

export const FUENTES = { VERT, GRANO, LUZ }; // para la prueba de compilación (glslangValidator) y el probador
