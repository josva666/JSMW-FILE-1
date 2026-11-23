import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export const JSMW_STICKER_URL =
  '/assets/aistudio/WhatsApp_Image_2026-11-23_at_4.52.49_PM_5db7d62c.jpeg';

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface StudioContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  pmremGenerator: THREE.PMREMGenerator;
  envTexture: THREE.Texture;
  dispose: () => void;
}

/**
 * Generates a custom commercial DSLR tabletop-photography environment map
 * using studio softboxes, dark contrast flags, and warm golden rim bounce cards
 * so optical glass and viscous honey render crisp vertical studio reflections.
 */
function buildCommercialStudioEnvScene(): THREE.Scene {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x28170a);

  // Overhead diffused ceiling softbox
  const topPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff0d6, side: THREE.DoubleSide }),
  );
  topPanel.position.set(0, 8, 0);
  topPanel.rotation.x = Math.PI / 2;
  envScene.add(topPanel);

  // Left vertical key strip softbox (crisp specular ribbon on glass & honey)
  const leftStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 11),
    new THREE.MeshBasicMaterial({ color: 0xfffaf0, side: THREE.DoubleSide }),
  );
  leftStrip.position.set(-7.5, 2.4, 4.2);
  leftStrip.lookAt(0, 1, 0);
  envScene.add(leftStrip);

  // Right vertical warm golden kicker strip
  const rightStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd078, side: THREE.DoubleSide }),
  );
  rightStrip.position.set(7.6, 2.4, 3.0);
  rightStrip.lookAt(0, 1, 0);
  envScene.add(rightStrip);

  // Back golden warm bounce wall (transmits luminous honey glow)
  const backGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 9),
    new THREE.MeshBasicMaterial({ color: 0xe8931a, side: THREE.DoubleSide }),
  );
  backGlow.position.set(0, 2.5, -8.5);
  backGlow.lookAt(0, 1, 0);
  envScene.add(backGlow);

  // Subtle dark-umber contrast cards further back to sculpt glass edges without harsh black artifacts
  const flagLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 9),
    new THREE.MeshBasicMaterial({ color: 0x1a0e06, side: THREE.DoubleSide }),
  );
  flagLeft.position.set(-6.0, 2.2, 7.6);
  flagLeft.lookAt(0, 1, 0);
  envScene.add(flagLeft);

  const flagRight = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 9),
    new THREE.MeshBasicMaterial({ color: 0x1a0e06, side: THREE.DoubleSide }),
  );
  flagRight.position.set(6.0, 2.2, 7.6);
  flagRight.lookAt(0, 1, 0);
  envScene.add(flagRight);

  // Front-top diffused fill reflector so metallic bottle caps and glass necks capture crisp highlights
  const frontTopBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xffebd0, side: THREE.DoubleSide }),
  );
  frontTopBounce.position.set(0, 5.2, 7.6);
  frontTopBounce.lookAt(0, 1.2, 0);
  envScene.add(frontTopBounce);

  // Warm studio tabletop bounce underneath
  const floorBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({ color: 0x4d2a0b, side: THREE.DoubleSide }),
  );
  floorBounce.position.set(0, -4.5, 0);
  floorBounce.rotation.x = -Math.PI / 2;
  envScene.add(floorBounce);

  return envScene;
}

