
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Users, Search, Mail } from "lucide-react";

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  // Get first letter of first and last name for avatar
  const getNameInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
    }
    return name.charAt(0);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-isn-secondary">
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
              <span className="text-2xl font-bold">0</span>
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>View</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-isn-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Invitations</CardTitle>
            <CardDescription>Pending invites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">0</span>
              <Button size="sm" variant="outline" className="flex items-center gap-1">
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
            <Button size="sm" variant="outline" className="w-full flex items-center gap-1">
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
            <Button size="sm" className="w-full bg-isn-primary hover:bg-isn-primary/90 flex items-center gap-1">
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
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto bg-isn-secondary rounded-full mb-4 flex items-center justify-center text-white">
                <Users className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Family Tree Visualization</h3>
              <p className="text-gray-500 mb-4">Your family tree will appear here as you add more members.</p>
              <Button size="sm" className="bg-isn-primary hover:bg-isn-primary/90">
                Start Adding Members
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Activities</CardTitle>
            <CardDescription>Latest updates in your family network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              <p>No recent activities</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
