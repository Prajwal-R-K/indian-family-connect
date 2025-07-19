import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { ArrowLeft, Home, Settings, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import FamilyTreeVisualization from "@/components/FamilyTreeVisualization";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";

const FamilyTreePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as User;
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembers(user.familyTreeId);
        setFamilyMembers(members);
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
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard', { state: { user } })}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Family Tree Visualization</h1>
                <p className="text-muted-foreground">Interactive view of your family connections</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/messages', { state: { user } })}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Messages
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard', { state: { user } })}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Family Tree</span>
              <div className="text-sm text-muted-foreground">
                Click on a node to view details • Select two nodes to view relationship • Click anywhere to deselect
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[80vh] w-full bg-muted/20 rounded-lg border">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary/30 rounded-full mb-4"></div>
                    <div className="h-4 w-40 bg-primary/30 rounded mb-2"></div>
                    <div className="h-4 w-60 bg-primary/30 rounded"></div>
                  </div>
                </div>
              ) : familyMembers.length > 0 ? (
                <FamilyTreeVisualization 
                  user={user} 
                  familyMembers={familyMembers} 
                  viewMode="all"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Family Members Found</h3>
                    <p className="text-muted-foreground mb-4">Start by adding family members to see your tree.</p>
                    <Button onClick={() => navigate('/dashboard', { state: { user } })}>
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyTreePage;