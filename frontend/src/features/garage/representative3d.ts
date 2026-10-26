import * as THREE from 'three';

/**
 * This is a rotatable general body-style preview, not a VW/Ford/etc scan.
 * The actual shape and trim must come from a licensed exact-model GLB.
 */
export function buildRepresentativeVehicle(bodyStyle: string) {
  const style = String(bodyStyle || '').toLowerCase();
  const suv = style === 'suv';
  const van = style === 'van';
  const estate = style === 'estate';
  const hatch = style === 'hatchback';
  const coupe = style === 'coupe' || style === 'concept coupe';
  const length = van ? 4.9 : suv ? 4.6 : estate ? 4.7 : hatch ? 4.05 : coupe ? 4.38 : 4.55;
  const width = van || suv ? 1.91 : 1.82;
  const high = van ? 2.03 : suv ? 1.82 : estate ? 1.62 : hatch ? 1.51 : coupe ? 1.36 : 1.5;
  const frontGlass = coupe ? 0.92 : suv ? 1.02 : van ? 1.55 : 1.11;
  const rearGlass = van || estate ? -1.88 : hatch ? -1.34 : -0.99;
  const roofFront = coupe ? 0.74 : van ? 1.38 : suv ? 0.94 : 0.62;
  const roofRear = van ? -1.83 : estate ? -1.51 : suv ? -1.04 : hatch ? -0.89 : -0.49;
  const wheelX = length * 0.355;
  const wheelRadius = suv || van ? 0.47 : 0.4;
  const bodyColor = new THREE.MeshStandardMaterial({
    name: 'body', color: '#8d8d9d', metalness: 0.54, roughness: 0.26,
  });
  bodyColor.userData = { bodyPaint: true, originalColor: bodyColor.color.clone() };
  const glass = new THREE.MeshStandardMaterial({
    color: '#132b42', metalness: 0.24, roughness: 0.16, transparent: true,
    opacity: 0.88, side: THREE.DoubleSide,
  });
  const black = new THREE.MeshStandardMaterial({ color: '#15151b', roughness: 0.85 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#161619', roughness: 0.94 });
  const rim = new THREE.MeshStandardMaterial({ color: '#c4c7d0', metalness: 0.8, roughness: 0.23 });
  const light = new THREE.MeshStandardMaterial({ color: '#f7f3d8', emissive: '#d5d1ac', emissiveIntensity: 0.25 });
  const red = new THREE.MeshStandardMaterial({ color: '#bd3444', emissive: '#53131a', emissiveIntensity: 0.2 });
  const group = new THREE.Group();
  // Side silhouette: bonnet, windscreen, cabin and boot form a continuous shell.
  const body = new THREE.Shape();
  body.moveTo(-length / 2, 0.55);
  body.lineTo(-length / 2, van ? 1.04 : 0.88);
  body.lineTo(rearGlass, high - 0.46);
  body.lineTo(roofRear, high);
  body.lineTo(roofFront, high);
  body.lineTo(frontGlass, high - 0.51);
  body.lineTo(length / 2, 0.87);
  body.lineTo(length / 2, 0.55);
  body.closePath();
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(body, {
    depth: width - 0.22, bevelEnabled: true, bevelSize: 0.085,
    bevelThickness: 0.065, bevelSegments: 2, curveSegments: 3,
  }), bodyColor);
  shell.position.z = -(width - 0.22) / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  // Four independent wheels, rims and wheel hubs — no flat 2D car silhouette.
  for (const x of [-wheelX, wheelX]) {
    for (const side of [-1, 1]) {
      const z = side * (width / 2 - 0.015);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.21, 30), rubber);
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(x, wheelRadius, z);
      tyre.castShadow = true;
      group.add(tyre);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.66, wheelRadius * 0.66, 0.229, 28), rim);
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(tyre.position);
      group.add(hub);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.23, wheelRadius * 0.23, 0.237, 20), black);
      center.rotation.x = Math.PI / 2;
      center.position.copy(tyre.position);
      group.add(center);
    }
  }

  // Glass on both cabin sides. Distinct rooflines for hatch, estate, SUV, van.
  const window = new THREE.Shape();
  window.moveTo(rearGlass + 0.10, high - 0.46);
  window.lineTo(roofRear + 0.15, high - 0.12);
  window.lineTo(roofFront - 0.12, high - 0.12);
  window.lineTo(frontGlass - 0.13, high - 0.5);
  window.closePath();
  for (const side of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.ShapeGeometry(window), glass);
    pane.position.z = side * (width / 2 - 0.01);
    pane.material.side = THREE.DoubleSide;
    group.add(pane);
    // Wing mirrors and side handles add visible perspective details.
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.095, 0.19), black);
    mirror.position.set(frontGlass - 0.16, high - 0.54, side * (width / 2 + 0.035));
    group.add(mirror);
    for (const x of [-0.6, 0.46]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.018), rim);
      handle.position.set(x, 1.02, side * (width / 2 + 0.044));
      group.add(handle);
    }
  }

  // Headlights, grille and rear lamps are part of the actual 3D scene.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, width * 0.5), black);
  grille.position.set(length / 2 + 0.072, 0.81, 0);
  group.add(grille);
  for (const side of [-1, 1]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.32), light);
    headlight.position.set(length / 2 + 0.075, 0.92, side * width * 0.31);
    group.add(headlight);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.061, 0.18, 0.28), red);
    lamp.position.set(-length / 2 - 0.078, 0.86, side * width * 0.34);
    group.add(lamp);
  }
  group.name = 'representative-body-style-3d';
  return group;
}
