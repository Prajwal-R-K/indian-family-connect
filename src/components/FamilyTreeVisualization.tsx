import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  Handle,
  ConnectionLineType,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { Heart, Crown, User as UserIcon } from "lucide-react";

interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  status: string;
  relationship?: string;
  createdBy?: string;
  profilePicture?: string;
  gender?: string;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  sourceName?: string;
  targetName?: string;
}

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: 'personal' | 'all' | 'hyper';
  level?: number;
  minHeight?: string;
  showControls?: boolean;
  defaultNodeRadius?: number;
  defaultLineWidth?: number;
  defaultZoom?: number;
}

// Relationship categorization for positioning
const getRelationshipCategory = (relationship: string): 'ancestor' | 'descendant' | 'sibling' => {
  const ancestors = ['father', 'mother', 'grandfather', 'grandmother', 'great-grandfather', 'great-grandmother'];
  const descendants = ['son', 'daughter', 'grandson', 'granddaughter', 'great-grandson', 'great-granddaughter'];
  const siblings = ['brother', 'sister', 'spouse', 'wife', 'husband'];
  
  if (ancestors.includes(relationship.toLowerCase())) return 'ancestor';
  if (descendants.includes(relationship.toLowerCase())) return 'descendant';
  return 'sibling';
};

// Get reciprocal relationship with gender
const getReciprocalRelationship = (relationship: string, targetGender: string, sourceGender?: string): string => {
  const reciprocals: Record<string, Record<string, string>> = {
    father: { male: 'son', female: 'daughter' },
    mother: { male: 'son', female: 'daughter' },
    son: { male: 'father', female: 'mother' },
    daughter: { male: 'father', female: 'mother' },
    brother: { male: 'brother', female: 'sister' },
    sister: { male: 'brother', female: 'sister' },
    grandfather: { male: 'grandson', female: 'granddaughter' },
    grandmother: { male: 'grandson', female: 'granddaughter' },
    grandson: { male: 'grandfather', female: 'grandmother' },
    granddaughter: { male: 'grandfather', female: 'grandmother' },
    husband: { female: 'wife' },
    wife: { male: 'husband' },
    spouse: { male: 'husband', female: 'wife' }
  };
  
  const targetReciprocal = reciprocals[relationship.toLowerCase()]?.[targetGender] || relationship;
  if (sourceGender && ['spouse', 'husband', 'wife'].includes(relationship.toLowerCase())) {
    return reciprocals[targetReciprocal.toLowerCase()]?.[sourceGender] || targetReciprocal;
  }
  // Ensure reciprocal matches the source's perspective for parent-child
  if (['son', 'daughter'].includes(relationship.toLowerCase()) && sourceGender) {
    return reciprocals[relationship.toLowerCase()]?.[sourceGender] || relationship;
  }
  return targetReciprocal;
};

