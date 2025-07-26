import React, { useRef, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships'; // Keep this if used elsewhere, but for 'all' view, we use getFamilyRelationships
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
  gender?: string; // Add gender to FamilyMember interface
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

// Helper to get the reciprocal relationship label
const getReciprocalRelationship = (relationship: string, targetMemberGender?: string): string | null => {
  const reciprocalMap: Record<string, string> = {
    "father": targetMemberGender === 'female' ? 'daughter' : 'son',
    "mother": targetMemberGender === 'female' ? 'daughter' : 'son',
    "son": "father",
    "daughter": "mother",
    "brother": targetMemberGender === 'female' ? 'sister' : 'brother',
    "sister": targetMemberGender === 'female' ? 'sister' : 'brother',
    "husband": "wife",
    "wife": "husband",
    "grandfather": targetMemberGender === 'female' ? 'granddaughter' : 'grandson',
    "grandmother": targetMemberGender === 'female' ? 'granddaughter' : 'grandson',
    "grandson": "grandfather",
    "granddaughter": "grandmother",
  };
  return reciprocalMap[relationship.toLowerCase()] || null;
};


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
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [selectedRelationshipDetails, setSelectedRelationshipDetails] = useState<{
    from: FamilyMember | null;
    to: FamilyMember | null;
    fromToRelation: string;
    toFromRelation: string | null; // Changed to nullable
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
           // In 'all' view, fetch all relationships for the tree
          if (viewMode === 'all') {
            relationshipData = await getFamilyRelationships(user.familyTreeId);
        } else {
             // Keep personalized view logic if needed, but ensure it fetches the base relationships
             // If getUserPersonalizedFamilyTree already returns Relationship[], use it.
             // Otherwise, you might need to adjust its return type or fetch
             // from getFamilyRelationships and filter here for personal view.
             // Assuming getUserPersonalizedFamilyTree returns a compatible format for now.
             relationshipData = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
        }
        setRelationships(relationshipData);
      } catch (error) {
        console.error("Error fetching relationships:", error);
        setRelationships([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRelationships();
     // Depend on user and viewMode to refetch when needed
  }, [user.userId, user.familyTreeId, viewMode]);

  // Filter nodes/edges for each view - Keep this logic
  const getVisibleNodesAndEdges = useCallback(() => {
    if (viewMode === 'personal') {
      // In personal view, we need the direct relationships involving the user
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
    // For 'all' view, show all fetched nodes and relationships
    return { nodes: familyMembers, edges: relationships };
  }, [viewMode, relationships, familyMembers, user.userId]);

  // Layout for personal view: user in center, direct connections in circle - Keep this logic
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

  // Generation-based layout for 'all' view - Keep and potentially enhance this logic
  const calculateGenerationPositions = (nodes: FamilyMember[], edges: Relationship[]) => {
      if (!canvasRef.current) return {};
      const rect = canvasRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // 1. Build parent-child map based on SON/DAUGHTER relationships for hierarchical layout
      const childrenMap: Record<string, string[]> = {};
      const parentCount: Record<string, number> = {};
      const edgeTypeMap: Record<string, string> = {}; // Map edge ID to type

      nodes.forEach(n => {
        childrenMap[n.userId] = [];
        parentCount[n.userId] = 0;
      });

      edges.forEach(e => {
        const type = e.type.toLowerCase();
         edgeTypeMap[`${e.source}-${e.target}`] = type; // Store edge type

        // Only consider direct parent-child for hierarchical layout
        if ((type === 'son' || type === 'daughter')) {
            // Ensure source and target exist in the node list before creating hierarchy
            const sourceExists = nodes.some(n => n.userId === e.source);
            const targetExists = nodes.some(n => n.userId === e.target);

            if (sourceExists && targetExists) {
              childrenMap[e.source].push(e.target);
              parentCount[e.target]++;
            }
        }
      });

      // 2. Find root nodes (eldest generation in the parent-child hierarchy)
      // Roots are nodes with no incoming 'son' or 'daughter' relationships that have a source within the visible nodes
      const potentialRoots = nodes.filter(n => {
          const hasIncomingChildRel = edges.some(e =>
             e.target === n.userId && (e.type.toLowerCase() === 'son' || e.type.toLowerCase() === 'daughter') && nodes.some(sourceNode => sourceNode.userId === e.source)
          );
           return !hasIncomingChildRel;
      });


      // 3. BFS to assign generation levels
      const generationMap: Record<string, number> = {};
      const queue: Array<{id: string, gen: number}> = potentialRoots.map(r => ({id: r.userId, gen: 0}));
      const visited = new Set<string>();

      while (queue.length) {
        const {id, gen} = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        generationMap[id] = gen;

        // Find children (nodes with outgoing 'son' or 'daughter' relationships)
        edges.filter(e => e.source === id && (e.type.toLowerCase() === 'son' || e.type.toLowerCase() === 'daughter')).forEach(e => {
            // Ensure target node is in the visible nodes
            if (nodes.some(n => n.userId === e.target) && !visited.has(e.target)) {
                queue.push({id: e.target, gen: gen + 1});
            }
        });
          // Find parents (nodes with incoming 'son' or 'daughter' relationships)
          edges.filter(e => e.target === id && (e.type.toLowerCase() === 'son' || e.type.toLowerCase() === 'daughter')).forEach(e => {
             // Ensure source node is in the visible nodes
             if (nodes.some(n => n.userId === e.source) && !visited.has(e.source)) {
                queue.push({id: e.source, gen: gen - 1});
             }
          });
      }

      // 4. Group nodes by generation
      const genValues = Object.values(generationMap);
      const minGen = genValues.length > 0 ? Math.min(...genValues) : 0;
      const maxGen = genValues.length > 0 ? Math.max(...genValues) : 0;
      const genNodes: Record<number, FamilyMember[]> = {};

      nodes.forEach(n => {
          const g = generationMap[n.userId] !== undefined ? generationMap[n.userId] : 0; // Default to 0 if no generation assigned
          const normalizedGen = g - minGen; // Normalize generations
          if (!genNodes[normalizedGen]) genNodes[normalizedGen] = [];
          genNodes[normalizedGen].push(n);
      });

      // 5. Assign positions: each generation is a row, siblings spaced evenly
      const positions: Record<string, NodePosition> = {};
       const totalGenerations = maxGen - minGen + 1;
       const rowHeight = height / (totalGenerations + 1); // Add some padding

      for (let gen = 0; gen < totalGenerations; gen++) {
        const members = genNodes[gen] || [];
        const colWidth = width / (members.length + 1); // Even spacing
        members.forEach((n, i) => {
          positions[n.userId] = {
            x: colWidth * (i + 1),
            y: rowHeight * (gen + 1)
          };
        });
      }
       // Adjust positions to center the entire graph horizontally
       const minX = Math.min(...Object.values(positions).map(p => p.x));
       const maxX = Math.max(...Object.values(positions).map(p => p.x));
       const graphWidth = maxX - minX;
       const offsetX = (width - graphWidth) / 2 - minX;

       Object.keys(positions).forEach(userId => {
           positions[userId].x += offsetX;
       });


      return positions;
  };


  // Drag logic - Keep this logic
  const handleMouseDown = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
     // Only allow dragging if viewMode is not 'all' or you want to allow manual adjustments
     if (viewMode === 'all') return; // Prevent dragging in auto-layout mode

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

   // Mouse move and up handlers for drag logic - Keep these logic
   const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragNode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setNodePositions(pos => ({
        ...pos,
        [dragNode]: {
            x: e.clientX - rect.left - dragOffset.x,
            y: e.clientY - rect.top - dragOffset.y
        }
    }));
}, [isDragging, dragNode, dragOffset]);

const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNode(null);
}, []);

  // Keep lines updated while dragging - Keep this logic
  useEffect(() => {
    if (!isDragging) return;
     const onMove = (e: MouseEvent) => {
        if (dragNode) { // Check if dragNode is not null
            handleMouseMove(e as any);
        }
     };
    const onUp = () => handleMouseUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragNode, dragOffset, handleMouseMove, handleMouseUp]); // Include dependencies


  

  // Initialize node positions based on view mode and data
  useEffect(() => {
      const { nodes: visibleNodes, edges: visibleEdges } = getVisibleNodesAndEdges();
      let positions: Record<string, NodePosition> = {};

      if (viewMode === 'personal') {
          positions = calculatePersonalPositions(visibleNodes, visibleEdges);
      } else if (viewMode === 'all') {
           // Calculate generation-based positions
           positions = calculateGenerationPositions(visibleNodes, visibleEdges);
      }
      // For 'hyper' view or other custom views, you would add different layout logic here.

      setNodePositions(positions);

      // Fit view after initial layout
      // You would need to implement a fit view logic similar to react-flow-renderer
      // or adjust your initial zoom and pan to center the content.
       // A simple way is to center the view on the calculated positions' bounding box.
       if (canvasRef.current && Object.keys(positions).length > 0) {
           const xValues = Object.values(positions).map(p => p.x);
           const yValues = Object.values(positions).map(p => p.y);
           const minX = Math.min(...xValues);
           const maxX = Math.max(...xValues);
           const minY = Math.min(...yValues);
           const maxY = Math.max(...yValues);

           const graphWidth = maxX - minX + nodeRadius * 2; // Add node size
           const graphHeight = maxY - minY + nodeRadius * 2; // Add node size

           const containerWidth = canvasRef.current.offsetWidth;
           const containerHeight = canvasRef.current.offsetHeight;

           const zoomX = containerWidth / graphWidth;
           const zoomY = containerHeight / graphHeight;
           const fitZoom = Math.min(zoomX, zoomY) * 0.8; // Fit with some padding

           const centerX = (minX + maxX) / 2;
           const centerY = (minY + maxY) / 2;

            // Adjust pan to center the graph
           const panX = containerWidth / 2 - centerX * fitZoom;
           const panY = containerHeight / 2 - centerY * fitZoom;

           setZoom(fitZoom);
           // You would need to apply this pan to your canvas element or graph wrapper
           // if you are manually handling pan. In the current structure, zooming
           // is handled by CSS transform on the .graph-content, but panning is not.
           // Manual pan implementation would be needed here.
       }


  }, [viewMode, getVisibleNodesAndEdges, nodeRadius]); // Depend on relevant state/props

  // Node click logic to display details and inferred relationships
  const handleNodeClick = useCallback((userId: string) => {
    // Close any open relationship details when a node is clicked
    setRelationshipDetailsOpen(false);
    setSelectedRelationshipDetails(null);

    if (selectedNode === userId) {
      // Clicking the already selected node, close details
      setSelectedNode(null);
      setNodeDetailsOpen(false);
      setSelectedMember(null);
      return;
    }

    // Find the clicked family member details
    const clickedMember = familyMembers.find(member => member.userId === userId);
    if (!clickedMember) {
        setSelectedNode(null);
        setNodeDetailsOpen(false);
        setSelectedMember(null);
        return;
    }

    setSelectedNode(userId);
    setNodeDetailsOpen(true);
    setSelectedMember(clickedMember);

  }, [familyMembers, relationships]);


  // Relationship details logic on line click (or derived from node click for now)
  // We will trigger this from the Node Details Panel for simplicity based on your current structure
  const handleRelationshipClick = useCallback((fromUserId: string, toUserId: string) => {
       // Find the direct relationship from the stored relationships
       const directRelationship = relationships.find(rel => rel.source === fromUserId && rel.target === toUserId);

       // Find the members involved
       const fromMember = familyMembers.find(m => m.userId === fromUserId);
       const toMember = familyMembers.find(m => m.userId === toUserId);

       if (fromMember && toMember && directRelationship) {
           // Infer the reciprocal relationship
           const reciprocalRelationshipType = getReciprocalRelationship(directRelationship.type, fromMember.gender); // Infer reciprocal from target (toMember) back to source (fromMember)


           setSelectedRelationshipDetails({
               from: fromMember,
               to: toMember,
               fromToRelation: directRelationship.type,
               toFromRelation: reciprocalRelationshipType,
           });
           setRelationshipDetailsOpen(true);
           setNodeDetailsOpen(false); // Close node details when showing relationship details

       } else {
           // Handle cases where relationship or members are not found (optional)
            setSelectedRelationshipDetails(null);
            setRelationshipDetailsOpen(false);
       }

  }, [familyMembers, relationships]);


  // Deselect on background click - Keep this logic
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Check if the click target is the canvas container itself, not a child node
    if (canvasRef.current && event.target === canvasRef.current) {
        setSelectedNode(null);
        setNodeDetailsOpen(false);
        setRelationshipDetailsOpen(false);
        setSelectedMember(null);
        setSelectedRelationshipDetails(null);
    }
  }, []);


  // Render
  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }
  const { nodes, edges } = getVisibleNodesAndEdges();

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-slate-50 to-blue-50`}
      style={{ minHeight: minHeight || '300px', overflow: 'hidden' }}
    >
      {/* Controls - Keep this logic */}
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
        onClick={handleCanvasClick} // Handle background click
      >
        {/* Centered graph content wrapper for scaling */}
        <div
          className="graph-content relative"
           // Apply zoom transform
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', pointerEvents: isDragging ? 'none' : 'auto', minHeight: '100%', minWidth: '100%' }}
           onMouseMove={handleMouseMove} // Add mouse move for dragging
           onMouseUp={handleMouseUp} // Add mouse up for dragging
        >
          {/* Connection Lines - Keep this logic */}
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
          {/* Nodes - Keep this logic */}
          {(nodes.length > 0 ? nodes : [user]).map((member) => {
            const pos = nodePositions[member.userId] || { x: 0, y: 0 }; // Default position if not calculated
            const isMainUser = member.userId === user.userId;
            const isSelected = selectedNode === member.userId;
            return (
              <div // This is the outer div for the node
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
                {/* Animated glowing ring for selected/hovered nodes - Keep this logic */}
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
                    <img src={member.profilePicture} alt={member.name} className="w-full h-full rounded-full object-cover border-2 border-white" /> 
                  ) : (
                    <UserIcon className="w-10 h-10 text-white" />
                  )}
                  {isMainUser && <div className="absolute -top-3 -right-3 text-3xl drop-shadow-lg">👑</div>}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-3 border-white shadow-md ${member.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                </div>
                {/* Name label with better styling - Keep this logic */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 px-4 py-2 bg-white rounded-xl shadow-lg border border-gray-200 min-w-max">
                  <div className="text-sm font-semibold text-gray-800 text-center">{member.name}</div>
                </div>
              </div> // This is the correct closing for the outer div
              // REMOVE the extra </div> that was here
            );
          })}
        </div>
      </div>
      {/* Node Details Dialog - Modified */}
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
            <DialogDescription>Family member details and relationships</DialogDescription> {/* Updated description */}
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
             {selectedMember?.gender && ( // Display gender if available
                <div className="flex items-center justify-between">
                 <span className="text-sm font-medium">Gender:</span>
                 <span className="text-sm text-muted-foreground">{selectedMember.gender}</span>
                </div>
             )}

            {/* Display relationships involving the selected node */}
             {selectedMember && (
                <div className="mt-4">
                    <h4 className="text-base font-semibold mb-2">Connections:</h4>
                    {relationships.filter(rel => rel.source === selectedMember.userId || rel.target === selectedMember.userId).length > 0 ? (
                        <ul className="space-y-2">
                            {relationships
                                .filter(rel => rel.source === selectedMember.userId || rel.target === selectedMember.userId)
                                .map((rel, index) => {
                                    const otherMember = familyMembers.find(m =>
                                        m.userId === (rel.source === selectedMember.userId ? rel.target : rel.source)
                                    );
                                     if (!otherMember) return null;

                                     // Determine the relationship from the perspective of the selected node
                                     const relationFromSelected = rel.source === selectedMember.userId ? rel.type : getReciprocalRelationship(rel.type, selectedMember.gender);
                                     const relationToSelected = rel.target === selectedMember.userId ? rel.type : getReciprocalRelationship(rel.type, otherMember.gender);


                                    return (
                                        <li key={index} className="p-2 bg-muted rounded-md flex items-center justify-between cursor-pointer hover:bg-muted/80"
                                             onClick={() => handleRelationshipClick(rel.source, rel.target)} // Handle click to show relationship details
                                        >
                                             <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                  <AvatarImage src={otherMember.profilePicture} />
                                                  <AvatarFallback>{otherMember.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                 <span>{otherMember.name}</span>
                                             </div>
                                             {/* Display the relationship from the perspective of the selected node */}
                                             {relationFromSelected && <Badge variant="secondary">{relationFromSelected}</Badge>}
                                             {/* If both directions are needed, you can show both */}
                                             {/* {relationFromSelected && relationToSelected && relationFromSelected !== relationToSelected && (
                                                 <Badge variant="secondary">{relationToSelected}</Badge>
                                             )} */}

                                        </li>
                                    );
                                })}
                      </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No direct connections.</p>
                    )}
                </div>
             )}
            </div>
        </DialogContent>
      </Dialog>
      {/* Relationship Details Dialog - Modified to show inferred reciprocal */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Relationship Details
            </DialogTitle>
            <DialogDescription>Connection between family members</DialogDescription>
          </DialogHeader>
          {selectedRelationshipDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedRelationshipDetails.from?.profilePicture} />
                    <AvatarFallback>{selectedRelationshipDetails.from?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedRelationshipDetails.from?.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedRelationshipDetails.to?.profilePicture} />
                    <AvatarFallback>{selectedRelationshipDetails.to?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedRelationshipDetails.to?.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Display the stored relationship type */}
                {selectedRelationshipDetails.fromToRelation && selectedRelationshipDetails.fromToRelation !== '' && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Stored Relationship</div>
                    <div className="text-sm text-blue-700">{selectedRelationshipDetails.fromToRelation}</div>
                </div>
                )}
                {/* Display the inferred reciprocal relationship type */}
                {selectedRelationshipDetails.toFromRelation && selectedRelationshipDetails.toFromRelation !== '' && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-900">Inferred Reciprocal</div>
                    <div className="text-sm text-green-700">{selectedRelationshipDetails.toFromRelation}</div>
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
