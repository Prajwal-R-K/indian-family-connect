
import React, { useRef, useEffect, useState } from 'react';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { toast } from '@/hooks/use-toast';

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
  viewMode?: 'personal' | 'all';
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
          } else {
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
      
      // Create a unique set of member IDs from both familyMembers and relationships
      const uniqueMemberIds = new Set<string>();
      familyMembers.forEach(member => uniqueMemberIds.add(member.userId));
      
      // Create nodes for all unique members
      const nodeElements: Record<string, SVGElement> = {};
      const nodePositions: Record<string, {x: number, y: number}> = {};
      
      // Collect unique nodes
      const uniqueMembers = familyMembers.filter(member => 
        uniqueMemberIds.has(member.userId)
      );
      
      // Add nodes for all unique family members including current user
      uniqueMembers.forEach((member, index) => {
        // Calculate initial positions in a circle
        const angle = (2 * Math.PI * index) / (uniqueMembers.length || 1);
        const radius = Math.min(width, height) * 0.35; // Adjust as needed
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Store position
        nodePositions[member.userId] = {x, y};
        
        // Create group for node
        const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodeGroup.setAttribute("transform", `translate(${x}, ${y})`);
        nodeGroup.dataset.userId = member.userId;
        
        // Add click event to display node details
        nodeGroup.addEventListener('click', () => {
          setSelectedNode(member.userId);
          toast({
            title: member.name,
            description: `Email: ${member.email}\nStatus: ${member.status}`,
          });
        });
        
        // Create circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", `${nodeRadius}`);
        circle.setAttribute("fill", member.userId === user.userId ? "#6366f1" : "#9ca3af");
        circle.setAttribute("stroke", "#ffffff");
        circle.setAttribute("stroke-width", "3");
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
          
          // Create line element
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", `${startX}`);
          line.setAttribute("y1", `${startY}`);
          line.setAttribute("x2", `${endX}`);
          line.setAttribute("y2", `${endY}`);
          line.setAttribute("stroke", "#6366f1");
          line.setAttribute("stroke-width", "2");
          line.setAttribute("stroke-dasharray", "4");
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
          textBg.setAttribute("fill", "white");
          textBg.setAttribute("stroke", "#e5e7eb");
          
          // Create text element
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.textContent = rel.type;
          text.setAttribute("x", `${midX}`);
          text.setAttribute("y", `${midY}`);
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("dominant-baseline", "central");
          text.setAttribute("font-size", "10");
          text.setAttribute("fill", "#4b5563");
          text.setAttribute("paint-order", "stroke");
          text.setAttribute("stroke", "white");
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
  }, [user, familyMembers, relationships, isLoading, viewMode, selectedNode]);
  
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
          {viewMode === 'personal' ? 'Personal view' : 'All relationships'}: {relationships.length} relationships found
        </div>
      )}
    </div>
  );
};

export default FamilyTreeVisualization;
