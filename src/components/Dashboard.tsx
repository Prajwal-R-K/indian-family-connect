
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User } from "@/types";
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  Settings,
  TreePine,
  UserPlus,
  Bell,
  Activity,
  Heart,
  Gift,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Edit
} from "lucide-react";
import FamilyTreeVisualization from "./FamilyTreeVisualization";
import PersonalFamilyView from "./PersonalFamilyView";

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Helper function to get user's first name
  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || 'User';
  };

  // Helper function to get user initials
  const getUserInitials = (fullName: string) => {
    if (!fullName) return "U";
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`;
    }
    return fullName.charAt(0);
  };

  const handleNavigation = (path: string) => {
    navigate(path, { state: { user } });
  };

  const statsCards = [
    {
      title: "Family Members",
      value: "12",
      description: "Active members in your tree",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Messages",
      value: "8",
      description: "Unread messages",
      icon: MessageCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Events",
      value: "3",
      description: "Upcoming family events",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Connections",
      value: "24",
      description: "Total family connections",
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const quickActions = [
    {
      title: "View Family Tree",
      description: "Explore your family connections",
      icon: TreePine,
      action: () => setActiveTab("family-tree"),
      color: "bg-gradient-to-r from-green-500 to-emerald-500"
    },
    {
      title: "My Relationships",
      description: "View your personal family view",
      icon: Users,
      action: () => setActiveTab("relationships"),
      color: "bg-gradient-to-r from-blue-500 to-cyan-500"
    },
    {
      title: "Send Messages",
      description: "Connect with family members",
      icon: MessageCircle,
      action: () => handleNavigation("/messages"),
      color: "bg-gradient-to-r from-purple-500 to-pink-500"
    },
    {
      title: "Update Profile",
      description: "Manage your information",
      icon: Settings,
      action: () => setActiveTab("profile"),
      color: "bg-gradient-to-r from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 max-w-7xl">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-blue-100">
              <AvatarImage src={user.profilePicture} alt={user.name} />
              <AvatarFallback className="bg-blue-500 text-white text-2xl">
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {getFirstName(user.name)}!
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Here's what's happening with your family today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white text-sm px-3 py-1">
              Family Tree: {user.familyTreeId}
            </Badge>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`${stat.bgColor} p-4 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump to the most important family tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-4 hover:scale-105 transition-transform border-2"
                  onClick={action.action}
                >
                  <div className={`${action.color} p-4 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="family-tree">Family Tree</TabsTrigger>
          <TabsTrigger value="relationships">My Relationships</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Gift className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="font-medium">Birthday Celebration</p>
                    <p className="text-sm text-gray-600">Tomorrow, 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Heart className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium">Family Reunion</p>
                    <p className="text-sm text-gray-600">Next Saturday, 10:00 AM</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Recent Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-500 text-white">JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-gray-600 truncate">Hope you're doing well! Let's catch up soon...</p>
                  </div>
                  <Badge variant="secondary">2h</Badge>
                </div>
                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-500 text-white">MS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">Mary Smith</p>
                    <p className="text-sm text-gray-600 truncate">Thanks for sharing the family photos!</p>
                  </div>
                  <Badge variant="secondary">1d</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="family-tree" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Family Tree Visualization</CardTitle>
              <CardDescription>Interactive view of your complete family tree</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full">
                <FamilyTreeVisualization user={user} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Family Relationships</CardTitle>
              <CardDescription>Your personalized view of family connections</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full">
                <PersonalFamilyView user={user} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Profile Information
                <Button variant="outline" size="sm" onClick={() => handleNavigation("/profile")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.profilePicture} alt={user.name} />
                  <AvatarFallback className="bg-blue-500 text-white text-2xl">
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">{user.name}</h3>
                  <div className="space-y-1">
                    {user.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        {user.phone}
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {user.location}
                      </div>
                    )}
                    {user.profession && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="h-4 w-4" />
                        {user.profession}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="font-medium text-gray-900 mb-2">Status</p>
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-2">Family Tree ID</p>
                  <p className="text-gray-600 font-mono text-sm">{user.familyTreeId}</p>
                </div>
              </div>

              {user.bio && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium text-gray-900 mb-3">About</p>
                    <p className="text-gray-600">{user.bio}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Family Activity</CardTitle>
              <CardDescription>Latest updates from your family network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">New family member added</p>
                  <p className="text-sm text-gray-600">Sarah joined your family tree 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Relationship updated</p>
                  <p className="text-sm text-gray-600">Mike updated his relationship status yesterday</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Photo shared</p>
                  <p className="text-sm text-gray-600">Lisa shared family reunion photos 3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
