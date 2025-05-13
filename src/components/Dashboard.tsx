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
import { getUserRelationships, getUserPersonalizedFamilyTree } from "@/lib/neo4j/relationships";

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [uniqueFamilyMembers, setUniqueFamilyMembers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [userRelationships, setUserRelationships] = useState<any[]>([]);
  const [personalizedView, setPersonalizedView] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationCount, setInvitationCount] = useState(0);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [viewMode, setViewMode] = useState<'personal' | 'all' | 'hyper' | 'connected'>('personal');
  
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        console.log("Loading family data for user:", user.userId, "in tree:", user.familyTreeId);
        
        // Load family members
        const members = await getFamilyMembers(user.familyTreeId);
        console.log("Loaded family members:", members);
        
        // Make sure we have unique members based on userId
        const uniqueMembers = removeDuplicateMembers(members);
        setFamilyMembers(members);
        setUniqueFamilyMembers(uniqueMembers);
        
        // Load all relationships in the family tree
        const relations = await getFamilyRelationships(user.familyTreeId);
        console.log("Loaded family relationships:", relations);
        setRelationships(relations);
        
        // Count pending invitations
        const pendingInvites = uniqueMembers.filter(member => member.status === 'invited').length;
        setInvitationCount(pendingInvites);
        
        // Load current user's specific relationships
        if (user.email) {
          // Get user's outgoing relationships
          const userRels = await getUserRelationships(user.email, user.familyTreeId);
          console.log("Loaded user relationships:", userRels);
          setUserRelationships(userRels);
          
          // Get user's personalized view
          const personalView = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
          console.log("Loaded personalized view:", personalView);
          setPersonalizedView(personalView);
        }
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
  }, [user.familyTreeId, user.userId, user.email]);
  
  // Helper function to remove duplicate members
  const removeDuplicateMembers = (members: any[]): any[] => {
    const uniqueMap = new Map();
    members.forEach(member => {
      // Only keep the latest/most complete version of each member
      if (!uniqueMap.has(member.userId) || 
          member.status === 'active' || 
          (uniqueMap.get(member.userId).status !== 'active')) {
        uniqueMap.set(member.userId, member);
      }
    });
    return Array.from(uniqueMap.values());
  };
  
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
  
  // Toggle view mode function - expanded to include hyper and connected views
  const toggleViewMode = () => {
    // Cycle through the view modes: personal -> all -> hyper -> connected -> personal
    if (viewMode === 'personal') {
      setViewMode('all');
      toast({
        title: "View Mode",
        description: "Switched to all family members view.",
      });
    } else if (viewMode === 'all') {
      setViewMode('hyper');
      toast({
        title: "View Mode",
        description: "Switched to hyper graph view.",
      });
    } else if (viewMode === 'hyper') {
      setViewMode('connected');
      toast({
        title: "View Mode",
        description: "Switched to connected family trees view.",
      });
    } else {
      setViewMode('personal');
      toast({
        title: "View Mode",
        description: "Switched to personal view.",
      });
    }
  };
  
  const handleDefineRelationships = () => {
    navigate('/relationships', { state: { user } });
  };
  
  // Get relationship description between current user and another member - FIXED
  const getRelationship = (memberId: string) => {
    // Try to find user's personal relationship to this member
    const personalRel = personalizedView.find(r => r.target === memberId);
    if (personalRel) {
      return personalRel.type.charAt(0).toUpperCase() + personalRel.type.slice(1);
    }
    
    // Try to find a direct relationship from current user to this member
    const directRel = relationships.find(r => 
      r.source === user.userId && r.target === memberId
    );
    if (directRel) {
      return directRel.type.charAt(0).toUpperCase() + directRel.type.slice(1);
    }
    
    // Try to find a reverse relationship from this member to current user
    const reverseRel = relationships.find(r => 
      r.target === user.userId && r.source === memberId
    );
    if (reverseRel) {
      // FIXED: We need to reverse the relationship description
      return `${reverseRel.type.charAt(0).toUpperCase() + reverseRel.type.slice(1)} of`;
    }
    
    // Find the member by ID
    const member = familyMembers.find(m => m.userId === memberId);
    if (member?.myRelationship) {
      return member.myRelationship;
    }
    
    return "Family member";
  };

  // Format the relationship text for better readability and correctness
  const formatRelationshipText = (relationship: any): string => {
    // Find the source and target member names
    const source = uniqueFamilyMembers.find(m => m.userId === relationship.source)?.name || "Someone";
    const target = uniqueFamilyMembers.find(m => m.userId === relationship.target)?.name || "someone";
    
    // FIXED: Ensure the relationship description shows the correct direction
    if (relationship.source === user.userId) {
      // Current user sees someone as their X
      return `${source} sees ${target} as their ${relationship.type}`;
    } else if (relationship.target === user.userId) {
      // Someone sees current user as their X
      return `${source} sees ${target} as their ${relationship.type}`;
    }
    
    // For third-party relationships (not involving current user)
    return `${source} sees ${target} as their ${relationship.type}`;
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
      
      {/* Dashboard cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Family Members card */}
        <Card className="border-l-4 border-l-isn-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Family Members</CardTitle>
            <CardDescription>View and manage your family</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{uniqueFamilyMembers.length || 0}</span>
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
            
            {showAllMembers && uniqueFamilyMembers.length > 0 && (
              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
                {uniqueFamilyMembers.map((member) => (
                  <div key={`member-${member.userId}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
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
        
        {/* Invitations card */}
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
        
        {/* Relationships card */}
        <Card className="border-l-4 border-l-isn-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Relationships</CardTitle>
            <CardDescription>Family connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{personalizedView.length}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center gap-1"
                onClick={toggleViewMode}
              >
                <Network className="h-4 w-4" />
                <span>
                  {viewMode === 'personal' ? "All View" : 
                   viewMode === 'all' ? "Hyper View" : 
                   viewMode === 'hyper' ? "Connected View" : "Personal View"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Family Relationships card */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Family Relationships</CardTitle>
            <CardDescription>Define or update your relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              className="w-full bg-isn-primary hover:bg-isn-primary/90 flex items-center gap-1"
              onClick={handleDefineRelationships}
            >
              <Users className="h-4 w-4" />
              <span>{user.myRelationship ? "Update" : "Define"} Relationships</span>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Family tree visualization card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Your Family Tree</CardTitle>
            <CardDescription>
              {viewMode === 'personal' ? "Your personal view of family relationships" : 
               viewMode === 'hyper' ? "View relationships grouped by type" :
               viewMode === 'connected' ? "View connected family trees" : 
               "Interactive view of all family connections"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">
            {loading ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-20 h-20 bg-isn-primary/30 rounded-full mb-4"></div>
                <div className="h-4 w-40 bg-isn-primary/30 rounded mb-2"></div>
                <div className="h-4 w-60 bg-isn-primary/30 rounded"></div>
              </div>
            ) : uniqueFamilyMembers.length > 0 ? (
              <FamilyTreeVisualization 
                user={user} 
                familyMembers={uniqueFamilyMembers} 
                viewMode={viewMode}
              />
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
        
        {/* Family Relationships sidebar - FIXED */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Family Relationships</CardTitle>
              <CardDescription>
                {viewMode === 'personal' ? "Your personal connections" : 
                 viewMode === 'hyper' ? "Relationships grouped by type" :
                 viewMode === 'connected' ? "Connected family trees" :
                 "All family connections"}
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleViewMode}
              className="h-8"
            >
              {viewMode === 'personal' ? "All" : 
               viewMode === 'all' ? "Hyper" : 
               viewMode === 'hyper' ? "Connected" : "Personal"}
            </Button>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {viewMode === 'personal' ? (
              personalizedView.length > 0 ? (
                <div className="space-y-3">
                  {personalizedView.slice(0, 10).map((rel, idx) => {
                    const targetMember = uniqueFamilyMembers.find(m => m.userId === rel.target);
                    return (
                      <div key={`personal-rel-${idx}`} className="flex items-start gap-2">
                        <div className="w-2 h-2 mt-2 rounded-full bg-isn-primary"></div>
                        <p className="text-sm">
                          You see <span className="font-medium">{targetMember?.name || 'Someone'}</span> as your <span className="font-medium">{rel.type}</span>
                        </p>
                      </div>
                    );
                  })}
                  {personalizedView.length > 10 && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      + {personalizedView.length - 10} more relationships
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No personal relationships defined yet</p>
                  <p className="text-xs mt-1">Define your relationship to family members when inviting them</p>
                </div>
              )
            ) : (
              relationships.length > 0 ? (
                <div className="space-y-3">
                  {relationships.slice(0, 10).map((rel, idx) => {
                    // Find the member objects
                    const sourceMember = uniqueFamilyMembers.find(m => m.userId === rel.source);
                    const targetMember = uniqueFamilyMembers.find(m => m.userId === rel.target);
                    
                    return (
                      <div key={`all-rel-${idx}`} className="flex items-start gap-2">
                        <div className="w-2 h-2 mt-2 rounded-full bg-isn-primary"></div>
                        <p className="text-sm">
                          <span className="font-medium">{sourceMember?.name || 'Someone'}</span> sees <span className="font-medium">{targetMember?.name || 'someone'}</span> as their <span className="font-medium">{rel.type}</span>
                        </p>
                      </div>
                    );
                  })}
                  {relationships.length > 10 && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      + {relationships.length - 10} more relationships
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No relationships yet</p>
                  <p className="text-xs mt-1">Invite family members to create connections</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
