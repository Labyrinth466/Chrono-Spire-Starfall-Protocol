import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ELEMENT_META, RESONATORS, ResonatorData } from '../data/resonators';
import {
  BossPartId,
  BossPartUnit,
  CombatHeroUnit,
  FloatingText,
  ImpactShockwave,
} from '../engine/combatEngine';
import { Particle } from '../engine/pixelRenderer';

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

// Convert 2D battlefield coordinates (1040x430) to 3D Voxel Arena coordinates
function map2DTo3D(x2d: number, y2d: number): { x: number; z: number } {
  const x = ((x2d - 520) / 520) * 14.5;
  const z = ((y2d - 245) / 180) * 5.2;
  return { x, z };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.85)');
  grad.addColorStop(0.6, 'rgba(2, 6, 23, 0.35)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a composite 10-part 3D Voxel Hero Model strictly from BoxGeometry voxel blocks
 * (No smooth spheres or capsules) pivoted at bottom-center (y = 0).
 */
function buildVoxelHeroGroup(
  hero: ResonatorData,
  shadowTex: THREE.Texture
): {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  weaponGroup: THREE.Group;
  ringGroup: THREE.Group;
  ultPillar: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
} {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const weaponGroup = new THREE.Group();
  const ringGroup = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];

  const elColor = ELEMENT_META[hero.element].color;

  const makeMat = (
    hex: string,
    roughness: number,
    metalness: number,
    emissiveHex?: string,
    emissiveIntensity: number = 0
  ) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness,
      metalness,
      emissive: emissiveHex ? new THREE.Color(emissiveHex) : new THREE.Color(0x000000),
      emissiveIntensity,
    });
    mat.userData.baseEmissive = emissiveHex ? new THREE.Color(emissiveHex) : new THREE.Color(0x000000);
    mat.userData.baseEmissiveIntensity = emissiveIntensity;
    materials.push(mat);
    return mat;
  };

  // Contact shadow plane on ground
  const shadowGeo = new THREE.PlaneGeometry(1.9, 1.3);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  root.add(shadowMesh);

  // 3D Voxel Magic Ring under feet (8 voxel rune blocks in an octagonal ring)
  const runeMat = makeMat(elColor, 0.2, 0.8, elColor, 0.85);
  const runeGeo = new THREE.BoxGeometry(0.18, 0.05, 0.18);
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const block = new THREE.Mesh(runeGeo, runeMat);
    block.position.set(Math.cos(ang) * 0.72, 0.03, Math.sin(ang) * 0.52);
    block.rotation.y = -ang;
    ringGroup.add(block);
  }
  root.add(ringGroup);

  const bootMat = makeMat('#0f172a', 0.75, 0.25);
  const armorPrimaryMat = makeMat(hero.colors.primary, 0.35, 0.65);
  const armorSecondaryMat = makeMat(hero.colors.secondary, 0.6, 0.3);
  const skinMat = makeMat('#fde68a', 0.7, 0.05);
  const hairMat = makeMat(hero.colors.hair, 0.55, 0.15);
  const eyeMat = makeMat(elColor, 0.15, 0.9, elColor, 1.1);

  // 1. Left & Right Voxel Boots + Greaves
  const legGeo = new THREE.BoxGeometry(0.24, 0.52, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, bootMat);
  leftLeg.position.set(-0.16, 0.26, 0);
  leftLeg.castShadow = !isSoftwareGl;
  const rightLeg = new THREE.Mesh(legGeo, bootMat);
  rightLeg.position.set(0.16, 0.26, 0);
  rightLeg.castShadow = !isSoftwareGl;
  bodyGroup.add(leftLeg, rightLeg);

  // 2. Voxel Belt / Waist Tasset
  const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.36), armorSecondaryMat);
  beltMesh.position.set(0, 0.58, 0);
  bodyGroup.add(beltMesh);

  // 3. Voxel Chestplate Torso
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.64, 0.34), armorPrimaryMat);
  torsoMesh.position.set(0, 0.96, 0);
  torsoMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(torsoMesh);

  // 4. Emissive Elemental Core Gem on Chest
  const coreGem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.08), eyeMat);
  coreGem.position.set(0.06, 0.98, 0.18);
  bodyGroup.add(coreGem);

  // 5. Left & Right Voxel Shoulder Pauldrons
  const pauldronGeo = new THREE.BoxGeometry(0.24, 0.24, 0.38);
  const leftPauldron = new THREE.Mesh(pauldronGeo, armorSecondaryMat);
  leftPauldron.position.set(-0.42, 1.16, 0);
  const rightPauldron = new THREE.Mesh(pauldronGeo, armorSecondaryMat);
  rightPauldron.position.set(0.42, 1.16, 0);
  bodyGroup.add(leftPauldron, rightPauldron);

  // 6. Voxel Flowing Cape / Wings behind back
  const capeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.78, 0.1), armorSecondaryMat);
  capeMesh.position.set(-0.14, 0.86, -0.22);
  capeMesh.rotation.z = 0.14;
  bodyGroup.add(capeMesh);

  // 7. Voxel Head Cube
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.48), skinMat);
  headMesh.position.set(0, 1.56, 0);
  headMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(headMesh);

  // 8. Voxel Glowing Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.12, 1.54, 0.24);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.24, 1.54, 0.24);
  bodyGroup.add(leftEye, rightEye);

  // 9. Voxel Hair Crown + Spikes / Crest
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.54), hairMat);
  hairTop.position.set(-0.02, 1.84, 0);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.2), hairMat);
  hairBack.position.set(-0.16, 1.58, -0.2);
  const hairCrest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.16), eyeMat);
  hairCrest.position.set(0.1, 2.02, 0.1);
  bodyGroup.add(hairTop, hairBack, hairCrest);

  // 10. Composite 3D Voxel Elemental Weapon (Hilt + Crossguard + Stepped Voxel Blade)
  weaponGroup.position.set(0.38, 1.02, 0.22);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), bootMat);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.16), armorSecondaryMat);
  guard.position.set(0, 0.18, 0);
  const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.08), eyeMat);
  bladeCore.position.set(0, 0.68, 0);
  const bladeTip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.08), eyeMat);
  bladeTip.position.set(0, 1.24, 0);
  weaponGroup.add(hilt, guard, bladeCore, bladeTip);
  bodyGroup.add(weaponGroup);

  // 11. Ultimate Voxel Light Pillar (Visible during ULTIMATE_CAST)
  const ultPillarMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(elColor),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const ultPillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.5, 1.1), ultPillarMat);
  ultPillar.position.set(0, 2.75, 0);
  root.add(ultPillar);

  root.add(bodyGroup);
  return { root, bodyGroup, weaponGroup, ringGroup, ultPillar, materials };
}

