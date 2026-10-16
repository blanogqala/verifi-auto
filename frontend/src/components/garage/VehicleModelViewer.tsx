import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

function buildGarage(theme: string) {
  const light = theme === 'light';
  const group = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: light ? '#d7d1e2' : '#221b2e', roughness: 0.95 }),
  );
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(16, 3.2, 0.08),
    new THREE.MeshStandardMaterial({ color: light ? '#ebe6f2' : '#16111f', roughness: 1 }),
  );
  wall.position.set(0, 1.56, -3.4);
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
  const pivotRef = useRef<THREE.Group | null>(null);
  const paintRef = useRef<(color: string) => void>(() => {});
  const yawRef = useRef<(delta: number) => void>(() => {});
  const zoomRef = useRef<(delta: number) => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const rotatingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);
  const [rotating, setRotating] = useState(false);
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
    setTouch(coarse);
    setReady(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      fail();
      return;
    }
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const scene = new THREE.Scene();
    const garage = buildGarage(theme);
    const pivot = new THREE.Group();
    pivot.rotation.y = homeYaw;
    pivotRef.current = pivot;
    scene.add(garage, pivot);
    scene.add(new THREE.HemisphereLight(theme === 'light' ? '#f7f4fb' : '#c9bddc', theme === 'light' ? '#b7ad9c' : '#2a2233', 1.15));
    const sun = new THREE.DirectionalLight('#fff4e8', theme === 'light' ? 1.45 : 1.2);
    sun.position.set(4.2, 7.2, 3.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 24;
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    let zoom = 1;
    const applyCamera = () => {
      camera.position.copy(lookTarget).add(baseOffset.clone().multiplyScalar(zoom));
      camera.lookAt(lookTarget);
    };
    applyCamera();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
    zoomRef.current = (delta) => {
      zoom = Math.min(1.7, Math.max(0.82, zoom + delta));
      applyCamera();
      render();
    };
    resetRef.current = () => {
      pivot.rotation.y = homeYaw;
      zoom = 1;
      applyCamera();
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
    const canvas = renderer.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      if (!disposed) fail();
    };
    canvas.addEventListener('webglcontextlost', lost);
    let dragging = false;
    let lastX = 0;
    const down = (event: PointerEvent) => {
      if (coarse && !rotatingRef.current) return;
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const delta = event.clientX - lastX;
      lastX = event.clientX;
      pivot.rotation.y += delta * 0.01;
      render();
    };
    const up = () => {
      dragging = false;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      disposed = true;
      gate.begin();
      observer.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      pivotRef.current = null;
    };
  }, [src, paintMaterials]);

  useEffect(() => {
    if (ready) paintRef.current(paintColor);
  }, [paintColor, ready]);

  useEffect(() => {
    rotatingRef.current = rotating;
  }, [rotating]);

  return (
    <div className="vehicle-viewer">
      <div
        ref={hostRef}
        className={'vehicle-canvas-host' + (rotating ? ' is-rotating' : '')}
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
      <div className="viewer-controls">
        {touch ? (
          <button type="button" className="secondary" aria-pressed={rotating} onClick={() => setRotating((current) => !current)}>
            {rotating ? 'Scroll the page' : 'Rotate the model'}
          </button>
        ) : null}
        <button type="button" className="secondary" onClick={() => yawRef.current(-0.35)}>
          Rotate left
        </button>
        <button type="button" className="secondary" onClick={() => yawRef.current(0.35)}>
          Rotate right
        </button>
        <button type="button" className="secondary" onClick={() => zoomRef.current(0.12)}>
          Zoom out
        </button>
        <button type="button" className="secondary" onClick={() => zoomRef.current(-0.12)}>
          Zoom in
        </button>
        <button type="button" className="secondary" onClick={() => resetRef.current()}>
          Reset view
        </button>
      </div>
      {touch && rotating ? <p className="muted">Drag to rotate the vehicle. Page scrolling pauses while this is on.</p> : null}
    </div>
  );
}