export function createStudioContext(
  container: HTMLElement,
  options?: { backgroundColor?: number; fov?: number },
): StudioContext {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(container.clientWidth, 300);
  const height = Math.max(container.clientHeight, 300);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (options?.backgroundColor !== undefined) {
    scene.background = new THREE.Color(options.backgroundColor);
    scene.fog = new THREE.FogExp2(options.backgroundColor, 0.032);
  }

  const camera = new THREE.PerspectiveCamera(options?.fov ?? 36, width / height, 0.1, 100);
  camera.position.set(0, 2.25, 5.65);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = buildCommercialStudioEnvScene();
  const envTexture = pmremGenerator.fromScene(envScene, 0.035).texture;
  scene.environment = envTexture;
  disposeHierarchy(envScene);

  // Balanced 3-point + backlit honey DSLR studio lighting rig
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x1a0e06, 0.62);
  scene.add(hemi);

  // Warm key directional light with tight soft shadows
  const keyLight = new THREE.DirectionalLight(0xffe6bd, 2.1);
  keyLight.position.set(3.8, 6.2, 4.4);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 18;
    const d = 3.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.radius = 3;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.018;
  }
  scene.add(keyLight);

  // Cool sky/fill directional light to sculpt glass curvature & ceramic glazes
  const fillLight = new THREE.DirectionalLight(0xf0f4ff, 0.58);
  fillLight.position.set(-4.8, 3.2, 3.6);
  scene.add(fillLight);

  // Warm golden backlight (makes honey & beeswax glow with rich amber depth)
  const rimLight = new THREE.DirectionalLight(0xffaa1d, 1.95);
  rimLight.position.set(-2.0, 4.4, -5.2);
  scene.add(rimLight);

  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const softboxLeft = new THREE.RectAreaLight(0xfff5e4, 2.6, 2.4, 4.8);
    softboxLeft.position.set(-3.6, 2.4, 2.8);
    softboxLeft.lookAt(0, 0.85, 0);
    scene.add(softboxLeft);

    const softboxRight = new THREE.RectAreaLight(0xffd796, 1.8, 1.8, 4.2);
    softboxRight.position.set(3.7, 2.1, 1.9);
    softboxRight.lookAt(0, 0.85, 0);
    scene.add(softboxRight);
  }

  const dispose = () => {
    envTexture.dispose();
    pmremGenerator.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return { scene, camera, renderer, isSoftwareGl, pmremGenerator, envTexture, dispose };
}

export function scheduleNextFrame(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  tick: () => void,
  timerRef: { current: number },
): void {
  if (!isSoftwareGl) {
    timerRef.current = window.requestAnimationFrame(tick);
    return;
  }
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync !== 'function') {
    timerRef.current = window.setTimeout(tick, 60);
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
    if (state === gl.UNSIGNALED) {
      timerRef.current = window.setTimeout(poll, 4);
    } else {
      if (sync) gl.deleteSync(sync);
      timerRef.current = window.setTimeout(tick, 60);
    }
  };
  timerRef.current = window.setTimeout(poll, 4);
}

/**
 * Generates a tangent-space normal map from a grayscale height array using Sobel gradients.
 */
function buildNormalMapFromHeight(
  heights: Float32Array,
  size: number,
  strength: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const sample = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return heights[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a deep jewel-like amber depth gradient texture so liquid honey displays
 * realistic dark-amber internal richness even on software WebGL renderers.
 */
function createHoneyDepthMap(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 132);
  grad.addColorStop(0.0, '#ffca3a');
  grad.addColorStop(0.32, '#eb920c');
  grad.addColorStop(0.68, '#b85302');
  grad.addColorStop(1.0, '#6e2600');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHoneyMaterial(
  isSoftwareGl: boolean,
  options?: { color?: number; opacity?: number; attenuation?: number },
): THREE.MeshPhysicalMaterial {
  const depthMap = createHoneyDepthMap();
  return new THREE.MeshPhysicalMaterial({
    map: isSoftwareGl ? depthMap : null,
    color: options?.color ?? (isSoftwareGl ? 0xffffff : 0xf0960a),
    emissive: new THREE.Color(0x612600),
    emissiveIntensity: isSoftwareGl ? 0.32 : 0.2,
    roughness: 0.03,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xfff5de),
    ior: 1.504,
    thickness: 1.75,
    attenuationColor: new THREE.Color(options?.attenuation ?? 0xb84900),
    attenuationDistance: 0.56,
    envMapIntensity: 1.6,
    transmission: isSoftwareGl ? 0 : 0.86,
    transparent: true,
    opacity: isSoftwareGl ? (options?.opacity ?? 0.94) : 1.0,
  });
}

/**
 * Rich jewel-like wildflower amber honey specifically for honey enclosed inside
 * transmissive outer glass jars (in Three.js, non-transmissive inner meshes are captured
 * by the glass transmission pass so the glass walls genuinely refract the honey).
 */
export function createEnclosedHoneyMaterial(
  renderer: THREE.WebGLRenderer,
): THREE.MeshPhysicalMaterial {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#ffcb38'); // sunlit top meniscus edge
  grad.addColorStop(0.14, '#e68c08');
  grad.addColorStop(0.45, '#be5e02');
  grad.addColorStop(0.8, '#873600');
  grad.addColorStop(1.0, '#5c2000'); // rich deep wildflower amber at jar base
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle natural suspended pollen / micro-bubble golden flecks
  for (let i = 0; i < 160; i++) {
    const px = Math.abs((Math.sin(i * 19.31) * 43758.5453) % 1) * 256;
    const py = Math.abs((Math.cos(i * 41.73) * 29481.217) % 1) * 512;
    const rad = 0.7 + (i % 3) * 0.55;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 225, 130, 0.22)' : 'rgba(255, 175, 45, 0.12)';
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return new THREE.MeshPhysicalMaterial({
    map,
    color: 0xffd269,
    emissive: new THREE.Color(0x702c00),
    emissiveIntensity: 0.34,
    roughness: 0.04,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xfff2cf),
    envMapIntensity: 1.5,
  });
}

