
// Fixed visualization code with proper node selection and relationship display

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
    console.log(`Finding relationship between ${sourceId} and ${targetId}`);
    
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
      console.log(`Found relationship: ${sourceMember.name} -> ${targetMember.name}`);
      console.log(`Forward: ${forwardRel?.type || "None"}, Reverse: ${reverseRel?.type || "None"}`);
      
      setSelectedRelationship({
        from: sourceMember,
        to: targetMember,
        fromToRelation: forwardRel?.type || "No direct relationship",
        toFromRelation: reverseRel?.type || "No direct relationship"
      });
      setRelationshipDetailsOpen(true);
      return true;
    } else {
      console.log("Could not find one or both members");
      return false;
    }
  };

  // Improved function to handle node click with proper selection/deselection
  const handleNodeClick = (userId: string) => {
    console.log(`Node clicked: ${userId}, currently selected: ${selectedNode}, previous: ${previousSelectedNode}`);
    
    // If the same node is clicked again, deselect it and close any dialogs
    if (selectedNode === userId) {
      console.log("Deselecting node");
      setSelectedNode(null);
      setPreviousSelectedNode(null);
      setNodeDetailsOpen(false);
      return;
    }
    
    // If one node is already selected and now a different node is clicked
    if (selectedNode && selectedNode !== userId) {
      console.log("Second node selected, showing relationship");
      
      // Try to show relationship between current selected node and new node
      const relationshipShown = findRelationshipBetweenNodes(selectedNode, userId);
      
      if (relationshipShown) {
        // After showing relationship, update selection state
        setPreviousSelectedNode(selectedNode);
        setSelectedNode(userId);
      } else {
        // If no relationship found, just update to new node
        setSelectedNode(userId);
        setPreviousSelectedNode(null);
        
        // Show node details for this node
        const member = familyMembers.find(m => m.userId === userId);
        if (member) {
          setSelectedMember(member);
          setNodeDetailsOpen(true);
        }
      }
      return;
    }
    
    // If this is the first node being selected
    console.log("First node selected, showing details");
    setSelectedNode(userId);
    
    // Show node details for this node
    const member = familyMembers.find(m => m.userId === userId);
    if (member) {
      setSelectedMember(member);
      setNodeDetailsOpen(true);
    }
  };

  // Handle closing dialogs - reset selections
  const handleNodeDetailsClose = () => {
    setNodeDetailsOpen(false);
    setSelectedNode(null);  // Deselect node when closing details
  };

  const handleRelationshipDetailsClose = () => {
    setRelationshipDetailsOpen(false);
    // Reset selections after relationship view is closed
    setSelectedNode(null);
    setPreviousSelectedNode(null);
  };

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    
    // Force-directed graph rendering with improved visual design
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
        
        // Create clusters for each relationship type - enhanced visual design
        let groupIndex = 0;
        for (const [relType, memberIds] of Object.entries(relationshipGroups)) {
          // Create group label
          const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          const angle = (2 * Math.PI * groupIndex) / Object.keys(relationshipGroups).length;
          const radius = Math.min(width, height) * 0.35;
          const groupX = centerX + radius * Math.cos(angle);
          const groupY = centerY + radius * Math.sin(angle);
          
          // Create background for group with gradient
          const gradientId = `gradient-${relType}`;
          const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
          const gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
          gradient.setAttribute("id", gradientId);
          gradient.setAttribute("cx", "50%");
          gradient.setAttribute("cy", "50%");
          gradient.setAttribute("r", "50%");
          
          const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
          stop1.setAttribute("offset", "0%");
          stop1.setAttribute("stop-color", "#e0e7ff");
          
          const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
          stop2.setAttribute("offset", "100%");
          stop2.setAttribute("stop-color", "#f3f4f6");
          
          gradient.appendChild(stop1);
          gradient.appendChild(stop2);
          defs.appendChild(gradient);
          svg.appendChild(defs);
          
          // Create group background with animation
          const groupBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          groupBg.setAttribute("cx", `${groupX}`);
          groupBg.setAttribute("cy", `${groupY}`);
          groupBg.setAttribute("r", `${nodeRadius * 3}`);
          groupBg.setAttribute("fill", `url(#${gradientId})`);
          groupBg.setAttribute("opacity", "0.8");
          svg.appendChild(groupBg);
          
          // Add pulsing animation
          const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
          animate.setAttribute("attributeName", "r");
          animate.setAttribute("values", `${nodeRadius * 2.8};${nodeRadius * 3.2};${nodeRadius * 2.8}`);
          animate.setAttribute("dur", "3s");
          animate.setAttribute("repeatCount", "indefinite");
          groupBg.appendChild(animate);
          
          // Create label for group with better styling
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.textContent = relType.charAt(0).toUpperCase() + relType.slice(1) + "s";
          label.setAttribute("x", `${groupX}`);
          label.setAttribute("y", `${groupY - nodeRadius * 2}`);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("font-size", "14");
          label.setAttribute("font-weight", "bold");
          label.setAttribute("fill", "#4b5563");
          
          // Add drop shadow for better visibility
          const labelShadow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
          labelShadow.setAttribute("id", `shadow-${relType}`);
          const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
          feDropShadow.setAttribute("dx", "0");
          feDropShadow.setAttribute("dy", "1");
          feDropShadow.setAttribute("stdDeviation", "1");
          feDropShadow.setAttribute("flood-color", "#000000");
          feDropShadow.setAttribute("flood-opacity", "0.3");
          labelShadow.appendChild(feDropShadow);
          defs.appendChild(labelShadow);
          
          label.setAttribute("filter", `url(#shadow-${relType})`);
          svg.appendChild(label);
          
          // Position members around the group center
          memberIds.forEach((memberId, memberIndex) => {
            const member = familyMembers.find(m => m.userId === memberId);
            if (!member) return;
            
            // Calculate position in a mini-circle around the group center
            const memberAngle = (2 * Math.PI * memberIndex) / memberIds.length;
            const memberRadius = nodeRadius * 2;
            const x = groupX + memberRadius * Math.cos(memberAngle);
            const y = groupY + memberRadius * Math.sin(memberAngle);
            
            // Store position for this member
            nodePositions[memberId] = {x, y};
          });
          
          groupIndex++;
        }
      } else {
        // Standard layout in a circle or force-directed layout
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
      
      // Add nodes for all unique family members including current user - enhanced visual design
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
        
        // Add shadow effect for nodes
        const nodeShadowId = `node-shadow-${member.userId}`;
        const nodeShadow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        nodeShadow.setAttribute("id", nodeShadowId);
        nodeShadow.setAttribute("x", "-50%");
        nodeShadow.setAttribute("y", "-50%");
        nodeShadow.setAttribute("width", "200%");
        nodeShadow.setAttribute("height", "200%");
        
        const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
        feDropShadow.setAttribute("dx", "0");
        feDropShadow.setAttribute("dy", "3");
        feDropShadow.setAttribute("stdDeviation", "3");
        feDropShadow.setAttribute("flood-color", "#0000003d");
        nodeShadow.appendChild(feDropShadow);
        
        const defs = svg.querySelector("defs") || document.createElementNS("http://www.w3.org/2000/svg", "defs");
        if (!svg.querySelector("defs")) {
          svg.appendChild(defs);
        }
        defs.appendChild(nodeShadow);
        
        // Create fancy background glow circle for aesthetic
        const glowCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        glowCircle.setAttribute("r", `${nodeRadius + 3}`);
        glowCircle.setAttribute("fill", "rgba(99, 102, 241, 0.1)");
        glowCircle.setAttribute("stroke", "none");
        nodeGroup.appendChild(glowCircle);
        
        // Create circle with different style if selected
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", `${nodeRadius}`);
        
        // Determine node color based on status and selection - Only color user's node by default
        let fillColor = "#d1d5db"; // Default light gray for other nodes
        
        if (member.userId === user.userId) {
          fillColor = "#6366f1"; // Current user color - indigo
        }
        
        // If a node is selected, change its color
        if (selectedNode === member.userId) {
          fillColor = "#10b981"; // Selected node - green
          
          // Add highlight pulse animation
          const pulseAnimation = document.createElementNS("http://www.w3.org/2000/svg", "animate");
          pulseAnimation.setAttribute("attributeName", "r");
          pulseAnimation.setAttribute("values", `${nodeRadius};${nodeRadius + 2};${nodeRadius}`);
          pulseAnimation.setAttribute("dur", "1.5s");
          pulseAnimation.setAttribute("repeatCount", "indefinite");
          circle.appendChild(pulseAnimation);
          
          // Add stroke
          circle.setAttribute("stroke", "#047857");
          circle.setAttribute("stroke-width", "4");
        } else if (previousSelectedNode === member.userId) {
          // If it's the previously selected node in a relationship comparison
          fillColor = "#10b981"; // Keep green
          circle.setAttribute("stroke", "#047857");
          circle.setAttribute("stroke-width", "4");
        } else {
          // Not selected
          circle.setAttribute("stroke", "#ffffff");
          circle.setAttribute("stroke-width", "2");
        }
        
        circle.setAttribute("fill", fillColor);
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
        
        // Create nicer name label with background
        const nameBackgroundGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nameBackgroundGroup.setAttribute("transform", `translate(0, ${nodeRadius + 15})`);
        
        // Calculate width based on text
        const nameWidth = Math.max(member.name.length * 7, 70);
        
        // Create text background for name
        const nameBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        nameBackground.setAttribute("x", `-${nameWidth / 2}`);
        nameBackground.setAttribute("y", "-10");
        nameBackground.setAttribute("width", `${nameWidth}`);
        nameBackground.setAttribute("height", "20");
        nameBackground.setAttribute("rx", "10");
        nameBackground.setAttribute("ry", "10");
        nameBackground.setAttribute("fill", "white");
        nameBackground.setAttribute("stroke", "#e5e7eb");
        nameBackground.setAttribute("stroke-width", "1");
        nameBackground.setAttribute("filter", "url(#node-shadow-" + member.userId + ")");
        
        // Create text for name
        const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        nameText.textContent = member.name;
        nameText.setAttribute("text-anchor", "middle");
        nameText.setAttribute("font-size", "12");
        nameText.setAttribute("fill", "#374151");
        nameText.style.pointerEvents = "none";
        
        nameBackgroundGroup.appendChild(nameBackground);
        nameBackgroundGroup.appendChild(nameText);
        nodeGroup.appendChild(nameBackgroundGroup);
        
        // Add status indicator
        const statusIndicator = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        statusIndicator.setAttribute("cx", `${nodeRadius - 5}`);
        statusIndicator.setAttribute("cy", `-${nodeRadius - 5}`);
        statusIndicator.setAttribute("r", "6");
        statusIndicator.setAttribute("fill", member.status === "active" ? "#10b981" : "#f59e0b");
        statusIndicator.setAttribute("stroke", "white");
        statusIndicator.setAttribute("stroke-width", "2");
        nodeGroup.appendChild(statusIndicator);
        
        // Store node reference
        nodeElements[member.userId] = nodeGroup;
        svg.appendChild(nodeGroup);
      });
      
      // Draw edges (relationships) - enhanced with animations and better visibility
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
            
            // Use bezier curves for nicer connections
            const curveFactor = dist * 0.2;
            
            // Control points for bezier
            const cx1 = sourcePos.x + nx * curveFactor;
            const cy1 = sourcePos.y + ny * curveFactor;
            const cx2 = targetPos.x - nx * curveFactor;
            const cy2 = targetPos.y - ny * curveFactor;
            
            // Start and end points (adjusted for node radius)
            const startX = sourcePos.x + nx * nodeRadius;
            const startY = sourcePos.y + ny * nodeRadius;
            const endX = targetPos.x - nx * nodeRadius;
            const endY = targetPos.y - ny * nodeRadius;
            
            // Determine if this is a selected edge
            const isSelectedEdge = 
              (selectedNode === rel.source && previousSelectedNode === rel.target) ||
              (selectedNode === rel.target && previousSelectedNode === rel.source);
            
            // Add gradients for edge
            const edgeGradientId = `edge-gradient-${rel.source}-${rel.target}`;
            const edgeGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            edgeGradient.setAttribute("id", edgeGradientId);
            edgeGradient.setAttribute("x1", "0%");
            edgeGradient.setAttribute("y1", "0%");
            edgeGradient.setAttribute("x2", "100%");
            edgeGradient.setAttribute("y2", "0%");
            
            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute("offset", "0%");
            stop1.setAttribute("stop-color", isSelectedEdge ? "#10b981" : "#6366f1");
            
            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute("offset", "100%");
            stop2.setAttribute("stop-color", isSelectedEdge ? "#16a34a" : "#4f46e5");
            
            edgeGradient.appendChild(stop1);
            edgeGradient.appendChild(stop2);
            
            const defs = svg.querySelector("defs") || document.createElementNS("http://www.w3.org/2000/svg", "defs");
            if (!svg.querySelector("defs")) {
              svg.appendChild(defs);
            }
            defs.appendChild(edgeGradient);
            
            // Create path element for curved line
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const pathData = `M${startX},${startY} C${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`;
            path.setAttribute("d", pathData);
            path.setAttribute("stroke", `url(#${edgeGradientId})`);
            path.setAttribute("stroke-width", isSelectedEdge ? "3" : "1.5"); // Thinner lines by default
            path.setAttribute("fill", "none");
            
            // Add dotted animation to all connections
            path.setAttribute("stroke-dasharray", isSelectedEdge ? "none" : "5,5");
            
            // Add animation to selected edge
            if (isSelectedEdge) {
              const dashOffset = document.createElementNS("http://www.w3.org/2000/svg", "animate");
              dashOffset.setAttribute("attributeName", "stroke-dashoffset");
              dashOffset.setAttribute("values", "0;40");
              dashOffset.setAttribute("dur", "1s");
              dashOffset.setAttribute("repeatCount", "indefinite");
              path.appendChild(dashOffset);
            }
            
            // Insert path BEFORE nodes so they appear on top
            svg.insertBefore(path, svg.firstChild);
            
            // Create mid-point for label
            const midPointX = (startX + endX) / 2;
            const midPointY = (startY + endY) / 2;
            
            // Create fancy background for relationship label
            const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            labelGroup.setAttribute("transform", `translate(${midPointX}, ${midPointY})`);
            
            // Calculate width based on text
            const labelWidth = rel.type.length * 7 + 20;
            
            // Create background with gradient
            const labelBgGradientId = `label-bg-${rel.source}-${rel.target}`;
            const labelBgGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            labelBgGradient.setAttribute("id", labelBgGradientId);
            
            const labelStop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            labelStop1.setAttribute("offset", "0%");
            labelStop1.setAttribute("stop-color", isSelectedEdge ? "#d1fae5" : "#eef2ff");
            
            const labelStop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            labelStop2.setAttribute("offset", "100%");
            labelStop2.setAttribute("stop-color", isSelectedEdge ? "#a7f3d0" : "#e0e7ff");
            
            labelBgGradient.appendChild(labelStop1);
            labelBgGradient.appendChild(labelStop2);
            defs.appendChild(labelBgGradient);
            
            // Create label background
            const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            labelBg.setAttribute("x", `-${labelWidth / 2}`);
            labelBg.setAttribute("y", "-10");
            labelBg.setAttribute("width", `${labelWidth}`);
            labelBg.setAttribute("height", "20");
            labelBg.setAttribute("rx", "10");
            labelBg.setAttribute("ry", "10");
            labelBg.setAttribute("fill", `url(#${labelBgGradientId})`);
            labelBg.setAttribute("stroke", isSelectedEdge ? "#10b981" : "#818cf8");
            labelBg.setAttribute("stroke-width", "1");
            
            // Create label text
            const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            labelText.textContent = rel.type;
            labelText.setAttribute("text-anchor", "middle");
            labelText.setAttribute("dominant-baseline", "middle");
            labelText.setAttribute("font-size", "11");
            labelText.setAttribute("font-weight", isSelectedEdge ? "bold" : "normal");
            labelText.setAttribute("fill", isSelectedEdge ? "#047857" : "#4338ca");
            
            labelGroup.appendChild(labelBg);
            labelGroup.appendChild(labelText);
            svg.appendChild(labelGroup);
          }
        });
      }
      
      // Add arrowhead marker definition with better styling
      const defs = svg.querySelector("defs") || document.createElementNS("http://www.w3.org/2000/svg", "defs");
      if (!svg.querySelector("defs")) {
        svg.appendChild(defs);
      }
      
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
      
      // Add instructions with better styling
      const instructionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      instructionGroup.setAttribute("transform", `translate(10, 20)`);
      
      const instructionBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      instructionBg.setAttribute("x", "-5");
      instructionBg.setAttribute("y", "-15");
      instructionBg.setAttribute("width", "650");  // Extended width for more detailed instruction
      instructionBg.setAttribute("height", "25");
      instructionBg.setAttribute("rx", "5");
      instructionBg.setAttribute("ry", "5");
      instructionBg.setAttribute("fill", "rgba(255, 255, 255, 0.8)");
      instructionBg.setAttribute("stroke", "#e5e7eb");
      instructionBg.setAttribute("stroke-width", "1");
      
      const instructionText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      instructionText.textContent = "Click on a node to view details, click same node again to deselect, select a second node to view relationship";
      instructionText.setAttribute("font-size", "11");
      instructionText.setAttribute("fill", "#4b5563");
      
      instructionGroup.appendChild(instructionBg);
      instructionGroup.appendChild(instructionText);
      svg.appendChild(instructionGroup);
      
      // Add view mode indicator with better styling
      const viewModeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      viewModeGroup.setAttribute("transform", `translate(${width - 120}, 20)`);
      
      const viewModeBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      viewModeBg.setAttribute("x", "-60");
      viewModeBg.setAttribute("y", "-15");
      viewModeBg.setAttribute("width", "170");
      viewModeBg.setAttribute("height", "25");
      viewModeBg.setAttribute("rx", "5");
      viewModeBg.setAttribute("ry", "5");
      viewModeBg.setAttribute("fill", "rgba(255, 255, 255, 0.8)");
      viewModeBg.setAttribute("stroke", "#e5e7eb");
      viewModeBg.setAttribute("stroke-width", "1");
      
      const viewModeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      viewModeText.textContent = `View mode: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`;
      viewModeText.setAttribute("text-anchor", "end");
      viewModeText.setAttribute("font-size", "11");
      viewModeText.setAttribute("fill", "#4b5563");
      
      viewModeGroup.appendChild(viewModeBg);
      viewModeGroup.appendChild(viewModeText);
      svg.appendChild(viewModeGroup);
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
      <Dialog open={nodeDetailsOpen} onOpenChange={(open) => {
        setNodeDetailsOpen(open);
        if (!open) {
          // Deselect nodes when dialog is closed
          setSelectedNode(null);
          setPreviousSelectedNode(null);
        }
      }}>
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
                  {selectedMember.profilePicture ? (
                    <AvatarImage src={selectedMember.profilePicture} alt={selectedMember.name} />
                  ) : (
                    <AvatarFallback className="bg-isn-primary text-white">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  )}
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
                
                <div className="text-sm col-span-2">
                  <span className="font-medium">Family Tree ID:</span> 
                  <span className="ml-2 text-gray-600">{user.familyTreeId}</span>
                </div>
                
                <div className="text-sm col-span-2">
                  <span className="font-medium">Member ID:</span> 
                  <span className="ml-2 text-gray-600">{selectedMember.userId}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Relationship Details Dialog - Enhanced design with directional indicators */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={(open) => {
        setRelationshipDetailsOpen(open); 
        if (!open) {
          // Reset all selections when relationship dialog is closed
          setSelectedNode(null);
          setPreviousSelectedNode(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Relationship Details</DialogTitle>
            <DialogDescription className="text-center">
              How these family members are related to each other
            </DialogDescription>
          </DialogHeader>
          
          {selectedRelationship && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto">
                    <AvatarFallback className="bg-isn-primary text-white text-xl">
                      {getInitials(selectedRelationship.from?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 text-sm font-medium">{selectedRelationship.from?.name}</p>
                </div>
                
                <div className="flex flex-col items-center px-4">
                  {/* Bidirectional relationship indicators */}
                  <div className="flex flex-col items-center relative">
                    {/* Top arrow (from left to right) */}
                    <div className="flex items-center w-28 mb-1">
                      <div className="w-full h-0.5 bg-isn-primary"></div>
                      <div className="text-isn-primary" style={{ marginLeft: "-8px" }}>▶</div>
                    </div>
                    
                    <div className="text-xs bg-gradient-to-r from-isn-primary/10 to-isn-primary/20 rounded-full px-3 py-1 mb-1 font-medium">
                      {selectedRelationship.fromToRelation}
                    </div>
                    
                    {/* Bottom arrow (from right to left) */}
                    <div className="flex items-center w-28 mt-1 flex-row-reverse">
                      <div className="w-full h-0.5 bg-isn-secondary"></div>
                      <div className="text-isn-secondary" style={{ marginRight: "-8px" }}>◀</div>
                    </div>
                    
                    <div className="text-xs bg-gradient-to-r from-isn-secondary/20 to-isn-secondary/10 rounded-full px-3 py-1 mt-1 font-medium">
                      {selectedRelationship.toFromRelation}
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto">
                    <AvatarFallback className="bg-isn-secondary text-white text-xl">
                      {getInitials(selectedRelationship.to?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 text-sm font-medium">{selectedRelationship.to?.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                <div className="border rounded-lg p-3 bg-gradient-to-br from-white to-indigo-50">
                  <p className="text-sm font-medium text-gray-600">
                    {selectedRelationship.from?.name} sees {selectedRelationship.to?.name} as:
                  </p>
                  <p className="text-lg font-semibold text-isn-primary mt-1">
                    {selectedRelationship.fromToRelation}
                  </p>
                </div>
                
                <div className="border rounded-lg p-3 bg-gradient-to-br from-white to-emerald-50">
                  <p className="text-sm font-medium text-gray-600">
                    {selectedRelationship.to?.name} sees {selectedRelationship.from?.name} as:
                  </p>
                  <p className="text-lg font-semibold text-isn-secondary mt-1">
                    {selectedRelationship.toFromRelation}
                  </p>
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
