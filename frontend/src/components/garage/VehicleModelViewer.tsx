import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoadLoader } from '../ui/RoadLoader';
import { createLoadGeneration } from '../../features/garage/assetResolution';
import { isBodyPaintMaterial } from '../../features/garage/vehicleCatalogue';

const lookTarget = new THREE.Vector3(0, 0.72, 0);
const baseOffset = new THREE.Vector3(3.35, 1.28, 4.05);
const homeYaw = 0.55;

function disposeObject(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
      });
      material.dispose();
    });
  });
  textures.forEach((texture) => texture.dispose());
}

function sceneTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function buildGarage(theme: string) {
  const light = theme === 'light';
  const group = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: light ? '#d7d1e2' : '#3a3448', roughness: 0.92, metalness: 0.04 }),
  );
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.name = 'garage-floor';
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(16, 3.6, 0.08),
    new THREE.MeshStandardMaterial({ color: light ? '#ebe6f2' : '#8d849f', roughness: 1, metalness: 0 }),
  );
  wall.position.set(0, 1.7, -3.4);
  wall.name = 'garage-wall';
  const rubber = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.92 });
  const tyreA = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 12, 20), rubber);
  tyreA.position.set(-4.4, 0.36, 2.15);
  tyreA.rotation.x = Math.PI / 2;
  const tyreB = tyreA.clone();
  tyreB.position.y = 0.58;
  const tool = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.24, 0.32),
    new THREE.MeshStandardMaterial({ color: '#7a5842', roughness: 0.85 }),
  );
  tool.position.set(4.3, 0.14, 2.05);
  group.add(floor, wall, tyreA, tyreB, tool);
  return group;
}

function applyGarageTheme(
  theme: string,
  garage: THREE.Group,
  hemi: THREE.HemisphereLight,
  sun: THREE.DirectionalLight,
  fill: THREE.DirectionalLight,
  renderer: THREE.WebGLRenderer,
) {
  const light = theme === 'light';
  const floor = garage.getObjectByName('garage-floor') as THREE.Mesh | undefined;
  const wall = garage.getObjectByName('garage-wall') as THREE.Mesh | undefined;
  (floor?.material as THREE.MeshStandardMaterial | undefined)?.color.set(light ? '#d7d1e2' : '#3a3448');
  (wall?.material as THREE.MeshStandardMaterial | undefined)?.color.set(light ? '#ebe6f2' : '#8d849f');
  hemi.color.set(light ? '#f7f4fb' : '#f4eefc');
  hemi.groundColor.set(light ? '#c4b8a4' : '#6e657c');
  hemi.intensity = light ? 1.05 : 1.35;
  sun.color.set('#fff6ee');
  sun.intensity = light ? 1.7 : 2.15;
  fill.color.set(light ? '#f7f2ff' : '#efe4ff');
  fill.intensity = light ? 0.45 : 0.85;
  renderer.toneMappingExposure = light ? 1.05 : 1.2;
}

function frameVehicle(model: THREE.Object3D) {
  model.position.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  const measured = new THREE.Box3().setFromObject(model);
  const size = measured.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(3.25 / span);
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= fitted.min.y;
}

function paintVehicle(root: THREE.Object3D, color: string, allowed: string[]) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((material) => {
      const paint = material as THREE.MeshStandardMaterial;
      if (!paint || !isBodyPaintMaterial(paint.name, allowed) || !paint.color) return;
      if (!paint.userData.bodyPaint) return;
      if (!color && paint.userData.originalColor) paint.color.copy(paint.userData.originalColor);
      else if (color) paint.color.set(color);
    });
  });
}

function clonePaintMaterials(root: THREE.Object3D, allowed: string[]) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = list.map((material) => {
      const paint = material as THREE.MeshStandardMaterial;
      if (!paint || !isBodyPaintMaterial(paint.name, allowed)) return material;
      const clone = paint.clone();
      clone.userData.bodyPaint = true;
      clone.userData.originalColor = paint.color ? paint.color.clone() : null;
      return clone;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });
}

