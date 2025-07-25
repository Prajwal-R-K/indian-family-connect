import React, { useRef, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Heart, Crown, User as UserIcon } from "lucide-react";


interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  status: string;
  relationship?: string;
  createdBy?: string;
  profilePicture?: string;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  sourceName?: string;
  targetName?: string;
}

interface NodePosition { x: number; y: number; }

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: 'personal' | 'all' | 'hyper';
  level?: number; // for full tree view
  minHeight?: string; // e.g., '300px' for dashboard
  showControls?: boolean;
  defaultNodeRadius?: number;
  defaultLineWidth?: number;
  defaultZoom?: number;
}

const NODE_RADIUS = 60;

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ 
  user, 
  familyMembers,
  viewMode = 'personal',
  level = 1,
  minHeight,
  showControls = true,
  defaultNodeRadius = 60,
  defaultLineWidth = 3,
  defaultZoom = 1
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [previousSelectedNode, setPreviousSelectedNode] = useState<string | null>(null);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<{
    from: FamilyMember | null;
    to: FamilyMember | null;
    fromToRelation: string;
    toFromRelation: string;
  } | null>(null);
  // Draggable state
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);
  const [nodeRadius, setNodeRadius] = useState(defaultNodeRadius);
  const [lineWidth, setLineWidth] = useState(defaultLineWidth);
  const [zoom, setZoom] = useState(defaultZoom);

  // Fetch relationships
  useEffect(() => {
    const fetchRelationships = async () => {
      setIsLoading(true);
      try {
          let relationshipData: Relationship[] = [];
          if (viewMode === 'personal') {
            relationshipData = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
        } else {
            relationshipData = await getFamilyRelationships(user.familyTreeId);
        }
        setRelationships(relationshipData);
      } catch (error) {
        setRelationships([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRelationships();
  }, [user.userId, user.familyTreeId, viewMode]);

  // Filter nodes/edges for each view
  const getVisibleNodesAndEdges = useCallback(() => {
    if (viewMode === 'personal') {
      // Only user and direct connections
      const directEdges = relationships.filter(
        r => r.source === user.userId || r.target === user.userId
      );
      const nodeIds = new Set<string>([user.userId]);
      directEdges.forEach(r => {
        nodeIds.add(r.source);
        nodeIds.add(r.target);
      });
      const nodes = familyMembers.filter(m => nodeIds.has(m.userId));
      return { nodes, edges: directEdges };
    }
    // Full tree and hypergraph handled below
    return { nodes: familyMembers, edges: relationships };
  }, [viewMode, relationships, familyMembers, user.userId]);

  // Layout for personal view: user in center, direct connections in circle
  const calculatePersonalPositions = (nodes: FamilyMember[], edges: Relationship[]) => {
    if (!canvasRef.current) return {};
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const positions: Record<string, NodePosition> = {};
    positions[user.userId] = { x: centerX, y: centerY };
    const directNodes = nodes.filter(n => n.userId !== user.userId);
    directNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / directNodes.length;
      const r = Math.min(width, height) * 0.3 + nodeRadius;
      positions[n.userId] = {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      };
    });
    return positions;
  };

  // Generation-based layout for 'all' view
  const calculateGenerationPositions = (nodes: FamilyMember[], edges: Relationship[]) => {
    if (!canvasRef.current) return {};
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    // 1. Build parent-child map
    const childrenMap: Record<string, string[]> = {};
    const parentCount: Record<string, number> = {};
    nodes.forEach(n => {
      childrenMap[n.userId] = [];
      parentCount[n.userId] = 0;
    });
    edges.forEach(e => {
      const type = e.type.toLowerCase();
      // An edge with type 'son' or 'daughter' means the source is the parent and target is the child.
      // This establishes the hierarchy for the tree layout.
      if ((type === 'son' || type === 'daughter') && childrenMap[e.source] && parentCount[e.target] !== undefined) {
        childrenMap[e.source].push(e.target); // Add child to parent's list
        parentCount[e.target]++; // Increment parent count for the child
      }
    });
    // 2. Find root nodes (eldest generation, no parents)
    const roots = nodes.filter(n => parentCount[n.userId] === 0);
    // 3. BFS to assign generation levels
    const generationMap: Record<string, number> = {};
    const queue: Array<{id: string, gen: number}> = roots.map(r => ({id: r.userId, gen: 0}));
    while (queue.length) {
      const {id, gen} = queue.shift()!;
      generationMap[id] = gen;
      for (const child of childrenMap[id]) {
        if (generationMap[child] === undefined) {
          queue.push({id: child, gen: gen + 1});
        }
      }
    }
    // 4. Group nodes by generation
    // FIX: handle empty generationMap
    const genValues = Object.values(generationMap);
    const maxGen = genValues.length > 0 ? Math.max(...genValues) : 0;
    const genNodes: Record<number, FamilyMember[]> = {};
    nodes.forEach(n => {
      const g = generationMap[n.userId] ?? 0;
      if (!genNodes[g]) genNodes[g] = [];
      genNodes[g].push(n);
    });
    // 5. Assign positions: each generation is a row, siblings spaced evenly
    const positions: Record<string, NodePosition> = {};
    const rowHeight = height / (maxGen + 2);
    for (let gen = 0; gen <= maxGen; gen++) {
      const members = genNodes[gen] || [];
      const colWidth = width / (members.length + 1);
      members.forEach((n, i) => {
        positions[n.userId] = {
          x: colWidth * (i + 1),
          y: rowHeight * (gen + 1)
        };
      });
    }
    return positions;
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragNode(userId);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left - (nodePositions[userId]?.x || 0),
      y: e.clientY - rect.top - (nodePositions[userId]?.y || 0)
    });
    // Attach native listeners
    const onMove = (event: MouseEvent) => {
      setNodePositions(pos => ({
        ...pos,
        [userId]: {
          x: event.clientX - rect.left - dragOffset.x,
          y: event.clientY - rect.top - dragOffset.y
        }
      }));
    };
    const onUp = () => {
      setIsDragging(false);
      setDragNode(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragNode) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setNodePositions(pos => ({
      ...pos,
      [dragNode]: {
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top - dragOffset.y
      }
    }));
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragNode(null);
  };

  // Initialize node positions for personal and all view
  useEffect(() => {
    const { nodes, edges } = getVisibleNodesAndEdges();
    if (viewMode === 'personal') {
      setNodePositions(calculatePersonalPositions(nodes, edges));
    } else if (viewMode === 'all') {
      setNodePositions(calculateGenerationPositions(nodes, edges));
    }
  }, [viewMode, getVisibleNodesAndEdges]);

  // Keep lines updated while dragging
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleMouseMove(e as any);
    const onUp = () => handleMouseUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragNode, dragOffset]);

  // Node click logic
  const handleNodeClick = (userId: string) => {
    if (selectedNode === userId) {
      setSelectedNode(null);
      setPreviousSelectedNode(null);
      setNodeDetailsOpen(false);
      setRelationshipDetailsOpen(false);
      return;
    }
    if (selectedNode && selectedNode !== userId) {
      // Always show both forward and reverse relationships
      const forwardRel = relationships.find(r => r.source === selectedNode && r.target === userId);
      const reverseRel = relationships.find(r => r.source === userId && r.target === selectedNode);
      setSelectedRelationship({
        from: familyMembers.find(m => m.userId === selectedNode)!,
        to: familyMembers.find(m => m.userId === userId)!,
        fromToRelation: forwardRel?.type || '',
        toFromRelation: reverseRel?.type || '',
      });
      setRelationshipDetailsOpen(true);
        setNodeDetailsOpen(false);
        setPreviousSelectedNode(selectedNode);
        setSelectedNode(userId);
      return;
    }
    setSelectedNode(userId);
    setPreviousSelectedNode(null);
      setNodeDetailsOpen(true);
    setRelationshipDetailsOpen(false);
    setSelectedMember(familyMembers.find(m => m.userId === userId)!);
  };

  // Deselect on background click
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setSelectedNode(null);
      setPreviousSelectedNode(null);
      setNodeDetailsOpen(false);
      setRelationshipDetailsOpen(false);
    }
  };

  // Render
  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }
  const { nodes, edges } = getVisibleNodesAndEdges();
  
  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-slate-50 to-blue-50`}
      style={{ minHeight: minHeight || '300px', overflow: 'hidden' }}
    >
      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 z-50 bg-white/90 rounded-lg shadow p-2 flex flex-wrap items-center gap-4 max-w-full overflow-x-auto">
          <div className="flex items-center gap-2">
            <label htmlFor="node-size-slider" className="text-sm font-medium">Node Size:</label>
            <input
              id="node-size-slider"
              type="range"
              min={40}
              max={120}
              value={nodeRadius}
              onChange={e => setNodeRadius(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-gray-600">{nodeRadius}px</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="line-size-slider" className="text-sm font-medium">Line Size:</label>
            <input
              id="line-size-slider"
              type="range"
              min={1}
              max={10}
              value={lineWidth}
              onChange={e => setLineWidth(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-gray-600">{lineWidth}px</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="zoom-slider" className="text-sm font-medium">Zoom:</label>
            <input
              id="zoom-slider"
              type="range"
              min={0.3}
              max={2}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-gray-600">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      )}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-pointer relative overflow-hidden flex items-center justify-center"
      >
        {/* Centered graph content wrapper for scaling */}
        <div
          className="graph-content relative"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'auto', minHeight: '100%', minWidth: '100%', overflow: 'hidden' }}
        >
          {/* Connection Lines */}
          <svg className="absolute left-0 top-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            {edges.map((rel, idx) => {
              const source = nodePositions[rel.source];
              const target = nodePositions[rel.target];
              if (!source || !target) return null;
              // Quadratic Bezier curve for all edges
              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const mx = (source.x + target.x) / 2;
              const my = (source.y + target.y) / 2;
              const curve = 0.25 * Math.sqrt(dx * dx + dy * dy);
              const cx = mx - curve * (dy / Math.sqrt(dx * dx + dy * dy));
              const cy = my + curve * (dx / Math.sqrt(dx * dx + dy * dy));
              return (
                <path
                  key={idx}
                  d={`M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`}
                  stroke="url(#connection-gradient)"
                  strokeWidth={lineWidth}
                  fill="none"
                  opacity={0.8}
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.15))' }}
                />
              );
            })}
          </svg>
          {/* Nodes */}
          {(nodes.length > 0 ? nodes : [user]).map((member) => {
            const pos = nodePositions[member.userId] || { x: 120, y: 80 };
            const isMainUser = member.userId === user.userId;
            const isSelected = selectedNode === member.userId;
            return (
              <div
                key={member.userId}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none
                  ${isMainUser ? 'z-20' : 'z-10'}
                  ${isSelected ? 'scale-110' : 'hover:scale-105'}
                  group
                `}
                style={{ left: pos.x, top: pos.y, width: nodeRadius * 2, height: nodeRadius * 2 }}
                onMouseDown={e => handleMouseDown(e, member.userId)}
                onClick={e => { e.stopPropagation(); handleNodeClick(member.userId); }}
              >
                {/* Animated glowing ring for selected/hovered nodes */}
                <div
                  className={`absolute inset-0 rounded-full pointer-events-none
                    ${isSelected ? 'animate-pulse-glow-selected' : 'group-hover:animate-pulse-glow-hover'}`}
                  style={{
                    boxShadow: isSelected
                      ? '0 0 32px 8px rgba(255, 165, 0, 0.5)'
                      : undefined
                  }}
                />
                <div className={`relative w-full h-full flex items-center justify-center rounded-full shadow-lg border-4
                  ${isMainUser ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 border-blue-300'
                    : isSelected ? 'bg-gradient-to-br from-orange-400 via-yellow-400 to-red-500 border-orange-400'
                    : 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 border-green-300'}
                  transition-all duration-300
                `}>
                  {member.profilePicture ? (
                    <img src={member.profilePicture} alt={member.name} className="w-16 h-16 rounded-full object-cover border-2 border-white" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-white" />
                  )}
                  {isMainUser && <div className="absolute -top-3 -right-3 text-3xl drop-shadow-lg">👑</div>}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-3 border-white shadow-md ${member.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                </div>
                {/* Name label with better styling */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 px-4 py-2 bg-white rounded-xl shadow-lg border border-gray-200 min-w-max">
                  <div className="text-sm font-semibold text-gray-800 text-center">{member.name}</div>
                  {/* REMOVE relationship label here */}
        </div>
        </div>
            );
          })}
        </div>
      </div>
      {/* Node Details Dialog */}
      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedMember?.profilePicture} />
                <AvatarFallback>{selectedMember?.name?.[0]}</AvatarFallback>
              </Avatar>
              {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>Family member details and information</DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={selectedMember?.status === 'active' ? 'default' : 'secondary'}>{selectedMember?.status}</Badge>
                </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm text-muted-foreground">{selectedMember?.email}</span>
              </div>
            {/* Show relationship from main user to selected node, but not for main user */}
            {selectedMember && selectedMember.userId !== user.userId && (() => {
              const rel = relationships.find(r => r.source === user.userId && r.target === selectedMember.userId);
              if (rel && rel.type) {
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Relationship:</span>
                    <span className="text-sm text-muted-foreground">{rel.type}</span>
                  </div>
                );
              }
              return null;
            })()}
            {selectedMember?.userId === user.userId && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">You (Main User)</span>
              </div>
            )}
            </div>
        </DialogContent>
      </Dialog>
      {/* Relationship Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Relationship Details
            </DialogTitle>
            <DialogDescription>Connection between family members</DialogDescription>
          </DialogHeader>
          {selectedRelationship && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedRelationship.from?.profilePicture} />
                    <AvatarFallback>{selectedRelationship.from?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedRelationship.from?.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">→</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedRelationship.to?.profilePicture} />
                    <AvatarFallback>{selectedRelationship.to?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedRelationship.to?.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Only show Forward Relationship if it exists */}
                {selectedRelationship.fromToRelation && selectedRelationship.fromToRelation !== '' && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Forward Relationship</div>
                    <div className="text-sm text-blue-700">{selectedRelationship.fromToRelation}</div>
                </div>
                )}
                {/* Only show Reverse Relationship if it exists */}
                {selectedRelationship.toFromRelation && selectedRelationship.toFromRelation !== '' && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-900">Reverse Relationship</div>
                    <div className="text-sm text-green-700">{selectedRelationship.toFromRelation}</div>
                </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;
