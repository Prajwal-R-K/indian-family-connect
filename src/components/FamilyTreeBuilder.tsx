
import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, Save, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createUser, createReciprocalRelationship } from '@/lib/neo4j';
import { generateId } from '@/lib/utils';

interface FamilyMemberNode extends Node {
  data: {
    label: string;
    name: string;
    email: string;
    phone?: string;
    relationship?: string;
    generation: number;
    isRoot?: boolean;
    onAddRelation?: (nodeId: string) => void;
  };
}

const relationshipTypes = [
  'father', 'mother', 'son', 'daughter', 'brother', 'sister',
  'husband', 'wife', 'grandfather', 'grandmother', 'grandson', 'granddaughter'
];

// Custom node component
const FamilyNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="relative bg-white border-2 border-blue-200 rounded-xl p-4 min-w-[200px] shadow-lg hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      
      <div className="flex flex-col items-center space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-slate-800 text-sm">{data.name}</div>
          <div className="text-xs text-slate-600">{data.email}</div>
          {data.relationship && !data.isRoot && (
            <div className="text-xs font-medium text-blue-600 mt-1 capitalize bg-blue-50 px-2 py-1 rounded">
              {data.relationship}
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant="outline"
          className="w-8 h-8 rounded-full p-0 hover:bg-blue-50 border-blue-300"
          onClick={() => data.onAddRelation && data.onAddRelation(id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const nodeTypes = {
  familyMember: FamilyNode,
};

interface FamilyTreeBuilderProps {
  onComplete: (familyData: any) => void;
  onBack: () => void;
  user: any;
}

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack, user }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with "You" node in center
  useEffect(() => {
    const rootNode: FamilyMemberNode = {
      id: 'root',
      type: 'familyMember',
      position: { x: 0, y: 0 },
      data: {
        label: user?.name || 'You',
        name: user?.name || 'You',
        email: user?.email || '',
        generation: 0,
        isRoot: true,
        onAddRelation: handleAddRelation
      }
    };
    setNodes([rootNode]);
  }, [user]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleAddRelation = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowAddDialog(true);
    setNewMember({ name: '', email: '', phone: '', relationship: '' });
  };

  // Calculate generation based on relationship
  const getGeneration = (relationship: string, parentGeneration: number): number => {
    const parentRelationships = ['father', 'mother', 'grandfather', 'grandmother'];
    const childRelationships = ['son', 'daughter', 'grandson', 'granddaughter'];
    const siblingRelationships = ['brother', 'sister'];
    const spouseRelationships = ['husband', 'wife'];

    if (parentRelationships.includes(relationship)) {
      return parentGeneration - 1;
    } else if (childRelationships.includes(relationship)) {
      return parentGeneration + 1;
    } else if (siblingRelationships.includes(relationship) || spouseRelationships.includes(relationship)) {
      return parentGeneration;
    }
    return parentGeneration;
  };

  // Enhanced position calculation for proper tree structure
  const calculateNodePosition = (
    parentNode: Node, 
    relationship: string, 
    existingNodes: Node[]
  ): { x: number; y: number } => {
    const parentPos = parentNode.position;
    const parentGeneration = typeof parentNode.data?.generation === 'number' ? parentNode.data.generation : 0;
    const generation = getGeneration(relationship, parentGeneration);
    
    // Enhanced spacing
    const generationSpacing = 300;
    const siblingSpacing = 400;
    
    // Calculate Y position based on generation
    const baseY = (generation * generationSpacing);
    
    // Count existing nodes in this generation
    const nodesInGeneration = existingNodes.filter(node => {
      const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
      return nodeGeneration === generation;
    });
    
    // For spouses, place them side by side
    if (['husband', 'wife'].includes(relationship)) {
      return {
        x: parentPos.x + (relationship === 'husband' ? -300 : 300),
        y: parentPos.y
      };
    }
    
    // For siblings, place them in the same row with proper spacing
    if (['brother', 'sister'].includes(relationship)) {
      const siblingsCount = nodesInGeneration.length;
      return {
        x: parentPos.x + ((siblingsCount + 1) * siblingSpacing) - (siblingsCount * siblingSpacing / 2),
        y: baseY
      };
    }
    
    // For parents and children, distribute them horizontally
    const nodesCount = nodesInGeneration.length;
    
    // For parents (generation -1), place them above
    if (generation < parentGeneration) {
      return {
        x: parentPos.x + (nodesCount * 400) - (nodesCount > 0 ? 200 : 0),
        y: baseY
      };
    }
    
    // For children (generation +1), place them below
    return {
      x: parentPos.x + (nodesCount * 350) - (nodesCount > 0 ? 175 : 0),
      y: baseY
    };
  };

  const addFamilyMember = () => {
    if (!newMember.name || !newMember.email || !newMember.relationship || !selectedNodeId) {
      return;
    }

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    const newNodeId = `node-${Date.now()}`;
    const selectedGeneration = typeof selectedNode.data?.generation === 'number' ? selectedNode.data.generation : 0;
    const generation = getGeneration(newMember.relationship, selectedGeneration);
    
    // Calculate position based on tree structure
    const position = calculateNodePosition(selectedNode, newMember.relationship, nodes);
    
    const newNode: FamilyMemberNode = {
      id: newNodeId,
      type: 'familyMember',
      position,
      data: {
        label: newMember.name,
        name: newMember.name,
        email: newMember.email,
        phone: newMember.phone,
        relationship: newMember.relationship,
        generation,
        onAddRelation: handleAddRelation
      }
    };

    // Create edge with proper styling
    const newEdge: Edge = {
      id: `edge-${selectedNodeId}-${newNodeId}`,
      source: selectedNodeId,
      target: newNodeId,
      type: 'smoothstep',
      style: { 
        stroke: '#3b82f6', 
        strokeWidth: 3,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: '#3b82f6'
      }
    };

    setNodes((nds) => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddRelation: handleAddRelation
      }
    })).concat([newNode]));
    
    setEdges((eds) => [...eds, newEdge]);

    setShowAddDialog(false);
    setNewMember({ name: '', email: '', phone: '', relationship: '' });
  };

  const getOppositeRelationship = (relationship: string): string => {
    const opposites: Record<string, string> = {
      "father": "child",
      "mother": "child",
      "son": "parent",
      "daughter": "parent",
      "brother": "sibling",
      "sister": "sibling",
      "husband": "wife",
      "wife": "husband",
      "grandfather": "grandchild",
      "grandmother": "grandchild",
      "grandson": "grandparent",
      "granddaughter": "grandparent"
    };
    return opposites[relationship.toLowerCase()] || "family";
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Create family tree data structure
      const familyTreeId = user.familyTreeId;
      
      // Store all family members in Neo4j
      for (const node of nodes) {
        if (node.id !== 'root') {
          const memberData = {
            userId: generateId('U'),
            name: node.data.name,
            email: node.data.email,
            phone: node.data.phone,
            status: 'invited',
            familyTreeId: familyTreeId,
            createdBy: user.userId,
            createdAt: new Date().toISOString(),
            myRelationship: node.data.relationship
          };
          
          await createUser(memberData);
          
          // Create relationships
          const selectedEdge = edges.find(edge => edge.target === node.id);
          if (selectedEdge) {
            const sourceNode = nodes.find(n => n.id === selectedEdge.source);
            if (sourceNode) {
              const sourceUserId = sourceNode.id === 'root' ? user.userId : sourceNode.data.userId;
              const relationship1 = node.data.relationship;
              const relationship2 = getOppositeRelationship(relationship1);
              
              await createReciprocalRelationship(
                familyTreeId,
                sourceUserId,
                memberData.userId,
                relationship2,
                relationship1
              );
            }
          }
        }
      }

      toast({
        title: "Family Tree Created!",
        description: "Your family tree has been saved successfully.",
      });

      onComplete({
        members: nodes.filter(n => n.id !== 'root'),
        relationships: edges
      });
    } catch (error) {
      console.error('Error saving family tree:', error);
      toast({
        title: "Error",
        description: "Failed to save family tree. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Build Your Family Tree</h1>
          <p className="text-slate-600 text-sm mt-1">Click the + button on any node to add family members</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={nodes.length <= 1 || isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Family Tree'}
          </Button>
        </div>
      </div>

      {/* Main Canvas - Scrollable */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.1}
          maxZoom={2}
          panOnScroll={true}
          panOnScrollSpeed={0.5}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
          selectNodesOnDrag={false}
        >
          <Controls className="bg-white shadow-lg border border-slate-200" />
          <Background color="#e2e8f0" gap={30} size={2} />
        </ReactFlow>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="relationship" className="text-sm font-medium">Relationship *</Label>
              <Select
                value={newMember.relationship}
                onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Phone (Optional)</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={addFamilyMember}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newMember.name || !newMember.email || !newMember.relationship}
              >
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeBuilder;
