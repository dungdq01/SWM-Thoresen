// Road network graph for warehouse facility — trucks follow these roads

const H_ROADS = [-210, -50, 95, 230, 350];
const V_ROADS = [-300, -240, -110, 20, 140, 240, 300];
const ROAD_WIDTH = 18;

export { H_ROADS, V_ROADS, ROAD_WIDTH };

export function buildRoadNetwork() {
  const nodes = [];
  const nodeMap = {};

  H_ROADS.forEach(z => {
    V_ROADS.forEach(x => {
      const id = nodes.length;
      nodeMap[`${x},${z}`] = id;
      nodes.push({ id, x, z });
    });
  });

  const edges = [];
  H_ROADS.forEach(z => {
    for (let i = 0; i < V_ROADS.length - 1; i++) {
      const a = nodeMap[`${V_ROADS[i]},${z}`];
      const b = nodeMap[`${V_ROADS[i + 1]},${z}`];
      if (a !== undefined && b !== undefined) {
        edges.push({ a, b, cost: Math.abs(V_ROADS[i + 1] - V_ROADS[i]) });
      }
    }
  });
  V_ROADS.forEach(x => {
    for (let i = 0; i < H_ROADS.length - 1; i++) {
      const a = nodeMap[`${x},${H_ROADS[i]}`];
      const b = nodeMap[`${x},${H_ROADS[i + 1]}`];
      if (a !== undefined && b !== undefined) {
        edges.push({ a, b, cost: Math.abs(H_ROADS[i + 1] - H_ROADS[i]) });
      }
    }
  });

  return { nodes, edges, nodeMap, hRoads: H_ROADS, vRoads: V_ROADS };
}

export function dijkstra(nodes, edges, startId, endId) {
  const dist = new Array(nodes.length).fill(Infinity);
  const prev = new Array(nodes.length).fill(-1);
  const visited = new Array(nodes.length).fill(false);
  dist[startId] = 0;

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

  const path = [];
  for (let at = endId; at !== -1; at = prev[at]) path.push(at);
  path.reverse();
  return path[0] === startId ? path : [];
}

export function nearestNode(nodes, x, z) {
  let best = 0, bestDist = Infinity;
  nodes.forEach((n, i) => {
    const d = Math.abs(n.x - x) + Math.abs(n.z - z);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}
