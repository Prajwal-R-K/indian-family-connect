
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, User, Save, ArrowLeft, Users, TreePine } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createUser, createReciprocalRelationship, createFamilyTree } from '@/lib/neo4j';
import { generateId } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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

// Custom node component with improved styling
const FamilyNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="relative bg-white border-2 border-blue-200 rounded-xl p-4 min-w-[180px] shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      
      <div className="flex flex-col items-center space-y-3">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
          <User className="w-7 h-7 text-white" />
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-slate-800 text-sm leading-tight">{data.name}</div>
          <div className="text-xs text-slate-500 mt-1">{data.email}</div>
          {data.relationship && !data.isRoot && (
            <div className="text-xs font-medium text-blue-600 mt-2 capitalize bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {data.relationship}
            </div>
          )}
          {data.isRoot && (
            <div className="text-xs font-medium text-green-600 mt-2 capitalize bg-green-50 px-3 py-1 rounded-full border border-green-200">
              You
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          className="w-8 h-8 rounded-full p-0 bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
  const navigate = useNavigate();
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
    
    const generationSpacing = 250;
    const siblingSpacing = 300;
    
    const baseY = (generation * generationSpacing);
    
    const nodesInGeneration = existingNodes.filter(node => {
      const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
      return nodeGeneration === generation;
    });
    
    if (['husband', 'wife'].includes(relationship)) {
      return {
        x: parentPos.x + (relationship === 'husband' ? -250 : 250),
        y: parentPos.y
      };
    }
    
    if (['brother', 'sister'].includes(relationship)) {
      const siblingsCount = nodesInGeneration.length;
      return {
        x: parentPos.x + ((siblingsCount + 1) * siblingSpacing) - (siblingsCount * siblingSpacing / 2),
        y: baseY
      };
    }
    
    const nodesCount = nodesInGeneration.length;
    
    if (generation < parentGeneration) {
      return {
        x: parentPos.x + (nodesCount * 300) - (nodesCount > 0 ? 150 : 0),
        y: baseY
      };
    }
    
    return {
      x: parentPos.x + (nodesCount * 280) - (nodesCount > 0 ? 140 : 0),
      y: baseY
    };
  };

  const addFamilyMember = () => {
    if (!newMember.name || !newMember.email || !newMember.relationship || !selectedNodeId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    const newNodeId = `node-${Date.now()}`;
    const selectedGeneration = typeof selectedNode.data?.generation === 'number' ? selectedNode.data.generation : 0;
    const generation = getGeneration(newMember.relationship, selectedGeneration);
    
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

    const newEdge: Edge = {
      id: `edge-${selectedNodeId}-${newNodeId}`,
      source: selectedNodeId,
      target: newNodeId,
      type: 'smoothstep',
      style: { 
        stroke: '#3b82f6', 
        strokeWidth: 2,
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
    
    toast({
      title: "Member Added",
      description: `${newMember.name} has been added to your family tree.`,
    });
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
    if (nodes.length <= 1) {
      toast({
        title: "Add Family Members",
        description: "Please add at least one family member before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Starting family tree creation process...");
      
      // First, create the family tree in the database
      const familyTreeId = generateId('FT');
      await createFamilyTree({
        familyTreeId,
        createdBy: user.email,
        createdAt: new Date().toISOString()
      });
      
      console.log("Family tree created with ID:", familyTreeId);

      // Now create the main user with the family tree ID
      const mainUserData = {
        userId: user.userId || generateId('U'),
        name: user.name,
        email: user.email,
        password: user.password,
        status: 'active' as const,
        familyTreeId: familyTreeId,
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        myRelationship: 'self'
      };
      
      await createUser(mainUserData);
      console.log("Main user created successfully");

      // Create all family members
      const createdMembers: any[] = [];
      for (const node of nodes) {
        if (node.id !== 'root') {
          const memberData = {
            userId: generateId('U'),
            name: node.data.name,
            email: node.data.email,
            phone: node.data.phone || '',
            status: 'invited' as const,
            familyTreeId: familyTreeId,
            createdBy: mainUserData.userId,
            createdAt: new Date().toISOString(),
            myRelationship: node.data.relationship
          };
          
          await createUser(memberData);
          createdMembers.push({ ...memberData, nodeId: node.id });
          console.log("Created member:", memberData.name);
        }
      }

      // Create relationships
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const sourceUserId = edge.source === 'root' ? mainUserData.userId : 
            createdMembers.find(m => m.nodeId === edge.source)?.userId;
          const targetUserId = createdMembers.find(m => m.nodeId === edge.target)?.userId;
          
          if (sourceUserId && targetUserId) {
            const relationship1 = targetNode.data.relationship;
            const relationship2 = getOppositeRelationship(relationship1);
            
            await createReciprocalRelationship(
              familyTreeId,
              sourceUserId,
              targetUserId,
              relationship2,
              relationship1
            );
            console.log(`Created relationship: ${relationship2} -> ${relationship1}`);
          }
        }
      }

      toast({
        title: "Success!",
        description: "Your family tree has been created successfully!",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('Error creating family tree:', error);
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
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Family Tree Builder</h1>
              <p className="text-sm text-slate-600">Create your family connections</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 flex-1">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                How to Build
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">1</div>
                <p>Click the <Plus className="w-3 h-3 inline mx-1" /> button on any family member</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">2</div>
                <p>Fill in their details and relationship</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">3</div>
                <p>Continue adding family members</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">4</div>
                <p>Save your complete family tree</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Family Members</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Relationships</span>
                <span className="font-medium">{edges.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 space-y-3">
          <Button
            onClick={handleComplete}
            disabled={nodes.length <= 1 || isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Family Tree...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Family Tree ({nodes.length - 1} members)
              </div>
            )}
          </Button>
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Registration
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          minZoom={0.2}
          maxZoom={1.5}
          panOnScroll={true}
          panOnScrollSpeed={0.5}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
          selectNodesOnDrag={false}
        >
          <Controls className="bg-white shadow-lg border border-slate-200 rounded-lg" />
          <Background color="#e2e8f0" gap={20} size={1} />
        </ReactFlow>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Family Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter their full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="relationship" className="text-sm font-medium">Relationship to You *</Label>
              <Select
                value={newMember.relationship}
                onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select their relationship" />
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
              <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Enter their email"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number (Optional)</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="Enter their phone number"
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