export function createGlassMaterial(isSoftwareGl: boolean): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.025,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff),
    ior: 1.52,
    thickness: 0.36,
    attenuationColor: new THREE.Color(0xfafffc),
    attenuationDistance: 4.5,
    envMapIntensity: 1.65,
    transmission: isSoftwareGl ? 0 : 0.96,
    transparent: true,
    opacity: isSoftwareGl ? 0.14 : 1.0,
    depthWrite: false,
  });
}

export function createBrassCapMaterial(renderer: THREE.WebGLRenderer): THREE.MeshPhysicalMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const vNorm = y / size;
    const isGripBand = vNorm > 0.2 && vNorm < 0.82 ? 1.0 : 0.12;
    const brush = ((Math.sin(y * 0.42) + 1) * 0.5) * 0.06;
    for (let x = 0; x < size; x++) {
      const knurl = (Math.sin((x / size) * Math.PI * 56) * 0.5 + 0.5) * 0.28;
      const v = Math.max(0, Math.min(1, 0.62 + brush + knurl * isGripBand));
      heights[y * size + x] = v;

      const idx = (y * size + x) * 4;
      const g = Math.round(188 + v * 58);
      img.data[idx] = Math.min(255, g);
      img.data[idx + 1] = Math.round(g * 0.78);
      img.data[idx + 2] = Math.round(g * 0.28);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const normalMap = buildNormalMapFromHeight(heights, size, 1.35);
  normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    color: 0xffd25a,
    metalness: 0.52,
    roughness: 0.24,
    anisotropy: 0.75,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.45,
  });
}

/**
 * Smooth hand-sanded oiled olivewood PBR material (albedo + tangent normal + roughness map)
 * for natural wood grain on the honey dipper & comb tray.
 */
export function createHardwoodMaterial(renderer: THREE.WebGLRenderer): THREE.MeshPhysicalMaterial {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const heights = new Float32Array(size * size);
  const aImg = ctx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const warp =
        Math.sin(v * Math.PI * 2 + Math.sin(u * Math.PI * 2) * 0.8) * 0.25 +
        Math.sin(v * Math.PI * 6 + u * 6.283) * 0.08;
      const ring = Math.sin((u * 10 + warp) * Math.PI) * 0.5 + 0.5;
      const finePore =
        (Math.sin(x * 0.45 + y * 0.05) * Math.cos(y * 0.8 - x * 0.12)) * 0.5 + 0.5;
      const grain = ring * 0.82 + finePore * 0.18;

      heights[y * size + x] = grain;

      // Smooth warm natural teak/olivewood tones
      const r = Math.round(104 + grain * 56);
      const g = Math.round(58 + grain * 38);
      const b = Math.round(24 + grain * 20);

      const idx = (y * size + x) * 4;
      aImg.data[idx] = r;
      aImg.data[idx + 1] = g;
      aImg.data[idx + 2] = b;
      aImg.data[idx + 3] = 255;

      const roughVal = Math.round(92 + (1 - grain) * 62);
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const normalMap = buildNormalMapFromHeight(heights, size, 0.75);
  normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughnessMap,
    roughness: 0.62,
    metalness: 0.02,
    clearcoat: 0.28,
    clearcoatRoughness: 0.38,
    envMapIntensity: 0.95,
  });
}

