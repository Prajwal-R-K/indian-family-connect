import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types";
import { ArrowLeft, Home, Settings, MessageCircle, Users, Network, Eye, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import FamilyTreeVisualization from "@/components/FamilyTreeVisualization";
import HybridFamilyGraph from "@/components/HybridFamilyGraph";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";

const FamilyTreePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as User;
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'personal' | 'all' | 'hyper'>('all');
  const [hybridMode, setHybridMode] = useState<'force-directed' | 'hierarchical'>('force-directed');
  
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

  const viewModeOptions = [
    {
      value: 'personal' as const,
      label: 'Personal View',
      description: 'Your direct connections',
      icon: Eye,
      color: 'bg-blue-500'
    },
    {
      value: 'all' as const,
      label: 'Full Tree',
      description: 'Complete family network',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      value: 'hyper' as const,
      label: 'Hybrid Graph',
      description: 'Interactive hybrid visualization',
      icon: Network,
      color: 'bg-purple-500'
    }
  ];

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
                  Family Tree Visualization
                </h1>
                <p className="text-muted-foreground">Interactive view of your family connections</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/messages', { state: { user } })}
                className="flex items-center gap-2 hover:bg-blue-50"
              >
                <MessageCircle className="h-4 w-4" />
                Messages
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

      {/* View Mode Selector */}
      <div className="container mx-auto px-4 py-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Visualization Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {viewModeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={viewMode === option.value ? "default" : "outline"}
                    className={`h-auto p-4 flex flex-col items-center gap-2 ${
                      viewMode === option.value 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0' 
                        : 'hover:bg-blue-50'
                    }`}
                    onClick={() => setViewMode(option.value)}
                  >
                    <Icon className={`h-5 w-5 ${viewMode === option.value ? 'text-white' : 'text-blue-500'}`} />
                    <div className="text-center">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs opacity-80">{option.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold">Your Family Tree</span>
                  <div className="text-sm text-muted-foreground mt-1">
                    {familyMembers.length} family members • {viewModeOptions.find(v => v.value === viewMode)?.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Click nodes for details
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Select two for relationship
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[75vh] w-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border-2 border-dashed border-blue-200 relative overflow-hidden">
              {loading ? (
                <div className="h-full flex items-center justify-center relative z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-lg font-medium text-gray-600 mb-2">Loading Family Tree</div>
                    <div className="text-sm text-gray-500">Gathering your family connections...</div>
                  </div>
                </div>
              ) : familyMembers.length > 0 ? (
                viewMode === 'hyper' ? (
                  <HybridFamilyGraph 
                    user={user} 
                    familyMembers={familyMembers} 
                    viewMode={hybridMode}
                    onViewModeChange={setHybridMode}
                  />
                ) : (
                  <FamilyTreeVisualization 
                    user={user} 
                    familyMembers={familyMembers} 
                    viewMode={viewMode}
                  />
                )
              ) : (
                <div className="h-full flex items-center justify-center relative z-10">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Family Members Found</h3>
                    <p className="text-gray-600 mb-6">
                      Start by adding family members to see your beautiful family tree visualization.
                    </p>
                    <Button 
                      onClick={() => navigate('/dashboard', { state: { user } })}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
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
