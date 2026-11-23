import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  buildPhotorealisticBee,
  createArtisanCeramicMaterial,
  createBeeswaxMaterial,
  createBrassCapMaterial,
  createContactShadowPlane,
  createDynamicLiquidStream,
  createEnclosedHoneyMaterial,
  createGlassMaterial,
  createHardwoodMaterial,
  createHoneyMaterial,
  createJarLabelTexture,
  createSlatePlinthMaterial,
  createStudioContext,
  createWaxCappingMaterial,
  disposeHierarchy,
  prefersReducedMotion,
  scheduleNextFrame,
} from '../../three/honeyEngine';

export type HoneyStageMode = 'jar' | 'pour' | 'dipper' | 'comb';

export interface HoneyStage3DProps {
  mode: HoneyStageMode;
  isPlaying?: boolean;
  pourActive?: boolean;
  dipTrigger?: number;
  combFilling?: boolean;
  combResetTick?: number;
  zoomAction?: { type: 'in' | 'out' | 'reset'; tick: number } | null;
  onTogglePour?: () => void;
  onTriggerDip?: () => void;
  variant?: 'hero' | 'atelier';
}

const _spoutWorldPos = new THREE.Vector3();
const _throatWorldPos = new THREE.Vector3();
const _zoomVec = new THREE.Vector3();

