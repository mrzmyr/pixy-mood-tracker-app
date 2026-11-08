// Accessibility trees from `agent-device snapshot --json`: probes, a
// normalized form for caching, and the flags-off versus flags-on diff.

/** Node as agent-device prints it. Only the fields the sitemap reads. */
export interface RawNode {
  index: number;
  parentIndex?: number;
  type?: string;
  label?: string;
  value?: string;
  identifier?: string;
  rect?: { x: number; y: number; width: number; height: number };
}

/** Node kept in the cache and the site. Rect in points. */
export interface TreeNode {
  index: number;
  parent: number | null;
  type: string;
  id: string;
  label: string;
  rect: [number, number, number, number];
}

const PROBE_PREFIX = "sitemap-";

const round = (value: number) => Math.round(value * 2) / 2;

/** Drop probe nodes, keep stable fields, round rects to half points. */
export const normalizeTree = (nodes: RawNode[]): TreeNode[] =>
  nodes.flatMap((node) =>
    (node.identifier ?? "").startsWith(PROBE_PREFIX)
      ? []
      : [
          {
            index: node.index,
            parent: node.parentIndex ?? null,
            type: node.type ?? "",
            id: node.identifier ?? "",
            label: node.label ?? "",
            rect: [
              round(node.rect?.x ?? 0),
              round(node.rect?.y ?? 0),
              round(node.rect?.width ?? 0),
              round(node.rect?.height ?? 0),
            ],
          },
        ]
  );

/** Probe values the app renders in capture builds (src/shell/sitemap-capture.tsx). */
export interface Probes {
  route: string | null;
  filters: string | null;
  /** Flag key to `on` or `off`. Empty when the probes are missing. */
  flags: Map<string, string>;
}

/** Probe values of a raw tree. Missing probes read as null or empty. */
export const readProbes = (nodes: RawNode[]): Probes => {
  const flags = new Map<string, string>();
  let route: string | null = null;
  let filters: string | null = null;
  for (const node of nodes) {
    const id = node.identifier ?? "";
    if (id === "sitemap-route") {
      route = node.label ?? "";
    } else if (id === "sitemap-filters") {
      filters = node.label ?? "";
    } else if (id.startsWith("sitemap-flag-")) {
      flags.set(id.slice("sitemap-flag-".length), node.label ?? "");
    }
  }
  return { route, filters, flags };
};

/** Identity of a node across trees: type, testID, and label, not position. */
const nodeKey = (node: TreeNode) => `${node.type}|${node.id}|${node.label}`;

/**
 * Nodes of `on` that `off` lacks, counted per key, so a second copy of a row
 * also counts. Only the outermost new node of a subtree is returned.
 */
export const diffTrees = (off: TreeNode[], on: TreeNode[]): TreeNode[] => {
  const available = new Map<string, number>();
  for (const node of off) {
    available.set(nodeKey(node), (available.get(nodeKey(node)) ?? 0) + 1);
  }
  const added = new Set<number>();
  for (const node of on) {
    const key = nodeKey(node);
    const count = available.get(key) ?? 0;
    if (count > 0) {
      available.set(key, count - 1);
    } else {
      added.add(node.index);
    }
  }
  return on.filter(
    (node) =>
      added.has(node.index) &&
      !(node.parent !== null && added.has(node.parent)) &&
      node.type !== "Application"
  );
};

/** How often `tree` holds a node with the identity of `node`. */
export const countNode = (tree: TreeNode[], node: TreeNode) =>
  tree.filter((candidate) => nodeKey(candidate) === nodeKey(node)).length;
