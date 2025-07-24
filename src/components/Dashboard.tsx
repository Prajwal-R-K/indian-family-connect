
import React, { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home } from 'lucide-react';
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
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<UserType>(initialUser);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
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
        const members = await getFamilyMembers(user.familyTreeId);
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
      }
    };

    if (user.familyTreeId) {
      loadFamilyMembers();
    }
  }, [user.familyTreeId]);

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
    { id: 1, type: 'member_joined', description: 'John Smith joined the family tree', time: '2 hours ago' },
    { id: 2, type: 'relationship_added', description: 'Added relationship: Father-Son', time: '1 day ago' },
    { id: 3, type: 'profile_updated', description: 'Updated profile information', time: '3 days ago' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_joined': return <Users className="w-4 h-4" />;
      case 'relationship_added': return <User className="w-4 h-4" />;
      case 'profile_updated': return <Settings className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}!</p>
          </div>
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.profilePicture} />
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="family-tree">Family Tree</TabsTrigger>
            <TabsTrigger value="relationships">My Relationships</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Family Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{familyMembers.length}</div>
                  <p className="text-xs text-muted-foreground">Total members</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {familyMembers.filter(m => m.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {familyMembers.filter(m => m.status === 'invited').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting registration</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Generations</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">Spanning generations</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-full">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Invite Member
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <User className="h-6 w-6 mb-2" />
                    Add Relationship
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <MessageSquare className="h-6 w-6 mb-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Settings className="h-6 w-6 mb-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileData.profilePicture} />
                    <AvatarFallback className="text-lg">{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <Badge variant="secondary">{user.status}</Badge>
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
                      <Label>Phone</Label>
                      <p className="text-sm text-gray-600">{user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <p className="text-sm text-gray-600">{user.dateOfBirth || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Occupation</Label>
                      <p className="text-sm text-gray-600">{user.occupation || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <p className="text-sm text-gray-600">{user.address || 'Not provided'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Bio</Label>
                      <p className="text-sm text-gray-600">{user.bio || 'No bio provided'}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  {isEditing ? (
                    <>
                      <Button onClick={handleProfileUpdate}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Tree Tab */}
          <TabsContent value="family-tree">
            <Card>
              <CardHeader>
                <CardTitle>Family Tree Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <FamilyTreeVisualization 
                  user={user} 
                  familyMembers={familyMembers}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personal Relationships Tab */}
          <TabsContent value="relationships">
            <Card>
              <CardHeader>
                <CardTitle>My Family Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonalFamilyView user={user} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
