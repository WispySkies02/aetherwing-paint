/* Victory Lane landed confetti — physical, body-attached paper pieces.
   Only generated for the three Victory Lane presets. No UV template edits.
   The actual paint texture remains unchanged. */
const CONFETTI_COUNTS = Object.freeze({
  victory: 420,
  'victory-night': 650,
  'victory-confetti': 1600
});
const COLORS = [0xf3f5f7, 0x2275cd, 0xe13638, 0xf5d54d, 0x36a96b, 0x141a28, 0xf1f2fc];

function seededRandom(text) {
  let state = 2166136261;
  for (const c of text) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** Returns a mesh attached by the caller to the paintable body mesh, or null. */
export function createLandedConfetti(THREE, body, preset, paintSlug = '') {
  const target = CONFETTI_COUNTS[preset];
  if (!target || !body?.isMesh || !body.geometry) return null;
  const positions = body.geometry.getAttribute('position');
  if (!positions || positions.count < 3) return null;
  const indices = body.geometry.getIndex();
  const triangleCount = Math.floor((indices?.count || positions.count) / 3);
  const bounds = body.geometry.boundingBox || (body.geometry.computeBoundingBox(), body.geometry.boundingBox);
  if (!bounds) return null;
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const minimumY = bounds.min.y + size.y * 0.12;
  const unit = Math.max(0.05, Math.min(0.24, Math.max(size.x, size.z) * 0.011));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3();
  const triangles = [];
  let weight = 0;

  // Only surface-facing body triangles; avoid underside, grille and lower skirt.
  // Area weighting keeps large bonnet/roof/decklid panels from being underrepresented.
  for (let i = 0; i < triangleCount; i++) {
    const v0 = indices ? indices.getX(i * 3) : i * 3;
    const v1 = indices ? indices.getX(i * 3 + 1) : i * 3 + 1;
    const v2 = indices ? indices.getX(i * 3 + 2) : i * 3 + 2;
    a.fromBufferAttribute(positions, v0);
    b.fromBufferAttribute(positions, v1);
    c.fromBufferAttribute(positions, v2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac);
    const crossLength = normal.length();
    if (crossLength < 1e-7) continue;
    normal.divideScalar(crossLength);
    const midY = (a.y + b.y + c.y) / 3;
    if (normal.y < 0.16 || midY < minimumY) continue;
    const area = crossLength * 0.5;
    const bias = normal.y * normal.y * (0.55 + 0.45 * Math.min(1, (midY - minimumY) / Math.max(0.001, size.y * 0.5)));
    weight += area * bias;
    triangles.push({ v0, v1, v2, weight });
  }
  if (weight === 0 || !triangles.length) return null;

  const rand = seededRandom(paintSlug + ':' + preset + ':aetherwing-v90');
  const count = typeof window !== 'undefined' && window.innerWidth < 720 ? Math.round(target * 0.62) : target;
  const verts = [], normals = [], colors = [];
  const paperColors = COLORS.map(value => new THREE.Color(value));
  const center = new THREE.Vector3(), right = new THREE.Vector3(), forward = new THREE.Vector3();
  const first = new THREE.Vector3(), second = new THREE.Vector3(), third = new THREE.Vector3();
  const sideA = new THREE.Vector3(), sideB = new THREE.Vector3();
  function addVertex(pos, norm, color) {
    verts.push(pos.x, pos.y, pos.z);
    normals.push(norm.x, norm.y, norm.z);
    colors.push(color.r, color.g, color.b);
  }
  // Reusable area-weighted sampling of the upward-facing vehicle body.
  // A few anchored showers create the natural piles visible in NASCAR Victory Lane.
  function sampleSurface() {
    const choice = rand() * weight;
    let low = 0, high = triangles.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (choice > triangles[mid].weight) low = mid + 1;
      else high = mid;
    }
    const tri = triangles[low];
    a.fromBufferAttribute(positions, tri.v0);
    b.fromBufferAttribute(positions, tri.v1);
    c.fromBufferAttribute(positions, tri.v2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac).normalize();
    const r1 = Math.sqrt(rand()), r2 = rand();
    center.copy(a).multiplyScalar(1 - r1).addScaledVector(b, r1 * (1 - r2)).addScaledVector(c, r1 * r2);
  }

  const isHeavy = preset === 'victory-confetti';
  const clusterShare = isHeavy ? 0.72 : preset === 'victory-night' ? 0.48 : 0.34;
  const clusterCount = isHeavy ? 9 : preset === 'victory-night' ? 6 : 4;
  const clusterRadius = Math.max(size.x, size.z) * (isHeavy ? 0.115 : 0.14);
  const clusterRadiusSquared = clusterRadius * clusterRadius;
  const clusters = [];
  for (let i = 0; i < clusterCount; i++) {
    sampleSurface();
    clusters.push(center.clone());
  }

  for (let n = 0; n < count; n++) {
    const clustered = rand() < clusterShare;
    if (clustered) {
      const anchor = clusters[Math.floor(rand() * clusters.length)];
      // Reject distant paper placements to form several local heaps, but
      // cap attempts to keep scene changes responsive on mobile devices.
      for (let attempt = 0; attempt < 14; attempt++) {
        sampleSurface();
        const dx = center.x - anchor.x, dz = center.z - anchor.z;
        const distanceSquared = dx * dx + dz * dz;
        if (rand() < Math.exp(-distanceSquared / (2 * clusterRadiusSquared))) break;
      }
    } else {
      sampleSurface();
    }
    // Slightly lift the clustered sheets so they visually overlap instead
    // of all lying at precisely the same surface depth.
    center.addScaledVector(normal, unit * (0.08 + (clustered ? rand() * 0.10 : 0)));
    right.copy(ab).normalize();
    forward.crossVectors(normal, right).normalize();
    const rotation = rand() * Math.PI * 2;
    // Most pieces are fine paper; retain some longer streamers for variety.
    const paperScale = rand() < 0.78 ? 0.67 + rand() * 0.40 : 1.02 + rand() * 0.28;
    const halfLength = unit * (0.4 + rand() * 0.9) * paperScale;
    const halfWidth = unit * (0.14 + rand() * 0.3) * paperScale;
    sideA.copy(right).multiplyScalar(Math.cos(rotation)).addScaledVector(forward, Math.sin(rotation)).multiplyScalar(halfLength);
    sideB.copy(right).multiplyScalar(-Math.sin(rotation)).addScaledVector(forward, Math.cos(rotation)).multiplyScalar(halfWidth);
    first.copy(center).sub(sideA).sub(sideB);
    second.copy(center).add(sideA).sub(sideB);
    third.copy(center).add(sideA).add(sideB);
    const fourth = center.clone().sub(sideA).add(sideB);
    const color = paperColors[Math.floor(rand() * paperColors.length)];
    for (const point of [first, second, third, first, third, fourth]) addVertex(point, normal, color);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const result = new THREE.Mesh(geometry, material);
  result.name = 'AetherwingVictoryLandedConfetti';
  result.frustumCulled = false;
  result.renderOrder = 2;
  return result;
}
