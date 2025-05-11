
import React, { useRef, useEffect, useState } from 'react';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';

interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  status: string;
  relationship?: string;
  createdBy?: string;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
}

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
}

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ user, familyMembers }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch relationship data
    const fetchRelationships = async () => {
      try {
        if (user.familyTreeId) {
          const relations = await getFamilyRelationships(user.familyTreeId);
          setRelationships(relations);
        }
      } catch (error) {
        console.error("Failed to fetch relationships:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRelationships();
  }, [user.familyTreeId]);

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    
    // Simple force-directed graph rendering
    const renderFamilyTree = () => {
      const container = canvasRef.current;
      if (!container) return;
      
      // Clear previous content
      container.innerHTML = '';
      
      // Create elements for visualization
      const nodes: HTMLElement[] = [];
      const relationshipConnections: { source: HTMLElement, target: HTMLElement, type: string }[] = [];
      
      // Add the current user as the central node
      const centralNode = document.createElement('div');
      centralNode.className = 'absolute p-2 bg-isn-primary text-white rounded-full flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2';
      centralNode.style.left = '50%';
      centralNode.style.top = '50%';
      centralNode.style.zIndex = '10';
      centralNode.dataset.userId = user.userId;
      
      const centralAvatar = document.createElement('div');
      centralAvatar.className = 'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-isn-primary border-2 border-white';
      centralAvatar.textContent = getInitials(user.name);
      
      const centralName = document.createElement('div');
      centralName.className = 'mt-1 text-xs font-medium bg-white text-isn-primary px-2 py-1 rounded-full';
      centralName.textContent = user.name;
      
      centralNode.appendChild(centralAvatar);
      centralNode.appendChild(centralName);
      container.appendChild(centralNode);
      nodes.push(centralNode);
      
      // Create a map for quick lookup of HTML nodes by userId
      const nodeMap: Record<string, HTMLElement> = {
        [user.userId]: centralNode
      };
      
      // Add family members as nodes around the central user
      familyMembers.forEach((member, index) => {
        if (member.email === user.email) return; // Skip the current user
        
        // Calculate position in a circle around the central node
        const angle = (2 * Math.PI * index) / familyMembers.length;
        const radius = 130; // Adjust this value to change the distance from center
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        
        const memberNode = document.createElement('div');
        memberNode.className = 'absolute p-2 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2';
        memberNode.style.left = `${x}%`;
        memberNode.style.top = `${y}%`;
        memberNode.dataset.userId = member.userId;
        
        const memberAvatar = document.createElement('div');
        memberAvatar.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-isn-secondary text-white font-bold border-2 border-white';
        memberAvatar.textContent = getInitials(member.name);
        
        const memberName = document.createElement('div');
        memberName.className = 'mt-1 text-xs font-medium bg-white text-isn-dark px-2 py-1 rounded-full shadow';
        memberName.textContent = member.name;
        
        const relationshipLabel = document.createElement('div');
        relationshipLabel.className = 'text-[10px] text-isn-secondary font-medium';
        relationshipLabel.textContent = member.relationship || 'Family Member';
        
        memberNode.appendChild(memberAvatar);
        memberNode.appendChild(memberName);
        memberNode.appendChild(relationshipLabel);
        container.appendChild(memberNode);
        nodes.push(memberNode);
        nodeMap[member.userId] = memberNode;
      });
      
      // Draw relationship lines
      relationships.forEach((rel) => {
        const sourceNode = nodeMap[rel.source];
        const targetNode = nodeMap[rel.target];
        
        // Only draw line if both nodes exist
        if (sourceNode && targetNode) {
          const line = document.createElement('div');
          line.className = 'absolute border-t-2 border-dashed border-isn-secondary';
          line.style.zIndex = '1';
          container.appendChild(line);
          
          // Calculate line position and angle
          const updateLine = () => {
            const sourceRect = sourceNode.getBoundingClientRect();
            const targetRect = targetNode.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Source and target centers relative to container
            const sourceX = (sourceRect.left + sourceRect.width / 2) - containerRect.left;
            const sourceY = (sourceRect.top + sourceRect.height / 2) - containerRect.top;
            const targetX = (targetRect.left + targetRect.width / 2) - containerRect.left;
            const targetY = (targetRect.top + targetRect.height / 2) - containerRect.top;
            
            // Distance between centers
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Angle in radians
            const angle = Math.atan2(dy, dx);
            
            // Position line to connect the two nodes
            line.style.width = `${distance}px`;
            line.style.left = `${sourceX}px`;
            line.style.top = `${sourceY}px`;
            line.style.transform = `rotate(${angle}rad)`;
            
            // Add relationship type as a tooltip
            line.title = rel.type;
          };
          
          // Initial positioning
          updateLine();
          
          // Create relationship label
          const relLabel = document.createElement('div');
          relLabel.className = 'absolute text-[9px] px-1 bg-white border border-isn-secondary rounded-full text-isn-secondary z-10';
          relLabel.textContent = rel.type;
          container.appendChild(relLabel);
          
          // Position relationship label
          const sourceRect = sourceNode.getBoundingClientRect();
          const targetRect = targetNode.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          const sourceCenterX = (sourceRect.left + sourceRect.width / 2) - containerRect.left;
          const sourceCenterY = (sourceRect.top + sourceRect.height / 2) - containerRect.top;
          const targetCenterX = (targetRect.left + targetRect.width / 2) - containerRect.left;
          const targetCenterY = (targetRect.top + targetRect.height / 2) - containerRect.top;
          
          relLabel.style.left = `${sourceCenterX + (targetCenterX - sourceCenterX) * 0.4}px`;
          relLabel.style.top = `${sourceCenterY + (targetCenterY - sourceCenterY) * 0.4}px`;
          relLabel.style.transform = 'translate(-50%, -50%)';
          
          // Store for updates on resize
          relationshipConnections.push({
            source: sourceNode,
            target: targetNode,
            type: rel.type
          });
        }
      });
      
      // Update lines on window resize
      const handleResize = () => {
        relationshipConnections.forEach(conn => {
          // Recalculate positions when window is resized
          const sourceRect = conn.source.getBoundingClientRect();
          const targetRect = conn.target.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Source and target centers relative to container
          const sourceX = (sourceRect.left + sourceRect.width / 2) - containerRect.left;
          const sourceY = (sourceRect.top + sourceRect.height / 2) - containerRect.top;
          const targetX = (targetRect.left + targetRect.width / 2) - containerRect.left;
          const targetY = (targetRect.top + targetRect.height / 2) - containerRect.top;
          
          // Distance and angle calculations
          // ... code to update line positions
        });
      };
      
      // Add resize listener
      window.addEventListener('resize', handleResize);
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
  }, [user, familyMembers, relationships, isLoading]);
  
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
      ) : null}
    </div>
  );
};

export default FamilyTreeVisualization;
