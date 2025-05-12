
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "@/types";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRelationshipTypes, createReciprocalRelationship } from "@/lib/neo4j/relationships";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import { updateUser } from "@/lib/neo4j/users";

const RelationshipPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const relationshipTypes = getRelationshipTypes();
  
  useEffect(() => {
    // Try to get user data from location state first
    const userData = location.state?.user;
    
    if (userData) {
      console.log("Relationship Page: User data found in location state", userData.userId);
      setUser(userData);
      
      // Fetch family members
      if (userData.familyTreeId) {
        loadFamilyMembers(userData.familyTreeId, userData.userId);
      } else {
        setIsLoading(false);
      }
    } else {
      // If no user data in location state, try to get from localStorage
      const storedUserId = localStorage.getItem('userId');
      const storedUserData = localStorage.getItem('userData');
      
      if (storedUserId && storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData) as User;
          setUser(parsedUserData);
          
          if (parsedUserData.familyTreeId) {
            loadFamilyMembers(parsedUserData.familyTreeId, parsedUserData.userId);
          } else {
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Failed to parse stored user data", e);
          navigate('/auth');
          setIsLoading(false);
        }
      } else {
        navigate('/auth');
        setIsLoading(false);
      }
    }
  }, [navigate, location.state]);
  
  const loadFamilyMembers = async (familyTreeId: string, currentUserId: string) => {
    try {
      const members = await getFamilyMembers(familyTreeId);
      // Filter out the current user
      const filteredMembers = members.filter(member => member.userId !== currentUserId);
      setFamilyMembers(filteredMembers);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading family members:", error);
      toast({
        title: "Error",
        description: "Could not load family members. Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  const handleRelationshipChange = (memberId: string, relationship: string) => {
    setRelationships(prev => ({
      ...prev,
      [memberId]: relationship
    }));
  };
  
  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // For each relationship, create a bidirectional relationship in Neo4j
      const relationshipPromises = Object.entries(relationships).map(([memberId, relationship]) => {
        // Find the member by ID
        const member = familyMembers.find(m => m.userId === memberId);
        if (!member) return null;
        
        return createReciprocalRelationship(
          user.familyTreeId,
          user.userId,
          memberId,
          relationship.toLowerCase(),
          getOppositeRelationship(relationship.toLowerCase())
        );
      });
      
      // Wait for all relationships to be created
      await Promise.all(relationshipPromises.filter(Boolean));
      
      // Update user status to indicate they've defined their relationships
      if (user) {
        await updateUser(user.userId, {
          // Store user's self-defined relationship in the user node
          myRelationship: "self"
        });
      }
      
      // Update stored user data
      const updatedUser = { ...user, myRelationship: "self" };
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      toast({
        title: "Relationships Saved",
        description: "Your family relationships have been saved successfully.",
      });
      
      // Redirect to dashboard
      navigate("/dashboard", { state: { user: updatedUser } });
    } catch (error) {
      console.error("Error saving relationships:", error);
      toast({
        title: "Error",
        description: "Failed to save relationships. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper function to get name initials for avatar
  const getNameInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
    }
    return name.charAt(0);
  };
  
  // Helper function for opposite relationships
  const getOppositeRelationship = (relationship: string): string => {
    const opposites: Record<string, string> = {
      "father": "child",
      "mother": "child",
      "son": "parent",
      "daughter": "parent",
      "brother": "sibling",
      "sister": "sibling",
      "husband": "spouse",
      "wife": "spouse",
      "grandfather": "grandchild",
      "grandmother": "grandchild",
      "grandson": "grandparent",
      "granddaughter": "grandparent",
      "uncle": "niece/nephew",
      "aunt": "niece/nephew",
      "nephew": "uncle/aunt",
      "niece": "uncle/aunt",
      "cousin": "cousin",
      "friend": "friend",
      "other": "other"
    };
    
    return opposites[relationship.toLowerCase()] || "family";
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-isn-primary/30 rounded-full mb-4"></div>
            <p>Loading family members...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p>Please <button 
            className="text-isn-primary hover:underline" 
            onClick={() => navigate('/auth')}
          >
            login
          </button> to continue.</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Define Your Family Relationships</CardTitle>
            <CardDescription>
              Welcome to your family tree! Please define your relationship to each family member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This information helps build your personalized view of the family tree.
              Each family member defines their own relationships, creating a rich network of connections.
            </p>
          </CardContent>
        </Card>
        
        {familyMembers.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">There are no other family members in your tree yet.</p>
            <p className="text-sm">Your family tree will grow as more members are invited and join.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {familyMembers.map(member => (
              <Card key={member.userId} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      {member.profilePicture ? (
                        <AvatarImage src={member.profilePicture} alt={member.name} />
                      ) : (
                        <AvatarFallback className="bg-isn-secondary text-white">
                          {getNameInitials(member.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <CardDescription>{member.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 flex-grow">
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">How are you related to {member.name.split(' ')[0]}?</p>
                    <Select
                      value={relationships[member.userId] || ''}
                      onValueChange={(value) => handleRelationshipChange(member.userId, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {relationships[member.userId] && (
                    <div className="text-sm text-gray-500 italic">
                      You are {relationships[member.userId].toLowerCase()} to {member.name.split(' ')[0]}.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="flex justify-end mt-6 space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard", { state: { user } })}
            disabled={isSaving}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(relationships).length === 0 || isSaving}
            className="bg-isn-primary hover:bg-isn-primary/90"
          >
            {isSaving ? "Saving..." : "Save Relationships"}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default RelationshipPage;
