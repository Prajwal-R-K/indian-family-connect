
import React, { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, TreePine, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getFamilyMembers } from '@/lib/neo4j';
import { User as UserType } from '@/types';
import FamilyTreeVisualization from './FamilyTreeVisualization';
import PersonalFamilyView from './PersonalFamilyView';

interface DashboardProps {
  user: UserType;
  onNavigateToBuilder?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onNavigateToBuilder }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<UserType>(initialUser);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    dateOfBirth: user.dateOfBirth || '',
    bio: user.bio || '',
    occupation: user.occupation || '',
    profilePicture: user.profilePicture || ''
  });

  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        setLoadingMembers(true);
        console.log('Loading family members for tree:', user.familyTreeId);
        const members = await getFamilyMembers(user.familyTreeId);
        console.log('Loaded family members:', members);
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
        toast({
          title: "Error",
          description: "Failed to load family members. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoadingMembers(false);
      }
    };

    if (user.familyTreeId) {
      loadFamilyMembers();
    }
  }, [user.familyTreeId, toast]);

  const handleProfileUpdate = async () => {
    try {
      await updateUserProfile(user.userId, profileData);
      setUser({ ...user, ...profileData });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const recentActivities = [
    { id: 1, type: 'member_joined', description: 'Family tree created successfully', time: 'Recently' },
    { id: 2, type: 'profile_updated', description: 'Welcome to your family dashboard', time: 'Today' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_joined': return <Users className="w-4 h-4" />;
      case 'relationship_added': return <User className="w-4 h-4" />;
      case 'profile_updated': return <Settings className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  const activeMembersCount = familyMembers.filter(m => m.status === 'active').length;
  const pendingInvitesCount = familyMembers.filter(m => m.status === 'invited').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user.name}!</p>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="bg-blue-500 text-white font-semibold">
                {user.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {user.status === 'active' ? 'Active' : 'Invited'}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white rounded-lg p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="family-tree" className="flex items-center gap-2">
              <TreePine className="w-4 h-4" />
              Family Tree
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              My Relationships
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Family Members</CardTitle>
                  <Users className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{familyMembers.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Total members</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Members</CardTitle>
                  <UserCheck className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{activeMembersCount}</div>
                  <p className="text-xs text-gray-500 mt-1">Registered users</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending Invites</CardTitle>
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{pendingInvitesCount}</div>
                  <p className="text-xs text-gray-500 mt-1">Awaiting registration</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Tree Health</CardTitle>
                  <TreePine className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {familyMembers.length > 0 ? '100%' : '0%'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Complete</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-full">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col bg-blue-50 hover:bg-blue-100 border-blue-200"
                    onClick={onNavigateToBuilder}
                  >
                    <TreePine className="h-6 w-6 mb-2 text-blue-600" />
                    <span className="text-sm">Build Tree</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-green-50 hover:bg-green-100 border-green-200">
                    <Users className="h-6 w-6 mb-2 text-green-600" />
                    <span className="text-sm">Invite Member</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-purple-50 hover:bg-purple-100 border-purple-200">
                    <User className="h-6 w-6 mb-2 text-purple-600" />
                    <span className="text-sm">Add Relationship</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-orange-50 hover:bg-orange-100 border-orange-200">
                    <MessageSquare className="h-6 w-6 mb-2 text-orange-600" />
                    <span className="text-sm">Send Message</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileData.profilePicture} />
                    <AvatarFallback className="text-lg bg-blue-500 text-white">
                      {user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {user.status === 'active' ? 'Active' : 'Invited'}
                    </Badge>
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileData.dateOfBirth}
                        onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        value={profileData.occupation}
                        onChange={(e) => setProfileData({...profileData, occupation: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profileData.address}
                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Phone</Label>
                      <p className="text-sm text-gray-600">{user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Date of Birth</Label>
                      <p className="text-sm text-gray-600">{user.dateOfBirth || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Occupation</Label>
                      <p className="text-sm text-gray-600">{user.occupation || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Address</Label>
                      <p className="text-sm text-gray-600">{user.address || 'Not provided'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="font-medium">Bio</Label>
                      <p className="text-sm text-gray-600">{user.bio || 'No bio provided'}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  {isEditing ? (
                    <>
                      <Button onClick={handleProfileUpdate} className="bg-blue-600 hover:bg-blue-700">
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Tree Tab */}
          <TabsContent value="family-tree">
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Family Tree Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading family tree...</p>
                    </div>
                  </div>
                ) : (
                  <FamilyTreeVisualization 
                    user={user} 
                    familyMembers={familyMembers}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personal Relationships Tab */}
          <TabsContent value="relationships">
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">My Family Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading relationships...</p>
                    </div>
                  </div>
                ) : (
                  <PersonalFamilyView user={user} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
