
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
import { Plus, Wand2, User, Save } from 'lucide-react';

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
    <div className="relative bg-white border-2 border-slate-200 rounded-xl p-4 min-w-[160px] shadow-lg hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
      
      <div className="flex flex-col items-center space-y-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-slate-800">{data.name}</div>
          <div className="text-xs text-slate-600">{data.email}</div>
          {data.relationship && !data.isRoot && (
            <div className="text-xs font-medium text-blue-600 mt-1 capitalize">
              {data.relationship}
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant="outline"
          className="w-8 h-8 rounded-full p-0 hover:bg-blue-50"
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
}

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack }) => {
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

  // Initialize with "You" node in center
  useEffect(() => {
    const rootNode: FamilyMemberNode = {
      id: 'root',
      type: 'familyMember',
      position: { x: 600, y: 400 },
      data: {
        label: 'You',
        name: 'You',
        email: '',
        generation: 0,
        isRoot: true,
        onAddRelation: handleAddRelation
      }
    };
    setNodes([rootNode]);
  }, []);

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

  // Calculate position based on generation and relationship
  const calculateNodePosition = (
    parentNode: Node, 
    relationship: string, 
    existingNodes: Node[]
  ): { x: number; y: number } => {
    const parentPos = parentNode.position;
    const generation = getGeneration(relationship, parentNode.data.generation);
    
    // Vertical spacing between generations
    const generationSpacing = 200;
    const siblingSpacing = 200;
    
    // Calculate Y position based on generation
    const baseY = 400 + (generation * generationSpacing);
    
    // Count existing nodes in this generation
    const nodesInGeneration = existingNodes.filter(node => 
      node.data.generation === generation
    );
    
    // For spouses, place them side by side
    if (['husband', 'wife'].includes(relationship)) {
      return {
        x: parentPos.x + (relationship === 'husband' ? -180 : 180),
        y: parentPos.y
      };
    }
    
    // For siblings, place them in the same row
    if (['brother', 'sister'].includes(relationship)) {
      const siblingsCount = nodesInGeneration.length;
      return {
        x: parentPos.x + ((siblingsCount + 1) * siblingSpacing) - (siblingsCount * siblingSpacing / 2),
        y: baseY
      };
    }
    
    // For parents and children, center them relative to their generation
    const nodesCount = nodesInGeneration.length;
    const startX = 400 - (nodesCount * siblingSpacing / 2);
    
    return {
      x: startX + (nodesCount * siblingSpacing),
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
    const generation = getGeneration(newMember.relationship, selectedNode.data.generation);
    
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
        strokeWidth: 2,
        strokeDasharray: generation > selectedNode.data.generation ? '0' : '5,5'
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

  const handleAIGeneration = () => {
    const aiNodes: FamilyMemberNode[] = [
      {
        id: 'root',
        type: 'familyMember',
        position: { x: 600, y: 400 },
        data: { 
          label: 'You', 
          name: 'You', 
          email: '', 
          generation: 0,
          isRoot: true, 
          onAddRelation: handleAddRelation
        }
      },
      {
        id: 'father',
        type: 'familyMember',
        position: { x: 500, y: 200 },
        data: { 
          label: 'Father', 
          name: 'Father', 
          email: 'father@family.com', 
          relationship: 'father',
          generation: -1,
          onAddRelation: handleAddRelation
        }
      },
      {
        id: 'mother',
        type: 'familyMember',
        position: { x: 700, y: 200 },
        data: { 
          label: 'Mother', 
          name: 'Mother', 
          email: 'mother@family.com', 
          relationship: 'mother',
          generation: -1,
          onAddRelation: handleAddRelation
        }
      }
    ];

    const aiEdges: Edge[] = [
      { 
        id: 'e1', 
        source: 'father', 
        target: 'root', 
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      },
      { 
        id: 'e2', 
        source: 'mother', 
        target: 'root', 
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }
    ];

    setNodes(aiNodes);
    setEdges(aiEdges);
  };

  const handleComplete = () => {
    const familyData = {
      members: nodes.map(node => ({
        name: node.data.name,
        email: node.data.email,
        phone: node.data.phone,
        relationship: node.data.relationship,
        generation: node.data.generation
      })).filter(member => member.name !== 'You'),
      relationships: edges.map(edge => ({
        from: edge.source,
        to: edge.target,
        type: edge.label || 'family'
      }))
    };
    onComplete(familyData);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Build Your Family Tree</h2>
          <p className="text-slate-600">Click the + button on any node to add family members</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleAIGeneration}
            className="flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            AI Generate Sample
          </Button>
          <Button
            onClick={handleComplete}
            disabled={nodes.length <= 1}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Family Tree
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1">
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
        >
          <Controls className="bg-white shadow-lg border border-slate-200" />
          <Background color="#e2e8f0" gap={20} />
        </ReactFlow>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="relationship">Relationship *</Label>
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
              <Label htmlFor="email">Email *</Label>
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
              <Label htmlFor="phone">Phone (Optional)</Label>
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
                className="flex-1"
                disabled={!newMember.name || !newMember.email || !newMember.relationship}
              >
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Back Button */}
      <div className="absolute bottom-6 left-6">
        <Button variant="outline" onClick={onBack} className="bg-white shadow-lg">
          ← Back to Registration
        </Button>
      </div>
    </div>
  );
};

export default FamilyTreeBuilder;
