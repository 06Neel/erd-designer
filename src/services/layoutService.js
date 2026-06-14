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
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: entityArr.map((e) => ({
      id: e.id,
      width: 240,
      height: Math.max(80, 52 + e.attributes.length * 28),
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