/**
 * Natural organic beeswax PBR material with micro-crystalline normal map & warm golden translucency.
 */
export function createBeeswaxMaterial(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
): THREE.MeshPhysicalMaterial {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mottle =
        Math.sin(x * 0.08) * Math.cos(y * 0.08) * 0.35 +
        Math.sin(x * 0.31 + y * 0.19) * 0.25 +
        ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 0.2;
      const n = Math.max(0, Math.min(1, 0.52 + mottle * 0.45));
      heights[y * size + x] = n;

      const idx = (y * size + x) * 4;
      img.data[idx] = Math.round(182 + n * 48);
      img.data[idx + 1] = Math.round(122 + n * 44);
      img.data[idx + 2] = Math.round(26 + n * 28);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const normalMap = buildNormalMapFromHeight(heights, size, 1.0);

  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    color: 0xe6ac38,
    roughness: 0.44,
    metalness: 0.0,
    sheen: 0.65,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xffe6a6),
    clearcoat: 0.28,
    clearcoatRoughness: 0.34,
    transmission: isSoftwareGl ? 0 : 0.18,
    thickness: 0.35,
    attenuationColor: new THREE.Color(0xd98008),
    attenuationDistance: 0.45,
    envMapIntensity: 1.05,
  });
}

export function createWaxCappingMaterial(renderer: THREE.WebGLRenderer): THREE.MeshPhysicalMaterial {
  const base = createBeeswaxMaterial(renderer, true);
  base.color.setHex(0xf6e3b0);
  base.roughness = 0.68;
  base.sheen = 0.9;
  base.clearcoat = 0.06;
  return base;
}

export function createArtisanCeramicMaterial(
  renderer: THREE.WebGLRenderer,
): THREE.MeshPhysicalMaterial {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ece0cd';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 950; i++) {
    const px = Math.abs((Math.sin(i * 19.31) * 43758.5453) % 1) * size;
    const py = Math.abs((Math.cos(i * 41.73) * 29481.217) % 1) * size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(120, 86, 54, 0.18)' : 'rgba(255, 252, 245, 0.34)';
    ctx.fillRect(px, py, 1.8, 1.8);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return new THREE.MeshPhysicalMaterial({
    map,
    color: 0xf4ece0,
    roughness: 0.22,
    metalness: 0.02,
    clearcoat: 0.92,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.1,
  });
}

// Module-level cached JSMW label image so texture paints synchronously on re-mounts & ready ASAP
let cachedLabelImg: HTMLImageElement | null = null;
if (typeof Image !== 'undefined') {
  const preload = new Image();
  preload.crossOrigin = 'anonymous';
  preload.src = JSMW_STICKER_URL;
  preload.onload = () => {
    cachedLabelImg = preload;
  };
}

/**
 * Loads the official JSMW sticker image and trims thin top/bottom white margins
 * so it wraps seamlessly around the 3D jars & bottles.
 */
export function createJarLabelTexture(
  renderer: THREE.WebGLRenderer,
  onReady?: () => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  const drawSticker = (img: HTMLImageElement) => {
    const sy = Math.round(img.naturalHeight * 0.068);
    const sh = Math.round(img.naturalHeight * 0.864);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, canvas.width, canvas.height);
  };

  if (cachedLabelImg && cachedLabelImg.complete && cachedLabelImg.naturalWidth > 0) {
    drawSticker(cachedLabelImg);
  } else {
    // Rich golden-crimson interim placeholder until sticker finishes decoding
    const bg = ctx.createLinearGradient(0, 0, canvas.width, 0);
    bg.addColorStop(0, '#c87e06');
    bg.addColorStop(0.5, '#f2b705');
    bg.addColorStop(1, '#c87e06');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, canvas.width, 32);
    ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  if (!(cachedLabelImg && cachedLabelImg.complete && cachedLabelImg.naturalWidth > 0)) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedLabelImg = img;
      drawSticker(img);
      tex.needsUpdate = true;
      onReady?.();
    };
    img.src = JSMW_STICKER_URL;
  }

  return tex;
}