// Custom family member node component
const FamilyMemberNode = ({ data, id }: { data: any; id: string }) => {
  const getNodeColor = () => {
    if (data.isRoot) return 'border-amber-400 bg-amber-50';
    if (data.gender === 'male') return 'border-blue-400 bg-blue-50';
    if (data.gender === 'female') return 'border-pink-400 bg-pink-50';
    return 'border-gray-400 bg-gray-50';
  };

  return (
    <div className={`relative ${getNodeColor()} border-2 rounded-xl p-3 min-w-[160px] shadow-lg hover:shadow-xl transition-shadow`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-gray-400" />
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-gray-400" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-gray-400" />
      
      <div className="flex flex-col items-center space-y-2">
        <Avatar className="w-12 h-12">
          <AvatarImage src={data.profilePicture} />
          <AvatarFallback className="text-xs font-semibold">
            {data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <div className="font-semibold text-sm text-gray-800">{data.name}</div>
          {data.relationship && (
            <Badge variant="secondary" className="text-xs mt-1">
              {data.relationship}
            </Badge>
          )}
          {data.isRoot && (
            <Crown className="w-4 h-4 text-amber-500 mx-auto mt-1" />
          )}
        </div>
      </div>
    </div>
  );
};

// Calculate positions based on heritage layout logic
const calculateNodePositions = (
  members: FamilyMember[], 
  relationships: Relationship[], 
  createdByUserId: string
): { nodes: Node[]; edges: Edge[] } => {
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach(member => nodeMap.set(member.userId, member));
  
  const positions = new Map<string, { x: number; y: number; generation: number }>();
  const processedNodes = new Set<string>();
  
  // Start with the createdBy node at center
  const rootPosition = { x: 0, y: 0, generation: 0 };
  positions.set(createdByUserId, rootPosition);
  
  const queue: Array<{ userId: string; fromUserId?: string }> = [{ userId: createdByUserId }];
  
  // Generation tracking for y-positioning
  const generationCounts = new Map<number, number>();
  generationCounts.set(0, 0);
  
  while (queue.length > 0) {
    const { userId, fromUserId } = queue.shift()!;
    
    if (processedNodes.has(userId)) continue;
    processedNodes.add(userId);
    
    const currentPos = positions.get(userId)!;
    
    // Find all relationships from this node
    const nodeRelationships = relationships.filter(rel => rel.source === userId);
    
    let ancestorCount = 0;
    let descendantCount = 0;
    let siblingCount = 0;
    
    nodeRelationships.forEach(rel => {
      if (processedNodes.has(rel.target)) return;
      
      const category = getRelationshipCategory(rel.type);
      const targetMember = nodeMap.get(rel.target);
      if (!targetMember) return;
      
      let targetGeneration: number;
      let xOffset: number;
      
      switch (category) {
        case 'ancestor':
          targetGeneration = currentPos.generation - 1;
          xOffset = ancestorCount * 200 - ((nodeRelationships.filter(r => getRelationshipCategory(r.type) === 'ancestor').length - 1) * 100);
          ancestorCount++;
          break;
          
        case 'descendant':
          targetGeneration = currentPos.generation + 1;
          xOffset = descendantCount * 200 - ((nodeRelationships.filter(r => getRelationshipCategory(r.type) === 'descendant').length - 1) * 100);
          descendantCount++;
          break;
          
        case 'sibling':
        default:
          targetGeneration = currentPos.generation;
          xOffset = currentPos.x + (siblingCount + 1) * 250;
          siblingCount++;
          break;
      }
      
      // Count nodes in generation for x-positioning
      const genCount = generationCounts.get(targetGeneration) || 0;
      generationCounts.set(targetGeneration, genCount + 1);
      
      const targetPosition = {
        x: category === 'sibling' ? xOffset : currentPos.x + xOffset,
        y: targetGeneration * 200,
        generation: targetGeneration
      };
      
      positions.set(rel.target, targetPosition);
      queue.push({ userId: rel.target, fromUserId: userId });
    });
  }
  
  // Convert to nodes and edges
  const nodes: Node[] = Array.from(positions.entries()).map(([userId, pos]) => {
    const member = nodeMap.get(userId)!;
    return {
      id: userId,
      type: 'familyMember',
      position: { x: pos.x + 1000, y: pos.y + 500 }, // Offset to center in viewport
      data: {
        name: member.name,
        email: member.email,
        relationship: member.relationship,
        profilePicture: member.profilePicture,
        gender: member.gender,
        isRoot: userId === createdByUserId,
        status: member.status
      }
    };
  });
  
  const edges: Edge[] = relationships.map(rel => {
    const sourcePos = positions.get(rel.source)?.y || 0;
    const targetPos = positions.get(rel.target)?.y || 0;
    const isTopToBottom = sourcePos < targetPos; // Ensure top-to-bottom direction
    const sourceId = isTopToBottom ? rel.source : rel.target;
    const targetId = isTopToBottom ? rel.target : rel.source;
    const sourceMember = nodeMap.get(rel.source); // Original source
    const targetMember = nodeMap.get(rel.target); // Original target
    
    if (!sourceMember?.gender || !targetMember?.gender) {
      throw new Error(`Missing gender for userId ${rel.source} or ${rel.target}`);
    }

    // Use original relationship type as basis, adjust direct based on direction and target gender
    const originalRel = rel.type.toLowerCase();
    let directRel = isTopToBottom ? originalRel : getReciprocalRelationship(originalRel, targetMember.gender, sourceMember.gender);
    const reciprocalRel = isTopToBottom ? getReciprocalRelationship(originalRel, targetMember.gender, sourceMember.gender) : originalRel;

    // Override directRel to match target gender for parent-child relationships
    if (isTopToBottom && ['father', 'mother'].includes(originalRel)) {
      directRel = targetMember.gender === 'male' ? 'son' : 'daughter';
    } else if (!isTopToBottom && ['son', 'daughter'].includes(originalRel)) {
      directRel = sourceMember.gender === 'male' ? 'father' : 'mother';
    }

    return {
      id: `${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      data: {
        relationship: directRel,
        reciprocalRelationship: reciprocalRel,
        sourceName: sourceMember.name,
        targetName: targetMember.name
      }
    };
  });
  
  return { nodes, edges };
};

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ 
  user, 
  familyMembers,
  viewMode = 'personal',
  minHeight = '600px',
  showControls = true
}) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);
  const [showReciprocalRelation, setShowReciprocalRelation] = useState(false);
  
  // Calculate nodes and edges
  const { nodes: calculatedNodes, edges: calculatedEdges } = React.useMemo(() => {
    if (!relationships.length || !familyMembers.length) {
      return { nodes: [], edges: [] };
    }
    return calculateNodePositions(familyMembers, relationships, user.userId);
  }, [familyMembers, relationships, user.userId]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(calculatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(calculatedEdges);
  
  // Update nodes and edges when calculated values change
  useEffect(() => {
    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [calculatedNodes, calculatedEdges, setNodes, setEdges]);
  
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
        console.error('Error fetching relationships:', error);
        setRelationships([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRelationships();
  }, [user.userId, user.familyTreeId, viewMode]);
  
  // Handle edge click to show relationship details
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setShowReciprocalRelation(false);
    setRelationshipDetailsOpen(true);
  }, []);
  
  const toggleReciprocalRelation = () => {
    setShowReciprocalRelation(!showReciprocalRelation);
  };
  
  const getDisplayedRelationship = () => {
    if (!selectedEdge) return '';
    
    const relationship = showReciprocalRelation 
      ? selectedEdge.data?.reciprocalRelationship as string 
      : selectedEdge.data?.relationship as string;
    
    return relationship;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family tree...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border" style={{ height: minHeight }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        className="bg-gradient-to-br from-blue-50 to-indigo-100"
      >
        <Background color="#e0e7ff" gap={20} />
        {showControls && <Controls />}
      </ReactFlow>
      
      {/* Relationship Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Relationship Details
            </DialogTitle>
            <DialogDescription>
              Click to view the reciprocal relationship
            </DialogDescription>
          </DialogHeader>
          
          {selectedEdge && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-800">
                  {getDisplayedRelationship()}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {showReciprocalRelation ? 'Reciprocal relationship' : 'Direct relationship'}
                </div>
              </div>
              
              <button
                onClick={toggleReciprocalRelation}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {showReciprocalRelation ? 'Show Direct' : 'Show Reciprocal'}
              </button>
              
              <div className="text-xs text-gray-500 text-center">
                From: {(selectedEdge.data?.sourceName as string) || 'Unknown'} → To: {(selectedEdge.data?.targetName as string) || 'Unknown'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;