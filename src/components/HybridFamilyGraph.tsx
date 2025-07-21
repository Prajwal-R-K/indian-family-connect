
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  RotateCcw, 
  Users, 
  Heart,
  Crown,
  GraduationCap,
  TreePine,
  GitBranch
} from "lucide-react";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'family' | 'friend' | 'mentor' | 'cultural';
  relationship?: string;
  profilePicture?: string;
  status: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'family' | 'friend' | 'mentor' | 'cultural'>('all');
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [simulation, setSimulation] = useState<d3.Simulation<GraphNode, GraphLink> | null>(null);

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
        const sourceNode = filteredNodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
        const targetNode = filteredNodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
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

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create simulation
    const sim = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graphData.links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    setSimulation(sim);

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(graphData.links)
      .enter()
      .append("line")
      .attr("stroke", d => d.color || '#999')
      .attr("stroke-width", d => (d.strength || 0.5) * 4)
      .attr("stroke-opacity", 0.6);

    // Create nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(graphData.nodes)
      .enter()
      .append("circle")
      .attr("r", 15)
      .attr("fill", d => d.id === user.userId ? '#fbbf24' : nodeColors[d.type])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on("click", (event, d) => {
        setSelectedNode(d);
        setShowNodeDetails(true);
      });

    // Add labels
    const label = svg.append("g")
      .selectAll("text")
      .data(graphData.nodes)
      .enter()
      .append("text")
      .text(d => d.name)
      .attr("font-size", 12)
      .attr("text-anchor", "middle")
      .attr("dy", 25)
      .attr("fill", "#333");

    // Update positions on simulation tick
    sim.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x || 0)
        .attr("y1", d => (d.source as GraphNode).y || 0)
        .attr("x2", d => (d.target as GraphNode).x || 0)
        .attr("y2", d => (d.target as GraphNode).y || 0);

      node
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);

      label
        .attr("x", d => d.x || 0)
        .attr("y", d => d.y || 0);
    });

    return () => {
      sim.stop();
    };
  }, [graphData, user.userId, nodeColors]);

  // Search functionality
  const filteredNodes = graphData.nodes.filter(node =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              if (simulation) {
                simulation.alpha(1).restart();
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
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg overflow-hidden flex items-center justify-center">
        <svg
          ref={svgRef}
          width={800}
          height={600}
          className="border border-gray-200 rounded-lg bg-white shadow-inner"
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
