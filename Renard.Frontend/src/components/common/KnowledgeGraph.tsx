import { useEffect, useState } from "react";
import axios from "axios";
import { Brain, Loader2 } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  size: number;
  count: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface KnowledgeGraphProps {
  teamId?: string;
  limit?: number;
}

export function KnowledgeGraph({ teamId, limit = 50 }: KnowledgeGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const API_URL = import.meta.env.VITE_SERVER;

  useEffect(() => {
    fetchKnowledgeGraph();
  }, [teamId, limit]);

  const fetchKnowledgeGraph = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      if (teamId) params.append("teamId", teamId);
      params.append("limit", limit.toString());

      const response = await axios.get(
        `${API_URL}/activity/knowledge-graph?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const graphData = response.data.graph;

      // Position nodes in a circle for simple visualization
      const positionedNodes = graphData.nodes.map((node: GraphNode, index: number) => {
        const angle = (index / graphData.nodes.length) * 2 * Math.PI;
        const radius = 200;
        return {
          ...node,
          x: 250 + radius * Math.cos(angle),
          y: 250 + radius * Math.sin(angle),
        };
      });

      setNodes(positionedNodes);
      setEdges(graphData.edges);
      setError("");
    } catch (err: any) {
      console.error("Error fetching knowledge graph:", err);
      setError("Failed to load knowledge graph");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Knowledge Graph</h3>
        </div>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || nodes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Knowledge Graph</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Brain className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {error || "No data available yet. Start logging activities to build your knowledge graph!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Knowledge Graph</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {nodes.length} topics · {edges.length} connections
        </div>
      </div>

      <div className="relative">
        {/* SVG Graph Visualization */}
        <svg
          width="100%"
          height="500"
          viewBox="0 0 500 500"
          className="bg-secondary/20 rounded-lg"
        >
          {/* Render edges */}
          <g className="edges">
            {edges.map((edge, index) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);

              if (!sourceNode || !targetNode) return null;

              return (
                <line
                  key={index}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={Math.max(1, edge.weight / 3)}
                  opacity={0.3}
                />
              );
            })}
          </g>

          {/* Render nodes */}
          <g className="nodes">
            {nodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedNode(node)}
              >
                <circle
                  r={Math.max(8, Math.min(25, node.size / 2))}
                  fill="hsl(var(--primary))"
                  opacity={selectedNode?.id === node.id ? 1 : 0.7}
                />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fontSize="10"
                  fill="hsl(var(--primary-foreground))"
                  className="font-medium pointer-events-none select-none"
                >
                  {node.label.length > 8
                    ? node.label.substring(0, 6) + "..."
                    : node.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Selected node info */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground capitalize">
                  {selectedNode.label}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Mentioned {selectedNode.count} times in your activities
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top topics list */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Top Topics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {nodes.slice(0, 12).map((node) => (
            <div
              key={node.id}
              className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              onClick={() => setSelectedNode(node)}
            >
              <span className="text-sm text-foreground capitalize truncate">
                {node.label}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {node.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