export default function VehicleModelViewer({
  src,
  paintColor,
  paintMaterials,
  label,
  onFail,
}: {
  src: string;
  paintColor: string;
  paintMaterials: string[];
  label: string;
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef<(color: string) => void>(() => {});
  const yawRef = useRef<(delta: number) => void>(() => {});
  const [ready, setReady] = useState(false);
  const reported = useRef(false);

  function fail() {
    if (reported.current) return;
    reported.current = true;
    onFail();
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !src) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setReady(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: true, powerPreference: 'low-power' });
    } catch {
      fail();
      return;
    }
    const scene = new THREE.Scene();
    const theme = sceneTheme();
    const garage = buildGarage(theme);
    const pivot = new THREE.Group();
    pivot.rotation.y = homeYaw;
    scene.add(garage, pivot);
    const hemi = new THREE.HemisphereLight('#f4eefc', '#6e657c', 1.35);
    const sun = new THREE.DirectionalLight('#fff6ee', 2.15);
    sun.position.set(4.2, 7.2, 3.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 24;
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    const fill = new THREE.DirectionalLight('#efe4ff', 0.85);
    fill.position.set(-2.8, 2.6, 5.4);
    scene.add(hemi, sun, fill);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.copy(lookTarget).add(baseOffset);
    camera.lookAt(lookTarget);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 1;
    disposeObject(envScene);
    pmrem.dispose();
    applyGarageTheme(theme, garage, hemi, sun, fill, renderer);
    host.appendChild(renderer.domElement);
    let disposed = false;
    let visible = true;
    const render = () => {
      if (disposed || document.hidden || !visible) return;
      renderer.render(scene, camera);
    };
    yawRef.current = (delta) => {
      pivot.rotation.y += delta;
      render();
    };
    const gate = createLoadGeneration();
    const request = gate.begin();
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        if (disposed || !gate.isCurrent(request)) {
          disposeObject(gltf.scene);
          return;
        }
        clonePaintMaterials(gltf.scene, paintMaterials);
        frameVehicle(gltf.scene);
        gltf.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) mesh.castShadow = true;
        });
        pivot.add(gltf.scene);
        paintRef.current = (color) => {
          paintVehicle(pivot, color, paintMaterials);
          render();
        };
        paintRef.current(paintColor);
        setReady(true);
        render();
      },
      undefined,
      () => {
        if (!disposed && gate.isCurrent(request)) fail();
      },
    );
    const resize = () => {
      const width = Math.max(host.clientWidth, 280);
      const height = Math.max(host.clientHeight, 220);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const seen = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) render();
      },
      { threshold: 0.05 },
    );
    seen.observe(host);
    const onHide = () => {
      if (!document.hidden) render();
    };
    document.addEventListener('visibilitychange', onHide);
    const onTheme = () => {
      applyGarageTheme(sceneTheme(), garage, hemi, sun, fill, renderer);
      render();
    };
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const canvas = renderer.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      if (!disposed) fail();
    };
    canvas.addEventListener('webglcontextlost', lost);
    let pointerId: number | null = null;
    let mode: 'idle' | 'pending' | 'rotate' = 'idle';
    let originX = 0;
    let originY = 0;
    let lastX = 0;
    const endDrag = (event?: PointerEvent) => {
      if (event && canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      pointerId = null;
      mode = 'idle';
    };
    const down = (event: PointerEvent) => {
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      originX = lastX = event.clientX;
      originY = event.clientY;
      if (event.pointerType === 'touch') {
        mode = 'pending';
        return;
      }
      mode = 'rotate';
      canvas.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || mode === 'idle') return;
      if (mode === 'pending') {
        const dx = event.clientX - originX;
        const dy = event.clientY - originY;
        if (Math.hypot(dx, dy) < 10) return;
        if (Math.abs(dx) <= Math.abs(dy)) {
          endDrag(event);
          return;
        }
        mode = 'rotate';
        lastX = event.clientX;
        canvas.setPointerCapture?.(event.pointerId);
      }
      const delta = event.clientX - lastX;
      lastX = event.clientX;
      pivot.rotation.y += delta * 0.01;
      render();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      endDrag(event);
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', () => {
      pointerId = null;
      mode = 'idle';
    });
    return () => {
      disposed = true;
      gate.begin();
      observer.disconnect();
      seen.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      envMap.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [src, paintMaterials]);

  useEffect(() => {
    if (ready) paintRef.current(paintColor);
  }, [paintColor, ready]);

  return (
    <div className="vehicle-viewer">
      <div
        ref={hostRef}
        className="vehicle-canvas-host"
        tabIndex={0}
        aria-label={`${label || 'Vehicle model'}. Arrow keys rotate the vehicle. The garage stays still.`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            yawRef.current(-0.28);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            yawRef.current(0.28);
          }
        }}
      >
        {!ready ? <RoadLoader label="Loading vehicle model" /> : null}
      </div>
    </div>
  );
}
