
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Heart, Crown, User as UserIcon } from "lucide-react";

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

interface NodePosition { x: number; y: number; }

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: 'personal' | 'all' | 'hyper' | 'connected';
  level?: number;
  minHeight?: string;
  showControls?: boolean;
  defaultNodeRadius?: number;
  defaultLineWidth?: number;
  defaultZoom?: number;
}

const NODE_RADIUS = 60;

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ 
  user, 
  familyMembers,
  viewMode = 'personal',
  level = 1,
  minHeight,
  showControls = true,
  defaultNodeRadius = 60,
  defaultLineWidth = 3,
  defaultZoom = 1
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
  
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);
  const [nodeRadius, setNodeRadius] = useState(defaultNodeRadius);
  const [lineWidth, setLineWidth] = useState(defaultLineWidth);
  const [zoom, setZoom] = useState(defaultZoom);
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoize relationships fetch to prevent unnecessary re-renders
  const fetchRelationships = useCallback(async () => {
    if (!user?.userId || !user?.familyTreeId) return;
    
    setIsLoading(true);
    try {
      let relationshipData: Relationship[] = [];
      if (viewMode === 'personal') {
        relationshipData = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
      } else {
        relationshipData = await getFamilyRelationships(user.familyTreeId);
      }
      setRelationships(relationshipData);
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
      setRelationships([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, user?.familyTreeId, viewMode]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Optimized node and edge calculation with memoization
  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (viewMode === 'personal') {
      const directEdges = relationships.filter(
        r => r.source === user.userId || r.target === user.userId
      );
      const nodeIds = new Set<string>([user.userId]);
      directEdges.forEach(r => {
        nodeIds.add(r.source);
        nodeIds.add(r.target);
      });
      const nodes = familyMembers.filter(m => nodeIds.has(m.userId));
      return { visibleNodes: nodes, visibleEdges: directEdges };
    }
    return { visibleNodes: familyMembers, visibleEdges: relationships };
  }, [viewMode, relationships, familyMembers, user.userId]);

  // Optimized position calculation with faster initialization
  const calculateOptimizedPositions = useCallback((nodes: FamilyMember[], edges: Relationship[]) => {
    if (!canvasRef.current || nodes.length === 0) return {};
    
    const rect = canvasRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 800);
    const height = Math.max(rect.height, 600);
    const centerX = width / 2;
    const centerY = height / 2;
    const positions: Record<string, NodePosition> = {};

    if (viewMode === 'personal') {
      // Optimized personal view layout
      positions[user.userId] = { x: centerX, y: centerY };
      const directNodes = nodes.filter(n => n.userId !== user.userId);
      const radius = Math.min(width, height) * 0.25 + nodeRadius;
      
      directNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / directNodes.length;
        positions[node.userId] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });
    } else {
      // Optimized grid layout for other views
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const nodeSpacing = Math.min(width / (cols + 1), height / (Math.ceil(nodes.length / cols) + 1));
      
      nodes.forEach((node, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        positions[node.userId] = {
          x: (col + 1) * nodeSpacing,
          y: (row + 1) * nodeSpacing
        };
      });
    }
    
    return positions;
  }, [viewMode, user.userId, nodeRadius]);

  // Fast initialization effect
  useEffect(() => {
    if (!isLoading && visibleNodes.length > 0 && !isInitialized) {
      const positions = calculateOptimizedPositions(visibleNodes, visibleEdges);
      setNodePositions(positions);
      setIsInitialized(true);
    }
  }, [isLoading, visibleNodes, visibleEdges, calculateOptimizedPositions, isInitialized]);

  // Reset initialization when view mode changes
  useEffect(() => {
    setIsInitialized(false);
  }, [viewMode]);

  // Optimized drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    setDragNode(userId);
    setIsDragging(true);
    const currentPos = nodePositions[userId] || { x: 0, y: 0 };
    setDragOffset({
      x: e.clientX - rect.left - currentPos.x,
      y: e.clientY - rect.top - currentPos.y
    });

    const onMove = (event: MouseEvent) => {
      setNodePositions(pos => ({
        ...pos,
        [userId]: {
          x: event.clientX - rect.left - dragOffset.x,
          y: event.clientY - rect.top - dragOffset.y
        }
      }));
    };

    const onUp = () => {
      setIsDragging(false);
      setDragNode(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [nodePositions, dragOffset]);

  // Optimized node click handler
  const handleNodeClick = useCallback((userId: string) => {
    if (selectedNode === userId) {
      setSelectedNode(null);
      setPreviousSelectedNode(null);
      setNodeDetailsOpen(false);
      setRelationshipDetailsOpen(false);
      return;
    }

    if (selectedNode && selectedNode !== userId) {
      const forwardRel = relationships.find(r => r.source === selectedNode && r.target === userId);
      const reverseRel = relationships.find(r => r.source === userId && r.target === selectedNode);
      
      setSelectedRelationship({
        from: familyMembers.find(m => m.userId === selectedNode) || null,
        to: familyMembers.find(m => m.userId === userId) || null,
        fromToRelation: forwardRel?.type || '',
        toFromRelation: reverseRel?.type || '',
      });
      setRelationshipDetailsOpen(true);
      setNodeDetailsOpen(false);
      setPreviousSelectedNode(selectedNode);
      setSelectedNode(userId);
      return;
    }

    setSelectedNode(userId);
    setPreviousSelectedNode(null);
    setNodeDetailsOpen(true);
    setRelationshipDetailsOpen(false);
    setSelectedMember(familyMembers.find(m => m.userId === userId) || null);
  }, [selectedNode, relationships, familyMembers]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setSelectedNode(null);
      setPreviousSelectedNode(null);
      setNodeDetailsOpen(false);
      setRelationshipDetailsOpen(false);
    }
  }, []);

  // Enhanced loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-lg font-semibold text-gray-700 mb-2">Initializing Family Tree</div>
          <div className="text-sm text-gray-500">Building your family connections...</div>
        </div>
      </div>
    );
  }

  if (visibleNodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Family Members Found</h3>
          <p className="text-gray-600 mb-6">
            Start by adding family members to see your beautiful family tree visualization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden"
      style={{ minHeight: minHeight || '300px' }}
    >
      {/* Enhanced Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Size:</label>
              <input
                type="range"
                min={40}
                max={120}
                value={nodeRadius}
                onChange={e => setNodeRadius(Number(e.target.value))}
                className="w-20 accent-blue-600"
              />
              <span className="text-xs text-gray-500 min-w-[3rem]">{nodeRadius}px</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Lines:</label>
              <input
                type="range"
                min={1}
                max={10}
                value={lineWidth}
                onChange={e => setLineWidth(Number(e.target.value))}
                className="w-20 accent-blue-600"
              />
              <span className="text-xs text-gray-500">{lineWidth}px</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Zoom:</label>
              <input
                type="range"
                min={0.3}
                max={2}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-20 accent-blue-600"
              />
              <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-pointer relative flex items-center justify-center"
        onClick={handleCanvasClick}
      >
        {/* Graph Content */}
        <div
          className="relative transition-transform duration-300"
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'center center',
            minHeight: '100%',
            minWidth: '100%'
          }}
        >
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {visibleEdges.map((rel, idx) => {
              const source = nodePositions[rel.source];
              const target = nodePositions[rel.target];
              if (!source || !target) return null;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const mx = (source.x + target.x) / 2;
              const my = (source.y + target.y) / 2;
              const curve = Math.min(distance * 0.2, 100);
              const cx = mx - curve * (dy / distance);
              const cy = my + curve * (dx / distance);

              return (
                <path
                  key={`edge-${rel.source}-${rel.target}-${idx}`}
                  d={`M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`}
                  stroke="url(#connection-gradient)"
                  strokeWidth={lineWidth}
                  fill="none"
                  filter="url(#glow)"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {visibleNodes.map((member) => {
            const pos = nodePositions[member.userId];
            if (!pos) return null;

            const isMainUser = member.userId === user.userId;
            const isSelected = selectedNode === member.userId;
            const isPrevious = previousSelectedNode === member.userId;

            return (
              <div
                key={`node-${member.userId}`}
                className={`absolute cursor-pointer select-none transition-all duration-300 hover:z-30 ${
                  isMainUser ? 'z-20' : 'z-10'
                } ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                style={{ 
                  left: pos.x - nodeRadius, 
                  top: pos.y - nodeRadius, 
                  width: nodeRadius * 2, 
                  height: nodeRadius * 2 
                }}
                onMouseDown={e => handleMouseDown(e, member.userId)}
                onClick={e => { e.stopPropagation(); handleNodeClick(member.userId); }}
              >
                {/* Glow Effect */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-300 ${
                    isSelected 
                      ? 'shadow-[0_0_30px_8px_rgba(255,165,0,0.6)] animate-pulse' 
                      : isPrevious
                      ? 'shadow-[0_0_20px_4px_rgba(59,130,246,0.4)]'
                      : 'group-hover:shadow-[0_0_20px_4px_rgba(59,130,246,0.3)]'
                  }`}
                />

                {/* Node Circle */}
                <div className={`relative w-full h-full flex items-center justify-center rounded-full shadow-xl border-4 transition-all duration-300 ${
                  isMainUser 
                    ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 border-blue-300' 
                    : isSelected 
                    ? 'bg-gradient-to-br from-orange-400 via-yellow-400 to-red-500 border-orange-300'
                    : isPrevious
                    ? 'bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-500 border-blue-300'
                    : 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 border-green-300'
                }`}>
                  {member.profilePicture ? (
                    <img 
                      src={member.profilePicture} 
                      alt={member.name} 
                      className="w-[70%] h-[70%] rounded-full object-cover border-2 border-white shadow-inner" 
                    />
                  ) : (
                    <UserIcon className="w-[40%] h-[40%] text-white drop-shadow-lg" />
                  )}
                  
                  {/* Crown for main user */}
                  {isMainUser && (
                    <div className="absolute -top-4 -right-4 text-3xl drop-shadow-lg animate-bounce">
                      👑
                    </div>
                  )}
                  
                  {/* Status indicator */}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-3 border-white shadow-lg transition-all duration-300 ${
                    member.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </div>

                {/* Enhanced Name Label */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 min-w-max transition-all duration-300 hover:shadow-xl">
                  <div className="text-sm font-semibold text-gray-800 text-center">{member.name}</div>
                  <div className="text-xs text-gray-500 text-center">{member.status}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Node Details Dialog */}
      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={selectedMember?.profilePicture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  {selectedMember?.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{selectedMember?.name}</div>
                <div className="text-sm text-muted-foreground">Family Member</div>
              </div>
            </DialogTitle>
            <DialogDescription>View detailed information about this family member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <Badge variant={selectedMember?.status === 'active' ? 'default' : 'secondary'} className="w-full justify-center">
                  {selectedMember?.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600">Role</span>
                <Badge variant="outline" className="w-full justify-center">
                  {selectedMember?.userId === user.userId ? 'Main User' : 'Family Member'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">Email</span>
              <div className="p-2 bg-gray-50 rounded-md text-sm">{selectedMember?.email}</div>
            </div>

            {selectedMember && selectedMember.userId !== user.userId && (() => {
              const rel = relationships.find(r => r.source === user.userId && r.target === selectedMember.userId);
              if (rel?.type) {
                return (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-600">Relationship</span>
                    <div className="p-2 bg-blue-50 rounded-md text-sm text-blue-800">{rel.type}</div>
                  </div>
                );
              }
              return null;
            })()}

            {selectedMember?.userId === user.userId && (
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <Crown className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">You are the main user of this family tree</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Relationship Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Family Relationship Details
            </DialogTitle>
            <DialogDescription>Connection and relationship information between family members</DialogDescription>
          </DialogHeader>
          {selectedRelationship && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                    <AvatarImage src={selectedRelationship.from?.profilePicture} />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {selectedRelationship.from?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedRelationship.from?.name}</div>
                    <div className="text-sm text-muted-foreground">From</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <Heart className="h-4 w-4 text-red-500" />
                  <div className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                    <AvatarImage src={selectedRelationship.to?.profilePicture} />
                    <AvatarFallback className="bg-green-500 text-white">
                      {selectedRelationship.to?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedRelationship.to?.name}</div>
                    <div className="text-sm text-muted-foreground">To</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {selectedRelationship.fromToRelation && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-900 mb-1">Forward Relationship</div>
                    <div className="text-blue-700 font-semibold">{selectedRelationship.fromToRelation}</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {selectedRelationship.from?.name} → {selectedRelationship.to?.name}
                    </div>
                  </div>
                )}
                
                {selectedRelationship.toFromRelation && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-900 mb-1">Reverse Relationship</div>
                    <div className="text-green-700 font-semibold">{selectedRelationship.toFromRelation}</div>
                    <div className="text-xs text-green-600 mt-1">
                      {selectedRelationship.to?.name} → {selectedRelationship.from?.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;
