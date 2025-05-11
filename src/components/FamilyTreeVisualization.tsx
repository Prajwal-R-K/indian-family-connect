
import React, { useRef, useEffect } from 'react';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: any[];
}

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ user, familyMembers }) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Simple force-directed graph rendering
    const renderFamilyTree = () => {
      const container = canvasRef.current;
      if (!container) return;
      
      // Clear previous content
      container.innerHTML = '';
      
      // Create elements for visualization
      const nodes: HTMLElement[] = [];
      const relationships: { source: number, target: number, type: string }[] = [];
      
      // Add the current user as the central node
      const centralNode = document.createElement('div');
      centralNode.className = 'absolute p-2 bg-isn-primary text-white rounded-full flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2';
      centralNode.style.left = '50%';
      centralNode.style.top = '50%';
      centralNode.style.zIndex = '10';
      
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
        
        const memberAvatar = document.createElement('div');
        memberAvatar.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-isn-secondary text-white font-bold border-2 border-white';
        memberAvatar.textContent = getInitials(member.name);
        
        const memberName = document.createElement('div');
        memberName.className = 'mt-1 text-xs font-medium bg-white text-isn-dark px-2 py-1 rounded-full shadow';
        memberName.textContent = member.name;
        
        const relationshipLabel = document.createElement('div');
        relationshipLabel.className = 'text-[10px] text-isn-secondary font-medium';
        relationshipLabel.textContent = member.relationship || 'Family Member';
        
        // Draw connection line
        const line = document.createElement('div');
        line.className = 'absolute border-t-2 border-dashed border-isn-secondary origin-left';
        line.style.width = `${radius}px`;
        line.style.left = '50%';
        line.style.top = '50%';
        line.style.transform = `rotate(${angle}rad)`;
        line.style.zIndex = '1';
        container.appendChild(line);
        
        memberNode.appendChild(memberAvatar);
        memberNode.appendChild(memberName);
        memberNode.appendChild(relationshipLabel);
        container.appendChild(memberNode);
        nodes.push(memberNode);
        
        relationships.push({
          source: 0,
          target: index + 1,
          type: member.relationship || 'family'
        });
      });
    };
    
    renderFamilyTree();
    
    // Handle window resize
    window.addEventListener('resize', renderFamilyTree);
    return () => {
      window.removeEventListener('resize', renderFamilyTree);
    };
  }, [user, familyMembers]);
  
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
      {/* Family tree will be rendered here */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-pulse">Loading family tree...</div>
      </div>
    </div>
  );
};

export default FamilyTreeVisualization;
