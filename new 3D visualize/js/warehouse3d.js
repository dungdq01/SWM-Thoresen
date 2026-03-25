/* ===================================================
   SWM TVL — 3D Warehouse Monitoring System v2.0
   Three.js r128 — Premium Immersive 3D Visualization
   MAJOR UPGRADE: Realistic interiors, collision-aware
   vehicle pathing, enhanced detail & effects
   =================================================== */

// ---- Global State ----
let w3d = null;

// ---- Warehouse Data (11 warehouses, real-scale) ----
const WH_DATA = [
  { code: 'WH5.1', name: 'Kho 5.1 (Bulk)', owner: 'TVL', area: 8000, width: 100, depth: 80, fill: 78, stock: 5230, zones: 6, type: 'Hàng rời (Bulk)', pos: [-180, 0, -120], color: 0x2563eb, items: [['Phân bón NPK', 2100, 'tấn'], ['Xi măng PCB40', 1800, 'tấn'], ['Clinker', 1330, 'tấn']], temp: 28, humid: 65 },
  { code: 'WH5.2', name: 'Kho 5.2 (Bagged)', owner: 'TVL', area: 9500, width: 110, depth: 86, fill: 65, stock: 6800, zones: 8, type: 'Hàng bao (Bagged)', pos: [-40, 0, -120], color: 0x7c3aed, items: [['Xi măng PCB40', 3200, 'tấn'], ['Phân DAP', 2100, 'tấn'], ['Phân Ure', 1500, 'tấn']], temp: 27, humid: 60 },
  { code: 'WH5.3', name: 'Kho 5.3 (Mixed)', owner: 'Partner A', area: 7200, width: 90, depth: 80, fill: 82, stock: 8200, zones: 5, type: 'Hàng hỗn hợp', pos: [100, 0, -120], color: 0x0891b2, items: [['Clinker OPC', 5200, 'tấn'], ['Xi măng PCB50', 2100, 'tấn'], ['Clinker MH', 900, 'tấn']], temp: 30, humid: 70 },
  { code: 'WH5.4', name: 'Kho 5.4 (Bulk)', owner: 'TVL', area: 8800, width: 100, depth: 88, fill: 45, stock: 3100, zones: 7, type: 'Hàng rời (Bulk)', pos: [-180, 0, 20], color: 0x059669, items: [['Phân Ure 46%', 1850, 'tấn'], ['Phân NPK', 900, 'tấn'], ['Phân DAP', 350, 'tấn']], temp: 29, humid: 63 },
  { code: 'WH5.5.1', name: 'Kho 5.5.1', owner: 'Partner B', area: 6500, width: 80, depth: 81, fill: 90, stock: 4800, zones: 4, type: 'Clinker', pos: [-40, 0, 20], color: 0xd97706, items: [['Clinker OPC', 3500, 'tấn'], ['Clinker PPC', 1300, 'tấn']], temp: 32, humid: 55 },
  { code: 'WH5.5.2', name: 'Kho 5.5.2', owner: 'Partner B', area: 6800, width: 85, depth: 80, fill: 55, stock: 3200, zones: 4, type: 'Clinker', pos: [80, 0, 20], color: 0xdc2626, items: [['Clinker SH', 2100, 'tấn'], ['Clinker HT', 1100, 'tấn']], temp: 31, humid: 57 },
  { code: 'WH5.6.1', name: 'Kho 5.6.1 (Cont)', owner: 'TVL', area: 7500, width: 90, depth: 83, fill: 70, stock: 4200, zones: 6, type: 'Container', pos: [-180, 0, 160], color: 0x0284c7, items: [['Container 20ft', 80, 'TEU'], ['Container 40ft', 45, 'TEU']], temp: 26, humid: 62 },
  { code: 'WH5.6.2', name: 'Kho 5.6.2 (Pallet)', owner: 'TVL', area: 7000, width: 88, depth: 80, fill: 38, stock: 1800, zones: 5, type: 'Pallet', pos: [-50, 0, 160], color: 0x16a34a, items: [['Pallet NPK', 800, 'tấn'], ['Pallet Xi măng', 600, 'tấn'], ['Pallet khác', 400, 'tấn']], temp: 27, humid: 64 },
  { code: 'WH5.7', name: 'Kho 5.7 (VAS)', owner: 'Partner A', area: 6200, width: 78, depth: 79, fill: 95, stock: 4950, zones: 3, type: 'VAS / Đóng bao', pos: [70, 0, 160], color: 0xea580c, items: [['Hàng đóng bao', 2800, 'tấn'], ['Hàng pha trộn', 1500, 'tấn'], ['Hàng chờ VAS', 650, 'tấn']], temp: 33, humid: 72 },
  { code: 'WH5.8', name: 'Kho 5.8 (Jumbo)', owner: 'TVL', area: 7500, width: 90, depth: 83, fill: 60, stock: 3600, zones: 5, type: 'Jumbo Bag', pos: [185, 0, 160], color: 0x7c3aed, items: [['Jumbo bag NPK', 2000, 'tấn'], ['Jumbo bag DAP', 1000, 'tấn'], ['Jumbo bag khác', 600, 'tấn']], temp: 28, humid: 66 },
  { code: 'WH5.9', name: 'Kho 5.9 (Temp)', owner: 'TVL', area: 6500, width: 80, depth: 81, fill: 72, stock: 3350, zones: 4, type: 'Hàng tạm', pos: [-40, 0, 290], color: 0x0891b2, items: [['Hàng tạm HK', 1800, 'tấn'], ['Hàng chờ xuất', 1200, 'tấn'], ['Hàng phân loại', 350, 'tấn']], temp: 29, humid: 68 },
];

// ---- Camera Presets ----
const CAM_PRESETS = {
  overview:   { pos: [0, 320, 380], target: [0, 0, 60] },
  topdown:    { pos: [0, 550, 1], target: [0, 0, 60] },
  flythrough: null,
  free:       null,
};

// ---- Collision / Obstacle Rectangles for road pathfinding ----
// Each warehouse is an AABB obstacle { minX, maxX, minZ, maxZ } with margin
function getWhObstacles() {
  const margin = 12; // clearance around each warehouse
  return WH_DATA.map(wh => ({
    minX: wh.pos[0] - wh.width / 2 - margin,
    maxX: wh.pos[0] + wh.width / 2 + margin,
    minZ: wh.pos[2] - wh.depth / 2 - margin,
    maxZ: wh.pos[2] + wh.depth / 2 + margin,
  }));
}

// ---- Road Network (waypoint graph — trucks follow ONLY these roads) ----
// We define a grid of road intersection nodes and edges between them.
// Trucks pick a route from start to destination using only road segments.
function buildRoadNetwork() {
  // Horizontal road Z positions (between warehouse rows)
  const hRoads = [-210, -50, 95, 230, 350];
  // Vertical road X positions (between warehouse columns)
  const vRoads = [-300, -240, -110, 20, 140, 240, 300];
  
  // Create intersection nodes
  const nodes = [];
  const nodeMap = {};
  hRoads.forEach(z => {
    vRoads.forEach(x => {
      const id = nodes.length;
      nodeMap[`${x},${z}`] = id;
      nodes.push({ id, x, z });
    });
  });
  
  // Build edges (horizontal connections along each road)
  const edges = [];
  hRoads.forEach(z => {
    for (let i = 0; i < vRoads.length - 1; i++) {
      const a = nodeMap[`${vRoads[i]},${z}`];
      const b = nodeMap[`${vRoads[i + 1]},${z}`];
      if (a !== undefined && b !== undefined) {
        const dx = vRoads[i + 1] - vRoads[i];
        edges.push({ a, b, cost: Math.abs(dx) });
      }
    }
  });
  // Vertical connections
  vRoads.forEach(x => {
    for (let i = 0; i < hRoads.length - 1; i++) {
      const a = nodeMap[`${x},${hRoads[i]}`];
      const b = nodeMap[`${x},${hRoads[i + 1]}`];
      if (a !== undefined && b !== undefined) {
        const dz = hRoads[i + 1] - hRoads[i];
        edges.push({ a, b, cost: Math.abs(dz) });
      }
    }
  });
  
  return { nodes, edges, nodeMap, hRoads, vRoads };
}

// Simple Dijkstra for shortest path on the road graph
function dijkstra(nodes, edges, startId, endId) {
  const dist = new Array(nodes.length).fill(Infinity);
  const prev = new Array(nodes.length).fill(-1);
  const visited = new Array(nodes.length).fill(false);
  dist[startId] = 0;
  
  // Build adjacency list
  const adj = nodes.map(() => []);
  edges.forEach(e => {
    adj[e.a].push({ to: e.b, cost: e.cost });
    adj[e.b].push({ to: e.a, cost: e.cost });
  });
  
  for (let iter = 0; iter < nodes.length; iter++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;
    visited[u] = true;
    adj[u].forEach(({ to, cost }) => {
      if (dist[u] + cost < dist[to]) {
        dist[to] = dist[u] + cost;
        prev[to] = u;
      }
    });
  }
  
  // Reconstruct path
  const path = [];
  for (let at = endId; at !== -1; at = prev[at]) path.push(at);
  path.reverse();
  return path[0] === startId ? path : [];
}

