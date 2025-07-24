
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User } from '@/types';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { User as UserIcon } from 'lucide-react';

interface PersonalFamilyViewProps {
  user: User;
}

// Custom node component for personal view
const PersonalFamilyNode = ({ data }: { data: any }) => {
  const isCurrentUser = data.isCurrentUser;
  
  return (
    <div className={`relative rounded-xl p-4 min-w-[180px] shadow-lg transition-all ${
      isCurrentUser 
        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-2 border-blue-300' 
        : 'bg-white border-2 border-gray-200 hover:border-blue-300'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      
      <div className="flex flex-col items-center space-y-3">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isCurrentUser 
            ? 'bg-white/20' 
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}>
          <UserIcon className={`w-7 h-7 ${isCurrentUser ? 'text-white' : 'text-white'}`} />
        </div>
        
        <div className="text-center">
          <div className={`font-semibold text-sm ${isCurrentUser ? 'text-white' : 'text-slate-800'}`}>
            {data.name}
          </div>
          {data.relationship && (
            <div className={`text-xs font-medium mt-1 capitalize px-2 py-1 rounded ${
              isCurrentUser 
                ? 'bg-white/20 text-white' 
                : 'bg-blue-50 text-blue-600'
            }`}>
              My {data.relationship}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  personalFamily: PersonalFamilyNode,
};

const PersonalFamilyView: React.FC<PersonalFamilyViewProps> = ({ user }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate position for relationships in a circular pattern around the user
  const calculateNodePosition = (index: number, total: number, centerX = 0, centerY = 0) => {
    const radius = Math.max(300, total * 40);
    const angle = (index * 2 * Math.PI) / total;
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  const loadPersonalFamilyData = useCallback(async () => {
    if (!user?.userId || !user?.familyTreeId) return;
    
    setIsLoading(true);
    try {
      // Get personalized relationships for this user
      const relationships = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
      
      // Create nodes
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      
      // Add current user as center node
      const centerNode: Node = {
        id: user.userId,
        type: 'personalFamily',
        position: { x: 0, y: 0 },
        data: {
          name: user.name,
          isCurrentUser: true,
        }
      };
      newNodes.push(centerNode);
      
      // Add family members around the center
      relationships.forEach((rel, index) => {
        const position = calculateNodePosition(index, relationships.length);
        
        const memberNode: Node = {
          id: rel.target,
          type: 'personalFamily',
          position,
          data: {
            name: rel.targetName,
            relationship: rel.type,
            isCurrentUser: false,
          }
        };
        newNodes.push(memberNode);
        
        // Create edge from user to family member
        const edge: Edge = {
          id: `edge-${user.userId}-${rel.target}`,
          source: user.userId,
          target: rel.target,
          type: 'smoothstep',
          style: { 
            stroke: '#3b82f6', 
            strokeWidth: 2,
          },
          label: rel.type,
          labelStyle: { fill: '#374151', fontWeight: 600 },
          labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.8 },
        };
        newEdges.push(edge);
      });
      
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error('Error loading personal family data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, user?.familyTreeId]);

  useEffect(() => {
    loadPersonalFamilyData();
  }, [loadPersonalFamilyData]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your family relationships...</p>
        </div>
      </div>
    );
  }

  if (nodes.length <= 1) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <UserIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Family Relationships Found</h3>
          <p className="text-slate-600">Your family relationships will appear here once they're established.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-transparent"
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.1}
        maxZoom={2}
        panOnScroll={true}
        zoomOnScroll={true}
        panOnDrag={true}
        selectNodesOnDrag={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Controls className="bg-white shadow-lg border border-slate-200" />
        <Background color="#e2e8f0" gap={25} size={1} />
      </ReactFlow>
    </div>
  );
};

export default PersonalFamilyView;
