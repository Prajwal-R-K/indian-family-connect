
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { ArrowLeft, Home, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RealTimeMessaging from "@/components/RealTimeMessaging";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";

const MessagesPage: React.FC = () => {
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
          description: "Could not load family members for messaging.",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard', { state: { user } })}
                className="flex items-center gap-2 hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Family Messages
                </h1>
                <p className="text-muted-foreground">Stay connected with your family members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/family-tree', { state: { user } })}
                className="flex items-center gap-2 hover:bg-blue-50"
              >
                <MessageCircle className="h-4 w-4" />
                Family Tree
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard', { state: { user } })}
                className="flex items-center gap-2 hover:bg-blue-50"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Card className="w-full shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="h-[80vh]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-lg font-medium text-gray-600 mb-2">Loading Messages</div>
                    <div className="text-sm text-gray-500">Connecting to your family network...</div>
                  </div>
                </div>
              ) : (
                <RealTimeMessaging 
                  user={user} 
                  familyMembers={familyMembers}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagesPage;