export function createSlatePlinthMaterial(
  renderer: THREE.WebGLRenderer,
): THREE.MeshPhysicalMaterial {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const heights = new Float32Array(size * size);

  ctx.fillStyle = '#0d0906';
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const stone =
        Math.sin(x * 0.04 + Math.cos(y * 0.03) * 2.2) * 0.4 +
        Math.sin(x * 0.14 - y * 0.11) * 0.25 +
        ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 0.15;
      const n = Math.max(0, Math.min(1, 0.5 + stone * 0.45));
      heights[y * size + x] = n;
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.round(10 + n * 10);
      img.data[idx + 1] = Math.round(7 + n * 8);
      img.data[idx + 2] = Math.round(5 + n * 6);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const normalMap = buildNormalMapFromHeight(heights, size, 0.7);

  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    roughness: 0.68,
    metalness: 0.04,
    clearcoat: 0.14,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.38,
  });
}

export function createContactShadowPlane(radius = 1.8): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 124);
  grad.addColorStop(0, 'rgba(4, 2, 1, 0.88)');
  grad.addColorStop(0.5, 'rgba(4, 2, 1, 0.42)');
  grad.addColorStop(1, 'rgba(4, 2, 1, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  plane.rotation.x = -Math.PI / 2;
  return plane;
}

/**
 * Generates a realistic veined translucent insect wing texture for macro honeybees.
 */
function createBeeWingTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);

  // Translucent iridescent membrane
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.52, w * 0.46, h * 0.36, -0.06, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, 'rgba(255, 248, 232, 0.55)');
  grad.addColorStop(0.6, 'rgba(240, 238, 255, 0.34)');
  grad.addColorStop(1, 'rgba(255, 224, 175, 0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Delicate chitin wing veins
  ctx.strokeStyle = 'rgba(72, 46, 20, 0.72)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(8, h * 0.42);
  ctx.quadraticCurveTo(w * 0.45, h * 0.16, w * 0.92, h * 0.34);
  ctx.stroke();

  ctx.lineWidth = 1.6;
  const veins: [number, number, number, number][] = [
    [16, h * 0.46, w * 0.76, h * 0.55],
    [45, h * 0.42, w * 0.62, h * 0.78],
    [95, h * 0.34, w * 0.85, h * 0.52],
    [118, h * 0.30, w * 0.74, h * 0.24],
    [152, h * 0.48, w * 0.88, h * 0.64],
  ];
  veins.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) * 0.5, y1 + 8, x2, y2);
    ctx.stroke();
  });
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/**
 * Generates an anatomical segmented abdomen texture (golden-amber tergites + dark chitin bands).
 */
function createBeeAbdomenTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  // Tip (stinger end) dark -> banded amber & obsidian tergites -> waist
  grad.addColorStop(0.0, '#170e07');
  grad.addColorStop(0.18, '#170e07');
  grad.addColorStop(0.24, '#b86c14');
  grad.addColorStop(0.36, '#d98a1f');
  grad.addColorStop(0.42, '#1b1109');
  grad.addColorStop(0.56, '#1b1109');
  grad.addColorStop(0.62, '#d48418');
  grad.addColorStop(0.76, '#e09524');
  grad.addColorStop(0.82, '#1b1109');
  grad.addColorStop(1.0, '#1b1109');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Fine thoracic/abdominal hair texture noise
  for (let i = 0; i < 1600; i++) {
    const x = Math.abs((Math.sin(i * 31.7) * 43758.5453) % 1) * 256;
    const y = Math.abs((Math.cos(i * 17.9) * 19384.213) % 1) * 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,220,145,0.14)' : 'rgba(15,8,3,0.16)';
    ctx.fillRect(x, y, 2, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/**
 * Photorealistic multi-part macro honeybee (replaces stylized cartoon bee across all scenes):
 * dark glossy compound eyes, curved antennae, velvety golden-amber fuzzy thorax,
 * segmented amber/obsidian abdomen, veined iridescent wings, and folded pollen legs.
 */
export function buildPhotorealisticBee(renderer: THREE.WebGLRenderer): THREE.Group {
  const bee = new THREE.Group();

  const chitinMat = new THREE.MeshPhysicalMaterial({
    color: 0x160e08,
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
  });

  const compoundEyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e0805,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.4,
  });

  const thoraxVelvetMat = new THREE.MeshPhysicalMaterial({
    color: 0x8f561a,
    roughness: 0.82,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xf4c266),
  });

  const abdomenTex = createBeeAbdomenTexture(renderer);
  const abdomenMat = new THREE.MeshPhysicalMaterial({
    map: abdomenTex,
    roughness: 0.56,
    metalness: 0.02,
    sheen: 0.75,
    sheenRoughness: 0.58,
    sheenColor: new THREE.Color(0xf2ba52),
    clearcoat: 0.18,
  });

  const wingTex = createBeeWingTexture(renderer);
  const wingMat = new THREE.MeshPhysicalMaterial({
    map: wingTex,
    transparent: true,
    opacity: 0.92,
    roughness: 0.1,
    iridescence: 0.72,
    iridescenceIOR: 1.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 1. Velvety Thorax
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 16), thoraxVelvetMat);
  thorax.scale.set(0.95, 0.9, 1.18);

  // 2. Anatomical Head + Glossy Compound Eyes + Curved Antennae
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 14), chitinMat);
  head.scale.set(1.05, 0.95, 0.78);
  head.position.set(0, -0.004, 0.068);

  const eyeGeo = new THREE.SphereGeometry(0.017, 14, 12);
  const eyeL = new THREE.Mesh(eyeGeo, compoundEyeMat);
  eyeL.scale.set(0.7, 1.18, 0.95);
  eyeL.position.set(-0.026, 0.002, 0.072);
  const eyeR = new THREE.Mesh(eyeGeo, compoundEyeMat);
  eyeR.scale.set(0.7, 1.18, 0.95);
  eyeR.position.set(0.026, 0.002, 0.072);

  const antCurveL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.008, 0.006, 0.092),
    new THREE.Vector3(-0.018, 0.022, 0.108),
    new THREE.Vector3(-0.028, 0.018, 0.128),
  ]);
  const antCurveR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.008, 0.006, 0.092),
    new THREE.Vector3(0.018, 0.022, 0.108),
    new THREE.Vector3(0.028, 0.018, 0.128),
  ]);
  const antL = new THREE.Mesh(new THREE.TubeGeometry(antCurveL, 8, 0.0026, 6, false), chitinMat);
  const antR = new THREE.Mesh(new THREE.TubeGeometry(antCurveR, 8, 0.0026, 6, false), chitinMat);

  // 3. Tapered Segmented Abdomen (Lathe profile oriented along -Z)
  const abProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.016, 0.02),
    new THREE.Vector2(0.044, 0.055),
    new THREE.Vector2(0.056, 0.1),
    new THREE.Vector2(0.046, 0.145),
    new THREE.Vector2(0.02, 0.175),
    new THREE.Vector2(0.0, 0.185),
  ];
  const abGeo = new THREE.LatheGeometry(abProfile, 24);
  abGeo.rotateX(Math.PI / 2);
  const abdomen = new THREE.Mesh(abGeo, abdomenMat);
  abdomen.position.set(0, -0.014, -0.045);
  abdomen.rotation.x = -0.14;

  // 4. Primary Forewings (YXZ order so wing L & R sweep backward & flap symmetrically)
  const foreWingGeo = new THREE.PlaneGeometry(0.155, 0.072);
  foreWingGeo.translate(0.076, 0, -0.012);
  const wingL = new THREE.Mesh(foreWingGeo, wingMat);
  wingL.position.set(-0.018, 0.042, 0.012);
  wingL.rotation.order = 'YXZ';
  wingL.rotation.set(0.28, Math.PI - 0.56, 0.22);
  wingL.name = 'wingL';

  const foreWingGeoR = new THREE.PlaneGeometry(0.155, 0.072);
  foreWingGeoR.translate(0.076, 0, -0.012);
  const wingR = new THREE.Mesh(foreWingGeoR, wingMat);
  wingR.position.set(0.018, 0.042, 0.012);
  wingR.rotation.order = 'YXZ';
  wingR.rotation.set(-0.28, 0.56, 0.22);
  wingR.name = 'wingR';

  // 5. Subtle tucked legs with golden pollen hint
  const legGeo = new THREE.CylinderGeometry(0.003, 0.0022, 0.058, 6);
  const legPairs = [-1, 1].flatMap((side) => [
    (() => {
      const m = new THREE.Mesh(legGeo, chitinMat);
      m.position.set(side * 0.032, -0.046, 0.012);
      m.rotation.set(0.2, 0, side * 0.45);
      return m;
    })(),
    (() => {
      const m = new THREE.Mesh(legGeo, chitinMat);
      m.position.set(side * 0.036, -0.052, -0.032);
      m.rotation.set(-0.4, 0, side * 0.35);
      return m;
    })(),
  ]);

  bee.add(thorax, head, eyeL, eyeR, antL, antR, abdomen, wingL, wingR, ...legPairs);
  return bee;
}

