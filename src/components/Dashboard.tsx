
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User } from "@/types";
import { 
  Users, 
  MessageCircle, 
  TreePine, 
  UserPlus, 
  Bell, 
  Heart,
  TrendingUp,
  Calendar,
  Gift,
  Star,
  Camera,
  MapPin
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
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingInvites: 0,
    recentConnections: 0
  });

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembers(user.familyTreeId);
        setFamilyMembers(members);
        
        // Calculate stats
        const activeCount = members.filter(m => m.status === 'active').length;
        const pendingCount = members.filter(m => m.status === 'invited').length;
        
        setStats({
          totalMembers: members.length,
          activeMembers: activeCount,
          pendingInvites: pendingCount,
          recentConnections: Math.floor(Math.random() * 5) + 1
        });
      } catch (error) {
        console.error("Error loading family data:", error);
        toast({
          title: "Error",
          description: "Could not load family data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadFamilyData();
  }, [user.familyTreeId]);

  const completionPercentage = (stats.activeMembers / Math.max(stats.totalMembers, 1)) * 100;

  const quickActions = [
    {
      title: "View Family Tree",
      description: "Explore your family connections",
      icon: TreePine,
      color: "from-green-500 to-emerald-600",
      action: () => navigate('/family-tree', { state: { user } })
    },
    {
      title: "Invite Members",
      description: "Add new family members",
      icon: UserPlus,
      color: "from-blue-500 to-cyan-600",
      action: () => navigate('/dashboard', { state: { user } })
    },
    {
      title: "Messages",
      description: "Chat with family members",
      icon: MessageCircle,
      color: "from-purple-500 to-pink-600",
      action: () => navigate('/messages', { state: { user } })
    },
    {
      title: "Edit Profile",
      description: "Update your information",
      icon: Users,
      color: "from-orange-500 to-red-600",
      action: () => navigate('/profile', { state: { user } })
    }
  ];

  const recentActivity = [
    { type: 'join', user: 'Priya Sharma', time: '2 hours ago', icon: UserPlus },
    { type: 'message', user: 'Raj Patel', time: '4 hours ago', icon: MessageCircle },
    { type: 'photo', user: 'Anita Kumar', time: '1 day ago', icon: Camera },
    { type: 'birthday', user: 'Vikram Singh', time: '2 days ago', icon: Gift }
  ];

  const upcomingEvents = [
    { title: 'Family Reunion', date: 'Dec 25, 2024', location: 'Mumbai', attendees: 15 },
    { title: 'Wedding Anniversary', date: 'Jan 5, 2025', location: 'Delhi', attendees: 8 },
    { title: 'Birthday Celebration', date: 'Jan 12, 2025', location: 'Pune', attendees: 12 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome back, {user.name}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your family connections and stay in touch with loved ones
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <FamilySearchComponent />
            <Button variant="outline" className="relative">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-red-500">
                3
              </Badge>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Members</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.totalMembers}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-full">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Members</p>
                  <p className="text-3xl font-bold text-green-700">{stats.activeMembers}</p>
                </div>
                <div className="p-3 bg-green-500 rounded-full">
                  <Heart className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Pending Invites</p>
                  <p className="text-3xl font-bold text-orange-700">{stats.pendingInvites}</p>
                </div>
                <div className="p-3 bg-orange-500 rounded-full">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">New Connections</p>
                  <p className="text-3xl font-bold text-purple-700">{stats.recentConnections}</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-all duration-300"
                        onClick={action.action}
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{action.title}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Family Tree Preview */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-green-600" />
                    Family Tree Preview
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/family-tree', { state: { user } })}
                  >
                    View Full Tree
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border-2 border-dashed border-blue-200 overflow-hidden">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-pulse text-muted-foreground">Loading family tree...</div>
                    </div>
                  ) : familyMembers.length > 0 ? (
                    <FamilyTreeVisualization 
                      user={user} 
                      familyMembers={familyMembers.slice(0, 8)} 
                      viewMode="personal"
                      minHeight="250px"
                      showControls={false}
                      defaultNodeRadius={40}
                      defaultLineWidth={2}
                      defaultZoom={0.8}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <TreePine className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No family members yet</p>
                        <Button 
                          size="sm" 
                          className="mt-2"
                          onClick={() => navigate('/dashboard', { state: { user } })}
                        >
                          Invite Members
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Family Progress */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Family Network Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Profile Completion</span>
                    <span>{Math.round(completionPercentage)}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Active Members:</span>
                    <span className="font-medium">{stats.activeMembers}/{stats.totalMembers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Invites:</span>
                    <span className="font-medium">{stats.pendingInvites}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="p-1.5 bg-blue-100 rounded-full">
                          <Icon className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.user}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                        <span>• {event.attendees} attending</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
