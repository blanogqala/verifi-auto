import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoadLoader } from '../ui/RoadLoader';

const homeOffset = new THREE.Vector3(3.15, 1.42, 3.25);
const lookTarget = new THREE.Vector3(0, 0.46, 0);

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation?: [number, number, number],
  shadow = false,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildScene(theme: string) {
  const scene = new THREE.Scene();
  const light = theme === 'light';
  const body = new THREE.MeshStandardMaterial({ color: light ? '#c9c2d4' : '#b7adc6', roughness: 0.45, metalness: 0.08 });
  const cabin = new THREE.MeshStandardMaterial({ color: light ? '#2d2740' : '#1c1728', roughness: 0.35, metalness: 0.05 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#9fd0ea',
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.45,
  });
  const trim = new THREE.MeshStandardMaterial({ color: light ? '#6d587f' : '#8d78a4', roughness: 0.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#f6edd2', roughness: 0.3, emissive: '#f6edd2', emissiveIntensity: 0.25 });
  const floor = new THREE.MeshStandardMaterial({ color: light ? '#d9d3e4' : '#241c30', roughness: 1 });
  const wall = new THREE.MeshStandardMaterial({ color: light ? '#ece7f3' : '#171221', roughness: 1 });
  const tool = new THREE.MeshStandardMaterial({ color: '#7d5a45', roughness: 0.8 });

  const car = new THREE.Group();
  addMesh(car, new THREE.BoxGeometry(2.15, 0.42, 0.92), body, [0, 0.42, 0], undefined, true);
  addMesh(car, new THREE.BoxGeometry(1.05, 0.38, 0.82), cabin, [-0.05, 0.78, 0], undefined, true);
  addMesh(car, new THREE.BoxGeometry(0.72, 0.28, 0.74), glass, [-0.02, 0.8, 0]);
  addMesh(car, new THREE.BoxGeometry(0.55, 0.12, 0.9), body, [0.85, 0.48, 0], undefined, true);
  addMesh(car, new THREE.BoxGeometry(0.16, 0.1, 0.16), lamp, [1.08, 0.48, 0.28]);
  addMesh(car, new THREE.BoxGeometry(0.16, 0.1, 0.16), lamp, [1.08, 0.48, -0.28]);
  addMesh(car, new THREE.BoxGeometry(0.08, 0.08, 0.7), trim, [-1.08, 0.5, 0]);
  for (const x of [-0.68, 0.72]) {
    for (const z of [-0.42, 0.42]) {
      addMesh(car, new THREE.CylinderGeometry(0.2, 0.2, 0.16, 18), rubber, [x, 0.2, z], [Math.PI / 2, 0, 0], true);
      addMesh(car, new THREE.CylinderGeometry(0.09, 0.09, 0.18, 12), trim, [x, 0.2, z], [Math.PI / 2, 0, 0]);
    }
  }
  scene.add(car);

  const ground = addMesh(scene, new THREE.BoxGeometry(7.2, 0.08, 4.2), floor, [0, -0.04, 0]);
  ground.receiveShadow = true;
  ground.castShadow = false;
  addMesh(scene, new THREE.BoxGeometry(7.2, 1.6, 0.08), wall, [0, 0.76, -1.7]);
  addMesh(scene, new THREE.TorusGeometry(0.28, 0.08, 10, 18), rubber, [-1.85, 0.28, 1.15], [Math.PI / 2, 0, 0]);
  addMesh(scene, new THREE.TorusGeometry(0.28, 0.08, 10, 18), rubber, [-1.85, 0.46, 1.15], [Math.PI / 2, 0, 0.2]);
  addMesh(scene, new THREE.BoxGeometry(0.46, 0.22, 0.28), tool, [1.7, 0.14, 1.05]);

  scene.add(new THREE.HemisphereLight(light ? '#f4f1fb' : '#c4b6de', light ? '#b7ad9a' : '#2a2230', 1.35));
  const sun = new THREE.DirectionalLight('#fff6ea', light ? 1.35 : 1.15);
  sun.position.set(3.4, 5.2, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 14;
  sun.shadow.camera.left = -3;
  sun.shadow.camera.right = 3;
  sun.shadow.camera.top = 3;
  sun.shadow.camera.bottom = -3;
  scene.add(sun);
  return scene;
}

export default function VehicleModelViewer({
  onFail,
  label,
}: {
  onFail: () => void;
  label: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const yawRef = useRef<(delta: number) => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
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
    if (!host) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setTouch(coarse);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      fail();
      return;
    }
    let disposed = false;
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const scene = buildScene(theme);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    camera.position.copy(lookTarget).add(homeOffset);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(lookTarget);
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.enablePan = false;
    controls.minDistance = 2.45;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = 0.42;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.enabled = !coarse;
    controls.update();
    controlsRef.current = controls;
    let visible = true;
    const render = () => {
      if (disposed || document.hidden || !visible) return;
      renderer.render(scene, camera);
    };
    const place = (offset: THREE.Vector3) => {
      camera.position.copy(lookTarget).add(offset);
      camera.lookAt(lookTarget);
      controls.target.copy(lookTarget);
      controls.update();
      render();
    };
    yawRef.current = (delta: number) => {
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(lookTarget));
      spherical.theta += delta;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.42, Math.PI / 2.05);
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, 2.45, 6.2);
      const next = new THREE.Vector3().setFromSpherical(spherical);
      place(next);
    };
    resetRef.current = () => place(homeOffset.clone());
    const resize = () => {
      const width = Math.max(host.clientWidth, 280);
      const height = Math.max(host.clientHeight, 180);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };
    resize();
    controls.addEventListener('change', render);
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
    setReady(true);
    render();
    return () => {
      disposed = true;
      controls.removeEventListener('change', render);
      observer.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      canvas.removeEventListener('webglcontextlost', lost);
      controls.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = !touch || rotating;
  }, [touch, rotating, ready]);

  return (
    <div className="vehicle-viewer">
      <div
        ref={hostRef}
        className={'vehicle-canvas-host' + (rotating ? ' is-rotating' : '')}
        tabIndex={0}
        aria-label={`${label}. Arrow keys rotate the model.`}
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
          <button
            type="button"
            className="secondary"
            aria-pressed={rotating}
            onClick={() => setRotating((current) => !current)}
          >
            {rotating ? 'Scroll the page' : 'Rotate the model'}
          </button>
        ) : null}
        <button type="button" className="secondary" onClick={() => yawRef.current(-0.35)}>
          Rotate left
        </button>
        <button type="button" className="secondary" onClick={() => yawRef.current(0.35)}>
          Rotate right
        </button>
        <button type="button" className="secondary" onClick={() => resetRef.current()}>
          Reset view
        </button>
      </div>
      {touch && rotating ? (
        <p className="muted">Drag to look around. Vertical scrolling pauses while this is on.</p>
      ) : null}
    </div>
  );
}
