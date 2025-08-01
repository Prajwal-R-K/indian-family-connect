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
import { createUser, getUserByEmailOrId, createFamilyTree } from '@/lib/neo4j';
import { generateId, getCurrentDateTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { runQuery } from '@/lib/neo4j/connection'; // Import runQuery

// Helper function to create relationships in Neo4j - Defined OUTSIDE the component
const createRelationshipInNeo4j = async (
  familyTreeId: string,
  sourceUserId: string,
  targetUserId: string,
  relationshipType: string
) => {
   try {
      const cypher = `
         MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
         MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
         CREATE (source)-[:RELATES_TO {relationship: $relationshipType}]->(target)
         RETURN source.userId as sourceId, target.userId as targetId
      `;

      const result = await runQuery(cypher, {
         familyTreeId,
         sourceUserId,
         targetUserId,
         relationshipType: relationshipType.toLowerCase(), // Store in lowercase
      });

      return !!result;
   } catch (error) {
      console.error(`Error creating ${relationshipType} relationship:`, error);
      return false;
   }
};

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
    gender?: string; // Add gender to node data
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
  registrationData: any;
}

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack, registrationData }) => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    gender: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with "You" node in center using registration data
  useEffect(() => {
    if (registrationData) {
      const rootNode: FamilyMemberNode = {
        id: 'root',
        type: 'familyMember',
        position: { x: 0, y: 0 },
        data: {
          label: registrationData.name,
          name: registrationData.name,
          email: registrationData.email,
          generation: 0,
          isRoot: true,
          onAddRelation: handleAddRelation
        }
      };
      setNodes([rootNode]);
    }
  }, [registrationData]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleAddRelation = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowAddDialog(true);
    setNewMember({ name: '', email: '', phone: '', relationship: '', gender: '' });
  };

  // Check if email already exists in current tree or in database
  const checkEmailExists = async (email: string): Promise<boolean> => {
    // Check in current tree first
    const existsInTree = nodes.some(node => node.data.email === email);
    if (existsInTree) {
      return true;
    }

    // Check in database
    try {
      const existingUser = await getUserByEmailOrId(email);
      return existingUser !== null;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
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

    const generationSpacing = 300;
    const siblingSpacing = 400;

    const baseY = (generation * generationSpacing);

    const nodesInGeneration = existingNodes.filter(node => {
      const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
      return nodeGeneration === generation;
    });

    if (['husband', 'wife'].includes(relationship)) {
      return {
        x: parentPos.x + (relationship === 'husband' ? -300 : 300),
        y: parentPos.y
      };
    }

    if (['brother', 'sister'].includes(relationship)) {
      const nodesInSiblingLevel = existingNodes.filter(node => {
         const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
         return nodeGeneration === parentGeneration && node.id !== parentNode.id; // Filter for siblings of the parent
      });
      const siblingCount = nodesInSiblingLevel.length;
      return {
         x: parentPos.x + ((siblingCount + 1) * siblingSpacing) - (siblingCount * siblingSpacing / 2),
         y: baseY
      };
    }

    const nodesCount = nodesInGeneration.length;

    if (generation < parentGeneration) {
       // Position ancestors above the parent, spread out horizontally
       return {
         x: parentPos.x + (nodesCount * 300) - (nodesCount > 0 ? 150 : 0),
         y: baseY
       };
     }

    return {
      x: parentPos.x + (nodesCount * 350) - (nodesCount > 0 ? 175 : 0),
      y: baseY
    };
  };

  const addFamilyMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender || !selectedNodeId) {
      return;
    }

    // Check for email duplicates
    const emailExists = await checkEmailExists(newMember.email);
    if (emailExists) {
      toast({
        title: "Email already exists",
        description: "This email is already in use. Please use a different email.",
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
        onAddRelation: handleAddRelation,
        gender: newMember.gender,
      }
    };

    // Create edge based on how the user connected nodes in the UI
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
    setNewMember({ name: '', email: '', phone: '', relationship: '', gender: '' });
  };

   // This function is not needed for storing unidirectional relationships as per new requirement
   // const getOppositeRelationship = (relationship: string): string => {
  //   if (!relationship || typeof relationship !== 'string') return "family";
  //   const opposites: Record<string, string> = {
  //     "father": "child",
  //     "mother": "child",
  //     "son": "parent",
  //     "daughter": "parent",
  //     "brother": "sibling",
  //     "sister": "sibling",
  //     "husband": "wife",
  //     "wife": "husband",
  //     "grandfather": "grandchild",
  //     "grandmother": "grandchild",
  //     "grandson": "grandparent",
  //     "granddaughter": "grandparent"
  //   };
  //   return opposites[relationship.toLowerCase()] || "family";
  // };


  const handleComplete = async () => {
    if (nodes.length <= 1) {
      toast({
        title: "Add family members",
        description: "Please add at least one family member before creating the tree.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting family tree creation...');
      const familyTreeId = generateId('FT');
      await createFamilyTree({
        familyTreeId,
        createdBy: 'self',
        createdAt: getCurrentDateTime(),
      });

      // 1. Create all users and build a nodeId → userId map
      const nodeIdToUserId: Record<string, string> = {};
      // Create root user
      const rootUser = await createUser({
        userId: generateId('U'),
        name: registrationData.name,
        email: registrationData.email,
        password: registrationData.password,
        status: 'active' as const,
        familyTreeId,
        createdBy: 'self',
        createdAt: getCurrentDateTime(),
        gender: registrationData.gender,
      });
      nodeIdToUserId['root'] = rootUser.userId;
      localStorage.setItem("userId", rootUser.userId);
      localStorage.setItem("userData", JSON.stringify(rootUser));

      // Create all other users
      for (const node of nodes) {
        if (node.id !== 'root') {
          let createdMember = null;
          let memberUserId = null;
          let existingUser = await getUserByEmailOrId(node.data.email);
          if (!existingUser && node.data.userId) {
            existingUser = await getUserByEmailOrId(node.data.userId);
          }
          if (existingUser) {
            createdMember = existingUser;
            memberUserId = existingUser.userId;
          } else {
            const memberData = {
              userId: generateId('U'),
              name: node.data.name,
              email: node.data.email,
              phone: node.data.phone,
              status: 'invited' as const,
              familyTreeId,
              createdBy: rootUser.userId,
              createdAt: getCurrentDateTime(),
              myRelationship: node.data.relationship,
              gender: node.data.gender || 'other',
            };
            createdMember = await createUser(memberData);
            memberUserId = createdMember.userId;
          }
          nodeIdToUserId[node.id] = memberUserId;
        }
      }

      // 2. Create unidirectional relationships based on the edge direction and selected relationship
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) continue;

        const sourceUserId = nodeIdToUserId[sourceNode.id];
        const targetUserId = nodeIdToUserId[targetNode.id];
        const targetNodeRelationship = targetNode.data.relationship?.toLowerCase();

        // Store the relationship as it was created in the UI with the selected label
        if (targetNodeRelationship) {
            await createRelationshipInNeo4j(
                familyTreeId,
                sourceUserId,
                targetUserId,
                targetNodeRelationship // Use the selected relationship directly
            );
        }
      }

      toast({
        title: "Family Tree Created!",
        description: "Your family tree has been saved successfully.",
      });

      navigate('/dashboard', {
        state: { user: rootUser },
        replace: true
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
            {isLoading ? 'Creating...' : 'Create Family Tree'}
          </Button>
        </div>
      </div>

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
              <Label htmlFor="gender" className="text-sm font-medium">Gender *</Label>
              <select
                id="gender"
                value={newMember.gender}
                onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring mt-1"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
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
                disabled={!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender}
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