// Find nearest road node to a given position
function nearestNode(nodes, x, z) {
  let best = 0, bestDist = Infinity;
  nodes.forEach((n, i) => {
    const d = Math.abs(n.x - x) + Math.abs(n.z - z);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

// ---- Initialize 3D Scene ----
function initWarehouse3D() {
  // Hide loading
  setTimeout(() => {
    const loading = document.getElementById('w3d-loading');
    if (loading) loading.style.display = 'none';
  }, 2500);

  const canvas = document.getElementById('warehouse-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    console.error('Three.js or canvas not available');
    return;
  }

  // ---- THREE.JS SETUP ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1628);
  scene.fog = new THREE.FogExp2(0x0a1628, 0.0012);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;

  const camera = new THREE.PerspectiveCamera(55, canvas.parentElement.clientWidth / canvas.parentElement.clientHeight, 1, 6000);
  camera.position.set(0, 320, 380);
  camera.lookAt(0, 0, 60);

  // ---- LIGHTING ----
  const ambientLight = new THREE.AmbientLight(0x4a5a7a, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff8e8, 2.5);
  sunLight.position.set(250, 500, 200);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 1500;
  sunLight.shadow.camera.left = -500;
  sunLight.shadow.camera.right = 500;
  sunLight.shadow.camera.top = 500;
  sunLight.shadow.camera.bottom = -500;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.bias = -0.0002;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x7799cc, 0x223322, 0.6);
  scene.add(hemiLight);

  // Fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0x6688aa, 0.5);
  fillLight.position.set(-200, 200, -150);
  scene.add(fillLight);

  // ---- GROUND ----
  const groundGeo = new THREE.PlaneGeometry(1400, 1000);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0c1520, roughness: 0.92, metalness: 0.05 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Sub-ground (wider, darker)
  const subGround = new THREE.Mesh(new THREE.PlaneGeometry(3000, 2000), new THREE.MeshStandardMaterial({ color: 0x060a12 }));
  subGround.rotation.x = -Math.PI / 2;
  subGround.position.y = -0.5;
  scene.add(subGround);

  const gridHelper = new THREE.GridHelper(1400, 56, 0x1a2a40, 0x0d1825);
  gridHelper.position.y = 0.05;
  scene.add(gridHelper);

  // ---- ROAD NETWORK ----
  const roadNet = buildRoadNetwork();
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x151f2e, roughness: 0.85 });
  const roadMarkMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.25 });
  const roadWidth = 18;

  // Draw horizontal roads
  roadNet.hRoads.forEach(z => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(700, roadWidth), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.1, z);
    road.receiveShadow = true;
    scene.add(road);
    // Center dashed line
    for (let x = -340; x <= 340; x += 30) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.5), roadMarkMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, 0.15, z);
      scene.add(mark);
    }
    // Edge lines (solid white)
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, emissive: 0x4a5568, emissiveIntensity: 0.1 });
    [-roadWidth / 2, roadWidth / 2].forEach(dz => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(700, 0.8), edgeMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.16, z + dz);
      scene.add(line);
    });
  });

  // Draw vertical roads
  roadNet.vRoads.forEach(x => {
    const maxZ = Math.max(...roadNet.hRoads);
    const minZ = Math.min(...roadNet.hRoads);
    const len = maxZ - minZ;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, len), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.1, (maxZ + minZ) / 2);
    road.receiveShadow = true;
    scene.add(road);
    // Dashed center
    for (let z = minZ; z <= maxZ; z += 30) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 14), roadMarkMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, 0.15, z);
      scene.add(mark);
    }
  });

  // ---- GATE AREA ----
  function createGate(x, z, label, rot) {
    const gateGroup = new THREE.Group();
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.8, roughness: 0.25 });
    [-20, 20].forEach(dx => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(3, 24, 3), gateMat);
      pillar.position.set(dx, 12, 0);
      pillar.castShadow = true;
      gateGroup.add(pillar);
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(40, 2.5, 2.5), gateMat);
    bar.position.set(0, 24, 0);
    gateGroup.add(bar);
    // Gate sign
    const signMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.6 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(24, 7), signMat);
    sign.position.set(0, 20, 1.5);
    gateGroup.add(sign);
    // Barrier arm
    const armMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 0.6), armMat);
    arm.position.set(8, 14, 0);
    gateGroup.add(arm);
    // Lights
    const lightGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const greenLight = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 3 }));
    greenLight.position.set(-20, 26, 0);
    gateGroup.add(greenLight);
    const ptLight = new THREE.PointLight(0x10b981, 2, 40);
    ptLight.position.set(-20, 26, 0);
    gateGroup.add(ptLight);

    gateGroup.position.set(x, 0, z);
    if (rot) gateGroup.rotation.y = rot;
    scene.add(gateGroup);
  }
  createGate(-340, -50, 'CỔNG VÀO', 0);
  createGate(340, -50, 'CỔNG RA', Math.PI);

  // ---- WEIGHBRIDGE STATIONS ----
  function createWeighbridge(x, z) {
    const wbGroup = new THREE.Group();
    // Platform with markings
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1.0, 10),
      new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 })
    );
    platform.position.y = 0.5;
    platform.castShadow = true;
    wbGroup.add(platform);
    // Yellow safety stripes on edges
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.2 });
    [[-11, 0], [11, 0]].forEach(([sx, sz]) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 10), stripeMat);
      stripe.position.set(sx, 0.6, sz);
      wbGroup.add(stripe);
    });
    // Control booth with windows
    const boothMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.5, roughness: 0.3 });
    const booth = new THREE.Mesh(new THREE.BoxGeometry(7, 10, 7), boothMat);
    booth.position.set(16, 5, 0);
    booth.castShadow = true;
    wbGroup.add(booth);
    // Window
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.4, transparent: true, opacity: 0.6 });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), windowMat);
    win.position.set(16, 7, 3.6);
    wbGroup.add(win);
    // Status light
    const statusGeo = new THREE.SphereGeometry(1.0, 10, 10);
    const statusMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 3 });
    const statusLight = new THREE.Mesh(statusGeo, statusMat);
    statusLight.position.set(16, 11, 0);
    wbGroup.add(statusLight);
    const ptLight = new THREE.PointLight(0x10b981, 2, 35);
    ptLight.position.set(16, 11, 0);
    wbGroup.add(ptLight);
    // Digital display
    const display = new THREE.Mesh(new THREE.PlaneGeometry(5, 2), new THREE.MeshStandardMaterial({ color: 0x0f0f0f, emissive: 0x10b981, emissiveIntensity: 0.5 }));
    display.position.set(16, 8.5, -3.6);
    display.rotation.y = Math.PI;
    wbGroup.add(display);

    wbGroup.position.set(x, 0, z);
    scene.add(wbGroup);
  }
  createWeighbridge(-280, -50);
  createWeighbridge(-280, -80);

  // ---- TRUCK PARKING ----
  const parkingGroup = new THREE.Group();
  const parkingFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 120),
    new THREE.MeshStandardMaterial({ color: 0x0f1a28, roughness: 0.88 })
  );
  parkingFloor.rotation.x = -Math.PI / 2;
  parkingFloor.position.y = 0.08;
  parkingGroup.add(parkingFloor);
  // Parking lines & numbers
  const parkLineMat = new THREE.MeshStandardMaterial({ color: 0x4a5568 });
  for (let i = 0; i < 8; i++) {
    const z = -50 + i * 15;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(70, 0.6), parkLineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.12, z);
    parkingGroup.add(line);
  }
  parkingGroup.position.set(-380, 0, -50);
  scene.add(parkingGroup);

  // ---- WAREHOUSES ----
  const whMeshes = [];
  const whLabels = [];
  const whGroup = new THREE.Group();

  WH_DATA.forEach((wh, idx) => {
    const group = new THREE.Group();
    const [px, py, pz] = wh.pos;
    group.position.set(px, py, pz);
    group.userData = { whIndex: idx, whData: wh };

    const wallHeight = 22;
    const wallThick = 1.5;
    const doorWidth = 16;
    const doorHeight = 15;
    const baseDarker = new THREE.Color(wh.color).offsetHSL(0, -0.05, -0.15);
    const wallMat = new THREE.MeshStandardMaterial({ color: baseDarker, roughness: 0.7, metalness: 0.2 });
    const wallTopMat = new THREE.MeshStandardMaterial({ color: wh.color, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.55 });

    // === INVISIBLE HIT-BOX for raycasting ===
    const bodyGeo = new THREE.BoxGeometry(wh.width, wallHeight, wh.depth);
    const bodyHitMat = new THREE.MeshBasicMaterial({ visible: false });
    const body = new THREE.Mesh(bodyGeo, bodyHitMat);
    body.position.y = wallHeight / 2;
    body.userData = { whIndex: idx, whData: wh, isBody: true };
    group.add(body);

    // === 4 WALLS with door openings (front & back) ===
    // Side walls with window cutouts (solid for simplicity, window panels overlaid)
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, wh.depth), wallMat);
    leftWall.position.set(-wh.width / 2, wallHeight / 2, 0);
    leftWall.castShadow = true; leftWall.receiveShadow = true;
    group.add(leftWall);
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, wh.depth), wallMat);
    rightWall.position.set(wh.width / 2, wallHeight / 2, 0);
    rightWall.castShadow = true; rightWall.receiveShadow = true;
    group.add(rightWall);

    // Front & Back walls with 2 door openings each
    const doorCenterL = -wh.width * 0.26;
    const doorCenterR = wh.width * 0.26;
    [wh.depth / 2, -wh.depth / 2].forEach((faceZ, faceIdx) => {
      const segments = [
        { from: -wh.width / 2, to: doorCenterL - doorWidth / 2 },
        { from: doorCenterL + doorWidth / 2, to: doorCenterR - doorWidth / 2 },
        { from: doorCenterR + doorWidth / 2, to: wh.width / 2 },
      ];
      segments.forEach(seg => {
        const segW = seg.to - seg.from;
        if (segW > 1) {
          const fw = new THREE.Mesh(new THREE.BoxGeometry(segW, wallHeight, wallThick), wallMat);
          fw.position.set((seg.from + seg.to) / 2, wallHeight / 2, faceZ);
          fw.castShadow = true; fw.receiveShadow = true;
          group.add(fw);
        }
      });
      // Door lintels
      [doorCenterL, doorCenterR].forEach(cx => {
        const lintelH = wallHeight - doorHeight;
        if (lintelH > 0) {
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, wallThick), wallMat);
          lintel.position.set(cx, doorHeight + lintelH / 2, faceZ);
          group.add(lintel);
        }
      });
    });

    // === WINDOWS (translucent panels on side walls) ===
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x38bdf8, emissiveIntensity: 0.15, transparent: true, opacity: 0.35 });
    const windowCount = Math.floor(wh.depth / 20);
    for (let wi = 0; wi < windowCount; wi++) {
      const wz = -wh.depth / 2 + 15 + wi * (wh.depth - 20) / Math.max(1, windowCount - 1);
      [-wh.width / 2 - 0.1, wh.width / 2 + 0.1].forEach(wx => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), windowMat);
        win.position.set(wx, wallHeight - 6, wz);
        win.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(win);
      });
    }

    // === UPPER TRANSPARENT BAND ===
    const bandH = 5;
    [
      { w: wh.width + 0.5, d: 0.4, px: 0, pz: -wh.depth / 2 },
      { w: wh.width + 0.5, d: 0.4, px: 0, pz: wh.depth / 2 },
      { w: 0.4, d: wh.depth + 0.5, px: -wh.width / 2, pz: 0 },
      { w: 0.4, d: wh.depth + 0.5, px: wh.width / 2, pz: 0 },
    ].forEach(b => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(b.w, bandH, b.d), wallTopMat);
      band.position.set(b.px, wallHeight + 0.5, b.pz);
      group.add(band);
    });

    // === ROOF — Gable/Ridge using ExtrudeGeometry ===
    const roofOverhang = 5;
    const roofPeak = 10;
    const rW = wh.width / 2 + roofOverhang;
    const rD = wh.depth / 2 + roofOverhang;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-rW, 0);
    roofShape.lineTo(0, roofPeak);
    roofShape.lineTo(rW, 0);
    roofShape.lineTo(-rW, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: rD * 2, bevelEnabled: false });
    const roofColor = new THREE.Color(wh.color).offsetHSL(0, -0.1, -0.22);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.65, metalness: 0.2, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, wallHeight, rD);
    roof.castShadow = true;
    group.add(roof);

    // === GUTTERS (roof edge trim) ===
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.3 });
    [-rD, rD].forEach(gz => {
      const gutter = new THREE.Mesh(new THREE.BoxGeometry(rW * 2, 0.6, 1), gutterMat);
      gutter.position.set(0, wallHeight + 0.3, gz);
      group.add(gutter);
    });

    // === CONCRETE FLOOR ===
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.88 });
    const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(wh.width - 2, wh.depth - 2), floorMat);
    floor2.rotation.x = -Math.PI / 2;
    floor2.position.y = 0.06;
    floor2.receiveShadow = true;
    group.add(floor2);

    // === INTERIOR STEEL COLUMNS (I-beam style) ===
    const colMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.85, roughness: 0.25 });
    const colRows = Math.max(2, Math.floor(wh.depth / 22));
    const colCols = 3; // 3 columns across
    const colSpacingZ = (wh.depth - 10) / colRows;
    const colPositionsX = [-wh.width * 0.33, 0, wh.width * 0.33];
    for (let cr = 0; cr < colRows; cr++) {
      const cz = -wh.depth / 2 + 5 + cr * colSpacingZ + colSpacingZ / 2;
      colPositionsX.forEach((cx, ci) => {
        // Vertical column
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.0, wallHeight + roofPeak * 0.5, 1.0), colMat);
        col.position.set(cx, (wallHeight + roofPeak * 0.3) / 2, cz);
        col.castShadow = true;
        group.add(col);
        // Cross beam at top
        if (ci < colPositionsX.length - 1) {
          const nextX = colPositionsX[ci + 1];
          const beamLen = nextX - cx;
          const beam = new THREE.Mesh(new THREE.BoxGeometry(beamLen, 0.6, 0.6), colMat);
          beam.position.set(cx + beamLen / 2, wallHeight - 0.5, cz);
          group.add(beam);
        }
        // Diagonal bracing (small)
        if (cr < colRows - 1) {
          const braceLen = colSpacingZ * 0.5;
          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, braceLen), colMat);
          brace.position.set(cx, wallHeight - 2, cz + braceLen / 2);
          group.add(brace);
        }
      });
    }

    // === HANGING INDUSTRIAL LIGHTS ===
    const lightBodyMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9, roughness: 0.2 });
    const lightGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff8d0, emissive: 0xfff8d0, emissiveIntensity: 1.8 });
    for (let lz = -wh.depth / 2 + 12; lz < wh.depth / 2 - 8; lz += 18) {
      [-wh.width * 0.2, wh.width * 0.2].forEach(lx => {
        // Fixture housing
        const housing = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 1.5), lightBodyMat);
        housing.position.set(lx, wallHeight - 2.5, lz);
        group.add(housing);
        // Reflector cone
        const reflector = new THREE.Mesh(new THREE.ConeGeometry(2, 1.5, 8), lightBodyMat);
        reflector.position.set(lx, wallHeight - 3.5, lz);
        reflector.rotation.x = Math.PI;
        group.add(reflector);
        // Glowing tube
        const tube = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.4), lightGlowMat);
        tube.position.set(lx, wallHeight - 3, lz);
        group.add(tube);
        // Wire
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4), colMat);
        wire.position.set(lx, wallHeight - 1.2, lz);
        group.add(wire);
      });
    }

    // === ZONE VISUALIZATION with realistic inventory ===
    const zoneColors = [0x1e40af, 0x047857, 0x92400e, 0x6d28d9, 0x0e7490, 0x9f1239, 0x166534, 0x7e22ce];
    const zonesPerRow = Math.ceil(Math.sqrt(wh.zones));
    const zonesRows = Math.ceil(wh.zones / zonesPerRow);
    const usableW = wh.width - 10;
    const usableD = wh.depth - 10;
    const zoneW = usableW / zonesPerRow;
    const zoneD = usableD / zonesRows;

    for (let z = 0; z < wh.zones; z++) {
      const col = z % zonesPerRow;
      const row = Math.floor(z / zonesPerRow);
      const zoneCX = -usableW / 2 + zoneW * col + zoneW / 2;
      const zoneCZ = -usableD / 2 + zoneD * row + zoneD / 2;
      const fillPct = Math.max(0.15, Math.min(1, (wh.fill / 100) * (0.65 + Math.random() * 0.55)));
      const zoneColor = zoneColors[z % zoneColors.length];

      // Zone floor marking (colored area)
      const zMarkMat = new THREE.MeshStandardMaterial({ color: zoneColor, transparent: true, opacity: 0.2, emissive: zoneColor, emissiveIntensity: 0.06 });
      const zoneMark = new THREE.Mesh(new THREE.PlaneGeometry(zoneW - 3, zoneD - 3), zMarkMat);
      zoneMark.rotation.x = -Math.PI / 2;
      zoneMark.position.set(zoneCX, 0.1, zoneCZ);
      group.add(zoneMark);

      // Zone border tape on floor
      const tapeColor = new THREE.Color(zoneColor);
      const tapeMat = new THREE.MeshStandardMaterial({ color: tapeColor, emissive: tapeColor, emissiveIntensity: 0.4 });
      // Four sides
      const hw = (zoneW - 3) / 2, hd = (zoneD - 3) / 2;
      [
        [0, -hd, hw * 2, 0.5], [0, hd, hw * 2, 0.5],
        [-hw, 0, 0.5, hd * 2], [hw, 0, 0.5, hd * 2]
      ].forEach(([tx, tz, tw, td]) => {
        const tape = new THREE.Mesh(new THREE.PlaneGeometry(tw, td), tapeMat);
        tape.rotation.x = -Math.PI / 2;
        tape.position.set(zoneCX + tx, 0.12, zoneCZ + tz);
        group.add(tape);
      });

      // Zone label on floor
      // (Skip canvas label for performance — use zone tape color as identifier)

      // === INVENTORY STACKS (realistic, type-specific, height ∝ fill%) ===
      const stackMaxH = fillPct * 16;
      const stackCount = Math.max(2, Math.floor(1 + fillPct * 6));
      const innerMargin = 3;

      for (let s = 0; s < stackCount; s++) {
        const sW = 3 + Math.random() * 5;
        const sD = 3 + Math.random() * 5;
        const sx = zoneCX - zoneW / 2 + innerMargin + Math.random() * (zoneW - sW - innerMargin * 2);
        const sz = zoneCZ - zoneD / 2 + innerMargin + Math.random() * (zoneD - sD - innerMargin * 2);
        const sH = stackMaxH * (0.4 + Math.random() * 0.6);

        if (wh.type.includes('Bulk') || wh.type.includes('rời') || wh.type.includes('Clinker') || wh.type.includes('hỗn hợp')) {
          // Large piles — irregular cone shapes
          const topR = sW * (0.15 + Math.random() * 0.25);
          const botR = sW * (0.6 + Math.random() * 0.15);
          const pileGeo = new THREE.CylinderGeometry(topR, botR, sH, 10 + Math.floor(Math.random() * 4));
          const pileColors = [0x8b6914, 0x6b5a2e, 0x7a6633, 0x5c4b28, 0x9e8542, 0x736028];
          const pileMat = new THREE.MeshStandardMaterial({ color: pileColors[Math.floor(Math.random() * pileColors.length)], roughness: 0.95, metalness: 0 });
          const pile = new THREE.Mesh(pileGeo, pileMat);
          pile.position.set(sx, sH / 2, sz);
          pile.castShadow = true; pile.receiveShadow = true;
          group.add(pile);
          // Add small scattered debris around pile base
          for (let d = 0; d < 3; d++) {
            const debris = new THREE.Mesh(
              new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 6, 4),
              pileMat
            );
            debris.position.set(sx + (Math.random() - 0.5) * botR * 2.5, 0.2, sz + (Math.random() - 0.5) * botR * 2.5);
            group.add(debris);
          }

        } else if (wh.type.includes('Container')) {
          // Stacked shipping containers
          const containerColors = [0x2563eb, 0xdc2626, 0xd97706, 0x059669, 0x7c3aed, 0x0369a1, 0x9333ea, 0x0f766e];
          const levels = 1 + Math.floor(Math.random() * 3);
          for (let lv = 0; lv < levels; lv++) {
            const contW = sW * 1.6 + Math.random() * 2;
            const contD = sD * 2.2;
            const contH = 3.2;
            const contColor = containerColors[Math.floor(Math.random() * containerColors.length)];
            const contMat = new THREE.MeshStandardMaterial({ color: contColor, roughness: 0.45, metalness: 0.75 });
            const cont = new THREE.Mesh(new THREE.BoxGeometry(contW, contH, contD), contMat);
            cont.position.set(sx, contH / 2 + lv * (contH + 0.2), sz);
            cont.castShadow = true; cont.receiveShadow = true;
            group.add(cont);
            // Container corrugation ridges
            for (let r = 0; r < 3; r++) {
              const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(contW + 0.3, 0.15, 0.3),
                new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 })
              );
              ridge.position.set(sx, lv * (contH + 0.2) + 1 + r * 1.2, sz - contD / 2);
              group.add(ridge);
            }
            // Container door handles (front face)
            [-0.5, 0.5].forEach(dh => {
              const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6),
                new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9 })
              );
              handle.position.set(sx + dh * contW * 0.3, contH / 2 + lv * (contH + 0.2), sz + contD / 2 + 0.1);
              group.add(handle);
            });
          }
          continue;

        } else if (wh.type.includes('Pallet')) {
          // Palletized goods — wooden pallet base + stacked boxes
          const palletW = sW + 1;
          const palletD = sD + 1;
          // Pallet base
          const palletBase = new THREE.Mesh(
            new THREE.BoxGeometry(palletW, 0.4, palletD),
            new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.92 })
          );
          palletBase.position.set(sx, 0.2, sz);
          palletBase.castShadow = true;
          group.add(palletBase);
          // Pallet slats
          for (let ps = 0; ps < 3; ps++) {
            const slat = new THREE.Mesh(
              new THREE.BoxGeometry(palletW, 0.08, 0.6),
              new THREE.MeshStandardMaterial({ color: 0x6d4c2e, roughness: 0.9 })
            );
            slat.position.set(sx, 0.04, sz - palletD / 2 + 0.5 + ps * (palletD - 1) / 2);
            group.add(slat);
          }
          // Stacked boxes on pallet
          const layers = 1 + Math.floor(fillPct * 3);
          for (let ly = 0; ly < layers; ly++) {
            const boxMat = new THREE.MeshStandardMaterial({
              color: ly % 2 === 0 ? 0xc4b896 : 0xb8a87a,
              roughness: 0.82
            });
            const box = new THREE.Mesh(new THREE.BoxGeometry(sW * 0.95, 2.5, sD * 0.95), boxMat);
            box.position.set(sx, 0.4 + 1.25 + ly * 2.6, sz);
            box.castShadow = true; box.receiveShadow = true;
            group.add(box);
          }
          // Shrink wrap effect (transparent shell around top)
          if (layers > 1) {
            const wrap = new THREE.Mesh(
              new THREE.BoxGeometry(sW + 0.3, layers * 2.6, sD + 0.3),
              new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 })
            );
            wrap.position.set(sx, 0.4 + layers * 1.3, sz);
            group.add(wrap);
          }
          continue;

        } else if (wh.type.includes('Jumbo')) {
          // Jumbo bags — large cylindrical bags
          const bagR = sW * 0.4 + Math.random() * 0.15;
          const bagH = sH * 0.85;
          const bagGeo = new THREE.CylinderGeometry(bagR * 0.85, bagR, bagH, 12);
          const bagMat = new THREE.MeshStandardMaterial({ color: 0xe8dfc5, roughness: 0.8, metalness: 0.05 });
          const bag = new THREE.Mesh(bagGeo, bagMat);
          bag.position.set(sx, bagH / 2, sz);
          bag.castShadow = true; bag.receiveShadow = true;
          group.add(bag);
          // Bag top tie
          const tie = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, bagR * 0.3, 1.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.9 })
          );
          tie.position.set(sx, bagH + 0.75, sz);
          group.add(tie);
          // Lifting loops (4 corners)
          for (let l = 0; l < 4; l++) {
            const angle = l * Math.PI / 2;
            const loop = new THREE.Mesh(
              new THREE.TorusGeometry(0.4, 0.08, 6, 8),
              new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7 })
            );
            loop.position.set(sx + Math.cos(angle) * bagR * 0.7, bagH + 0.5, sz + Math.sin(angle) * bagR * 0.7);
            loop.rotation.x = Math.PI / 2;
            group.add(loop);
          }

        } else if (wh.type.includes('VAS') || wh.type.includes('đóng bao')) {
          // Neatly stacked bags in rows
          const layers = 2 + Math.floor(Math.random() * 4);
          const bagsPerLayer = 2 + Math.floor(Math.random() * 2);
          for (let ly = 0; ly < layers; ly++) {
            for (let bi = 0; bi < bagsPerLayer; bi++) {
              const bx = sx + (bi - (bagsPerLayer - 1) / 2) * (sW * 0.9 / bagsPerLayer);
              const bag = new THREE.Mesh(
                new THREE.BoxGeometry(sW * 0.8 / bagsPerLayer, 1.2, sD * 0.85),
                new THREE.MeshStandardMaterial({
                  color: (ly + bi) % 3 === 0 ? 0xd4c5a0 : (ly + bi) % 3 === 1 ? 0xc9ba90 : 0xbfb080,
                  roughness: 0.85
                })
              );
              bag.position.set(bx, 0.6 + ly * 1.3, sz);
              // Slight rotation offset for realism
              bag.rotation.y = ly % 2 === 0 ? 0 : 0.02;
              bag.castShadow = true; bag.receiveShadow = true;
              group.add(bag);
            }
          }
          continue;

        } else {
          // Default: generic boxes
          const boxGeo = new THREE.BoxGeometry(sW, sH, sD);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a0, roughness: 0.85 });
          const box = new THREE.Mesh(boxGeo, boxMat);
          box.position.set(sx, sH / 2, sz);
          box.castShadow = true; box.receiveShadow = true;
          group.add(box);
        }
      }
    }

    // === SHELVING RACKS (for Container/Pallet/VAS warehouses) ===
    if (wh.type.includes('Pallet') || wh.type.includes('Container') || wh.type.includes('VAS')) {
      const rackMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.7, roughness: 0.4 });
      const rackCount = Math.floor(wh.width / 30);
      for (let ri = 0; ri < rackCount; ri++) {
        const rx = -wh.width / 2 + 15 + ri * (wh.width - 20) / Math.max(1, rackCount - 1);
        // Rack uprights
        for (let rz = -wh.depth / 2 + 8; rz < wh.depth / 2 - 8; rz += wh.depth / 4) {
          const upright = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 0.6), rackMat);
          upright.position.set(rx, 7, rz);
          upright.castShadow = true;
          group.add(upright);
          // Horizontal rack beams
          [4, 8, 12].forEach(bh => {
            const rackBeam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, wh.depth / 5), rackMat);
            rackBeam.position.set(rx, bh, rz);
            group.add(rackBeam);
          });
        }
      }
    }

    // === DOOR FRAMES (steel) on front and back face ===
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.85, roughness: 0.25 });
    [wh.depth / 2, -wh.depth / 2].forEach((faceZ, faceIdx) => {
      const offset = faceIdx === 0 ? 1.0 : -1.0;
      [doorCenterL, doorCenterR].forEach(cx => {
        // Side posts
        [-doorWidth / 2 - 0.5, doorWidth / 2 + 0.5].forEach(dx => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(1, doorHeight + 1, 1.8), doorFrameMat);
          post.position.set(cx + dx, (doorHeight + 1) / 2, faceZ + offset);
          post.castShadow = true;
          group.add(post);
        });
        // Top beam
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 2.5, 1.2, 1.8), doorFrameMat);
        topBeam.position.set(cx, doorHeight + 0.6, faceZ + offset);
        group.add(topBeam);
        // Status light sphere
        const doorStatusColor = wh.fill >= 90 ? 0xef4444 : wh.fill >= 70 ? 0xf59e0b : 0x10b981;
        const statusLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 8, 8),
          new THREE.MeshStandardMaterial({ color: doorStatusColor, emissive: doorStatusColor, emissiveIntensity: 2.5 })
        );
        statusLight.position.set(cx, doorHeight + 2.5, faceZ + offset);
        group.add(statusLight);
        // Concrete ramp/apron
        const ramp = new THREE.Mesh(
          new THREE.BoxGeometry(doorWidth + 3, 0.4, 5),
          new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8, metalness: 0.2 })
        );
        ramp.position.set(cx, 0.2, faceZ + offset * 3);
        ramp.receiveShadow = true;
        group.add(ramp);
        // Safety bollards at each door side
        [-doorWidth / 2 - 2, doorWidth / 2 + 2].forEach(bx => {
          const bollard = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.5, 2.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.15 })
          );
          bollard.position.set(cx + bx, 1.25, faceZ + offset * 2.5);
          bollard.castShadow = true;
          group.add(bollard);
        });
      });
    });

    // === INTERIOR LIGHTS (PointLights) ===
    const intLight1 = new THREE.PointLight(0xfff8d0, 1.0, wh.width * 0.8);
    intLight1.position.set(-wh.width * 0.2, wallHeight - 4, 0);
    group.add(intLight1);
    const intLight2 = new THREE.PointLight(0xfff8d0, 1.0, wh.width * 0.8);
    intLight2.position.set(wh.width * 0.2, wallHeight - 4, 0);
    group.add(intLight2);
    group.userData.intLight = intLight1;
    group.userData.intLight2 = intLight2;

    // === EDGE WIREFRAME GLOW ===
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(wh.width + 1.5, wallHeight + 1.5, wh.depth + 1.5));
    const edgeMat = new THREE.LineBasicMaterial({ color: wh.color, transparent: true, opacity: 0.18 });
    const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
    wireframe.position.y = wallHeight / 2;
    wireframe.userData.isEdge = true;
    group.add(wireframe);

    // === EXTERNAL DETAILS: Small loading docks, external lights, crates ===
    // External pole lights (2 per warehouse)
    [-wh.width / 2 - 4, wh.width / 2 + 4].forEach(lx => {
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.7 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 12, 8), poleMat);
      pole.position.set(lx, 6, wh.depth / 2 + 3);
      pole.castShadow = true;
      group.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfff5b0, emissive: 0xfff5b0, emissiveIntensity: 1.5 })
      );
      lamp.position.set(lx, 12, wh.depth / 2 + 3);
      group.add(lamp);
      const polePt = new THREE.PointLight(0xfff5b0, 0.8, 30);
      polePt.position.set(lx, 12, wh.depth / 2 + 3);
      group.add(polePt);
    });

    whGroup.add(group);
    whMeshes.push({ group, body, wh, idx });
  });
  scene.add(whGroup);

  // ---- TREES / LANDSCAPE ----
  function createTree(x, z, scale) {
    scale = scale || (0.8 + Math.random() * 0.5);
    const treeGroup = new THREE.Group();
    const trunkH = 4 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 * scale, 0.7 * scale, trunkH, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 })
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    // Multiple canopy layers for fuller look
    const canopyColors = [0x1a4a1a, 0x1e5c1e, 0x225522, 0x184018];
    [0, 2, 4].forEach((offset, i) => {
      const canopyR = (4.5 - i * 0.8) * scale;
      const canopyH = (5 - i * 0.5) * scale;
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(canopyR, canopyH, 8),
        new THREE.MeshStandardMaterial({ color: canopyColors[i % canopyColors.length], roughness: 0.95 })
      );
      canopy.position.y = trunkH + offset * scale + canopyH / 2;
      canopy.castShadow = true;
      treeGroup.add(canopy);
    });
    treeGroup.position.set(x, 0, z);
    return treeGroup;
  }
  const treePositions = [
    [-480, -250], [-490, -150], [-480, -50], [-490, 50], [-480, 150], [-490, 250],
    [380, -250], [390, -150], [380, -50], [390, 50], [380, 150], [390, 250],
    [-250, -350], [-150, -340], [-50, -350], [50, -340], [150, -350], [250, -340],
    [-250, 390], [-150, 380], [-50, 390], [50, 380], [150, 390], [250, 380],
    // Additional interior trees along roads
    [-300, -120], [-300, 100], [300, -120], [300, 100],
  ];
  treePositions.forEach(([x, z]) => scene.add(createTree(x, z)));

  // ---- ROAD NETWORK PATHS FOR TRUCKS ----
  const roadNetwork = buildRoadNetwork();
  const obstacles = getWhObstacles();

  // ---- TRUCKS (with collision-aware road pathing) ----
  function createTruck(baseColor) {
    const truckGroup = new THREE.Group();
    // Cargo body
    const cargoMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.65, metalness: 0.55 });
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 14), cargoMat);
    cargo.position.set(0, 2.8, 2);
    cargo.castShadow = true; cargo.receiveShadow = true;
    truckGroup.add(cargo);
    // Cargo side panels (detail lines)
    const panelMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(baseColor).offsetHSL(0, 0, -0.08), metalness: 0.6 });
    [-3.1, 3.1].forEach(sx => {
      for (let pz = -4; pz <= 8; pz += 4) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.15), panelMat);
        panel.position.set(sx, 2.8, pz);
        panel.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
        truckGroup.add(panel);
      }
    });
    // Cab
    const cabColor = new THREE.Color(baseColor).offsetHSL(0, 0.05, 0.08);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4.5, 5.5),
      new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.55, metalness: 0.6 })
    );
    cab.position.set(0, 4.3, -5.2);
    cab.castShadow = true;
    truckGroup.add(cab);
    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 3),
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, emissive: 0x1a3050, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 })
    );
    windshield.position.set(0, 5, -8);
    truckGroup.add(windshield);
    // Wheels (6 wheels — front 2, rear 4)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.75, metalness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.7, 14);
    // Front axle
    [[-3.5, 0.9, -6], [3.5, 0.9, -6]].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      truckGroup.add(wheel);
      // Hubcap
      const hub = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9 }));
      hub.position.set(wx > 0 ? wx + 0.36 : wx - 0.36, wy, wz);
      hub.rotation.y = wx > 0 ? Math.PI / 2 : -Math.PI / 2;
      truckGroup.add(hub);
    });
    // Rear axles (dual wheels)
    [[3, 6], [7, 10]].forEach(([z1]) => {
      [[-3.5, 0.9, z1], [3.5, 0.9, z1]].forEach(([wx, wy, wz]) => {
        // Inner wheel
        const w1 = new THREE.Mesh(wheelGeo, wheelMat);
        w1.rotation.z = Math.PI / 2;
        w1.position.set(wx, wy, wz);
        truckGroup.add(w1);
        // Outer wheel
        const w2 = new THREE.Mesh(wheelGeo, wheelMat);
        w2.rotation.z = Math.PI / 2;
        w2.position.set(wx > 0 ? wx + 0.75 : wx - 0.75, wy, wz);
        truckGroup.add(w2);
      });
    });
    // Headlights
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff8c0, emissive: 0xfff8c0, emissiveIntensity: 2.5 });
    [[-2.2, 4, -8], [2.2, 4, -8]].forEach(([lx, ly, lz]) => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), hlMat);
      hl.position.set(lx, ly, lz);
      truckGroup.add(hl);
    });
    // Tail lights
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 });
    [[-2.5, 2, 9.2], [2.5, 2, 9.2]].forEach(([lx, ly, lz]) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.2), tlMat);
      tl.position.set(lx, ly, lz);
      truckGroup.add(tl);
    });
    // Exhaust pipe
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 })
    );
    exhaust.position.set(3.3, 3.5, -2);
    truckGroup.add(exhaust);
    // Side mirrors
    [-3.3, 3.3].forEach(mx => {
      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
      );
      mirror.position.set(mx, 5.5, -7);
      truckGroup.add(mirror);
    });

    return truckGroup;
  }

  // Build truck routes using the road network (collision-free)
  const truckColors = [0x1e3a5f, 0x374151, 0x1c3a2e, 0x3b1c1c, 0x2d1b69];
  const trucks = [];

  // Define truck patrol routes as sequences of road node positions
  const truckRouteDefinitions = [
    // Truck 1: Gate entry → weighbridge → row 1 → row 2 → back to gate
    [[-300, -210], [-110, -210], [-110, -50], [20, -50], [20, -210], [140, -210], [140, -50], [240, -50], [240, -210], [-300, -210]],
    // Truck 2: Gate → middle road → east side → loop
    [[-300, -50], [-110, -50], [-110, 95], [20, 95], [140, 95], [140, -50], [20, -50], [-110, -50], [-300, -50]],
    // Truck 3: Internal east-west patrol (upper)
    [[-240, 95], [-110, 95], [20, 95], [140, 95], [240, 95], [240, 230], [140, 230], [20, 230], [-110, 230], [-240, 230], [-240, 95]],
    // Truck 4: Gate exit loop via south road
    [[300, -210], [140, -210], [20, -210], [-110, -210], [-240, -210], [-240, -50], [-110, -50], [20, -50], [140, -50], [300, -50], [300, -210]],
    // Truck 5: South loop
    [[-240, 230], [-110, 230], [20, 230], [140, 230], [240, 230], [240, 350], [140, 350], [20, 350], [-110, 350], [-240, 350], [-240, 230]],
  ];

  truckRouteDefinitions.forEach((route, i) => {
    const truck = createTruck(truckColors[i % truckColors.length]);
    truck.position.set(route[0][0], 0, route[0][1]);
    scene.add(truck);
    trucks.push({
      mesh: truck,
      waypoints: route,
      speed: 0.25 + Math.random() * 0.15,
      progress: 0,
      wpIdx: 0,
      totalDist: 0,
      segDists: [],
    });
  });

  // Pre-compute segment distances for each truck
  trucks.forEach(truck => {
    let total = 0;
    truck.segDists = [];
    for (let i = 0; i < truck.waypoints.length - 1; i++) {
      const dx = truck.waypoints[i + 1][0] - truck.waypoints[i][0];
      const dz = truck.waypoints[i + 1][1] - truck.waypoints[i][1];
      const d = Math.sqrt(dx * dx + dz * dz);
      truck.segDists.push(d);
      total += d;
    }
    truck.totalDist = total;
  });

  // ---- FORKLIFTS (with more detail) ----
  function createForklift() {
    const fg = new THREE.Group();
    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6, metalness: 0.45 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 4), bodyMat);
    body.position.set(0, 1.8, 0);
    body.castShadow = true;
    fg.add(body);
    // Cab roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.3, 4.2),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.5 })
    );
    roof.position.set(0, 3.4, 0);
    fg.add(roof);
    // Cab pillars
    [[-1.4, -1.8], [1.4, -1.8], [-1.4, 1.8], [1.4, 1.8]].forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 })
      );
      pillar.position.set(px, 2.5, pz);
      fg.add(pillar);
    });
    // Fork mast
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.85, roughness: 0.3 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), mastMat);
    mast.position.set(-0.8, 2, 2.5);
    fg.add(mast);
    const mast2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), mastMat);
    mast2.position.set(0.8, 2, 2.5);
    fg.add(mast2);
    // Fork tines
    const forkMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.25 });
    [-0.6, 0.6].forEach(fx => {
      const tine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 2), forkMat);
      tine.position.set(fx, 0.5, 3.5);
      fg.add(tine);
    });
    // Fork backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.15), forkMat);
    backrest.position.set(0, 1.8, 2.5);
    fg.add(backrest);
    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    [[-1.5, 0.5, -1.5], [1.5, 0.5, -1.5], [-1.5, 0.5, 1.2], [1.5, 0.5, 1.2]].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      fg.add(wheel);
    });
    // Warning beacon on top
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 2 })
    );
    beacon.position.set(0, 3.7, 0);
    fg.add(beacon);
    // Counterweight at back
    const cw = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.6 })
    );
    cw.position.set(0, 1.5, -2.5);
    cw.castShadow = true;
    fg.add(cw);
    return fg;
  }

  // Forklift paths (inside/near warehouses, along internal roads, avoid buildings)
  const forklifts = [];
  const forkliftPaths = [
    { wh: WH_DATA[0], path: [[-180, -165], [-110, -165], [-110, -50], [-180, -50], [-180, -165]], speed: 0.15 },
    { wh: WH_DATA[3], path: [[-180, -25], [-110, -25], [-110, 65], [-180, 65], [-180, -25]], speed: 0.12 },
    { wh: WH_DATA[6], path: [[-180, 115], [-110, 115], [-50, 115], [-50, 205], [-110, 205], [-180, 205], [-180, 115]], speed: 0.13 },
  ];

  forkliftPaths.forEach((fp, i) => {
    const fl = createForklift();
    fl.position.set(fp.path[0][0], 0, fp.path[0][1]);
    scene.add(fl);
    const segDists = [];
    let total = 0;
    for (let j = 0; j < fp.path.length - 1; j++) {
      const dx = fp.path[j + 1][0] - fp.path[j][0];
      const dz = fp.path[j + 1][1] - fp.path[j][1];
      const d = Math.sqrt(dx * dx + dz * dz);
      segDists.push(d);
      total += d;
    }
    forklifts.push({
      mesh: fl,
      waypoints: fp.path,
      speed: fp.speed,
      progress: i * 30,
      segDists,
      totalDist: total,
    });
  });

  // ---- AMBIENT PARTICLES ----
  const particleCount = 800;
  const pPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 900;
    pPositions[i * 3 + 1] = Math.random() * 50 + 0.5;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 700;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x88aacc, size: 0.35, transparent: true, opacity: 0.35, sizeAttenuation: true });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ---- CAMERA CONTROLS (manual orbit) ----
  let isMouseDown = false;
  let isRightMouseDown = false;
  let lastMouse = { x: 0, y: 0 };
  let cameraState = {
    phi: 0.85,
    theta: 0,
    radius: 480,
    target: new THREE.Vector3(0, 0, 60),
    mode: 'overview',
    flyAngle: 0,
  };

  function updateCameraFromState() {
    const { phi, theta, radius, target } = cameraState;
    camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = target.y + radius * Math.cos(phi);
    camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(target);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) isMouseDown = true;
    if (e.button === 2) isRightMouseDown = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
    isRightMouseDown = false;
    canvas.style.cursor = 'default';
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousemove', (e) => {
    handleMouseMove(e);
    handleHover(e);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY * 0.5;
    cameraState.radius = Math.max(30, Math.min(900, cameraState.radius + delta));
    if (cameraState.mode !== 'flythrough') updateCameraFromState();
  }, { passive: false });

  // Touch controls for mobile
  let touchStart = null;
  let touchDist = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && touchStart) {
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      cameraState.theta -= dx * 0.006;
      cameraState.phi = Math.max(0.1, Math.min(Math.PI * 0.48, cameraState.phi + dy * 0.005));
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateCameraFromState();
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const delta = (touchDist - newDist) * 1.5;
      cameraState.radius = Math.max(30, Math.min(900, cameraState.radius + delta));
      touchDist = newDist;
      updateCameraFromState();
    }
  }, { passive: false });

  function handleMouseMove(e) {
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };

    if (isMouseDown && cameraState.mode !== 'flythrough') {
      cameraState.theta -= dx * 0.005;
      cameraState.phi = Math.max(0.1, Math.min(Math.PI * 0.48, cameraState.phi + dy * 0.004));
      updateCameraFromState();
    }
    if (isRightMouseDown) {
      const panFactor = cameraState.radius * 0.0008;
      cameraState.target.x -= dx * panFactor;
      cameraState.target.z += dy * panFactor;
      updateCameraFromState();
    }
  }

  // ---- RAYCASTER (Hover + Click) ----
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredWh = null;
  let selectedWh = null;

  function handleHover(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const bodyMeshes = whMeshes.map(wm => wm.body);
    const intersects = raycaster.intersectObjects(bodyMeshes, false);

    if (intersects.length > 0) {
      const whIdx = intersects[0].object.userData.whIndex;
      if (hoveredWh !== whIdx) {
        if (hoveredWh !== null) unhighlightWh(hoveredWh);
        hoveredWh = whIdx;
        highlightWh(whIdx);
        updateWhPanel(WH_DATA[whIdx], true);
        canvas.style.cursor = 'pointer';
      }
    } else {
      if (hoveredWh !== null) {
        if (hoveredWh !== selectedWh) unhighlightWh(hoveredWh);
        hoveredWh = null;
        updateWhPanel(null, false);
        if (!isMouseDown) canvas.style.cursor = 'default';
      }
    }
  }

  canvas.addEventListener('click', (e) => {
    if (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const bodyMeshes = whMeshes.map(wm => wm.body);
    const intersects = raycaster.intersectObjects(bodyMeshes, false);

    if (intersects.length > 0) {
      const whIdx = intersects[0].object.userData.whIndex;
      selectedWh = whIdx;
      const wh = WH_DATA[whIdx];
      smoothFlyTo(
        new THREE.Vector3(wh.pos[0] + 30, 60, wh.pos[2] + wh.depth * 0.8),
        new THREE.Vector3(wh.pos[0], 8, wh.pos[2])
      );
    } else {
      selectedWh = null;
    }
  });

  // Double-click to open modal
  canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const bodyMeshes = whMeshes.map(wm => wm.body);
    const intersects = raycaster.intersectObjects(bodyMeshes, false);
    if (intersects.length > 0) {
      selectedWh = intersects[0].object.userData.whIndex;
      w3dShowWhModal();
    }
  });

  function highlightWh(idx) {
    const wm = whMeshes[idx];
    if (!wm) return;
    wm.group.children.forEach(c => {
      if (c.userData && c.userData.isEdge) {
        c.material.opacity = 0.9;
        c.material.color.setHex(0xffffff);
      }
    });
    if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = 2.5;
    if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = 2.5;
  }

  function unhighlightWh(idx) {
    const wm = whMeshes[idx];
    if (!wm) return;
    wm.group.children.forEach(c => {
      if (c.userData && c.userData.isEdge) {
        c.material.opacity = 0.18;
        c.material.color.setHex(wm.wh.color);
      }
    });
    if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = 1.0;
    if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = 1.0;
  }

  // ---- FLOATING LABELS ----
  function createWhLabel(wh, idx) {
    const lc = document.createElement('canvas');
    lc.width = 320;
    lc.height = 96;
    const ctx = lc.getContext('2d');
    ctx.clearRect(0, 0, 320, 96);
    // Background
    ctx.fillStyle = 'rgba(8,16,32,0.88)';
    ctx.beginPath();
    ctx.moveTo(12, 8);
    ctx.lineTo(308, 8);
    ctx.quadraticCurveTo(312, 8, 312, 12);
    ctx.lineTo(312, 84);
    ctx.quadraticCurveTo(312, 88, 308, 88);
    ctx.lineTo(12, 88);
    ctx.quadraticCurveTo(8, 88, 8, 84);
    ctx.lineTo(8, 12);
    ctx.quadraticCurveTo(8, 8, 12, 8);
    ctx.fill();
    // Border
    ctx.strokeStyle = new THREE.Color(wh.color).getStyle();
    ctx.lineWidth = 2;
    ctx.stroke();
    // Code
    ctx.font = 'bold 26px Inter, Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(wh.code, 160, 42);
    // Fill bar
    const barX = 40, barY = 54, barW = 240, barH = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barY, barW, barH);
    const fillColor = wh.fill >= 90 ? '#ef4444' : wh.fill >= 70 ? '#f59e0b' : '#10b981';
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barW * wh.fill / 100, barH);
    // Fill text
    ctx.font = '15px Inter, Arial, sans-serif';
    ctx.fillStyle = fillColor;
    ctx.fillText(`${wh.fill}% · ${wh.stock.toLocaleString('vi-VN')}T`, 160, 78);

    const texture = new THREE.CanvasTexture(lc);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(48, 14.5, 1);
    sprite.position.set(wh.pos[0], 46, wh.pos[2]);
    sprite.userData.isLabel = true;
    return sprite;
  }

  const labelSprites = WH_DATA.map((wh, idx) => {
    const sprite = createWhLabel(wh, idx);
    scene.add(sprite);
    return sprite;
  });

  // ---- CAMERA SMOOTH TRANSITION ----
  let camAnim = null;
  function smoothFlyTo(targetPos, targetLookAt, duration = 1800) {
    if (camAnim) cancelAnimationFrame(camAnim);
    const startPos = camera.position.clone();
    const startTarget = cameraState.target.clone();
    const start = performance.now();

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animCam(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(startPos, targetPos, e);
      cameraState.target.lerpVectors(startTarget, targetLookAt, e);
      camera.lookAt(cameraState.target);
      if (t < 1) camAnim = requestAnimationFrame(animCam);
      else camAnim = null;
    }
    camAnim = requestAnimationFrame(animCam);
  }

  // ---- PUBLIC CAMERA CONTROLS ----
  window.w3dSetCamera = function(mode) {
    cameraState.mode = mode;
    document.querySelectorAll('[id^="btn-"]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('[id^="radio-"]').forEach(r => r.classList.remove('active'));
    const btn = document.getElementById('btn-' + mode);
    const radio = document.getElementById('radio-' + mode);
    if (btn) btn.classList.add('active');
    if (radio) radio.classList.add('active');

    if (mode === 'overview') {
      smoothFlyTo(new THREE.Vector3(0, 320, 380), new THREE.Vector3(0, 0, 60));
      cameraState.radius = 480;
    } else if (mode === 'topdown') {
      smoothFlyTo(new THREE.Vector3(0, 550, 1), new THREE.Vector3(0, 0, 60));
    } else if (mode === 'flythrough') {
      cameraState.flyAngle = 0;
    } else if (mode === 'free') {
      if (typeof showToast === 'function') showToast('Chế độ tự do: Kéo chuột xoay, chuột phải pan, cuộn zoom', 'info');
    }
  };

  window.w3dResetCamera = function() { w3dSetCamera('overview'); };

  // ---- HEATMAP MODE ----
  let heatmapActive = false;
  window.w3dToggleHeatmap = function() {
    heatmapActive = !heatmapActive;
    const btn = document.getElementById('btn-heatmap');
    if (btn) btn.classList.toggle('active', heatmapActive);
    const legend = document.getElementById('w3d-legend');
    if (legend) legend.classList.toggle('visible', heatmapActive);

    whMeshes.forEach(wm => {
      const { wh, group } = wm;
      let hColor;
      if (heatmapActive) {
        hColor = wh.fill >= 96 ? 0xef4444 :
                 wh.fill >= 81 ? 0xf97316 :
                 wh.fill >= 61 ? 0xf59e0b :
                 wh.fill >= 31 ? 0x3b82f6 : 0x10b981;
      } else {
        hColor = wh.color;
      }
      // Update wall materials
      group.children.forEach(child => {
        if (child.isMesh && child.material && child.material.isMeshStandardMaterial && !child.userData.isBody) {
          if (child.material.transparent && child.material.opacity < 0.6) {
            // Transparent band
            child.material.color.setHex(heatmapActive ? hColor : wh.color);
          }
        }
      });
      // Update edge wireframe
      group.children.forEach(child => {
        if (child.userData && child.userData.isEdge) {
          child.material.color.setHex(heatmapActive ? hColor : wh.color);
          child.material.opacity = heatmapActive ? 0.5 : 0.18;
        }
      });
    });
  };

  // ---- DAY/NIGHT ----
  let isDay = true;
  window.w3dToggleDayNight = function() {
    isDay = !isDay;
    const btn = document.getElementById('btn-daynight');

    if (isDay) {
      scene.background = new THREE.Color(0x0a1628);
      scene.fog = new THREE.FogExp2(0x0a1628, 0.0012);
      sunLight.color.setHex(0xfff8e8);
      sunLight.intensity = 2.5;
      ambientLight.color.setHex(0x4a5a7a);
      ambientLight.intensity = 0.7;
      hemiLight.intensity = 0.6;
      if (btn) { btn.innerHTML = '<i class="fas fa-sun"></i> Ngày/Đêm'; btn.classList.remove('active'); }
    } else {
      scene.background = new THREE.Color(0x020510);
      scene.fog = new THREE.FogExp2(0x020510, 0.0018);
      sunLight.color.setHex(0x1828aa);
      sunLight.intensity = 0.1;
      ambientLight.color.setHex(0x06081a);
      ambientLight.intensity = 0.12;
      hemiLight.intensity = 0.1;
      if (btn) { btn.innerHTML = '<i class="fas fa-moon"></i> Ngày/Đêm'; btn.classList.add('active'); }
      whMeshes.forEach(wm => {
        if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = 3.5;
        if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = 3.5;
      });
    }
  };

  // ---- EFFECTS TOGGLE ----
  let effectsOn = true;
  window.w3dToggleEffects = function() {
    effectsOn = !effectsOn;
    particles.visible = effectsOn;
    const btn = document.getElementById('btn-effects');
    if (btn) btn.classList.toggle('active', effectsOn);
  };

  // ---- SETTINGS TOGGLES ----
  window.w3dToggleSetting = function(btn, setting) {
    btn.classList.toggle('on');
    const isOn = btn.classList.contains('on');
    if (setting === 'labels') labelSprites.forEach(s => s.visible = isOn);
    if (setting === 'vehicles') {
      trucks.forEach(t => t.mesh.visible = isOn);
      forklifts.forEach(f => f.mesh.visible = isOn);
    }
    if (setting === 'grid') gridHelper.visible = isOn;
    if (setting === 'fog') scene.fog = isOn ? new THREE.FogExp2(0x0a1628, 0.0012) : null;
    if (setting === 'shadows') {
      renderer.shadowMap.enabled = isOn;
      sunLight.castShadow = isOn;
    }
  };

  // ---- SEARCH & FILTER ----
  window.w3dSearch = function(query) {
    if (!query || query.trim() === '') {
      // Reset all
      whMeshes.forEach(wm => {
        wm.group.visible = true;
        wm.group.scale.set(1, 1, 1);
      });
      labelSprites.forEach(s => s.visible = true);
      return;
    }
    const q = query.trim().toLowerCase();
    let foundIdx = -1;
    whMeshes.forEach((wm, i) => {
      const match = wm.wh.code.toLowerCase().includes(q) || wm.wh.name.toLowerCase().includes(q);
      if (match && foundIdx === -1) foundIdx = i;
      // Dim non-matching
      wm.group.children.forEach(child => {
        if (child.userData && child.userData.isEdge) {
          child.material.opacity = match ? 0.6 : 0.02;
        }
      });
      if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = match ? 2 : 0.1;
      if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = match ? 2 : 0.1;
      labelSprites[i].material.opacity = match ? 1 : 0.15;
    });
    // Fly to first match
    if (foundIdx >= 0) {
      const wh = WH_DATA[foundIdx];
      selectedWh = foundIdx;
      smoothFlyTo(
        new THREE.Vector3(wh.pos[0] + 20, 80, wh.pos[2] + wh.depth * 0.9),
        new THREE.Vector3(wh.pos[0], 8, wh.pos[2])
      );
      updateWhPanel(wh, true);
    }
  };

  window.w3dClearSearch = function() {
    const input = document.getElementById('w3d-search-input');
    if (input) input.value = '';
    whMeshes.forEach((wm, i) => {
      wm.group.children.forEach(child => {
        if (child.userData && child.userData.isEdge) {
          child.material.opacity = 0.18;
          child.material.color.setHex(wm.wh.color);
        }
      });
      if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = 1.0;
      if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = 1.0;
      labelSprites[i].material.opacity = 1;
    });
  };

  // Filter by criteria
  window.w3dFilter = function(filterType, filterValue) {
    if (!filterValue || filterValue === 'all') {
      whMeshes.forEach((wm, i) => {
        wm.group.children.forEach(child => {
          if (child.userData && child.userData.isEdge) {
            child.material.opacity = 0.18;
          }
        });
        if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = 1.0;
        if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = 1.0;
        labelSprites[i].material.opacity = 1;
      });
      return;
    }

    whMeshes.forEach((wm, i) => {
      let match = false;
      if (filterType === 'owner') match = wm.wh.owner === filterValue;
      else if (filterType === 'type') match = wm.wh.type.includes(filterValue);
      else if (filterType === 'usage') {
        if (filterValue === 'low') match = wm.wh.fill < 50;
        else if (filterValue === 'medium') match = wm.wh.fill >= 50 && wm.wh.fill < 80;
        else if (filterValue === 'high') match = wm.wh.fill >= 80;
      }

      wm.group.children.forEach(child => {
        if (child.userData && child.userData.isEdge) {
          child.material.opacity = match ? 0.7 : 0.03;
        }
      });
      if (wm.group.userData.intLight) wm.group.userData.intLight.intensity = match ? 2.5 : 0.1;
      if (wm.group.userData.intLight2) wm.group.userData.intLight2.intensity = match ? 2.5 : 0.1;
      labelSprites[i].material.opacity = match ? 1 : 0.12;
    });
  };

  // ---- WAREHOUSE PANEL UPDATE ----
  function updateWhPanel(wh, show) {
    const panel = document.getElementById('w3d-wh-panel');
    if (!panel) return;
    if (!show || !wh) {
      panel.classList.remove('visible');
      return;
    }
    panel.classList.add('visible');
    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setEl('wh-panel-name', wh.code);
    setEl('wh-panel-code', wh.code + ' — ' + wh.name);
    setEl('wh-panel-area', wh.area.toLocaleString('vi-VN') + ' m²');
    setEl('wh-panel-stock', wh.stock.toLocaleString('vi-VN') + ' tấn');
    setEl('wh-panel-fill', wh.fill + '%');
    setEl('wh-panel-temp', wh.temp + '°C');
    setEl('wh-panel-humid', wh.humid + '%');
    setEl('wh-panel-type', wh.type);

    const barEl = document.getElementById('wh-panel-bar');
    if (barEl) {
      barEl.style.width = wh.fill + '%';
      barEl.style.background = wh.fill >= 90 ? '#ef4444' : wh.fill >= 70 ? '#f59e0b' : '#38bdf8';
    }
    const itemsEl = document.getElementById('wh-panel-items');
    if (itemsEl) {
      itemsEl.innerHTML = wh.items.map(([name, qty, unit]) =>
        `<div class="w3d-wh-item-row">
          <span class="w3d-wh-item-name">${name}</span>
          <span class="w3d-wh-item-qty">${typeof qty === 'number' ? qty.toLocaleString('vi-VN') : qty} ${unit || ''}</span>
        </div>`
      ).join('');
    }
  }

  // ---- WAREHOUSE MODAL ----
  window.w3dShowWhModal = function() {
    if (hoveredWh === null && selectedWh === null) return;
    const whIdx = selectedWh !== null ? selectedWh : hoveredWh;
    const wh = WH_DATA[whIdx];
    if (!wh) return;

    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setEl('modal-title', wh.code + ' — ' + wh.name);
    setEl('modal-code', wh.code + ' · ' + wh.type + ' · ' + wh.area.toLocaleString('vi-VN') + ' m²');
    setEl('modal-area', wh.area.toLocaleString('vi-VN') + ' m²');
    setEl('modal-stock', wh.stock.toLocaleString('vi-VN') + ' tấn');
    setEl('modal-fill-pct', wh.fill + '% công suất');
    setEl('modal-zones', wh.zones);
    setEl('modal-type', wh.type);
    setEl('modal-owner', wh.owner || 'TVL');
    setEl('modal-temp', wh.temp + '°C');
    setEl('modal-humid', wh.humid + '%');

    // Zones grid
    const zonesGrid = document.getElementById('modal-zones-grid');
    if (zonesGrid) {
      const zoneNames = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G', 'Zone H'];
      const fills = Array.from({ length: wh.zones }, () => Math.round(wh.fill * (0.65 + Math.random() * 0.65)));
      zonesGrid.innerHTML = fills.map((f, i) => {
        const c = f >= 90 ? '#ef4444' : f >= 70 ? '#f59e0b' : f >= 40 ? '#3b82f6' : '#10b981';
        return `<div class="w3d-zone-item">
          <div class="w3d-zone-name">${zoneNames[i] || 'Zone ' + (i + 1)}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, f)}%;background:${c}"></div></div>
          <div class="w3d-zone-fill" style="color:${c};margin-top:4px;font-weight:700">${f}%</div>
        </div>`;
      }).join('');
    }

    // Items list
    const itemsGrid = document.getElementById('modal-items-grid');
    if (itemsGrid) {
      itemsGrid.innerHTML = wh.items.map(([name, qty, unit]) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:4px">
          <span style="color:rgba(255,255,255,0.7);font-size:13px">${name}</span>
          <span style="color:#38bdf8;font-weight:700;font-size:13px;font-family:'JetBrains Mono',monospace">${typeof qty === 'number' ? qty.toLocaleString('vi-VN') : qty} ${unit}</span>
        </div>`
      ).join('');
    }

    // Recent transactions
    const transEl = document.getElementById('modal-recent-trans');
    if (transEl) {
      const types = ['Nhập', 'Xuất', 'Di chuyển', 'Kiểm kê'];
      const colors = ['#10b981', '#f59e0b', '#60a5fa', '#a78bfa'];
      const icons = ['fa-arrow-circle-down', 'fa-arrow-circle-up', 'fa-random', 'fa-clipboard-check'];
      transEl.innerHTML = Array.from({ length: 4 }, (_, i) => {
        const t = types[i];
        const c = colors[i];
        const code = `${i === 1 ? 'SH' : i === 0 ? 'RC' : i === 2 ? 'MO' : 'IC'}-2026-${String(300 + i * 47).padStart(4, '0')}`;
        const qty = (5 + Math.random() * 30).toFixed(1);
        const hr = 10 + Math.floor(Math.random() * 5);
        const min = Math.floor(Math.random() * 60);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fas ${icons[i]}" style="color:${c};font-size:12px"></i>
            <span style="font-size:10px;font-weight:700;color:${c};background:${c}22;padding:2px 8px;border-radius:4px">${t}</span>
            <span style="font-size:12px;color:rgba(255,255,255,0.5);font-family:'JetBrains Mono',monospace">${code}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:12px;font-weight:600;color:#fff;font-family:'JetBrains Mono',monospace">${qty} tấn</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3)">${hr}:${String(min).padStart(2, '0')}</span>
          </div>
        </div>`;
      }).join('');
    }

    const overlay = document.getElementById('w3d-modal-overlay');
    if (overlay) overlay.classList.add('visible');
  };

  window.w3dCloseModal = function() {
    const overlay = document.getElementById('w3d-modal-overlay');
    if (overlay) overlay.classList.remove('visible');
  };

  window.w3dFocusWarehouse = function() {
    const whIdx = hoveredWh !== null ? hoveredWh : selectedWh;
    if (whIdx === null) return;
    const wh = WH_DATA[whIdx];
    smoothFlyTo(
      new THREE.Vector3(wh.pos[0] + 25, 65, wh.pos[2] + wh.depth * 0.85),
      new THREE.Vector3(wh.pos[0], 8, wh.pos[2])
    );
  };

  // ---- FULLSCREEN ----
  window.w3dToggleFullscreen = function() {
    const container = document.getElementById('warehouse-3d-container');
    if (!document.fullscreenElement) {
      container.requestFullscreen && container.requestFullscreen();
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  };

  // ---- MINIMAP ----
  const minimapCanvas = document.getElementById('minimap-canvas');
  function renderMinimap() {
    if (!minimapCanvas) return;
    const ctx = minimapCanvas.getContext('2d');
    const W = minimapCanvas.width;
    const H = minimapCanvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050b18';
    ctx.fillRect(0, 0, W, H);

    const scaleX = W / 1400;
    const scaleZ = H / 1000;
    const offX = W / 2;
    const offZ = H / 2 - 30;

    // Draw roads
    ctx.strokeStyle = 'rgba(50,70,100,0.5)';
    ctx.lineWidth = 1;
    roadNet.hRoads.forEach(z => {
      ctx.beginPath();
      ctx.moveTo(10, offZ + z * scaleZ);
      ctx.lineTo(W - 10, offZ + z * scaleZ);
      ctx.stroke();
    });
    roadNet.vRoads.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(offX + x * scaleX, 10);
      ctx.lineTo(offX + x * scaleX, H - 10);
      ctx.stroke();
    });

    // Draw warehouses
    WH_DATA.forEach(wh => {
      const mx = offX + wh.pos[0] * scaleX;
      const mz = offZ + wh.pos[2] * scaleZ;
      const mw = wh.width * scaleX;
      const md = wh.depth * scaleZ;
      ctx.fillStyle = new THREE.Color(wh.color).getStyle();
      ctx.globalAlpha = 0.75;
      ctx.fillRect(mx - mw / 2, mz - md / 2, mw, md);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(mx - mw / 2, mz - md / 2, mw, md);
      // Label
      ctx.font = '6px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(wh.code.replace('WH', ''), mx, mz + 3);
    });

    // Draw trucks
    ctx.fillStyle = '#f59e0b';
    trucks.forEach(t => {
      const tx = offX + t.mesh.position.x * scaleX;
      const tz = offZ + t.mesh.position.z * scaleZ;
      ctx.beginPath();
      ctx.arc(tx, tz, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw camera
    const camX = offX + camera.position.x * scaleX;
    const camZ = offZ + camera.position.z * scaleZ;
    ctx.beginPath();
    ctx.arc(Math.max(4, Math.min(W - 4, camX)), Math.max(4, Math.min(H - 4, camZ)), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }

  // ---- CLOCK ----
  function updateClock() {
    const timeEl = document.getElementById('w3d-time');
    if (timeEl) timeEl.textContent = '⏱ ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ---- RESIZE ----
  function handleResize() {
    const container = canvas.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', handleResize);

  // ---- FPS COUNTER ----
  let frameCount = 0, lastFpsTime = performance.now();
  function updateFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime > 500) {
      const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
      const fpsEl = document.getElementById('w3d-fps');
      if (fpsEl) {
        fpsEl.textContent = `FPS: ${fps}`;
        fpsEl.style.color = fps >= 50 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444';
      }
      frameCount = 0;
      lastFpsTime = now;
    }
  }

  // ---- VEHICLE ANIMATION: Trucks follow road waypoints ----
  function animateVehicle(vehicle, dt) {
    vehicle.progress += vehicle.speed * dt * 0.06;
    const wps = vehicle.waypoints;
    const totalSegs = wps.length - 1;

    // Compute cumulative progress along segments
    let accumulated = 0;
    let segIdx = 0;
    let segT = 0;
    const progressMod = vehicle.progress % vehicle.totalDist;

    for (let i = 0; i < vehicle.segDists.length; i++) {
      if (accumulated + vehicle.segDists[i] >= progressMod) {
        segIdx = i;
        segT = (progressMod - accumulated) / vehicle.segDists[i];
        break;
      }
      accumulated += vehicle.segDists[i];
    }

    const from = wps[segIdx];
    const to = wps[Math.min(segIdx + 1, wps.length - 1)];
    const x = from[0] + (to[0] - from[0]) * segT;
    const z = from[1] + (to[1] - from[1]) * segT;
    vehicle.mesh.position.set(x, 0, z);

    // Rotate toward direction
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const targetAngle = Math.atan2(dx, dz);
      // Smooth rotation
      let currentAngle = vehicle.mesh.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      vehicle.mesh.rotation.y += diff * 0.08;
    }
  }

  function animateTrucks(dt) {
    trucks.forEach(truck => animateVehicle(truck, dt));
  }

  function animateForklifts(dt) {
    forklifts.forEach(fl => animateVehicle(fl, dt));
  }

  // ---- PARTICLE ANIMATION ----
  function animateParticles(t) {
    const positions = pGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] += 0.018;
      if (positions[i * 3 + 1] > 55) positions[i * 3 + 1] = 0.5;
      positions[i * 3] += Math.sin(t * 0.0008 + i) * 0.008;
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  // ---- FLYTHROUGH ANIMATION ----
  let flythroughAngle = 0;
  function animateFlythrough(dt) {
    if (cameraState.mode !== 'flythrough') return;
    flythroughAngle += dt * 0.00006;
    const r = 400;
    const x = Math.sin(flythroughAngle) * r;
    const z = Math.cos(flythroughAngle) * r;
    const y = 180 + Math.sin(flythroughAngle * 0.4) * 80;
    camera.position.set(x, y, z + 60);
    camera.lookAt(0, 10, 60);
  }

  // ---- PULSING EMISSIVE for critical warehouses ----
  let pulseT = 0;
  function animatePulse(dt) {
    pulseT += dt * 0.003;
    whMeshes.forEach((wm, idx) => {
      if (wm.wh.fill >= 90) {
        const pulseFactor = Math.sin(pulseT + idx * 1.5) * 0.5 + 0.5;
        wm.group.children.forEach(child => {
          if (child.userData && child.userData.isEdge) {
            child.material.opacity = 0.15 + pulseFactor * 0.5;
            child.material.color.setHex(0xef4444);
          }
        });
      }
    });
  }

  // ---- KEYBOARD SHORTCUTS ----
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (key === '1') w3dSetCamera('overview');
    else if (key === '2') w3dSetCamera('topdown');
    else if (key === '3') w3dSetCamera('flythrough');
    else if (key === '4') w3dSetCamera('free');
    else if (key === 'h') w3dToggleHeatmap();
    else if (key === 'n') w3dToggleDayNight();
    else if (key === 'f') w3dToggleFullscreen();
    else if (key === 'escape') {
      w3dCloseModal();
      w3dClearSearch();
    }
    // WASD movement in free mode
    if (cameraState.mode === 'free') {
      const moveSpeed = 5;
      if (key === 'w') { cameraState.target.z -= moveSpeed; updateCameraFromState(); }
      else if (key === 's') { cameraState.target.z += moveSpeed; updateCameraFromState(); }
      else if (key === 'a') { cameraState.target.x -= moveSpeed; updateCameraFromState(); }
      else if (key === 'd') { cameraState.target.x += moveSpeed; updateCameraFromState(); }
      else if (key === 'q') { cameraState.target.y += moveSpeed * 0.5; updateCameraFromState(); }
      else if (key === 'e') { cameraState.target.y -= moveSpeed * 0.5; updateCameraFromState(); }
    }
  });

  // ---- MAIN RENDER LOOP ----
  let lastTime = performance.now();
  let animFrameId;

  function animate(now) {
    animFrameId = requestAnimationFrame(animate);
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;

    updateFPS();
    animateTrucks(dt);
    animateForklifts(dt);
    if (effectsOn) animateParticles(now);
    animateFlythrough(dt);
    animatePulse(dt);

    // Minimap every ~5 frames
    if (Math.round(now / 16) % 5 === 0) renderMinimap();

    renderer.render(scene, camera);
  }

  animate(performance.now());

  // ---- DISPOSE ----
  if (window.warehouse3dInstance && window.warehouse3dInstance.dispose) {
    window.warehouse3dInstance.dispose();
  }
  window.warehouse3dInstance = {
    dispose: function() {
      cancelAnimationFrame(animFrameId);
      renderer.dispose();
      window.removeEventListener('resize', handleResize);
    }
  };

  handleResize();
  setTimeout(handleResize, 300);

  console.log('✅ SWM TVL 3D Warehouse v2.0 initialized — 11 warehouses, collision-aware trucks, detailed interiors');
}
