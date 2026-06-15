import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

export async function computeLayout(entities, relations) {
  const entityArr = Object.values(entities);
  if (entityArr.length === 0) return {};

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      // Generous spacing so tables don't feel congested
      'elk.spacing.nodeNode': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': '140',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      // Add padding around the entire layout
      'elk.padding': '[top=60,left=60,bottom=60,right=60]',
      // Better port alignment for cleaner edges
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: entityArr.map((e) => ({
      id: e.id,
      // Match actual EntityNode width (270) + buffer
      width: 280,
      // Header ~48px + each attr row ~28px + footer ~24px + buffer
      height: Math.max(100, 72 + e.attributes.length * 28),
    })),
    edges: Object.values(relations).map((r) => ({
      id: r.id,
      sources: [r.sourceEntityId],
      targets: [r.targetEntityId],
    })),
  };

  const layout = await elk.layout(graph);
  return Object.fromEntries(
    layout.children.map((n) => [n.id, { x: n.x, y: n.y }])
  );
}