/**
 * Reusable zero-GC tapered & coiled liquid stream mesh for realistic honey pouring and dripping.
 * Updates vertices & normals in-place along any 3D curve with variable radius function.
 */
export interface DynamicLiquidStream {
  mesh: THREE.Mesh;
  update: (curve: THREE.CatmullRomCurve3, radiusAt: (t: number) => number) => void;
}

const _p = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _norm = new THREE.Vector3();
const _binorm = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _alt = new THREE.Vector3(1, 0, 0);

export function createDynamicLiquidStream(
  material: THREE.Material,
  tubularSegments = 38,
  radialSegments = 16,
): DynamicLiquidStream {
  const ringStride = radialSegments + 1;
  const vertCount = (tubularSegments + 1) * ringStride;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  for (let i = 0; i <= tubularSegments; i++) {
    const v = i / tubularSegments;
    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const idx = (i * ringStride + j) * 2;
      uvs[idx] = u;
      uvs[idx + 1] = v;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringStride + j;
      const b = (i + 1) * ringStride + j;
      const c = (i + 1) * ringStride + (j + 1);
      const d = i * ringStride + (j + 1);
      // Outward winding so _binorm x _tan = +_norm faces exterior studio lights
      indices.push(a, d, b, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;

  const update = (curve: THREE.CatmullRomCurve3, radiusAt: (t: number) => number) => {
    const posAttr = geo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      curve.getPointAt(t, _p);
      curve.getTangentAt(t, _tan).normalize();

      const refAxis = Math.abs(_tan.dot(_up)) > 0.94 ? _alt : _up;
      _norm.crossVectors(_tan, refAxis).normalize();
      _binorm.crossVectors(_tan, _norm).normalize();

      const r = Math.max(0.001, radiusAt(t));
      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        const nx = _norm.x * cos + _binorm.x * sin;
        const ny = _norm.y * cos + _binorm.y * sin;
        const nz = _norm.z * cos + _binorm.z * sin;

        const vIdx = i * ringStride + j;
        posAttr.setXYZ(vIdx, _p.x + r * nx, _p.y + r * ny, _p.z + r * nz);
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  };

  return { mesh, update };
}

export function disposeHierarchy(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (!m) return;
        const record = m as unknown as Record<string, unknown>;
        [
          'map',
          'normalMap',
          'roughnessMap',
          'metalnessMap',
          'aoMap',
          'clearcoatNormalMap',
          'alphaMap',
        ].forEach((k) => {
          const tex = record[k];
          if (tex && typeof (tex as THREE.Texture).dispose === 'function') {
            (tex as THREE.Texture).dispose();
          }
        });
        m.dispose();
      });
    }
  });
}
