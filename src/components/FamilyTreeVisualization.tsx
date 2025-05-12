
// Let's improve the visualization code to fix relationship display and node details

import React, { useRef, useEffect, useState } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: 'personal' | 'all' | 'hyper' | 'connected';
}

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ 
  user, 
  familyMembers,
  viewMode = 'personal'
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

  useEffect(() => {
    // Fetch user-specific relationship data based on viewMode
    const fetchRelationships = async () => {
      try {
        if (user.familyTreeId) {
          let relationshipData: Relationship[] = [];
          
          if (viewMode === 'personal') {
            // Get personalized view of relationships for the current user
            relationshipData = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
            console.log("Fetched personal relationships for visualization:", relationshipData);
          } 
          else if (viewMode === 'hyper') {
            // Get relationships for hyper graph view (clustered by relationship type)
            relationshipData = await getFamilyRelationships(user.familyTreeId);
            console.log("Fetched hyper relationships for visualization:", relationshipData);
          }
          else if (viewMode === 'connected') {
            // For future implementation: connected family trees
            relationshipData = await getFamilyRelationships(user.familyTreeId);
            // This will be expanded in the future to get connected trees
            console.log("Fetched connected family trees for visualization:", relationshipData);
          }
          else {
            // Get all relationships in the family tree
            relationshipData = await getFamilyRelationships(user.familyTreeId);
            console.log("Fetched all family relationships for visualization:", relationshipData);
          }
          
          // Filter out any duplicate relationships to prevent multiple connections
          const uniqueRelationships = filterUniqueRelationships(relationshipData);
          setRelationships(uniqueRelationships);
        }
      } catch (error) {
        console.error("Failed to fetch relationships:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRelationships();
  }, [user.familyTreeId, user.userId, viewMode]);

  // Helper function to filter out duplicate relationships
  const filterUniqueRelationships = (relationships: Relationship[]): Relationship[] => {
    const uniqueMap = new Map<string, Relationship>();
    
    relationships.forEach(rel => {
      const key = `${rel.source}-${rel.target}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, rel);
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  // Function to find relationship between two nodes
  const findRelationshipBetweenNodes = (sourceId: string, targetId: string) => {
    // Get forward relationship
    const forwardRel = relationships.find(rel => 
      rel.source === sourceId && rel.target === targetId
    );
    
    // Get reverse relationship
    const reverseRel = relationships.find(rel => 
      rel.source === targetId && rel.target === sourceId
    );
    
    const sourceMember = familyMembers.find(m => m.userId === sourceId);
    const targetMember = familyMembers.find(m => m.userId === targetId);
    
    if (sourceMember && targetMember) {
      setSelectedRelationship({
        from: sourceMember,
        to: targetMember,
        fromToRelation: forwardRel?.type || "No direct relationship",
        toFromRelation: reverseRel?.type || "No direct relationship"
      });
      setRelationshipDetailsOpen(true);
    }
  };

  // Function to handle node click
  const handleNodeClick = (userId: string) => {
    // If the same node is clicked again, deselect it
    if (selectedNode === userId) {
      setSelectedNode(null);
      setPreviousSelectedNode(userId);
      setNodeDetailsOpen(false);
      return;
    }
    
    // If we already have a previously selected node and now selecting a different node
    if (previousSelectedNode && previousSelectedNode !== userId) {
      // Show relationship between previous and current node
      findRelationshipBetweenNodes(previousSelectedNode, userId);
      setPreviousSelectedNode(null); // Reset after showing relationship
      setSelectedNode(userId);
      return;
    }
    
    // If this is the first node being selected
    setSelectedNode(userId);
    setPreviousSelectedNode(null);
    
    // Show node details for this node
    const member = familyMembers.find(m => m.userId === userId);
    if (member) {
      setSelectedMember(member);
      setNodeDetailsOpen(true);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    
    // Force-directed graph rendering
    const renderFamilyTree = () => {
      const container = canvasRef.current;
      if (!container) return;
      
      // Clear previous content
      container.innerHTML = '';
      
      // Create SVG container
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.classList.add("family-tree-svg");
      container.appendChild(svg);
      
      // Graph simulation variables
      const nodeRadius = 35;
      const containerRect = container.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Create nodes for all unique members
      const nodeElements: Record<string, SVGElement> = {};
      const nodePositions: Record<string, {x: number, y: number}> = {};
      
      // For hyper graph, group members by relationship type
      const relationshipGroups: Record<string, string[]> = {};
      
      if (viewMode === 'hyper') {
        // Group members by relationship type
        relationships.forEach(rel => {
          const relType = rel.type.toLowerCase();
          if (!relationshipGroups[relType]) {
            relationshipGroups[relType] = [];
          }
          if (!relationshipGroups[relType].includes(rel.source)) {
            relationshipGroups[relType].push(rel.source);
          }
          if (!relationshipGroups[relType].includes(rel.target)) {
            relationshipGroups[relType].push(rel.target);
          }
        });
        
        // Create clusters for each relationship type
        let groupIndex = 0;
        for (const [relType, memberIds] of Object.entries(relationshipGroups)) {
          // Create group label
          const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          const angle = (2 * Math.PI * groupIndex) / Object.keys(relationshipGroups).length;
          const radius = Math.min(width, height) * 0.35;
          const groupX = centerX + radius * Math.cos(angle);
          const groupY = centerY + radius * Math.sin(angle);
          
          // Create background for group
          const groupBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          groupBg.setAttribute("cx", `${groupX}`);
          groupBg.setAttribute("cy", `${groupY}`);
          groupBg.setAttribute("r", `${nodeRadius * 3}`);
          groupBg.setAttribute("fill", "#f3f4f6");
          groupBg.setAttribute("opacity", "0.6");
          svg.appendChild(groupBg);
          
          // Create label for group
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.textContent = relType.charAt(0).toUpperCase() + relType.slice(1) + "s";
          label.setAttribute("x", `${groupX}`);
          label.setAttribute("y", `${groupY - nodeRadius * 2}`);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("font-size", "14");
          label.setAttribute("font-weight", "bold");
          label.setAttribute("fill", "#4b5563");
          svg.appendChild(label);
          
          // Position members around the group center
          memberIds.forEach((memberId, memberIndex) => {
            const member = familyMembers.find(m => m.userId === memberId);
            if (!member) return;
            
            // Calculate position in a mini-circle around the group center
            const memberAngle = (2 * Math.PI * memberIndex) / memberIds.length;
            const memberRadius = nodeRadius * 1.5;
            const x = groupX + memberRadius * Math.cos(memberAngle);
            const y = groupY + memberRadius * Math.sin(memberAngle);
            
            // Store position for this member
            nodePositions[memberId] = {x, y};
          });
          
          groupIndex++;
        }
      } else {
        // Standard layout in a circle
        familyMembers.forEach((member, index) => {
          if (!member) return; // Skip null/undefined members
          
          // Calculate initial positions in a circle
          const angle = (2 * Math.PI * index) / (familyMembers.length || 1);
          const radius = Math.min(width, height) * 0.35; // Adjust as needed
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          
          // Store position
          nodePositions[member.userId] = {x, y};
        });
      }
      
      // Add nodes for all unique family members including current user
      familyMembers.forEach((member) => {
        if (!member || !nodePositions[member.userId]) return; // Skip if no position
        
        // Get stored position
        const pos = nodePositions[member.userId];
        
        // Create group for node
        const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodeGroup.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
        nodeGroup.dataset.userId = member.userId;
        
        // Add click event to display node details
        nodeGroup.addEventListener('click', () => {
          handleNodeClick(member.userId);
        });
        
        // Create circle with different style if selected
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", `${nodeRadius}`);
        
        // Determine node color based on status and selection
        let fillColor = "#9ca3af"; // Default gray
        
        if (member.userId === user.userId) {
          fillColor = "#6366f1"; // Current user color
        }
        
        if (selectedNode === member.userId || previousSelectedNode === member.userId) {
          fillColor = "#10b981"; // Selected node is green
        }
        
        circle.setAttribute("fill", fillColor);
        circle.setAttribute("stroke", (selectedNode === member.userId || previousSelectedNode === member.userId) ? "#047857" : "#ffffff");
        circle.setAttribute("stroke-width", (selectedNode === member.userId || previousSelectedNode === member.userId) ? "4" : "3");
        circle.style.cursor = "pointer";
        
        nodeGroup.appendChild(circle);
        
        // Create text for initials
        const initials = getInitials(member.name);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.textContent = initials;
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        text.setAttribute("fill", "white");
        text.setAttribute("font-weight", "bold");
        text.style.pointerEvents = "none";
        nodeGroup.appendChild(text);
        
        // Create text background for name
        const nameBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        nameBackground.setAttribute("y", `${nodeRadius + 5}`);
        nameBackground.setAttribute("height", "20");
        nameBackground.setAttribute("rx", "10");
        nameBackground.setAttribute("ry", "10");
        nameBackground.setAttribute("fill", "white");
        nameBackground.setAttribute("stroke", "#e5e7eb");
        nameBackground.setAttribute("stroke-width", "1");
        
        // Create text for name
        const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        nameText.textContent = member.name;
        nameText.setAttribute("y", `${nodeRadius + 15}`);
        nameText.setAttribute("text-anchor", "middle");
        nameText.setAttribute("font-size", "12");
        nameText.setAttribute("fill", "#374151");
        nameText.style.pointerEvents = "none";
        
        // Calculate width based on text
        const nameWidth = Math.max(member.name.length * 7, 60);
        nameBackground.setAttribute("width", `${nameWidth}`);
        nameBackground.setAttribute("x", `-${nameWidth / 2}`);
        
        nodeGroup.appendChild(nameBackground);
        nodeGroup.appendChild(nameText);
        
        // Store node reference
        nodeElements[member.userId] = nodeGroup;
        svg.appendChild(nodeGroup);
      });
      
      // Draw edges (relationships)
      if (viewMode !== 'hyper') {
        relationships.forEach(rel => {
          if (nodeElements[rel.source] && nodeElements[rel.target]) {
            // Create line
            const sourcePos = nodePositions[rel.source];
            const targetPos = nodePositions[rel.target];
            
            if (!sourcePos || !targetPos) return;
            
            // Calculate direction vector
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Start and end points (adjusted for node radius)
            const startX = sourcePos.x + nx * nodeRadius;
            const startY = sourcePos.y + ny * nodeRadius;
            const endX = targetPos.x - nx * nodeRadius;
            const endY = targetPos.y - ny * nodeRadius;
            
            // Determine if this is a selected edge
            const isSelectedEdge = 
              (selectedNode === rel.source && previousSelectedNode === rel.target) ||
              (selectedNode === rel.target && previousSelectedNode === rel.source);
            
            // Create line element
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", `${startX}`);
            line.setAttribute("y1", `${startY}`);
            line.setAttribute("x2", `${endX}`);
            line.setAttribute("y2", `${endY}`);
            line.setAttribute("stroke", isSelectedEdge ? "#10b981" : "#6366f1");
            line.setAttribute("stroke-width", isSelectedEdge ? "3" : "2");
            line.setAttribute("stroke-dasharray", isSelectedEdge ? "" : "4");
            line.setAttribute("marker-end", "url(#arrowhead)");
            
            // Insert line BEFORE nodes so they appear on top
            svg.insertBefore(line, svg.firstChild);
            
            // Create text element for relationship type
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Create background for label
            const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            textBg.setAttribute("rx", "8");
            textBg.setAttribute("ry", "8");
            textBg.setAttribute("fill", isSelectedEdge ? "#d1fae5" : "white");
            textBg.setAttribute("stroke", isSelectedEdge ? "#10b981" : "#e5e7eb");
            
            // Create text element
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = rel.type;
            text.setAttribute("x", `${midX}`);
            text.setAttribute("y", `${midY}`);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "central");
            text.setAttribute("font-size", "10");
            text.setAttribute("fill", isSelectedEdge ? "#047857" : "#4b5563");
            text.setAttribute("paint-order", "stroke");
            text.setAttribute("stroke", isSelectedEdge ? "#d1fae5" : "white");
            text.setAttribute("stroke-width", "5");
            
            // Calculate background dimensions
            const padding = 6;
            const bgWidth = rel.type.length * 6 + padding * 2;
            const bgHeight = 16;
            
            textBg.setAttribute("x", `${midX - bgWidth/2}`);
            textBg.setAttribute("y", `${midY - bgHeight/2}`);
            textBg.setAttribute("width", `${bgWidth}`);
            textBg.setAttribute("height", `${bgHeight}`);
            
            // Add elements to SVG
            svg.appendChild(textBg);
            svg.appendChild(text);
          }
        });
      }
      
      // Add arrowhead marker definition
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", "arrowhead");
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "5");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "6");
      marker.setAttribute("markerHeight", "6");
      marker.setAttribute("orient", "auto");
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      path.setAttribute("fill", "#6366f1");
      
      marker.appendChild(path);
      defs.appendChild(marker);
      svg.insertBefore(defs, svg.firstChild);
      
      // Add instructions
      const instructionText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      instructionText.textContent = "Click on a node to view details, click again to deselect, or select two nodes to see their relationship";
      instructionText.setAttribute("x", "10");
      instructionText.setAttribute("y", "20");
      instructionText.setAttribute("font-size", "10");
      instructionText.setAttribute("fill", "#6b7280");
      svg.appendChild(instructionText);
      
      // Add view mode indicator
      const viewModeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      viewModeText.textContent = `View mode: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`;
      viewModeText.setAttribute("x", `${width - 100}`);
      viewModeText.setAttribute("y", "20");
      viewModeText.setAttribute("font-size", "10");
      viewModeText.setAttribute("text-anchor", "end");
      viewModeText.setAttribute("fill", "#6b7280");
      svg.appendChild(viewModeText);
    };
    
    renderFamilyTree();
    
    // Handle window resize
    const resizeHandler = () => {
      renderFamilyTree();
    };
    
    window.addEventListener('resize', resizeHandler);
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, [user, familyMembers, relationships, isLoading, viewMode, selectedNode, previousSelectedNode]);
  
  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
    }
    return name.charAt(0);
  };
  
  return (
    <div className="w-full h-full relative" ref={canvasRef}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse">Loading family tree...</div>
        </div>
      ) : familyMembers.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-gray-500">No family members yet</p>
          <p className="text-sm text-gray-400">Invite family members to see your tree</p>
        </div>
      ) : (
        <div className="absolute top-0 right-0 p-2 text-xs text-gray-500">
          {viewMode === 'personal' ? 'Personal view' : 
           viewMode === 'hyper' ? 'Hyper graph view' : 
           viewMode === 'connected' ? 'Connected trees view' : 'All relationships view'}: 
          {relationships.length} relationships found
        </div>
      )}
      
      {/* Node Details Dialog */}
      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              Personal information for this family member
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-isn-primary text-white">
                    {getInitials(selectedMember.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMember.name}</h3>
                  <p className="text-sm text-gray-500">{selectedMember.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm">
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    selectedMember.status === 'active' ? 'bg-green-100 text-green-800' : 
                    selectedMember.status === 'invited' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>{selectedMember.status}</span>
                </div>
                
                {selectedMember.userId === user.userId && (
                  <div className="text-sm">
                    <span className="font-medium">This is you</span>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Member ID:</span> 
                  <span className="ml-2 text-gray-600">{selectedMember.userId}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Relationship Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relationship Details</DialogTitle>
            <DialogDescription>
              How these family members are related to each other
            </DialogDescription>
          </DialogHeader>
          
          {selectedRelationship && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <Avatar className="h-12 w-12 mx-auto">
                    <AvatarFallback className="bg-isn-primary text-white">
                      {getInitials(selectedRelationship.from?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 text-sm font-medium">{selectedRelationship.from?.name}</p>
                </div>
                
                <div className="flex flex-col items-center px-4">
                  <div className="text-xs bg-gray-100 rounded-full px-3 py-1 mb-1">is {selectedRelationship.fromToRelation} of</div>
                  <div className="w-20 h-0.5 bg-isn-primary"></div>
                  <div className="text-xs bg-gray-100 rounded-full px-3 py-1 mt-1">is {selectedRelationship.toFromRelation} of</div>
                </div>
                
                <div className="text-center">
                  <Avatar className="h-12 w-12 mx-auto">
                    <AvatarFallback className="bg-isn-secondary text-white">
                      {getInitials(selectedRelationship.to?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 text-sm font-medium">{selectedRelationship.to?.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                <div>
                  <p className="text-sm font-medium">{selectedRelationship.from?.name} sees {selectedRelationship.to?.name} as:</p>
                  <p className="text-lg font-semibold text-isn-primary">{selectedRelationship.fromToRelation}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">{selectedRelationship.to?.name} sees {selectedRelationship.from?.name} as:</p>
                  <p className="text-lg font-semibold text-isn-secondary">{selectedRelationship.toFromRelation}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;
