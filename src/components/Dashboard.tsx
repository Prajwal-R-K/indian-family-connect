
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types";
import { 
  Users, 
  MessageSquare, 
  Settings, 
  Crown, 
  Plus,
  Network,
  UserCheck,
  Calendar,
  Bell,
  Search
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import FamilyTreeVisualization from "./FamilyTreeVisualization";
import FamilySearchComponent from "./FamilySearchComponent";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembers(user.familyTreeId);
        setFamilyMembers(members);
      } catch (error) {
        console.error("Error loading family members:", error);
        toast({
          title: "Connection Issue",
          description: "Could not load some family data. Please check your connection.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadFamilyData();
  }, [user.familyTreeId]);

  const stats = {
    totalMembers: familyMembers.length,
    activeMembers: familyMembers.filter(m => m.status === 'active').length,
    pendingInvites: familyMembers.filter(m => m.status === 'invited').length,
    recentActivity: 3
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Welcome Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-gray-600 text-lg">
          Manage your family tree and stay connected with your loved ones
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold">{stats.activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold">{stats.pendingInvites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold">{stats.recentActivity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Actions */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/family-tree', { state: { user } })}
              className="w-full justify-start bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Network className="h-4 w-4 mr-2" />
              View Family Tree
            </Button>
            
            <Button 
              onClick={() => navigate('/messages', { state: { user } })}
              variant="outline" 
              className="w-full justify-start hover:bg-blue-50"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Family Messages
            </Button>
            
            <Button 
              onClick={() => navigate('/profile', { state: { user } })}
              variant="outline" 
              className="w-full justify-start hover:bg-green-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Update Profile
            </Button>

            <Button 
              onClick={() => setShowSearch(!showSearch)}
              variant="outline" 
              className="w-full justify-start hover:bg-yellow-50"
            >
              <Search className="h-4 w-4 mr-2" />
              Search & Connect
            </Button>
          </CardContent>
        </Card>

        {/* Search Component or Family Preview */}
        {showSearch ? (
          <FamilySearchComponent user={user} />
        ) : (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Family Overview
                </div>
                <Badge variant="outline">{familyMembers.length} members</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : familyMembers.length > 0 ? (
                <div className="h-48">
                  <FamilyTreeVisualization 
                    user={user} 
                    familyMembers={familyMembers} 
                    viewMode="personal"
                    minHeight="200px"
                    showControls={false}
                    defaultNodeRadius={40}
                    defaultLineWidth={2}
                    defaultZoom={0.8}
                  />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center">
                  <div>
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-3">No family members yet</p>
                    <Button size="sm" onClick={() => navigate('/family-tree', { state: { user } })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Members
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Family tree updated</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New message received</p>
                <p className="text-xs text-gray-500">5 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile updated</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
