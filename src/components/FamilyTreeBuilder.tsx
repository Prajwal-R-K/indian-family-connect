
import React, { useState, useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wand2 } from 'lucide-react';

interface FamilyMemberNode extends Node {
  data: {
    label: string;
    name: string;
    email: string;
    phone?: string;
    relationship?: string;
  };
}

const initialNodes: FamilyMemberNode[] = [];
const initialEdges: Edge[] = [];

const relationshipTypes = [
  'father', 'mother', 'son', 'daughter', 'brother', 'sister',
  'husband', 'wife', 'grandfather', 'grandmother', 'grandson', 'granddaughter',
  'uncle', 'aunt', 'nephew', 'niece', 'cousin'
];

interface FamilyTreeBuilderProps {
  onComplete: (familyData: any) => void;
  onBack: () => void;
}

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: ''
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addFamilyMember = () => {
    if (!newMember.name || (!newMember.email && !newMember.phone)) {
      return;
    }

    const newNode: FamilyMemberNode = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: {
        label: newMember.name,
        name: newMember.name,
        email: newMember.email,
        phone: newMember.phone,
        relationship: newMember.relationship
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setNewMember({ name: '', email: '', phone: '', relationship: '' });
    setShowAddForm(false);
  };

  const handleAIGeneration = () => {
    // AI-based family tree generation placeholder
    const aiGeneratedNodes: FamilyMemberNode[] = [
      {
        id: 'grandfather',
        type: 'default',
        position: { x: 200, y: 50 },
        data: { label: 'Grandfather', name: 'Grandfather', email: 'grandfather@family.com', relationship: 'grandfather' }
      },
      {
        id: 'grandmother',
        type: 'default',
        position: { x: 400, y: 50 },
        data: { label: 'Grandmother', name: 'Grandmother', email: 'grandmother@family.com', relationship: 'grandmother' }
      },
      {
        id: 'father',
        type: 'default',
        position: { x: 150, y: 200 },
        data: { label: 'Father', name: 'Father', email: 'father@family.com', relationship: 'father' }
      },
      {
        id: 'mother',
        type: 'default',
        position: { x: 350, y: 200 },
        data: { label: 'Mother', name: 'Mother', email: 'mother@family.com', relationship: 'mother' }
      }
    ];

    const aiGeneratedEdges: Edge[] = [
      { id: 'e1', source: 'grandfather', target: 'father' },
      { id: 'e2', source: 'grandmother', target: 'father' },
      { id: 'e3', source: 'grandfather', target: 'mother' },
      { id: 'e4', source: 'grandmother', target: 'mother' }
    ];

    setNodes(aiGeneratedNodes);
    setEdges(aiGeneratedEdges);
  };

  const handleComplete = () => {
    const familyData = {
      members: nodes.map(node => node.data),
      relationships: edges.map(edge => ({
        from: edge.source,
        to: edge.target,
        type: 'family'
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
          <Button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Family Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label htmlFor="relationship">Relationship</Label>
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
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={addFamilyMember}>
                Add Member
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="h-96 border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ backgroundColor: "#F7F9FB" }}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      <div className="flex gap-2 justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete} disabled={nodes.length === 0}>
          Complete Family Tree
        </Button>
      </div>
    </div>
  );
};

export default FamilyTreeBuilder;