export function HoneyStage3D({
  mode,
  isPlaying = true,
  pourActive = true,
  dipTrigger = 0,
  combFilling = true,
  combResetTick = 0,
  zoomAction = null,
  onTogglePour,
  onTriggerDip,
  variant = 'atelier',
}: HoneyStage3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef({
    mode,
    isPlaying,
    pourActive,
    dipTrigger,
    lastHandledDipTrigger: 0,
    combFilling,
    combResetTick,
    lastHandledCombReset: 0,
    zoomAction,
    lastHandledZoomTick: 0,
    onTogglePour,
    onTriggerDip,
  });

  useEffect(() => {
    stateRef.current.mode = mode;
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.pourActive = pourActive;
    stateRef.current.dipTrigger = dipTrigger;
    stateRef.current.combFilling = combFilling;
    stateRef.current.combResetTick = combResetTick;
    stateRef.current.zoomAction = zoomAction;
    stateRef.current.onTogglePour = onTogglePour;
    stateRef.current.onTriggerDip = onTriggerDip;
  }, [
    mode,
    isPlaying,
    pourActive,
    dipTrigger,
    combFilling,
    combResetTick,
    zoomAction,
    onTogglePour,
    onTriggerDip,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const reducedMotion = prefersReducedMotion();
    let ctx: ReturnType<typeof createStudioContext> | null = null;
    try {
      ctx = createStudioContext(container, {
        backgroundColor: variant === 'hero' ? undefined : 0x110b06,
        fov: variant === 'hero' ? 35 : 37,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const { scene, camera, renderer, isSoftwareGl, dispose } = ctx;
    const defaultCamPos = new THREE.Vector3(0, 2.18, variant === 'hero' ? 5.55 : 6.0);
    const defaultTarget = new THREE.Vector3(0, 1.02, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 9.2;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.copy(defaultTarget);
    camera.position.copy(defaultCamPos);
    controls.update();

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // =========================================================================
    // SHARED COMMERCIAL PBR MATERIALS
    // =========================================================================
    const honeyMat = createHoneyMaterial(isSoftwareGl);
    const enclosedHoneyMat = createEnclosedHoneyMaterial(renderer);
    const streamMat = createHoneyMaterial(isSoftwareGl, {
      color: isSoftwareGl ? 0xffffff : 0xf49d0c,
      opacity: 0.95,
      attenuation: 0xc05200,
    });
    const glassMat = createGlassMaterial(isSoftwareGl);
    const innerGlassMat = createGlassMaterial(isSoftwareGl);
    innerGlassMat.opacity = isSoftwareGl ? 0.08 : 1.0;

    const brassCapMat = createBrassCapMaterial(renderer);
    const woodMat = createHardwoodMaterial(renderer);
    const ceramicMat = createArtisanCeramicMaterial(renderer);
    const beeswaxMat = createBeeswaxMaterial(renderer, isSoftwareGl);
    const waxCappingMat = createWaxCappingMaterial(renderer);
    const slateMat = createSlatePlinthMaterial(renderer);

    let needsImmediateRender = true;
    const labelTex = createJarLabelTexture(renderer, () => {
      needsImmediateRender = true;
    });
    const labelMat = new THREE.MeshPhysicalMaterial({
      map: labelTex,
      roughness: 0.34,
      metalness: 0.02,
      clearcoat: 0.32,
      clearcoatRoughness: 0.24,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // =========================================================================
    // STUDIO BEVELED SLATE PLINTH + SUBTLE BRASS RIM + CONTACT SHADOW
    // =========================================================================
    const plinthProfile = [
      new THREE.Vector2(0.0, -0.22),
      new THREE.Vector2(2.48, -0.22),
      new THREE.Vector2(2.52, -0.05),
      new THREE.Vector2(2.38, 0.0),
      new THREE.Vector2(0.0, 0.0),
    ];
    const plinthGeo = new THREE.LatheGeometry(plinthProfile, 64);
    plinthGeo.computeTangents();
    const plinth = new THREE.Mesh(plinthGeo, slateMat);
    plinth.rotation.y = Math.PI;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const plinthTrim = new THREE.Mesh(
      new THREE.TorusGeometry(2.38, 0.008, 10, 72),
      brassCapMat,
    );
    plinthTrim.rotation.x = Math.PI / 2;
    plinthTrim.position.y = -0.004;
    scene.add(plinthTrim);

    const contactShadow = createContactShadowPlane(1.95);
    contactShadow.position.y = 0.006;
    scene.add(contactShadow);

    // Sculpted Viscous Teardrop Geometry (surface-tension pear drop)
    const teardropPoints = [
      new THREE.Vector2(0.0, -0.14),
      new THREE.Vector2(0.072, -0.105),
      new THREE.Vector2(0.095, -0.02),
      new THREE.Vector2(0.074, 0.068),
      new THREE.Vector2(0.032, 0.16),
      new THREE.Vector2(0.009, 0.25),
      new THREE.Vector2(0.0, 0.29),
    ];
    const teardropGeo = new THREE.LatheGeometry(teardropPoints, 24);

    // Reusable Ceramic Bowl Lathe Geometry with foot ring & rolled rim
    const bowlPoints = [
      new THREE.Vector2(0.0, 0.015),
      new THREE.Vector2(0.68, 0.015),
      new THREE.Vector2(0.72, 0.0),
      new THREE.Vector2(0.76, 0.0),
      new THREE.Vector2(0.78, 0.055),
      new THREE.Vector2(1.06, 0.24),
      new THREE.Vector2(1.22, 0.62),
      new THREE.Vector2(1.24, 0.68),
      new THREE.Vector2(1.19, 0.72),
      new THREE.Vector2(1.13, 0.68),
      new THREE.Vector2(0.98, 0.3),
      new THREE.Vector2(0.68, 0.145),
      new THREE.Vector2(0.0, 0.14),
    ];
    const sharedBowlGeo = new THREE.LatheGeometry(bowlPoints, 64);

    // Contoured liquid honey pool geometry with natural concave rim meniscus
    const bowlPoolProfile = [
      new THREE.Vector2(0.0, -0.08),
      new THREE.Vector2(0.64, -0.08),
      new THREE.Vector2(0.88, 0.045),
      new THREE.Vector2(0.96, 0.135),
      new THREE.Vector2(0.85, 0.115),
      new THREE.Vector2(0.5, 0.108),
      new THREE.Vector2(0.0, 0.11),
    ];
    const bowlPoolGeo = new THREE.LatheGeometry(bowlPoolProfile, 48);

    // =========================================================================
    // SCENE 1: PHOTOREALISTIC 3D HONEY JAR (Thick Glass + Official JSMW Label)
    // =========================================================================
    const jarGroup = new THREE.Group();
    jarGroup.rotation.y = -0.12;
    scene.add(jarGroup);

    // Outer optical borosilicate glass wall (64 segments, authentic punted base & shoulder)
    const jarOuterProfile = [
      new THREE.Vector2(0.0, 0.03),
      new THREE.Vector2(0.64, 0.01),
      new THREE.Vector2(0.76, 0.0),
      new THREE.Vector2(0.84, 0.05),
      new THREE.Vector2(0.89, 0.2),
      new THREE.Vector2(0.89, 1.25),
      new THREE.Vector2(0.85, 1.38),
      new THREE.Vector2(0.72, 1.49),
      new THREE.Vector2(0.635, 1.54),
      new THREE.Vector2(0.635, 1.66),
    ];
    const jarGlass = new THREE.Mesh(new THREE.LatheGeometry(jarOuterProfile, 64), glassMat);
    jarGlass.renderOrder = 4;
    jarGlass.castShadow = true;
    jarGroup.add(jarGlass);

    // Inner glass wall for authentic wall-thickness edge refraction
    const jarInnerProfile = [
      new THREE.Vector2(0.0, 0.075),
      new THREE.Vector2(0.72, 0.075),
      new THREE.Vector2(0.825, 0.15),
      new THREE.Vector2(0.825, 1.24),
      new THREE.Vector2(0.76, 1.38),
      new THREE.Vector2(0.585, 1.5),
      new THREE.Vector2(0.585, 1.68),
    ];
    const jarInnerGlass = new THREE.Mesh(
      new THREE.LatheGeometry(jarInnerProfile, 48),
      innerGlassMat,
    );
    jarInnerGlass.renderOrder = 3;
    jarGroup.add(jarInnerGlass);

    // Golden Wild Honey inside with subtle concave surface meniscus
    const jarHoneyProfile = [
      new THREE.Vector2(0.0, 0.08),
      new THREE.Vector2(0.71, 0.08),
      new THREE.Vector2(0.815, 0.16),
      new THREE.Vector2(0.815, 1.22),
      new THREE.Vector2(0.76, 1.35),
      new THREE.Vector2(0.67, 1.375),
      new THREE.Vector2(0.32, 1.355),
      new THREE.Vector2(0.0, 1.35),
    ];
    const jarHoney = new THREE.Mesh(
      new THREE.LatheGeometry(jarHoneyProfile, 48),
      enclosedHoneyMat,
    );
    jarHoney.renderOrder = 2;
    jarGroup.add(jarHoney);

    // Subtle rising micro-bubbles trapped inside dense wild honey
    const bubbleCount = 38;
    const bubbleGeo = new THREE.SphereGeometry(0.018, 12, 12);
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff0c2,
      roughness: 0.03,
      ior: 1.33,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.65,
    });
    const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, bubbleCount);
    const dummy = new THREE.Object3D();
    const bubbleMeta: {
      angle: number;
      radius: number;
      yBase: number;
      speed: number;
      scale: number;
    }[] = [];
    for (let i = 0; i < bubbleCount; i++) {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 0.14 + ((i * 0.17) % 0.56);
      const yBase = 0.16 + ((i * 0.23) % 1.05);
      const scale = 0.4 + ((i * 0.29) % 0.95);
      bubbleMeta.push({ angle, radius, yBase, speed: 0.035 + (i % 5) * 0.01, scale });
      dummy.position.set(Math.cos(angle) * radius, yBase, Math.sin(angle) * radius);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    bubbles.computeBoundingSphere();
    bubbles.renderOrder = 2;
    jarGroup.add(bubbles);

    // Wrapped Official JSMW Sticker Label
    const jarWrapLen = Math.PI * 1.9;
    const jarLabel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.896, 0.896, 0.87, 64, 1, true, -jarWrapLen / 2, jarWrapLen),
      labelMat,
    );
    jarLabel.position.y = 0.74;
    jarLabel.renderOrder = 5;
    jarGroup.add(jarLabel);

    // Sculpted Brushed-Gold Knurled Screw Lid + Chamfered Lower Bead & Crown
    const capProfile = [
      new THREE.Vector2(0.0, 1.915),
      new THREE.Vector2(0.61, 1.915),
      new THREE.Vector2(0.66, 1.93),
      new THREE.Vector2(0.705, 1.905),
      new THREE.Vector2(0.715, 1.87),
      new THREE.Vector2(0.715, 1.64),
      new THREE.Vector2(0.725, 1.615),
      new THREE.Vector2(0.69, 1.605),
      new THREE.Vector2(0.65, 1.605),
    ];
    const capGeo = new THREE.LatheGeometry(capProfile, 64);
    capGeo.computeTangents();
    const jarCap = new THREE.Mesh(capGeo, brassCapMat);
    jarCap.castShadow = true;
    jarGroup.add(jarCap);

    // Subtle gleaming crown bevel ring on the jar lid for sharp studio definition
    const jarCapCrownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.665, 0.012, 12, 64),
      brassCapMat,
    );
    jarCapCrownRing.rotation.x = Math.PI / 2;
    jarCapCrownRing.position.y = 1.922;
    jarGroup.add(jarCapCrownRing);

    // Subtle macro wild honeybee hovering around the jar shoulder
    const jarBee = buildPhotorealisticBee(renderer);
    jarBee.scale.setScalar(1.35);
    jarGroup.add(jarBee);

    // =========================================================================
    // SCENE 2: PHOTOREALISTIC HONEY POURING (Tilted Bottle + Viscous Coiling Stream)
    // =========================================================================
    const pourGroup = new THREE.Group();
    scene.add(pourGroup);

    const bowlX = 0.68;
    const pourBowl = new THREE.Mesh(sharedBowlGeo, ceramicMat);
    pourBowl.position.set(bowlX, 0.0, 0);
    pourBowl.castShadow = true;
    pourBowl.receiveShadow = true;
    pourGroup.add(pourBowl);

    const bowlPool = new THREE.Mesh(bowlPoolGeo, honeyMat);
    bowlPool.position.set(bowlX, 0.22, 0);
    pourGroup.add(bowlPool);

    // Viscous stacked honey coiling mound where poured honey folds on itself
    const pourCoilMoundGroup = new THREE.Group();
    pourCoilMoundGroup.position.set(bowlX, 0.34, 0);
    pourGroup.add(pourCoilMoundGroup);

    const moundCoil1 = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.042, 16, 36), streamMat);
    moundCoil1.rotation.x = Math.PI / 2;
    const moundCoil2 = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.034, 16, 32), streamMat);
    moundCoil2.rotation.x = Math.PI / 2;
    moundCoil2.position.y = 0.036;
    const moundCap = new THREE.Mesh(new THREE.SphereGeometry(0.058, 22, 16), streamMat);
    moundCap.scale.set(1.1, 0.7, 1.1);
    moundCap.position.y = 0.062;
    pourCoilMoundGroup.add(moundCoil1, moundCoil2, moundCap);

    const pourRippleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf7b938,
      roughness: 0.04,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    const pourRipple = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.21, 40), pourRippleMat);
    pourRipple.rotation.x = -Math.PI / 2;
    pourRipple.position.set(bowlX, 0.35, 0);
    pourGroup.add(pourRipple);

    const bottlePivot = new THREE.Group();
    bottlePivot.position.set(-0.26, 1.86, 0);
    pourGroup.add(bottlePivot);

    const bottleMeshGroup = new THREE.Group();
    bottlePivot.add(bottleMeshGroup);

    // Smoothly filleted double-walled pouring bottle with molded neck collar & rounded crystal pouring lip
    const bOuterProfile = [
      new THREE.Vector2(0.0, 0.025),
      new THREE.Vector2(0.36, 0.01),
      new THREE.Vector2(0.45, 0.01),
      new THREE.Vector2(0.5, 0.065),
      new THREE.Vector2(0.52, 0.2),
      new THREE.Vector2(0.52, 1.02),
      new THREE.Vector2(0.49, 1.16),
      new THREE.Vector2(0.42, 1.28),
      new THREE.Vector2(0.31, 1.38),
      new THREE.Vector2(0.24, 1.48),
      new THREE.Vector2(0.222, 1.525),
      new THREE.Vector2(0.248, 1.545), // glass neck collar bead
      new THREE.Vector2(0.222, 1.565),
      new THREE.Vector2(0.218, 1.705),
      new THREE.Vector2(0.246, 1.728), // thick rounded pouring mouth lip
      new THREE.Vector2(0.232, 1.758),
      new THREE.Vector2(0.195, 1.758),
      new THREE.Vector2(0.175, 1.725),
    ];
    const bGlass = new THREE.Mesh(new THREE.LatheGeometry(bOuterProfile, 64), glassMat);
    bGlass.position.y = -0.82;
    bGlass.renderOrder = 4;
    bGlass.castShadow = true;
    bottleMeshGroup.add(bGlass);

    // Molded glass screw threads & bright crystal mouth rim highlight on bottle neck
    const bottleNeckHighlightMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      ior: 1.52,
      specularIntensity: 1.0,
      envMapIntensity: 1.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.72,
      depthWrite: false,
    });

    const bMouthRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.212, 0.024, 18, 48),
      bottleNeckHighlightMat,
    );
    bMouthRim.rotation.x = Math.PI / 2;
    bMouthRim.position.y = 0.922;
    bMouthRim.renderOrder = 5;
    bottleMeshGroup.add(bMouthRim);

    const bThread1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.226, 0.01, 12, 48),
      bottleNeckHighlightMat,
    );
    bThread1.rotation.set(Math.PI / 2 + 0.06, 0, 0);
    bThread1.position.y = 0.785;
    bThread1.renderOrder = 5;
    bottleMeshGroup.add(bThread1);

    const bThread2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.226, 0.01, 12, 48),
      bottleNeckHighlightMat,
    );
    bThread2.rotation.set(Math.PI / 2 + 0.06, 0, 0);
    bThread2.position.y = 0.845;
    bThread2.renderOrder = 5;
    bottleMeshGroup.add(bThread2);

    const bInnerProfile = [
      new THREE.Vector2(0.0, 0.065),
      new THREE.Vector2(0.42, 0.065),
      new THREE.Vector2(0.47, 0.14),
      new THREE.Vector2(0.47, 1.02),
      new THREE.Vector2(0.41, 1.2),
      new THREE.Vector2(0.28, 1.35),
      new THREE.Vector2(0.185, 1.47),
      new THREE.Vector2(0.175, 1.725),
    ];
    const bInnerGlass = new THREE.Mesh(new THREE.LatheGeometry(bInnerProfile, 48), innerGlassMat);
    bInnerGlass.position.y = -0.82;
    bInnerGlass.renderOrder = 3;
    bottleMeshGroup.add(bInnerGlass);

    const bHoneyProfile = [
      new THREE.Vector2(0.0, 0.07),
      new THREE.Vector2(0.415, 0.07),
      new THREE.Vector2(0.46, 0.15),
      new THREE.Vector2(0.46, 1.0),
      new THREE.Vector2(0.4, 1.18),
      new THREE.Vector2(0.28, 1.33),
      new THREE.Vector2(0.172, 1.45),
      new THREE.Vector2(0.0, 1.43),
    ];
    const bHoney = new THREE.Mesh(new THREE.LatheGeometry(bHoneyProfile, 48), enclosedHoneyMat);
    bHoney.position.y = -0.82;
    bHoney.renderOrder = 2;
    bottleMeshGroup.add(bHoney);

    // Golden honey tongue flowing cleanly through the lower glass neck throat up to the pouring lip
    const throatHoneyGeo = new THREE.CylinderGeometry(0.072, 0.135, 0.36, 24);
    const throatHoney = new THREE.Mesh(throatHoneyGeo, enclosedHoneyMat);
    throatHoney.position.set(0.088, 0.72, 0);
    throatHoney.rotation.z = -0.22;
    throatHoney.renderOrder = 2;
    bottleMeshGroup.add(throatHoney);

    // Glossy wetting bead of honey hugging the rounded glass pouring lip
    const lipMeniscus = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 14), streamMat);
    lipMeniscus.scale.set(1.05, 0.75, 0.95);
    lipMeniscus.position.set(0.202, 0.912, 0);
    lipMeniscus.renderOrder = 5;
    bottleMeshGroup.add(lipMeniscus);

    const bottleWrapLen = Math.PI * 1.86;
    const bLabel = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.525,
        0.525,
        0.64,
        48,
        1,
        true,
        -bottleWrapLen / 2,
        bottleWrapLen,
      ),
      labelMat,
    );
    bLabel.position.y = -0.22;
    bLabel.renderOrder = 5;
    bottleMeshGroup.add(bLabel);

    const throatMarker = new THREE.Object3D();
    throatMarker.position.set(0.125, 0.85, 0);
    bottleMeshGroup.add(throatMarker);

    const spoutMarker = new THREE.Object3D();
    spoutMarker.position.set(0.212, 0.922, 0);
    bottleMeshGroup.add(spoutMarker);

    const capSeatMarker = new THREE.Object3D();
    capSeatMarker.position.set(0, 0.792, 0);
    bottleMeshGroup.add(capSeatMarker);

    // Sculpted hollow-threaded brushed-gold bottle cap that rests cleanly on the studio slate while pouring
    const bCapGroup = new THREE.Group();
    const bCapOuterProfile = [
      new THREE.Vector2(0.0, 0.185),
      new THREE.Vector2(0.225, 0.185),
      new THREE.Vector2(0.258, 0.192),
      new THREE.Vector2(0.278, 0.172),
      new THREE.Vector2(0.28, 0.015),
      new THREE.Vector2(0.288, 0.0),
      new THREE.Vector2(0.245, 0.0),
      new THREE.Vector2(0.242, 0.145),
      new THREE.Vector2(0.0, 0.145),
    ];
    const bCapGeo = new THREE.LatheGeometry(bCapOuterProfile, 48);
    bCapGeo.computeTangents();
    const bCapMesh = new THREE.Mesh(bCapGeo, brassCapMat);
    bCapMesh.castShadow = true;
    bCapGroup.add(bCapMesh);
    const bCapCrownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.258, 0.008, 10, 48),
      brassCapMat,
    );
    bCapCrownRing.rotation.x = Math.PI / 2;
    bCapCrownRing.position.y = 0.188;
    bCapGroup.add(bCapCrownRing);
    pourGroup.add(bCapGroup);

    const bottleHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 1.9, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    bottleHit.userData.action = 'togglePour';
    bottleMeshGroup.add(bottleHit);

    // Tapered + helical rope-coiling liquid pour stream (zero GC updates)
    const pourStream = createDynamicLiquidStream(streamMat, 44, 18);
    pourGroup.add(pourStream.mesh);

    const pourPts = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];
    const pourCurve = new THREE.CatmullRomCurve3(pourPts);

    // Subtle trailing golden droplets near spout rim
    const pourSpoutDrop = new THREE.Mesh(teardropGeo, streamMat);
    pourSpoutDrop.scale.setScalar(0.45);
    pourSpoutDrop.visible = false;
    pourGroup.add(pourSpoutDrop);

    // =========================================================================
    // SCENE 3: PHOTOREALISTIC WOOD HONEY DIPPER + THICK DRIPS + MACRO BEES
    // =========================================================================
    const dipperGroup = new THREE.Group();
    scene.add(dipperGroup);

    const dipBowl = new THREE.Mesh(sharedBowlGeo, ceramicMat);
    dipBowl.castShadow = true;
    dipBowl.receiveShadow = true;
    dipperGroup.add(dipBowl);

    const dipHoneyPool = new THREE.Mesh(bowlPoolGeo, honeyMat);
    dipHoneyPool.scale.set(1.06, 1.25, 1.06);
    dipHoneyPool.position.y = 0.34;
    dipperGroup.add(dipHoneyPool);

    const dipRippleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf7b938,
      roughness: 0.04,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const dipRipple = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.21, 36), dipRippleMat);
    dipRipple.rotation.x = -Math.PI / 2;
    dipRipple.position.y = 0.495;
    dipperGroup.add(dipRipple);

    const dipperPivot = new THREE.Group();
    dipperPivot.position.set(0, 1.82, 0);
    dipperGroup.add(dipperPivot);

    const dipperAssembly = new THREE.Group();
    dipperPivot.add(dipperAssembly);

    // High-detail turned olivewood dipper lathe with 7 cleanly filleted grooves
    const dipperPoints: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.11, 0.015),
      new THREE.Vector2(0.14, 0.04),
    ];
    for (let r = 0; r < 7; r++) {
      const yBase = 0.055 + r * 0.088;
      dipperPoints.push(new THREE.Vector2(0.245, yBase + 0.022));
      dipperPoints.push(new THREE.Vector2(0.242, yBase + 0.044));
      dipperPoints.push(new THREE.Vector2(0.138, yBase + 0.068));
      dipperPoints.push(new THREE.Vector2(0.136, yBase + 0.082));
    }
    dipperPoints.push(new THREE.Vector2(0.085, 0.71));
    dipperPoints.push(new THREE.Vector2(0.056, 0.85));
    dipperPoints.push(new THREE.Vector2(0.05, 1.32));
    dipperPoints.push(new THREE.Vector2(0.072, 1.5));
    dipperPoints.push(new THREE.Vector2(0.082, 1.62));
    dipperPoints.push(new THREE.Vector2(0.058, 1.71));
    dipperPoints.push(new THREE.Vector2(0.0, 1.74));

    const dipperWoodGeo = new THREE.LatheGeometry(dipperPoints, 64);
    dipperWoodGeo.computeTangents();
    const dipperWood = new THREE.Mesh(dipperWoodGeo, woodMat);
    dipperWood.castShadow = true;
    dipperAssembly.add(dipperWood);

    // Rich amber liquid honey glaze clinging heavily to the lower 4 grooves of the wood dipper
    const dipperGlazeMat = createHoneyMaterial(isSoftwareGl, {
      color: isSoftwareGl ? 0xffffff : 0xed9208,
      opacity: 0.94,
      attenuation: 0xb84a00,
    });
    const glazeProfile = dipperPoints.slice(0, 19);
    const dipperGlaze = new THREE.Mesh(new THREE.LatheGeometry(glazeProfile, 48), dipperGlazeMat);
    dipperGlaze.scale.set(1.065, 1.01, 1.065);
    dipperGlaze.renderOrder = 3;
    dipperAssembly.add(dipperGlaze);

    const dipperTipMarker = new THREE.Object3D();
    dipperTipMarker.position.set(0, 0.0, 0);
    dipperAssembly.add(dipperTipMarker);

    const dipperHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 1.85, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    dipperHit.position.y = 0.85;
    dipperHit.userData.action = 'triggerDip';
    dipperAssembly.add(dipperHit);

    // Tapered stretching viscous honey strand from dipper tip
    const dipStream = createDynamicLiquidStream(streamMat, 30, 14);
    dipStream.mesh.visible = false;
    dipperGroup.add(dipStream.mesh);

    const dipPts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const dipCurve = new THREE.CatmullRomCurve3(dipPts);

    const slowDripBeads = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(teardropGeo, streamMat);
      m.visible = false;
      dipperGroup.add(m);
      return m;
    });

    // 2 Photorealistic Macro Honeybees flying gracefully behind the lifted dipper
    const dipperBeeConfigs = [
      { rx: 1.22, rz: 0.68, zBias: -0.45, yBase: 1.64, speed: 0.76, phase: 0.3, scale: 1.48 },
      { rx: 1.38, rz: 0.62, zBias: -0.55, yBase: 1.2, speed: -0.7, phase: 3.3, scale: 1.4 },
    ];
    const dipperBees = dipperBeeConfigs.map((cfg) => {
      const b = buildPhotorealisticBee(renderer);
      b.scale.setScalar(cfg.scale);
      dipperGroup.add(b);
      return { bee: b, ...cfg };
    });

    // =========================================================================
    // SCENE 4: STUDIO MACRO HONEYCOMB (Natural Wood Frame + Beeswax + Bees)
    // =========================================================================
    const combGroup = new THREE.Group();
    scene.add(combGroup);

    const combFrame = new THREE.Group();
    combFrame.position.set(0, 1.42, 0);
    combFrame.rotation.x = -0.15;
    combGroup.add(combFrame);

    // Handcrafted Natural Wood Hive-Section Frame with clean longitudinal UVs
    const frameBarMat = woodMat;
    const frameW = 2.65;
    const frameH = 2.15;
    const barThick = 0.14;
    const barDepth = 0.5;
    const horizBarGeo = new THREE.BoxGeometry(frameW, barThick, barDepth);
    const hUv = horizBarGeo.attributes.uv;
    for (let i = 0; i < hUv.count; i++) {
      hUv.setXY(i, hUv.getX(i) * 0.25, hUv.getY(i) * 2.2);
    }
    const vertBarGeo = new THREE.BoxGeometry(barThick, frameH - barThick, barDepth);
    const vUv = vertBarGeo.attributes.uv;
    for (let i = 0; i < vUv.count; i++) {
      vUv.setXY(i, vUv.getX(i) * 0.25, vUv.getY(i) * 1.9);
    }

    const topBar = new THREE.Mesh(horizBarGeo, frameBarMat);
    topBar.position.y = frameH / 2;
    topBar.castShadow = true;
    const botBar = new THREE.Mesh(horizBarGeo, frameBarMat);
    botBar.position.y = -frameH / 2;
    botBar.castShadow = true;
    const leftBar = new THREE.Mesh(vertBarGeo, frameBarMat);
    leftBar.position.x = -frameW / 2 + barThick / 2;
    leftBar.castShadow = true;
    const rightBar = new THREE.Mesh(vertBarGeo, frameBarMat);
    rightBar.position.x = frameW / 2 - barThick / 2;
    rightBar.castShadow = true;
    combFrame.add(topBar, botBar, leftBar, rightBar);

    // Mid-comb beeswax foundation septum so backlighting illuminates warm honey amber
    const foundationPlate = new THREE.Mesh(
      new THREE.BoxGeometry(frameW - barThick * 2, frameH - barThick * 2, 0.045),
      beeswaxMat,
    );
    foundationPlate.position.z = -0.02;
    combFrame.add(foundationPlate);

    // Organic Hexagonal Beeswax Cell Wall Geometry
    const hexOuter = new THREE.Shape();
    const outerR = 0.24;
    const innerR = 0.195;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(a) * outerR;
      const py = Math.sin(a) * outerR;
      if (k === 0) hexOuter.moveTo(px, py);
      else hexOuter.lineTo(px, py);
    }
    hexOuter.closePath();

    const hexHole = new THREE.Path();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(a) * innerR;
      const py = Math.sin(a) * innerR;
      if (k === 0) hexHole.moveTo(px, py);
      else hexHole.lineTo(px, py);
    }
    hexHole.closePath();
    hexOuter.holes.push(hexHole);

    const cellWallGeo = new THREE.ExtrudeGeometry(hexOuter, {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.014,
      bevelSegments: 2,
    });

    const hexFillGeo = new THREE.CylinderGeometry(innerR * 0.99, innerR * 0.99, 0.34, 6);
    hexFillGeo.rotateX(Math.PI / 2);

    const waxCapGeo = new THREE.SphereGeometry(innerR * 0.96, 12, 8);
    const cellMeniscusGeo = new THREE.SphereGeometry(innerR * 0.92, 16, 12);

    interface CombCell {
      fillMesh: THREE.Mesh;
      capMesh: THREE.Mesh;
      dist: number;
      fillAmount: number;
      capped: boolean;
    }
    const combCells: CombCell[] = [];

    const dx = Math.sqrt(3) * outerR * 0.975;
    const dy = outerR * 1.485;
    let seed = 0;
    for (let row = -3; row <= 3; row++) {
      for (let col = -4; col <= 4; col++) {
        const cx = (col + row * 0.5) * dx;
        const cy = row * dy;
        if (Math.abs(cx) > 1.05 || Math.abs(cy) > 0.85) continue;
        seed++;

        const wall = new THREE.Mesh(cellWallGeo, beeswaxMat);
        // Subtle natural comb irregularity so cells feel bee-built rather than rigid CAD
        const zJitter = ((Math.sin(seed * 12.98) * 43758.5) % 1) * 0.025;
        wall.position.set(cx, cy, -0.18 + zJitter);
        wall.rotation.z = Math.sin(seed * 4.1) * 0.02;
        wall.castShadow = true;
        combFrame.add(wall);

        const fillMesh = new THREE.Mesh(hexFillGeo, enclosedHoneyMat);
        fillMesh.position.set(cx, cy, -0.15);
        fillMesh.scale.set(1, 1, 0.05);
        fillMesh.userData.action = 'pulseCombCell';
        fillMesh.userData.cellIndex = combCells.length;
        combFrame.add(fillMesh);

        // Upper/edge cells organically sealed with domed pearlescent beeswax caps;
        // open lower/center cells reveal glistening glossy liquid amber meniscuses!
        const isCapped = cy > 0.32 && seed % 3 !== 0;
        const capMesh = isCapped
          ? new THREE.Mesh(waxCapGeo, waxCappingMat)
          : new THREE.Mesh(cellMeniscusGeo, streamMat);
        capMesh.position.set(cx, cy, 0.16);
        capMesh.scale.set(1, 1, isCapped ? 0.28 : 0.34);
        combFrame.add(capMesh);

        combCells.push({
          fillMesh,
          capMesh,
          dist: Math.hypot(cx, cy),
          fillAmount: 0.05,
          capped: isCapped,
        });
      }
    }

    // Thick golden honey ooze droplets hanging & dripping from bottom frame edge into dish
    const combDrips = [-0.62, -0.18, 0.24, 0.58].map((xPos, i) => {
      const m = new THREE.Mesh(teardropGeo, streamMat);
      m.position.set(xPos, 0.44 - i * 0.08, 0.04);
      m.scale.setScalar(0.65);
      combGroup.add(m);
      return { mesh: m, x: xPos, y: 0.44 - i * 0.11, speed: 0.24 + i * 0.04 };
    });

    // Glazed Ceramic Comb Drip Platter
    const combDishProfile = [
      new THREE.Vector2(0.0, 0.01),
      new THREE.Vector2(1.22, 0.01),
      new THREE.Vector2(1.52, 0.08),
      new THREE.Vector2(1.58, 0.19),
      new THREE.Vector2(1.52, 0.22),
      new THREE.Vector2(1.36, 0.13),
      new THREE.Vector2(0.0, 0.12),
    ];
    const combDish = new THREE.Mesh(new THREE.LatheGeometry(combDishProfile, 64), ceramicMat);
    combDish.receiveShadow = true;
    combDish.castShadow = true;
    combGroup.add(combDish);

    const combPoolProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.22, 0.0),
      new THREE.Vector2(1.37, 0.055),
      new THREE.Vector2(1.24, 0.045),
      new THREE.Vector2(0.0, 0.042),
    ];
    const combPool = new THREE.Mesh(new THREE.LatheGeometry(combPoolProfile, 48), honeyMat);
    combPool.position.y = 0.12;
    combGroup.add(combPool);

    // Photorealistic Macro Bees orbiting the natural honeycomb
    const swarmConfigs = [
      { rx: 1.55, rz: 0.92, yBase: 1.52, speed: 0.8, phase: 0.0, scale: 1.25 },
      { rx: 1.72, rz: 1.05, yBase: 1.15, speed: -0.72, phase: 1.2, scale: 1.15 },
      { rx: 1.38, rz: 0.85, yBase: 1.92, speed: 0.9, phase: 2.4, scale: 1.1 },
      { rx: 1.85, rz: 0.95, yBase: 0.88, speed: 0.64, phase: 3.5, scale: 1.2 },
      { rx: 1.48, rz: 1.18, yBase: 1.42, speed: -0.84, phase: 4.6, scale: 1.08 },
      { rx: 1.66, rz: 0.8, yBase: 2.08, speed: 0.7, phase: 5.3, scale: 1.18 },
    ];
    const beeSwarm = swarmConfigs.map((cfg) => {
      const b = buildPhotorealisticBee(renderer);
      b.scale.setScalar(cfg.scale);
      combGroup.add(b);
      return { bee: b, ...cfg };
    });

    // =========================================================================
    // INTERACTIVE RAYCASTER & VIEWPORT LIFECYCLE
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 8) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const curMode = stateRef.current.mode;
      const targetGroup =
        curMode === 'jar'
          ? jarGroup
          : curMode === 'pour'
            ? pourGroup
            : curMode === 'dipper'
              ? dipperGroup
              : combGroup;
      const hits = raycaster.intersectObjects(targetGroup.children, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const action = hitObj.userData.action;
        if (action === 'togglePour') {
          stateRef.current.onTogglePour?.();
        } else if (action === 'triggerDip') {
          stateRef.current.onTriggerDip?.();
        } else if (action === 'pulseCombCell') {
          const idx = hitObj.userData.cellIndex as number;
          if (combCells[idx]) combCells[idx].fillAmount = 0.05;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      const w = Math.max(container.clientWidth, 280);
      const h = Math.max(container.clientHeight, 280);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let pourProgress = stateRef.current.pourActive ? 1.0 : 0.0;
    let bowlFill = 0.35;
    let dipCycle = 0.42;
    let combWaveTime = 1.65;

    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    const timerRef = { current: 0 };
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDelta = Math.min((nowMs - lastTimeMs) / 1000, isSoftwareGl ? 0.12 : 0.05);
      lastTimeMs = nowMs;
      const dt = stateRef.current.isPlaying && !reducedMotion ? rawDelta : 0;
      const elapsed = (nowMs - startTimeMs) / 1000;
      const curMode = stateRef.current.mode;

      // Zoom In / Out / Reset controls
      const zAct = stateRef.current.zoomAction;
      if (zAct && zAct.tick !== stateRef.current.lastHandledZoomTick) {
        stateRef.current.lastHandledZoomTick = zAct.tick;
        if (zAct.type === 'reset') {
          controls.target.copy(defaultTarget);
          camera.position.copy(defaultCamPos);
        } else {
          _zoomVec.subVectors(camera.position, controls.target);
          const curDist = _zoomVec.length();
          const factor = zAct.type === 'in' ? 0.82 : 1.22;
          const nextDist = THREE.MathUtils.clamp(
            curDist * factor,
            controls.minDistance,
            controls.maxDistance,
          );
          _zoomVec.setLength(nextDist);
          camera.position.copy(controls.target).add(_zoomVec);
        }
      }

      jarGroup.visible = curMode === 'jar';
      pourGroup.visible = curMode === 'pour';
      dipperGroup.visible = curMode === 'dipper';
      combGroup.visible = curMode === 'comb';

      // 1. HERO JAR (360 Showcase + Rising Micro Bubbles + Macro Wild Bee)
      if (curMode === 'jar') {
        if (!reducedMotion && stateRef.current.isPlaying) {
          jarGroup.rotation.y += dt * 0.34;
          for (let i = 0; i < bubbleCount; i++) {
            const m = bubbleMeta[i];
            const y = 0.14 + ((m.yBase + elapsed * m.speed) % 1.08);
            dummy.position.set(Math.cos(m.angle) * m.radius, y, Math.sin(m.angle) * m.radius);
            dummy.scale.setScalar(m.scale);
            dummy.updateMatrix();
            bubbles.setMatrixAt(i, dummy.matrix);
          }
          bubbles.instanceMatrix.needsUpdate = true;

          const bAngle = elapsed * 0.68;
          jarBee.position.set(
            Math.cos(bAngle) * 1.44,
            1.42 + Math.sin(elapsed * 2.3) * 0.1,
            Math.sin(bAngle) * 1.18,
          );
          jarBee.rotation.y = -bAngle;
          const wL = jarBee.getObjectByName('wingL');
          const wR = jarBee.getObjectByName('wingR');
          if (wL && wR) {
            const flap = Math.sin(elapsed * 48) * 0.36;
            wL.rotation.z = 0.22 + flap;
            wR.rotation.z = 0.22 + flap;
          }
        }
      }

      // 2. HONEY POURING (Viscous Taper + Clear Mouth Lip Flow + Helical Rope-Coiling Into Bowl)
      if (curMode === 'pour') {
        const targetPour = stateRef.current.pourActive ? 1 : 0;
        pourProgress = THREE.MathUtils.damp(pourProgress, targetPour, 4.5, rawDelta);
        // Bottle tilts smoothly into pour (pourProgress 0.22..1.0) while cap opens cleanly first (0..0.28)
        const tiltT = THREE.MathUtils.clamp((pourProgress - 0.16) / 0.84, 0, 1);
        const tiltSmooth = tiltT * tiltT * (3 - 2 * tiltT);
        bottlePivot.rotation.z = -tiltSmooth * 1.82;
        bottlePivot.position.x = THREE.MathUtils.lerp(-0.62, -0.26, tiltSmooth);
        bottlePivot.position.y = THREE.MathUtils.lerp(0.84, 1.86, tiltSmooth);
        bottlePivot.updateMatrixWorld(true);

        // Cap unscrews axially from bottle neck first, then arcs in front (+Z) down onto slate plinth
        capSeatMarker.getWorldPosition(_throatWorldPos);
        if (pourProgress < 0.22) {
          const liftT = pourProgress / 0.22;
          const lift = liftT * liftT * (3 - 2 * liftT);
          bCapGroup.position.set(
            _throatWorldPos.x,
            _throatWorldPos.y + lift * 0.28,
            _throatWorldPos.z,
          );
          bCapGroup.rotation.set(0, lift * 2.4, bottlePivot.rotation.z);
        } else {
          const arcT = THREE.MathUtils.clamp((pourProgress - 0.22) / 0.55, 0, 1);
          const arcSmooth = arcT * arcT * (3 - 2 * arcT);
          const arcForwardBoost = Math.sin(arcSmooth * Math.PI) * 0.42;
          bCapGroup.position.set(
            THREE.MathUtils.lerp(_throatWorldPos.x, -0.78, arcSmooth),
            THREE.MathUtils.lerp(_throatWorldPos.y + 0.28, 0.015, arcSmooth),
            THREE.MathUtils.lerp(_throatWorldPos.z, 0.72, arcSmooth) + arcForwardBoost,
          );
          bCapGroup.rotation.set(
            THREE.MathUtils.lerp(0, 0.04, arcSmooth),
            THREE.MathUtils.lerp(2.4, 0.35, arcSmooth),
            THREE.MathUtils.lerp(bottlePivot.rotation.z, 0.02, arcSmooth),
          );
        }

        const pouringNow = pourProgress > 0.68;
        throatHoney.visible = pourProgress > 0.35;
        lipMeniscus.visible = pouringNow;
        pourStream.mesh.visible = pouringNow;
        pourCoilMoundGroup.visible = pouringNow;

        if (pouringNow) {
          throatMarker.getWorldPosition(_throatWorldPos);
          spoutMarker.getWorldPosition(_spoutWorldPos);
          bowlFill = Math.min(1.0, bowlFill + dt * 0.08);
          const surfaceY = 0.25 + bowlFill * 0.14;
          const coilAngle = elapsed * 5.2;
          const coilR = 0.055;

          pourPts[0].copy(_throatWorldPos);
          pourPts[1].set(_spoutWorldPos.x, _spoutWorldPos.y, _spoutWorldPos.z);
          pourPts[2].set(
            THREE.MathUtils.lerp(_spoutWorldPos.x, bowlX, 0.85),
            THREE.MathUtils.lerp(_spoutWorldPos.y, surfaceY, 0.56),
            0,
          );
          pourPts[3].set(
            bowlX + Math.cos(coilAngle) * (coilR * 0.55),
            surfaceY + 0.14,
            Math.sin(coilAngle) * (coilR * 0.55),
          );
          pourPts[4].set(
            bowlX + Math.cos(coilAngle + 1.1) * coilR,
            surfaceY + 0.03,
            Math.sin(coilAngle + 1.1) * coilR,
          );

          // Viscous thinning from inside glass throat, over mouth rim, down to coiling foot
          pourStream.update(pourCurve, (t) => {
            const base = 0.072 * (1 - 0.56 * Math.pow(t, 0.68));
            const swell = t > 0.88 ? ((t - 0.88) / 0.12) * 0.025 : 0;
            const pulse = Math.sin(elapsed * 8.5 - t * 6.0) * 0.003;
            return base + swell + pulse;
          });

          pourCoilMoundGroup.position.set(bowlX, surfaceY, 0);
          pourCoilMoundGroup.rotation.y = coilAngle;

          const rPhase = (elapsed * 1.15) % 1;
          pourRipple.scale.setScalar(1 + rPhase * 3.5);
          pourRippleMat.opacity = (1 - rPhase) * 0.45;
          pourRipple.position.set(bowlX, surfaceY + 0.01, 0);

          pourSpoutDrop.visible = false;
        } else {
          if (!stateRef.current.pourActive) {
            bowlFill = THREE.MathUtils.damp(bowlFill, 0.25, 2.0, rawDelta);
          }
          pourRippleMat.opacity = 0;

          if (pourProgress > 0.28) {
            spoutMarker.getWorldPosition(_spoutWorldPos);
            const dPhase = (elapsed * 1.2) % 1;
            pourSpoutDrop.visible = true;
            pourSpoutDrop.position.set(
              _spoutWorldPos.x,
              _spoutWorldPos.y - dPhase * 0.45,
              _spoutWorldPos.z,
            );
          } else {
            pourSpoutDrop.visible = false;
          }
        }
        bowlPool.scale.y = 0.78 + bowlFill * 0.55;
        bowlPool.position.y = 0.2 + bowlFill * 0.06;
      }

      // 3. INTERACTIVE HONEY DIPPER (Natural Hardwood + Viscous Pulling Strand + Macro Bees)
      if (curMode === 'dipper') {
        if (stateRef.current.dipTrigger !== stateRef.current.lastHandledDipTrigger) {
          stateRef.current.lastHandledDipTrigger = stateRef.current.dipTrigger;
          dipCycle = 0;
        }
        if (stateRef.current.isPlaying && !reducedMotion) {
          dipCycle = (dipCycle + dt * 0.088) % 1;
        }

        if (!reducedMotion && stateRef.current.isPlaying) {
          dipperBees.forEach((entry, bIdx) => {
            const a = elapsed * entry.speed + entry.phase;
            const nx = Math.cos(a) * entry.rx;
            const nz = Math.sin(a) * entry.rz + entry.zBias;
            const ny = entry.yBase + Math.sin(elapsed * 2.2 + entry.phase) * 0.16;
            entry.bee.position.set(nx, ny, nz);
            entry.bee.rotation.y = entry.speed > 0 ? -a : -a + Math.PI;
            const wL = entry.bee.getObjectByName('wingL');
            const wR = entry.bee.getObjectByName('wingR');
            if (wL && wR) {
              const flap = Math.sin(elapsed * 48 + bIdx * 1.6) * 0.38;
              wL.rotation.z = 0.22 + flap;
              wR.rotation.z = 0.22 + flap;
            }
          });
        }

        const honeySurfaceY = 0.49;
        const highLiftY = 1.82;

        if (dipCycle < 0.18) {
          const t = dipCycle / 0.18;
          const ease = t * t * (3 - 2 * t);
          dipperPivot.position.set(0, THREE.MathUtils.lerp(highLiftY, 0.15, ease), 0);
          dipperPivot.rotation.z = THREE.MathUtils.lerp(-0.18, 0, ease);
          dipperGlazeMat.opacity = THREE.MathUtils.lerp(0.32, 0.92, ease);
          dipStream.mesh.visible = false;
          slowDripBeads.forEach((b) => {
            b.visible = false;
          });
          dipRipple.scale.setScalar(1 + ease * 2.8);
          dipRippleMat.opacity = ease * 0.42;
        } else if (dipCycle < 0.32) {
          dipperPivot.position.set(0, 0.15, 0);
          dipperPivot.rotation.z = 0;
          dipperAssembly.rotation.y += dt * 4.2;
          dipperGlazeMat.opacity = 0.92;
          dipStream.mesh.visible = false;
          slowDripBeads.forEach((b) => {
            b.visible = false;
          });
          dipRippleMat.opacity = 0.28;
        } else {
          const t = (dipCycle - 0.32) / 0.68;
          const liftEase = Math.min(1, t / 0.24);
          const smoothLift = liftEase * liftEase * (3 - 2 * liftEase);
          const curY = THREE.MathUtils.lerp(0.15, highLiftY, smoothLift);
          dipperPivot.position.set(0, curY, 0);
          dipperPivot.rotation.z = THREE.MathUtils.lerp(0, -0.18, smoothLift);
          dipperAssembly.rotation.y += dt * 1.15;
          dipperGlazeMat.opacity = 0.92;

          dipperPivot.updateMatrixWorld(true);
          dipperTipMarker.getWorldPosition(_spoutWorldPos);

          if (_spoutWorldPos.y > honeySurfaceY + 0.12) {
            const strandStrength = Math.max(0, 1 - t * 2.0);
            dipStream.mesh.visible = strandStrength > 0.06;
            if (dipStream.mesh.visible) {
              dipPts[0].set(_spoutWorldPos.x, _spoutWorldPos.y, _spoutWorldPos.z);
              dipPts[1].set(
                _spoutWorldPos.x * 0.45 + Math.sin(elapsed * 4.5) * 0.008,
                (_spoutWorldPos.y + honeySurfaceY) * 0.5,
                0,
              );
              dipPts[2].set(0, honeySurfaceY, 0);

              // Viscous liquid bridge thickest at wood tip & bowl meniscus, necked smoothly in center
              dipStream.update(dipCurve, (u) => {
                const pinch = 1 - 0.68 * Math.sin(u * Math.PI);
                return (0.012 + 0.024 * strandStrength) * pinch;
              });
            }

            let maxImpact = 0;
            slowDripBeads.forEach((bead, idx) => {
              const dropPhase = (t * 2.4 + idx * 0.333) % 1;
              bead.visible = true;
              if (dropPhase < 0.42) {
                const growT = dropPhase / 0.42;
                const s = 0.38 + growT * 0.62;
                bead.scale.set(s * 0.85, s * (1 + growT * 0.48), s * 0.85);
                bead.position.set(
                  _spoutWorldPos.x,
                  _spoutWorldPos.y - growT * 0.12,
                  _spoutWorldPos.z,
                );
              } else {
                const fallT = (dropPhase - 0.42) / 0.58;
                const fallEase = fallT * fallT;
                const startY = _spoutWorldPos.y - 0.12;
                const curDropY = THREE.MathUtils.lerp(startY, honeySurfaceY + 0.02, fallEase);
                bead.scale.set(0.8, 1.4, 0.8);
                bead.position.set(
                  THREE.MathUtils.lerp(_spoutWorldPos.x, 0, fallEase),
                  curDropY,
                  0,
                );
                if (fallT > 0.82) {
                  maxImpact = Math.max(maxImpact, (fallT - 0.82) / 0.18);
                }
              }
            });

            if (maxImpact > 0) {
              dipRipple.scale.setScalar(1 + maxImpact * 3.6);
              dipRippleMat.opacity = (1 - maxImpact) * 0.55;
            } else {
              dipRippleMat.opacity = Math.max(0, dipRippleMat.opacity - dt * 0.8);
            }
          }
        }
      }

      // 4. ORGANIC STUDIO HONEYCOMB (Natural Beeswax + Wax Caps + Macro Swarm)
      if (curMode === 'comb') {
        if (stateRef.current.combResetTick !== stateRef.current.lastHandledCombReset) {
          stateRef.current.lastHandledCombReset = stateRef.current.combResetTick;
          combWaveTime = 0;
          combCells.forEach((c) => {
            c.fillAmount = 0.05;
          });
        }
        if (stateRef.current.combFilling && stateRef.current.isPlaying && !reducedMotion) {
          combWaveTime += dt * 0.58;
        }
        combCells.forEach((cell) => {
          const delay = cell.dist * 0.55;
          const waveTarget = THREE.MathUtils.clamp((combWaveTime - delay) * 0.95, 0.05, 1.0);
          cell.fillAmount = THREE.MathUtils.damp(cell.fillAmount, waveTarget, 3.2, rawDelta);
          cell.fillMesh.scale.set(1, 1, cell.fillAmount);
          cell.fillMesh.position.z = -0.15 + cell.fillAmount * 0.16;

          cell.capMesh.visible = cell.fillAmount > 0.55;
          const capScale = Math.max(0.01, (cell.fillAmount - 0.55) / 0.45);
          if (cell.capped) {
            cell.capMesh.scale.set(capScale, capScale, capScale * 0.28);
            cell.capMesh.position.z = -0.14 + cell.fillAmount * 0.34;
          } else {
            cell.capMesh.scale.set(capScale, capScale, capScale * 0.34);
            cell.capMesh.position.z = -0.15 + cell.fillAmount * 0.34;
          }
        });

        if (!reducedMotion && stateRef.current.isPlaying) {
          combDrips.forEach((cd) => {
            cd.y -= dt * cd.speed;
            if (cd.y < 0.15) cd.y = 0.46;
            cd.mesh.position.set(cd.x, cd.y, 0.04);
          });

          beeSwarm.forEach((entry, bIdx) => {
            const a = elapsed * entry.speed + entry.phase;
            const nx = Math.cos(a) * entry.rx;
            const nz = Math.sin(a) * entry.rz + 0.25;
            const ny = entry.yBase + Math.sin(elapsed * 2.4 + entry.phase) * 0.16;
            entry.bee.position.set(nx, ny, nz);
            entry.bee.rotation.y = entry.speed > 0 ? -a : -a + Math.PI;
            const wL = entry.bee.getObjectByName('wingL');
            const wR = entry.bee.getObjectByName('wingR');
            if (wL && wR) {
              const flap = Math.sin(elapsed * 48 + bIdx * 1.4) * 0.36;
              wL.rotation.z = 0.22 + flap;
              wR.rotation.z = 0.22 + flap;
            }
          });
        }
      }

      if (needsImmediateRender) {
        needsImmediateRender = false;
      }
      controls.update();
      renderer.render(scene, camera);
      scheduleNextFrame(renderer, isSoftwareGl, tick, timerRef);
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(timerRef.current);
      window.clearTimeout(timerRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      disposeHierarchy(scene);
      dispose();
    };
  }, [variant]);

  if (webglError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-[#F5ECD8]">
        <img
          src="/src/assets/images/hero_sirumalai_honey_1795429480407.jpg"
          alt="JSMW Golden Wild Honey"
          referrerPolicy="no-referrer"
          className="mb-4 h-48 w-72 rounded-xl object-cover"
        />
        <p className="font-display text-xl">3D Honey Experience Preview</p>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="h-full w-full cursor-grab active:cursor-grabbing touch-pan-y"
      aria-label="Interactive 3D JSMW Honey Viewport"
    />
  );
}
