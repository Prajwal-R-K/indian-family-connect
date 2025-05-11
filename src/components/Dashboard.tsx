
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Users, Search, Mail, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import FamilyTreeVisualization from "./FamilyTreeVisualization";
import { getFamilyMembers, getFamilyRelationships } from "@/lib/neo4j/family-tree";

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationCount, setInvitationCount] = useState(0);
  const [showAllMembers, setShowAllMembers] = useState(false);
  
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        // Load family members and relationships
        const members = await getFamilyMembers(user.familyTreeId);
        setFamilyMembers(members);
        
        const relations = await getFamilyRelationships(user.familyTreeId);
        setRelationships(relations);
        
        // Count pending invitations
        const pendingInvites = members.filter(member => member.status === 'invited').length;
        setInvitationCount(pendingInvites);
      } catch (error) {
        console.error("Error loading family members:", error);
        toast({
          title: "Error",
          description: "Could not load family members. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadFamilyData();
  }, [user.familyTreeId]);
  
  // Get first letter of first and last name for avatar
  const getNameInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
    }
    return name.charAt(0);
  };
  
  // Button handlers
  const handleViewFamily = () => {
    setShowAllMembers(!showAllMembers);
  };
  
  const handleManageInvitations = () => {
    toast({
      title: "Invitations",
      description: `You have ${invitationCount} pending invitations.`,
    });
  };
  
  const handleSearch = () => {
    toast({
      title: "Search",
      description: "Search functionality coming soon!",
    });
  };
  
  const handleInvite = () => {
    navigate('/invite');
  };
  
  const handleViewProfile = () => {
    toast({
      title: "Profile",
      description: "Profile management coming soon!",
    });
  };
  
  // Get relationship description between current user and another member
  const getRelationship = (memberId: string) => {
    const rel = relationships.find(r => r.source === user.userId && r.target === memberId);
    if (rel) {
      return rel.type.charAt(0).toUpperCase() + rel.type.slice(1);
    }
    
    const reverseRel = relationships.find(r => r.target === user.userId && r.source === memberId);
    if (reverseRel) {
      return `${reverseRel.type.charAt(0).toUpperCase() + reverseRel.type.slice(1)} of`;
    }
    
    return "Family member";
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-isn-secondary cursor-pointer" onClick={handleViewProfile}>
          {user.profilePicture ? (
            <AvatarImage src={user.profilePicture} alt={user.name} />
          ) : (
            <AvatarFallback className="bg-isn-primary text-white text-xl">
              {getNameInitials(user.name)}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold text-isn-dark">{user.name || "Welcome!"}</h1>
          <p className="text-gray-600">Family Tree ID: {user.familyTreeId}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-isn-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Family Members</CardTitle>
            <CardDescription>View and manage your family</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{familyMembers.length || 0}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center gap-1"
                onClick={handleViewFamily}
              >
                <Users className="h-4 w-4" />
                <span>{showAllMembers ? "Hide" : "View"}</span>
              </Button>
            </div>
            
            {showAllMembers && familyMembers.length > 0 && (
              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
                {familyMembers.map((member) => (
                  <div key={member.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className={`text-xs ${member.status === 'invited' ? 'bg-yellow-500' : 'bg-isn-secondary'}`}>
                        {getNameInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-gray-500 truncate">{getRelationship(member.userId)}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      member.status === 'active' ? 'bg-green-100 text-green-800' : 
                      member.status === 'invited' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-isn-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Invitations</CardTitle>
            <CardDescription>Pending invites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{invitationCount}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center gap-1"
                onClick={handleManageInvitations}
              >
                <Mail className="h-4 w-4" />
                <span>Manage</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-isn-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Find Family</CardTitle>
            <CardDescription>Search for other trees</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full flex items-center gap-1"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Invite Members</CardTitle>
            <CardDescription>Expand your family tree</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              className="w-full bg-isn-primary hover:bg-isn-primary/90 flex items-center gap-1"
              onClick={handleInvite}
            >
              <Plus className="h-4 w-4" />
              <span>Invite</span>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Your Family Tree</CardTitle>
            <CardDescription>
              Interactive view of your family connections
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">
            {loading ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-20 h-20 bg-isn-primary/30 rounded-full mb-4"></div>
                <div className="h-4 w-40 bg-isn-primary/30 rounded mb-2"></div>
                <div className="h-4 w-60 bg-isn-primary/30 rounded"></div>
              </div>
            ) : familyMembers.length > 0 ? (
              <FamilyTreeVisualization user={user} familyMembers={familyMembers} />
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto bg-isn-secondary rounded-full mb-4 flex items-center justify-center text-white">
                  <Users className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Family Tree Visualization</h3>
                <p className="text-gray-500 mb-4">Your family tree will appear here as you add more members.</p>
                <Button 
                  size="sm" 
                  className="bg-isn-primary hover:bg-isn-primary/90"
                  onClick={handleInvite}
                >
                  Start Adding Members
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Activities</CardTitle>
            <CardDescription>Latest updates in your family network</CardDescription>
          </CardHeader>
          <CardContent>
            {relationships.length > 0 ? (
              <div className="space-y-3">
                {relationships.slice(0, 5).map((rel, idx) => {
                  const source = familyMembers.find(m => m.userId === rel.source)?.name || "Someone";
                  const target = familyMembers.find(m => m.userId === rel.target)?.name || "someone";
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-2 h-2 mt-2 rounded-full bg-isn-primary"></div>
                      <p className="text-sm">
                        <span className="font-medium">{source}</span> is {rel.type} of{" "}
                        <span className="font-medium">{target}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No recent activities</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
