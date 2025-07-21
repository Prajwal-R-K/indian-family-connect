import React, { useRef, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships, getFamilyMembers } from '@/lib/neo4j/family-tree';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Users, Network, Eye, Search, Filter } from "lucide-react";

interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  status: string;
  relationship?: string;
  profilePicture?: string;
  type?: 'family' | 'friend' | 'mentor' | 'cultural';
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  sourceName?: string;
  targetName?: string;
}

interface NodePosition { x: number; y: number; vx?: number; vy?: number; }

interface HybridFamilyGraphProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode: 'force-directed' | 'hierarchical';
  onViewModeChange: (mode: 'force-directed' | 'hierarchical') => void;
}

const HybridFamilyGraph: React.FC<HybridFamilyGraphProps> = ({ 
  user, 
  familyMembers,
  viewMode,
  onViewModeChange
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'family' | 'friend' | 'mentor' | 'cultural'>('all');
  const [isSimulating, setIsSimulating] = useState(true);

  // Fetch relationships
  useEffect(() => {
    const fetchData = async () => {
      try {
        const relationshipData = await getFamilyRelationships(user.familyTreeId);
        setRelationships(relationshipData);
      } catch (error) {
        console.error('Error fetching relationships:', error);
      }
    };
    fetchData();
  }, [user.familyTreeId]);

  // Get node type and color
  const getNodeTypeAndColor = (member: FamilyMember) => {
    const familyRelations = ['father', 'mother', 'son', 'daughter', 'brother', 'sister', 'husband', 'wife', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'uncle', 'aunt', 'nephew', 'niece', 'cousin'];
    const friendRelations = ['friend'];
    const mentorRelations = ['mentor', 'teacher', 'guide'];
    const culturalRelations = ['cultural', 'community', 'neighbor'];

    if (member.relationship) {
      const rel = member.relationship.toLowerCase();
      if (familyRelations.includes(rel)) return { type: 'family', color: '#3b82f6' };
      if (friendRelations.includes(rel)) return { type: 'friend', color: '#8b5cf6' };
      if (mentorRelations.includes(rel)) return { type: 'mentor', color: '#f97316' };
      if (culturalRelations.includes(rel)) return { type: 'cultural', color: '#10b981' };
    }
    return { type: 'family', color: '#3b82f6' };
  };

  // Filter members based on search and filter
  const filteredMembers = familyMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    
    const { type } = getNodeTypeAndColor(member);
    return matchesSearch && type === filterType;
  });

  // Force-directed simulation
  const runSimulation = useCallback(() => {
    if (!canvasRef.current || filteredMembers.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions if not set
    setNodePositions(prev => {
      const newPositions = { ...prev };
      filteredMembers.forEach(member => {
        if (!newPositions[member.userId]) {
          newPositions[member.userId] = {
            x: centerX + (Math.random() - 0.5) * 200,
            y: centerY + (Math.random() - 0.5) * 200,
            vx: 0,
            vy: 0
          };
        }
      });
      return newPositions;
    });

    if (viewMode === 'force-directed' && isSimulating) {
      const simulate = () => {
        setNodePositions(prevPositions => {
          const newPositions = { ...prevPositions };
          const alpha = 0.1;
          const repulsionStrength = 3000;
          const attractionStrength = 0.1;
          const damping = 0.9;

          // Apply forces
          filteredMembers.forEach(member => {
            const pos = newPositions[member.userId];
            if (!pos) return;

            let fx = 0, fy = 0;

            // Repulsion from other nodes
            filteredMembers.forEach(other => {
              if (other.userId === member.userId) return;
              const otherPos = newPositions[other.userId];
              if (!otherPos) return;

              const dx = pos.x - otherPos.x;
              const dy = pos.y - otherPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy) + 1;
              const force = repulsionStrength / (distance * distance);

              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            });

            // Attraction along edges
            relationships.forEach(rel => {
              let targetId = null;
              if (rel.source === member.userId) targetId = rel.target;
              if (rel.target === member.userId) targetId = rel.source;

              if (targetId && newPositions[targetId]) {
                const targetPos = newPositions[targetId];
                const dx = targetPos.x - pos.x;
                const dy = targetPos.y - pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                fx += dx * attractionStrength;
                fy += dy * attractionStrength;
              }
            });

            // Update velocity and position
            pos.vx = (pos.vx || 0) * damping + fx * alpha;
            pos.vy = (pos.vy || 0) * damping + fy * alpha;
            pos.x += pos.vx;
            pos.y += pos.vy;

            // Keep nodes in bounds
            pos.x = Math.max(60, Math.min(width - 60, pos.x));
            pos.y = Math.max(60, Math.min(height - 60, pos.y));
          });

          return newPositions;
        });

        if (isSimulating) {
          animationRef.current = requestAnimationFrame(simulate);
        }
      };

      simulate();
    } else if (viewMode === 'hierarchical') {
      // Hierarchical layout
      const levels = new Map<string, number>();
      const positioned = new Set<string>();
      
      // Start with main user at top
      levels.set(user.userId, 0);
      const queue = [user.userId];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentLevel = levels.get(current) || 0;
        
        relationships.forEach(rel => {
          if (rel.source === current && !levels.has(rel.target)) {
            levels.set(rel.target, currentLevel + 1);
            queue.push(rel.target);
          }
          if (rel.target === current && !levels.has(rel.source)) {
            levels.set(rel.source, currentLevel + 1);
            queue.push(rel.source);
          }
        });
      }

      setNodePositions(prev => {
        const newPositions = { ...prev };
        const levelNodes = new Map<number, string[]>();
        
        // Group nodes by level
        filteredMembers.forEach(member => {
          const level = levels.get(member.userId) || 0;
          if (!levelNodes.has(level)) levelNodes.set(level, []);
          levelNodes.get(level)!.push(member.userId);
        });

        // Position nodes
        levelNodes.forEach((nodeIds, level) => {
          const y = 100 + level * 150;
          const totalWidth = nodeIds.length * 120;
          const startX = (width - totalWidth) / 2;

          nodeIds.forEach((nodeId, index) => {
            newPositions[nodeId] = {
              x: startX + index * 120 + 60,
              y: y,
              vx: 0,
              vy: 0
            };
          });
        });

        return newPositions;
      });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [viewMode, filteredMembers, relationships, user.userId, isSimulating]);

  useEffect(() => {
    runSimulation();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [runSimulation]);

  // Handle node click
  const handleNodeClick = (userId: string) => {
    setSelectedNodes(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else if (prev.length < 2) {
        return [...prev, userId];
      } else {
        return [userId];
      }
    });

    const member = filteredMembers.find(m => m.userId === userId);
    if (member) {
      setSelectedMember(member);
      setDetailsOpen(true);
    }
  };

  // Find path between two nodes
  const findPath = (start: string, end: string): string[] => {
    const visited = new Set<string>();
    const queue = [[start]];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === end) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      relationships.forEach(rel => {
        if (rel.source === current && !visited.has(rel.target)) {
          queue.push([...path, rel.target]);
        }
        if (rel.target === current && !visited.has(rel.source)) {
          queue.push([...path, rel.source]);
        }
      });
    }
    return [];
  };

  // Show path when two nodes are selected
  useEffect(() => {
    if (selectedNodes.length === 2) {
      const path = findPath(selectedNodes[0], selectedNodes[1]);
      setHighlightedPath(path);
    } else {
      setHighlightedPath([]);
    }
  }, [selectedNodes, relationships]);

  return (
    <div className="w-full h-full relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'force-directed' ? 'default' : 'outline'}
            onClick={() => onViewModeChange('force-directed')}
          >
            <Network className="h-4 w-4 mr-2" />
            Force Layout
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'hierarchical' ? 'default' : 'outline'}
            onClick={() => onViewModeChange('hierarchical')}
          >
            <Users className="h-4 w-4 mr-2" />
            Tree View
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2 py-1 text-sm border rounded"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-2 py-1 text-sm border rounded"
          >
            <option value="all">All</option>
            <option value="family">Family</option>
            <option value="friend">Friends</option>
            <option value="mentor">Mentors</option>
            <option value="cultural">Cultural</option>
          </select>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsSimulating(!isSimulating)}
        >
          {isSimulating ? 'Pause' : 'Resume'} Simulation
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-sm mb-2">Node Types</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Family</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>Friends</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span>Mentors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Cultural</span>
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden"
        onClick={() => {
          setSelectedNodes([]);
          setHighlightedPath([]);
          setDetailsOpen(false);
        }}
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>
          
          {relationships.map((rel, idx) => {
            const sourcePos = nodePositions[rel.source];
            const targetPos = nodePositions[rel.target];
            if (!sourcePos || !targetPos) return null;

            const isHighlighted = highlightedPath.includes(rel.source) && highlightedPath.includes(rel.target);
            const isSelected = selectedNodes.includes(rel.source) && selectedNodes.includes(rel.target);

            return (
              <g key={idx}>
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={isHighlighted || isSelected ? "#f59e0b" : "url(#connection-gradient)"}
                  strokeWidth={isHighlighted || isSelected ? 4 : 2}
                  strokeDasharray={viewMode === 'force-directed' ? "5,5" : "none"}
                  opacity={0.8}
                  markerEnd="url(#arrowhead)"
                />
                
                {/* Relationship Label */}
                <text
                  x={(sourcePos.x + targetPos.x) / 2}
                  y={(sourcePos.y + targetPos.y) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-600 font-medium"
                  style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                >
                  {rel.type}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {filteredMembers.map(member => {
          const pos = nodePositions[member.userId];
          if (!pos) return null;

          const { type, color } = getNodeTypeAndColor(member);
          const isSelected = selectedNodes.includes(member.userId);
          const isHighlighted = highlightedPath.includes(member.userId);
          const isMainUser = member.userId === user.userId;

          return (
            <div
              key={member.userId}
              className={`absolute cursor-pointer transition-all duration-300 ${
                isSelected || isHighlighted ? 'z-20 scale-110' : 'z-10'
              }`}
              style={{
                left: pos.x - 40,
                top: pos.y - 40,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(member.userId);
              }}
            >
              {/* Node glow effect */}
              {(isSelected || isHighlighted) && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                    width: 100,
                    height: 100,
                    left: -10,
                    top: -10
                  }}
                />
              )}

              {/* Node circle */}
              <div
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-lg relative ${
                  isMainUser ? 'border-yellow-400' : 'border-white'
                }`}
                style={{ backgroundColor: color }}
              >
                {member.profilePicture ? (
                  <img
                    src={member.profilePicture}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="text-white font-semibold text-sm">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                )}

                {/* Status indicator */}
                <div
                  className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                    member.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />

                {/* Main user crown */}
                {isMainUser && (
                  <div className="absolute -top-3 -right-2 text-2xl">👑</div>
                )}
              </div>

              {/* Node label */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-white/90 rounded-lg shadow-md min-w-max">
                <div className="text-sm font-semibold text-center">{member.name}</div>
                {member.relationship && (
                  <div className="text-xs text-gray-600 text-center capitalize">
                    {member.relationship}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={selectedMember?.profilePicture} />
                <AvatarFallback>
                  {selectedMember?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {selectedMember?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Email:</span>
                <span className="text-muted-foreground">{selectedMember.email}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant={selectedMember.status === 'active' ? 'default' : 'secondary'}>
                  {selectedMember.status}
                </Badge>
              </div>

              {selectedMember.relationship && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Relationship:</span>
                  <span className="text-muted-foreground capitalize">{selectedMember.relationship}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium">Type:</span>
                <Badge style={{ backgroundColor: getNodeTypeAndColor(selectedMember).color }}>
                  {getNodeTypeAndColor(selectedMember).type}
                </Badge>
              </div>

              {selectedNodes.length === 2 && highlightedPath.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Connection Path</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Path: {highlightedPath.map(id => 
                      filteredMembers.find(m => m.userId === id)?.name
                    ).join(' → ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HybridFamilyGraph;