/**
 * Builds a composite 3D Voxel Boss Part or Void Minion strictly from BoxGeometry blocks.
 */
function buildVoxelEnemyGroup(
  part: BossPartUnit,
  shadowTex: THREE.Texture
): {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  ringGroup: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
} {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const ringGroup = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];

  const elColor = ELEMENT_META[part.element || 'Dark'].color;
  const isMainCore = part.id === 'BOSS_MAIN';
  const isArm = part.id === 'TENTACLE_FRONT' || part.id === 'RIGHT_ARM';
  const isEye = part.id === 'EYE_BACK';

  const makeMat = (
    hex: string,
    roughness: number,
    metalness: number,
    emissiveHex?: string,
    emissiveIntensity: number = 0
  ) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness,
      metalness,
      emissive: emissiveHex ? new THREE.Color(emissiveHex) : new THREE.Color(0x000000),
      emissiveIntensity,
    });
    mat.userData.baseEmissive = emissiveHex ? new THREE.Color(emissiveHex) : new THREE.Color(0x000000);
    mat.userData.baseEmissiveIntensity = emissiveIntensity;
    materials.push(mat);
    return mat;
  };

  // Contact shadow
  const shadowSize = isMainCore ? 3.8 : 2.3;
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowSize, shadowSize * 0.7),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  root.add(shadowMesh);

  // Voxel Rune Ring under enemy
  const runeMat = makeMat(elColor, 0.25, 0.8, elColor, 0.8);
  const ringRadius = isMainCore ? 1.45 : 0.85;
  const runeGeo = new THREE.BoxGeometry(0.22, 0.06, 0.22);
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const b = new THREE.Mesh(runeGeo, runeMat);
    b.position.set(Math.cos(ang) * ringRadius, 0.03, Math.sin(ang) * (ringRadius * 0.72));
    ringGroup.add(b);
  }
  root.add(ringGroup);

  const obsidianMat = makeMat('#1e1b4b', 0.45, 0.7);
  const armorMat = makeMat('#312e81', 0.7, 0.35);
  const coreGlowMat = makeMat(elColor, 0.15, 0.9, elColor, 1.15);
  const boneMat = makeMat('#e2e8f0', 0.65, 0.2);

  if (isMainCore) {
    // 4-Part Old God Core: Multi-tiered Voxel Monolith + Crown Horns + Ribcage + Glowing Heart
    const basePedestal = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 1.5), obsidianMat);
    basePedestal.position.set(0, 0.35, 0);
    const lowerTorso = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.3, 1.25), armorMat);
    lowerTorso.position.set(0, 1.35, 0);
    const upperTorso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 1.4), obsidianMat);
    upperTorso.position.set(0, 2.55, 0);
    const abyssHeart = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.45), coreGlowMat);
    abyssHeart.position.set(-0.2, 2.5, 0.58);

    // Voxel Crown Horns
    const leftHorn = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), boneMat);
    leftHorn.position.set(-0.85, 3.65, 0.2);
    leftHorn.rotation.z = 0.22;
    const rightHorn = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), boneMat);
    rightHorn.position.set(0.85, 3.65, -0.2);
    rightHorn.rotation.z = -0.22;

    // Floating Voxel Halo Wing Blocks
    const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.9), coreGlowMat);
    wingLeft.position.set(0.4, 3.1, -0.95);
    const wingRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.9), coreGlowMat);
    wingRight.position.set(0.4, 3.1, 0.95);

    bodyGroup.add(
      basePedestal,
      lowerTorso,
      upperTorso,
      abyssHeart,
      leftHorn,
      rightHorn,
      wingLeft,
      wingRight
    );
  } else if (isArm) {
    // Old God Voxel Gauntlet / Abyssal Crusher Arm
    const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.95), obsidianMat);
    baseBlock.position.set(0, 0.28, 0);
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.25, 0.82), armorMat);
    forearm.position.set(0, 1.15, 0);
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 1.05), obsidianMat);
    knuckle.position.set(-0.15, 1.95, 0);
    const claw1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, 0.24), coreGlowMat);
    claw1.position.set(-0.55, 2.35, -0.28);
    const claw2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.24), coreGlowMat);
    claw2.position.set(-0.55, 2.4, 0);
    const claw3 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, 0.24), coreGlowMat);
    claw3.position.set(-0.55, 2.35, 0.28);
    bodyGroup.add(baseBlock, forearm, knuckle, claw1, claw2, claw3);
  } else if (isEye) {
    // Cosmic Eye of Madness (Voxel Octa-Frame + Glowing Voxel Iris + Pupil)
    const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.85), obsidianMat);
    outerFrame.position.set(0, 1.9, 0);
    outerFrame.rotation.z = Math.PI / 4;
    const scleraBlock = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.95), boneMat);
    scleraBlock.position.set(-0.08, 1.9, 0);
    const irisBlock = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 1.04), coreGlowMat);
    irisBlock.position.set(-0.16, 1.9, 0);
    const finTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.28), armorMat);
    finTop.position.set(0, 2.85, 0);
    const finBot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.28), armorMat);
    finBot.position.set(0, 0.95, 0);
    bodyGroup.add(outerFrame, scleraBlock, irisBlock, finTop, finBot);
  } else {
    // Void Minions or Rival Arena Heroes (Voxel Knight Husk)
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.65, 0.44), obsidianMat);
    legs.position.set(0, 0.32, 0);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.85, 0.52), armorMat);
    torso.position.set(0, 1.05, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.5), obsidianMat);
    head.position.set(0, 1.75, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.54), coreGlowMat);
    visor.position.set(-0.1, 1.76, 0);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), coreGlowMat);
    blade.position.set(-0.52, 1.25, 0.26);
    blade.rotation.z = 0.35;
    bodyGroup.add(legs, torso, head, visor, blade);
  }

  root.add(bodyGroup);
  return { root, bodyGroup, ringGroup, materials };
}

