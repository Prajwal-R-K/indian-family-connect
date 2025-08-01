
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import FamilyTreeVisualization from '@/components/FamilyTreeVisualization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { User } from '@/types';
import { getFamilyMembers, getTraversableFamilyTreeData, getUserPersonalFamilyView, getConnectedFamilyTrees } from '@/lib/neo4j';

const FamilyTreePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  const [viewType, setViewType] = useState<"personal" | "all" | "hyper">("all");
  const [connectedTrees, setConnectedTrees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      navigate('/auth');
    }
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchFamilyData();
    }
  }, [currentUser, viewType]);

  const fetchFamilyData = async () => {
    setIsLoading(true);
    try {
      let members: any[] = [];
      let visualizationData: { nodes: any[], links: any[] } = { nodes: [], links: [] };
      let connections: any[] = [];

      if (viewType === "personal") {
        members = await getUserPersonalFamilyView(currentUser.userId, currentUser.familyTreeId);
        visualizationData = {
          nodes: members.map(member => ({
            id: member.userId,
            name: member.name,
            status: member.status,
            profilePicture: member.profilePicture
          })),
          links: members.map(member => ({
            source: currentUser.userId,
            target: member.userId,
            type: member.relationship || 'family'
          }))
        };
      } else if (viewType === "hyper") {
        connections = await getConnectedFamilyTrees(currentUser.familyTreeId);
        visualizationData = { nodes: [], links: [] }; // No visualization for hyper view
      } else {
        members = await getFamilyMembers(currentUser.familyTreeId);
        visualizationData = await getTraversableFamilyTreeData(currentUser.familyTreeId);
      }

      setFamilyMembers(members);
      setTreeData(visualizationData);
      setConnectedTrees(connections);
    } catch (error) {
      console.error("Error fetching family data:", error);
      toast({
        title: "Error",
        description: "Failed to load family data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-isn-primary mb-4">Family Tree</h1>
          
          {currentUser && (
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {currentUser.name}'s Family Tree
                </h2>
                <Badge variant="outline" className="mb-4">
                  Family Tree ID: {currentUser.familyTreeId}
                </Badge>
              </div>
              
              <div className="flex gap-4 items-center">
                <Select value={viewType} onValueChange={(value: "personal" | "all" | "hyper") => setViewType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="personal">My View</SelectItem>
                    <SelectItem value="hyper">Connected Trees</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={() => navigate('/relationships')}
                  className="bg-isn-secondary hover:bg-isn-secondary/90"
                >
                  Manage Relationships
                </Button>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading family tree...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {viewType === "hyper" && connectedTrees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Connected Family Trees</CardTitle>
                  <CardDescription>
                    Relationships with members from other family trees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {connectedTrees.map((connection, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{connection.sourceName}</span>
                          <span className="text-muted-foreground mx-2">is {connection.type} of</span>
                          <span className="font-medium">{connection.targetName}</span>
                        </div>
                        <Badge variant="secondary">{connection.targetFamilyTreeId}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewType === "personal" ? "My Family Relationships" : 
                   viewType === "all" ? "Complete Family Tree" : 
                   "Connected Trees View"}
                </CardTitle>
                <CardDescription>
                  {viewType === "personal" ? "Your personal view of family relationships" : 
                   viewType === "all" ? "All members and relationships in your family tree" : 
                   "Visualization including connected family trees"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 border rounded-lg">
                  {currentUser && (
                    <FamilyTreeVisualization 
                      user={currentUser} 
                      familyMembers={familyMembers}
                      viewMode={viewType}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {familyMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Family Members ({familyMembers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {familyMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-isn-light rounded-full flex items-center justify-center">
                            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-medium">{member.name || 'Pending'}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.relationship && (
                            <Badge variant="outline">{member.relationship}</Badge>
                          )}
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FamilyTreePage;