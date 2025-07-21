
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph';
import * as d3 from 'd3';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Maximize2, 
  RotateCcw, 
  Users, 
  Heart,
  Crown,
  Briefcase,
  GraduationCap,
  TreePine,
  GitBranch
} from "lucide-react";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';

interface GraphNode {
  id: string;
  name: string;
  type: 'family' | 'friend' | 'mentor' | 'cultural';
  relationship?: string;
  profilePicture?: string;
  status: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  strength?: number;
  color?: string;
}

interface HybridFamilyGraphProps {
  user: User;
  familyMembers: any[];
  viewMode: 'force' | 'tree';
  onViewModeChange: (mode: 'force' | 'tree') => void;
}

const HybridFamilyGraph: React.FC<HybridFamilyGraphProps> = ({
  user,
  familyMembers,
  viewMode,
  onViewModeChange
}) => {
  const fgRef = useRef<any>();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'family' | 'friend' | 'mentor' | 'cultural'>('all');
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [relationships, setRelationships] = useState<any[]>([]);

  // Color schemes for different node types
  const nodeColors = {
    family: '#3b82f6',     // Blue
    friend: '#8b5cf6',     // Purple  
    mentor: '#f59e0b',     // Orange
    cultural: '#10b981'    // Green
  };

  const relationshipStrengths = {
    'parent': 1.0,
    'child': 1.0,
    'spouse': 0.9,
    'sibling': 0.8,
    'friend': 0.6,
    'mentor': 0.7,
    'colleague': 0.5,
    'cultural': 0.4
  };

  // Load relationships data
  useEffect(() => {
    const loadRelationships = async () => {
      try {
        const rels = await getFamilyRelationships(user.familyTreeId);
        setRelationships(rels);
      } catch (error) {
        console.error('Error loading relationships:', error);
      }
    };
    loadRelationships();
  }, [user.familyTreeId]);

  // Process data for graph
  useEffect(() => {
    const processGraphData = () => {
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];

      // Add main user
      nodes.push({
        id: user.userId,
        name: user.name,
        type: 'family',
        profilePicture: user.profilePicture,
        status: user.status
      });

      // Add family members with enhanced categorization
      familyMembers.forEach(member => {
        const nodeType = categorizeRelationship(member.relationship);
        nodes.push({
          id: member.userId,
          name: member.name,
          type: nodeType,
          relationship: member.relationship,
          profilePicture: member.profilePicture,
          status: member.status
        });
      });

      // Add relationships as links
      relationships.forEach(rel => {
        const strength = relationshipStrengths[rel.type?.toLowerCase()] || 0.5;
        links.push({
          source: rel.source,
          target: rel.target,
          relation: rel.type,
          strength,
          color: getRelationshipColor(rel.type)
        });
      });

      // Filter based on current filter
      const filteredNodes = filterType === 'all' 
        ? nodes 
        : nodes.filter(node => node.type === filterType || node.id === user.userId);

      const filteredLinks = links.filter(link => {
        const sourceNode = filteredNodes.find(n => n.id === link.source);
        const targetNode = filteredNodes.find(n => n.id === link.target);
        return sourceNode && targetNode;
      });

      setGraphData({ nodes: filteredNodes, links: filteredLinks });
    };

    processGraphData();
  }, [familyMembers, relationships, user, filterType]);

  const categorizeRelationship = (relationship?: string): 'family' | 'friend' | 'mentor' | 'cultural' => {
    if (!relationship) return 'family';
    const rel = relationship.toLowerCase();
    
    if (['parent', 'child', 'sibling', 'spouse', 'mother', 'father', 'son', 'daughter', 'brother', 'sister'].some(r => rel.includes(r))) {
      return 'family';
    }
    if (['mentor', 'teacher', 'coach', 'guide'].some(r => rel.includes(r))) {
      return 'mentor';
    }
    if (['friend', 'buddy', 'pal'].some(r => rel.includes(r))) {
      return 'friend';
    }
    return 'cultural';
  };

  const getRelationshipColor = (type: string) => {
    const rel = type?.toLowerCase() || '';
    if (['parent', 'child', 'sibling', 'spouse'].some(r => rel.includes(r))) return '#ef4444';
    if (['friend'].some(r => rel.includes(r))) return '#8b5cf6';
    if (['mentor', 'teacher'].some(r => rel.includes(r))) return '#f59e0b';
    return '#6b7280';
  };

  // Custom node rendering
  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    const nodeRadius = 8;

    // Draw node circle with type-based color
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = node.id === user.userId ? '#fbbf24' : nodeColors[node.type];
    ctx.fill();

    // Add border for selected/hovered nodes
    if (selectedNode?.id === node.id || hoveredNode?.id === node.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();
    }

    // Add status indicator
    if (node.status === 'active') {
      ctx.beginPath();
      ctx.arc(node.x! + 6, node.y! - 6, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }

    // Draw label
    ctx.fillStyle = '#1f2937';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(label, node.x!, node.y! + nodeRadius + fontSize);

    // Add crown for main user
    if (node.id === user.userId) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = `${fontSize * 1.5}px Arial`;
      ctx.fillText('👑', node.x!, node.y! - nodeRadius - 5);
    }
  }, [user.userId, selectedNode, hoveredNode, nodeColors]);

  // Handle node clicks
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setShowNodeDetails(true);
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  // Search functionality
  const filteredNodes = graphData.nodes.filter(node =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Highlight searched nodes
  useEffect(() => {
    if (searchTerm && fgRef.current) {
      const matchedNode = filteredNodes[0];
      if (matchedNode) {
        fgRef.current.centerAt(matchedNode.x, matchedNode.y, 1000);
        fgRef.current.zoom(2, 1000);
      }
    }
  }, [searchTerm, filteredNodes]);

  // Layout configurations
  const forceConfig = {
    d3AlphaDecay: 0.02,
    d3VelocityDecay: 0.3,
    d3Force: (simulation: any) => {
      simulation
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter())
        .force('link', d3.forceLink().distance(80).strength(0.1));
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Controls Panel */}
      <Card className="absolute top-4 left-4 z-10 w-80 bg-background/95 backdrop-blur shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Family Network Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'force' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('force')}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Force Layout
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('tree')}
              className="flex-1"
            >
              <TreePine className="h-4 w-4 mr-2" />
              Tree View
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2">
            {(['all', 'family', 'friend', 'mentor', 'cultural'] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className="text-xs"
              >
                {type === 'all' && <Filter className="h-3 w-3 mr-1" />}
                {type === 'family' && <Heart className="h-3 w-3 mr-1" />}
                {type === 'friend' && <Users className="h-3 w-3 mr-1" />}
                {type === 'mentor' && <GraduationCap className="h-3 w-3 mr-1" />}
                {type === 'cultural' && <Crown className="h-3 w-3 mr-1" />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          {/* Reset View */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (fgRef.current) {
                fgRef.current.zoomToFit(1000);
              }
            }}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs border-t pt-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span>You</span>
          </div>
        </CardContent>
      </Card>

      {/* Graph Container */}
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg overflow-hidden">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          nodeRelSize={8}
          nodeLabel={(node: GraphNode) => `${node.name} (${node.type})`}
          linkLabel={(link: GraphLink) => link.relation}
          linkColor={(link: GraphLink) => link.color || '#94a3b8'}
          linkWidth={(link: GraphLink) => (link.strength || 0.5) * 4}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkHover={(link: GraphLink | null) => {
            if (fgRef.current && link) {
              fgRef.current.linkHoverPrecision(10);
            }
          }}
          cooldownTicks={100}
          onEngineStop={() => fgRef.current?.zoomToFit(400)}
          {...(viewMode === 'force' ? forceConfig : {})}
          width={window.innerWidth * 0.75}
          height={window.innerHeight * 0.7}
        />
      </div>

      {/* Node Details Dialog */}
      <Dialog open={showNodeDetails} onOpenChange={setShowNodeDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedNode?.profilePicture} />
                <AvatarFallback>{selectedNode?.name?.[0]}</AvatarFallback>
              </Avatar>
              {selectedNode?.name}
              {selectedNode?.id === user.userId && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNode && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={selectedNode.type === 'family' ? 'default' : 'secondary'}
                  style={{ backgroundColor: nodeColors[selectedNode.type] }}
                  className="text-white"
                >
                  {selectedNode.type}
                </Badge>
                <Badge variant={selectedNode.status === 'active' ? 'default' : 'secondary'}>
                  {selectedNode.status}
                </Badge>
              </div>

              {selectedNode.relationship && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Relationship:</p>
                  <p className="text-sm text-muted-foreground">{selectedNode.relationship}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  <Briefcase className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Graph Stats */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-background/95 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{graphData.nodes.length} People</span>
              <span>{graphData.links.length} Connections</span>
              <span>{filteredNodes.length} Visible</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HybridFamilyGraph;
