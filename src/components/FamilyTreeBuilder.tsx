
import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wand2, User } from 'lucide-react';

interface FamilyMemberNode extends Node {
  data: {
    label: string;
    name: string;
    email: string;
    phone?: string;
    relationship?: string;
    isRoot?: boolean;
    showAddButton?: boolean;
    onAddRelation?: (nodeId: string) => void;
  };
}

const relationshipTypes = [
  'father', 'mother', 'son', 'daughter', 'brother', 'sister',
  'husband', 'wife', 'grandfather', 'grandmother', 'grandson', 'granddaughter',
  'uncle', 'aunt', 'nephew', 'niece', 'cousin'
];

// Custom node component with add button
const FamilyNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4 min-w-[150px] shadow-lg">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-600" />
          <div className="font-semibold text-sm">{data.name}</div>
        </div>
        
        <div className="text-xs text-gray-600 text-center">
          {data.email && <div>{data.email}</div>}
          {data.phone && <div>{data.phone}</div>}
          {data.relationship && <div className="font-medium text-blue-600">{data.relationship}</div>}
        </div>
        
        {data.showAddButton && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 p-1 h-6 w-6 rounded-full"
            onClick={() => data.onAddRelation && data.onAddRelation(id)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
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

  // Initialize with "You" node
  useEffect(() => {
    const rootNode: FamilyMemberNode = {
      id: 'root',
      type: 'familyMember',
      position: { x: 400, y: 300 },
      data: {
        label: 'You',
        name: 'You',
        email: '',
        isRoot: true,
        showAddButton: true,
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

  const addFamilyMember = () => {
    if (!newMember.name || (!newMember.email && !newMember.phone) || !newMember.relationship || !selectedNodeId) {
      return;
    }

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    const newNodeId = `node-${Date.now()}`;
    
    // Calculate position based on relationship and existing nodes
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
        showAddButton: true,
        onAddRelation: handleAddRelation
      }
    };

    // Create edge based on relationship
    const newEdge = createRelationshipEdge(selectedNodeId, newNodeId, newMember.relationship);

    setNodes((nds) => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddRelation: handleAddRelation
      }
    })).concat([newNode]));
    
    if (newEdge) {
      setEdges((eds) => [...eds, newEdge]);
    }

    setShowAddDialog(false);
    setNewMember({ name: '', email: '', phone: '', relationship: '' });
  };

  const calculateNodePosition = (parentNode: Node, relationship: string, existingNodes: Node[]) => {
    const parentPos = parentNode.position;
    const spacing = 200;
    
    // Count existing children of the parent
    const childrenCount = existingNodes.filter(node => {
      return edges.some(edge => edge.source === parentNode.id && edge.target === node.id);
    }).length;

    // Position based on relationship type
    if (['son', 'daughter', 'grandson', 'granddaughter'].includes(relationship)) {
      // Children go below
      return {
        x: parentPos.x + (childrenCount * spacing) - (childrenCount * spacing / 2),
        y: parentPos.y + 150
      };
    } else if (['father', 'mother', 'grandfather', 'grandmother'].includes(relationship)) {
      // Parents go above
      return {
        x: parentPos.x + (childrenCount * spacing) - (childrenCount * spacing / 2),
        y: parentPos.y - 150
      };
    } else if (['brother', 'sister', 'cousin'].includes(relationship)) {
      // Siblings go to the side
      return {
        x: parentPos.x + (childrenCount + 1) * spacing,
        y: parentPos.y
      };
    } else if (['husband', 'wife'].includes(relationship)) {
      // Spouse goes to the side
      return {
        x: parentPos.x + spacing,
        y: parentPos.y
      };
    } else {
      // Default positioning
      return {
        x: parentPos.x + (childrenCount * spacing),
        y: parentPos.y + 150
      };
    }
  };

  const createRelationshipEdge = (sourceId: string, targetId: string, relationship: string): Edge => {
    return {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      label: relationship,
      labelStyle: { fontSize: 12, fontWeight: 600 },
      style: { stroke: '#8B5CF6', strokeWidth: 2 }
    };
  };

  const handleAIGeneration = () => {
    // AI-based family tree generation
    const aiGeneratedNodes: FamilyMemberNode[] = [
      {
        id: 'root',
        type: 'familyMember',
        position: { x: 400, y: 300 },
        data: { 
          label: 'You', 
          name: 'You', 
          email: '', 
          isRoot: true, 
          showAddButton: true,
          onAddRelation: handleAddRelation
        }
      },
      {
        id: 'father',
        type: 'familyMember',
        position: { x: 300, y: 150 },
        data: { 
          label: 'Father', 
          name: 'Father', 
          email: 'father@family.com', 
          relationship: 'father',
          showAddButton: true,
          onAddRelation: handleAddRelation
        }
      },
      {
        id: 'mother',
        type: 'familyMember',
        position: { x: 500, y: 150 },
        data: { 
          label: 'Mother', 
          name: 'Mother', 
          email: 'mother@family.com', 
          relationship: 'mother',
          showAddButton: true,
          onAddRelation: handleAddRelation
        }
      }
    ];

    const aiGeneratedEdges: Edge[] = [
      { 
        id: 'e1', 
        source: 'father', 
        target: 'root', 
        type: 'smoothstep',
        label: 'parent',
        style: { stroke: '#8B5CF6', strokeWidth: 2 }
      },
      { 
        id: 'e2', 
        source: 'mother', 
        target: 'root', 
        type: 'smoothstep',
        label: 'parent',
        style: { stroke: '#8B5CF6', strokeWidth: 2 }
      }
    ];

    setNodes(aiGeneratedNodes);
    setEdges(aiGeneratedEdges);
  };

  const handleComplete = () => {
    const familyData = {
      members: nodes.map(node => ({
        name: node.data.name,
        email: node.data.email,
        phone: node.data.phone,
        relationship: node.data.relationship
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Build Your Family Tree</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAIGeneration}
            className="flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            AI Generate
          </Button>
        </div>
      </div>

      <div className="h-96 border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ backgroundColor: "#F7F9FB" }}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship *</Label>
                <Select
                  value={newMember.relationship}
                  onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}
                >
                  <SelectTrigger>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addFamilyMember}>
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete} disabled={nodes.length <= 1}>
          Complete Family Tree
        </Button>
      </div>
    </div>
  );
};

export default FamilyTreeBuilder;