export interface VoxelBattlefield3DProps {
  simRef: React.MutableRefObject<{
    heroes: CombatHeroUnit[];
    bossParts: BossPartUnit[];
    floatingTexts: FloatingText[];
    particles: Particle[];
    shockwaves: ImpactShockwave[];
    staggerSegments: number;
    currentSegmentBp: number;
    maxSegmentBp: number;
    isStaggered: boolean;
    staggerTimer: number;
    antiStaggerTimer: number;
    staggerWarningTimer: number;
    waveElapsed: number;
    isBerserk: boolean;
    guildRaidDamage: number;
    combatLog: string[];
    cutIn: unknown;
    manualFocusId: BossPartId | null;
    hitstopTimer: number;
    shakeMag: number;
  }>;
  floor: number;
  formationName: string;
  resonanceTitle: string;
  onSelectEnemyPart: (partId: BossPartId) => void;
}

export const VoxelBattlefield3D: React.FC<VoxelBattlefield3DProps> = ({
  simRef,
  floor,
  formationName,
  resonanceTitle,
  onSelectEnemyPart,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ floor, formationName, resonanceTitle, onSelectEnemyPart });
  propsRef.current = { floor, formationName, resonanceTitle, onSelectEnemyPart };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1040;
    const height = container.clientHeight || 430;

    // 1. WebGLRenderer with ACESFilmicToneMapping & Software-WebGL Guard
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'w-full h-full block cursor-crosshair';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040714');
    scene.fog = new THREE.FogExp2('#040714', 0.028);

    // 2. Mandatory RoomEnvironment PMREM Studio Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Fixed 2.5D Diorama Side-View Camera
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.5, 120);
    const baseCamPos = new THREE.Vector3(0, 6.4, 17.5);
    const baseLookAt = new THREE.Vector3(0.4, 1.5, 0);
    camera.position.copy(baseCamPos);
    camera.lookAt(baseLookAt);

    // 4. Balanced 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfef08a, 2.2);
    keyLight.position.set(-8, 16, 11);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc084fc, 1.45);
    rimLight.position.set(12, 8, -10);
    scene.add(rimLight);

    // 5. Reflective Obsidian Ruin Floor & Voxel Pillars
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#090d1e'),
      roughness: 0.22,
      metalness: 0.82,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(48, 22), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Voxel Arena Floor Grid Strips (Offset on Y to avoid Z-fighting)
    const stripGeo = new THREE.BoxGeometry(0.08, 0.02, 12);
    const stripMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 0.22,
      roughness: 0.3,
      metalness: 0.8,
    });
    for (let gx = -14; gx <= 14; gx += 3.5) {
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(gx, 0.01, 0);
      scene.add(strip);
    }

    // Background 3D Voxel Ruin Pillars + Glowing Astral Crystals
    const pillarMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.65,
      metalness: 0.35,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38bdf8'),
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.9,
    });
    for (let i = -3; i <= 3; i++) {
      const px = i * 4.6;
      const pz = -5.6 - (Math.abs(i) % 2) * 1.4;
      const h = 3.2 + (Math.abs(i * 7) % 3) * 1.1;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, h, 0.95), pillarMat);
      pillar.position.set(px, h / 2, pz);
      scene.add(pillar);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 1.15), pillarMat);
      cap.position.set(px, h + 0.14, pz);
      scene.add(cap);

      const crystal = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.32), crystalMat);
      crystal.position.set(px, h + 0.65, pz);
      scene.add(crystal);
    }

    // 6. Pooled 3D Voxel Particle Burst InstancedMesh (120 cubes)
    const MAX_VOXEL_PARTICLES = 120;
    const particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.75,
      emissive: 0x222222,
    });
    const voxelInstanced = new THREE.InstancedMesh(particleGeo, particleMat, MAX_VOXEL_PARTICLES);
    voxelInstanced.frustumCulled = false;
    scene.add(voxelInstanced);

    const shadowTex = createContactShadowTexture();

    // Cache of Hero & Enemy 3D Voxel Groups
    const heroMap = new Map<
      string,
      ReturnType<typeof buildVoxelHeroGroup>
    >();
    const enemyMap = new Map<
      string,
      ReturnType<typeof buildVoxelEnemyGroup> & { partId: BossPartId; element: string }
    >();

    // Raycaster for clicking enemy Boss parts / Minions
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const handlePointerDown = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const enemyRoots: THREE.Object3D[] = [];
      enemyMap.forEach((entry) => {
        if (entry.root.visible) enemyRoots.push(entry.root);
      });
      const hits = raycaster.intersectObjects(enemyRoots, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj) {
          if (obj.userData?.bossPartId) {
            propsRef.current.onSelectEnemyPart(obj.userData.bossPartId as BossPartId);
            return;
          }
          obj = obj.parent;
        }
      }
    };
    renderer.domElement.addEventListener('click', handlePointerDown);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1040;
      const h = container.clientHeight || 430;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = w;
        overlayCanvasRef.current.height = h;
      }
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const sim = simRef.current;

      // 1. Damped 2.5D Side-View Camera Sway + Combat Camera Shake
      const shake = sim.shakeMag || 0;
      const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 0.06 : 0;
      const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 0.05 : 0;

      const targetCamX = Math.sin(elapsed * 0.55) * 0.38 + shakeX;
      const targetCamY = baseCamPos.y + Math.cos(elapsed * 0.7) * 0.14 + shakeY;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6, dt);
      camera.lookAt(baseLookAt.x + shakeX * 0.4, baseLookAt.y + shakeY * 0.4, baseLookAt.z);

      // 2. Sync 3D Voxel Heroes
      const activeHeroIds = new Set<string>();
      sim.heroes.forEach((u) => {
        activeHeroIds.add(u.id);
        let entry = heroMap.get(u.id);
        if (!entry) {
          entry = buildVoxelHeroGroup(u.data, shadowTex);
          scene.add(entry.root);
          heroMap.set(u.id, entry);
        }

        const isAlive = u.hp > 0;
        entry.root.visible = isAlive;
        if (!isAlive) return;

        const basePos = map2DTo3D(u.x, u.y);
        let lungeX = 0;
        let liftY = Math.abs(Math.sin(elapsed * 4.5 + u.x * 0.03)) * 0.08;
        let wepRotZ = -0.25;

        if (u.animState === 'RUN_DASH') {
          lungeX = 0.75;
          liftY = 0.16;
          wepRotZ = -0.65;
        } else if (u.animState === 'ATTACK_COMBO') {
          const swing = Math.sin(Math.min(1, u.animTimer * 4) * Math.PI);
          lungeX = 0.65 + swing * 0.45;
          liftY = 0.22 * swing;
          wepRotZ = -1.35 + swing * 2.1;
        } else if (u.animState === 'SKILL_CAST') {
          lungeX = 0.35;
          liftY = 0.35;
          wepRotZ = -1.1;
        } else if (u.animState === 'ULTIMATE_CAST') {
          lungeX = 0.55;
          liftY = 0.62;
          wepRotZ = -1.5;
        }

        entry.root.position.set(basePos.x + lungeX, 0, basePos.z);
        entry.bodyGroup.position.y = liftY;
        entry.weaponGroup.rotation.z = wepRotZ;
        entry.ringGroup.rotation.y = elapsed * 1.8;

        const ultMat = entry.ultPillar.material as THREE.MeshBasicMaterial;
        ultMat.opacity = u.animState === 'ULTIMATE_CAST' ? 0.36 : 0;

        // 80ms White Voxel Hit-Flash on Impact
        const flashActive = u.hitFlash > 0;
        entry.materials.forEach((m) => {
          if (flashActive) {
            m.emissive.setHex(0xffffff);
            m.emissiveIntensity = 1.65;
          } else {
            m.emissive.copy(m.userData.baseEmissive);
            m.emissiveIntensity = m.userData.baseEmissiveIntensity;
          }
        });
      });

      heroMap.forEach((entry, id) => {
        if (!activeHeroIds.has(id)) {
          entry.root.visible = false;
        }
      });

      // 3. Sync 3D Voxel Boss Parts & Minions
      const activeEnemyKeys = new Set<string>();
      sim.bossParts.forEach((b) => {
        const key = `${b.id}_${b.element}`;
        activeEnemyKeys.add(key);
        let entry = enemyMap.get(key);
        if (!entry) {
          const built = buildVoxelEnemyGroup(b, shadowTex);
          built.root.userData.bossPartId = b.id;
          scene.add(built.root);
          entry = { ...built, partId: b.id, element: b.element };
          enemyMap.set(key, entry);
        }

        entry.root.visible = b.alive;
        if (!b.alive) return;

        const pos = map2DTo3D(b.x, b.y);
        const bobY = sim.isStaggered
          ? -0.15
          : Math.sin(elapsed * 3.2 + b.x * 0.02) * (b.id === 'BOSS_MAIN' ? 0.18 : 0.12);
        const shakeOffset = b.hitFlash > 0 ? (Math.random() - 0.5) * 0.22 : 0;

        entry.root.position.set(pos.x + shakeOffset, 0, pos.z);
        entry.bodyGroup.position.y = Math.max(0, bobY);
        entry.bodyGroup.rotation.z = sim.isStaggered ? 0.18 : 0;
        entry.ringGroup.rotation.y = -elapsed * 1.5;

        // 80ms White Voxel Hit-Flash on Impact
        const flashActive = b.hitFlash > 0;
        entry.materials.forEach((m) => {
          if (flashActive) {
            m.emissive.setHex(0xffffff);
            m.emissiveIntensity = 1.85;
          } else {
            m.emissive.copy(m.userData.baseEmissive);
            m.emissiveIntensity = m.userData.baseEmissiveIntensity;
          }
        });
      });

      enemyMap.forEach((entry, key) => {
        if (!activeEnemyKeys.has(key)) {
          entry.root.visible = false;
        }
      });

      // 4. Update Pooled 3D Voxel Particle Bursts (Tumbling Voxel Cubes)
      for (let i = 0; i < MAX_VOXEL_PARTICLES; i++) {
        const p = sim.particles[i];
        if (p && p.life > 0) {
          const pos3 = map2DTo3D(p.x, p.y);
          const heightY = Math.max(0.12, 1.35 + ((240 - p.y) / 140) * 1.1);
          const lifeRatio = Math.max(0.1, p.life / Math.max(0.05, p.maxLife));
          const s = (p.size / 4.2) * lifeRatio;

          _vec3.set(pos3.x, heightY, pos3.z);
          _euler.set(elapsed * 7 + i, elapsed * 5 + i * 0.5, elapsed * 6);
          _quat.setFromEuler(_euler);
          _scale.set(s, s, s);
          _mat4.compose(_vec3, _quat, _scale);
          voxelInstanced.setMatrixAt(i, _mat4);
          _color.set(p.color);
          voxelInstanced.setColorAt(i, _color);
        } else {
          _mat4.makeScale(0, 0, 0);
          voxelInstanced.setMatrixAt(i, _mat4);
        }
      }
      voxelInstanced.instanceMatrix.needsUpdate = true;
      if (voxelInstanced.instanceColor) voxelInstanced.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);

      // 5. Render Crisp 2D HUD Overlay (Floating Damage Numbers + WEAK!/RESIST Tags + Enemy Part Bars)
      const overlay = overlayCanvasRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        if (ctx) {
          const cw = overlay.width;
          const ch = overlay.height;
          ctx.clearRect(0, 0, cw, ch);

          // Project 3D enemy positions for target reticles & individual part HP bars
          sim.bossParts.forEach((b) => {
            if (!b.alive) return;
            const pos3 = map2DTo3D(b.x, b.y);
            _vec3.set(pos3.x, b.id === 'BOSS_MAIN' ? 3.8 : 2.5, pos3.z);
            _vec3.project(camera);
            const sx = (_vec3.x * 0.5 + 0.5) * cw;
            const sy = (-_vec3.y * 0.5 + 0.5) * ch;

            const isFocused = sim.manualFocusId === b.id;
            const elColor = ELEMENT_META[b.element || 'Dark'].color;
            const barW = b.id === 'BOSS_MAIN' ? 86 : 66;
            const hpPct = Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));

            // Element dot + Mini HP Bar above voxel part
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.fillRect(sx - barW / 2 - 1, sy - 7, barW + 2, 7);
            ctx.fillStyle = isFocused ? '#fbbf24' : elColor;
            ctx.fillRect(sx - barW / 2, sy - 6, barW * hpPct, 5);

            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = isFocused ? '#fde047' : '#e2e8f0';
            ctx.fillText(
              `${isFocused ? '🎯 ' : ''}[${b.element.slice(0, 2).toUpperCase()}] ${b.name.split(':')[0]}`,
              sx,
              sy - 10
            );
          });

          // Floating Combat Text (with WEAK! and RESIST styling)
          sim.floatingTexts.forEach((ft) => {
            const pos3 = map2DTo3D(ft.x, ft.y);
            const lift = (1 - ft.life / Math.max(0.1, ft.maxLife)) * 1.4;
            _vec3.set(pos3.x, 1.9 + lift, pos3.z);
            _vec3.project(camera);
            const sx = (_vec3.x * 0.5 + 0.5) * cw;
            const sy = (-_vec3.y * 0.5 + 0.5) * ch;

            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, ft.life / (ft.maxLife * 0.45)));
            const fontSize = Math.round(13 * (ft.scale || 1));
            ctx.font = `800 ${fontSize}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
            ctx.strokeText(ft.text, sx, sy);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, sx, sy);

            if (ft.subtext) {
              ctx.font = '800 10px "JetBrains Mono", monospace';
              ctx.strokeText(ft.subtext, sx, sy - fontSize);
              ctx.fillStyle = ft.subtext.includes('WEAK')
                ? '#fde047'
                : ft.subtext.includes('RESIST')
                ? '#94a3b8'
                : '#38bdf8';
              ctx.fillText(ft.subtext, sx, sy - fontSize);
            }
            ctx.restore();
          });
        }
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handlePointerDown);
      shadowTex.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      floorMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simRef]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full" />
      <canvas
        ref={overlayCanvasRef}
        width={1040}
        height={430}
        className="pointer-events-none absolute inset-0 w-full h-full"
      />
    </div>
  );
};

/**
 * 3D Voxel Hero Preview Box for the Heroes & Gambit and Summon tabs.
 */
export const VoxelPreview3D: React.FC<{
  hero: ResonatorData;
  ultPulse?: boolean;
}> = ({ hero, ultPulse = false }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef(hero);
  const ultRef = useRef(ultPulse);
  heroRef.current = hero;
  ultRef.current = ultPulse;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = 136;
    const height = 136;
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 30);
    camera.position.set(0.5, 1.55, 4.3);
    camera.lookAt(0, 1.05, 0);

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.1);
    const dir = new THREE.DirectionalLight(0xfef08a, 2.1);
    dir.position.set(-3, 5, 4);
    scene.add(hemi, dir);

    const shadowTex = createContactShadowTexture();
    let currentHeroId = heroRef.current.id;
    let built = buildVoxelHeroGroup(heroRef.current, shadowTex);
    scene.add(built.root);

    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const t = clock.getElapsedTime();
      if (heroRef.current.id !== currentHeroId) {
        scene.remove(built.root);
        built = buildVoxelHeroGroup(heroRef.current, shadowTex);
        scene.add(built.root);
        currentHeroId = heroRef.current.id;
      }

      const isUlt = ultRef.current;
      built.root.rotation.y = Math.sin(t * 0.9) * 0.42;
      built.bodyGroup.position.y = isUlt
        ? 0.28 + Math.abs(Math.sin(t * 10)) * 0.18
        : Math.abs(Math.sin(t * 3.8)) * 0.08;
      built.weaponGroup.rotation.z = isUlt ? -1.2 + Math.sin(t * 16) * 0.9 : -0.25 + Math.sin(t * 3) * 0.12;
      built.ringGroup.rotation.y = t * (isUlt ? 4.5 : 1.6);
      (built.ultPillar.material as THREE.MeshBasicMaterial).opacity = isUlt ? 0.38 : 0;

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-[136px] h-[136px] flex items-center justify-center overflow-hidden"
    />
  );
};
