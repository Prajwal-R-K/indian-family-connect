
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  TreePine, 
  MessageSquare, 
  Calendar,
  Heart,
  Star,
  TrendingUp,
  Activity,
  Gift,
  Home,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { User } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeConnections: 0,
    recentActivities: 0,
    upcomingEvents: 0
  });

  useEffect(() => {
    // Simulate loading stats - in real app, this would fetch from API
    setStats({
      totalMembers: 24,
      activeConnections: 18,
      recentActivities: 12,
      upcomingEvents: 3
    });
  }, []);

  const handleNavigateToFamilyTree = () => {
    navigate('/family-tree');
  };

  const handleNavigateToRelationships = () => {
    navigate('/relationships');
  };

  const handleNavigateToMessages = () => {
    navigate('/messages');
  };

  const recentActivities = [
    { id: 1, type: 'join', user: 'Priya Sharma', time: '2 hours ago', description: 'joined the family network' },
    { id: 2, type: 'update', user: 'Raj Patel', time: '4 hours ago', description: 'updated their profile' },
    { id: 3, type: 'message', user: 'Anita Kumar', time: '6 hours ago', description: 'sent a family message' },
    { id: 4, type: 'event', user: 'Vikram Singh', time: '1 day ago', description: 'created an upcoming event' }
  ];

  const upcomingEvents = [
    { id: 1, title: 'Family Reunion 2024', date: 'Dec 25, 2024', attendees: 15 },
    { id: 2, title: 'Diwali Celebration', date: 'Nov 12, 2024', attendees: 22 },
    { id: 3, title: 'Birthday Celebration', date: 'Nov 8, 2024', attendees: 8 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profilePicture} alt={user.firstName} />
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-lg font-semibold">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                Connect with your family and strengthen your bonds
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Member since</p>
              <p className="font-semibold text-indigo-600">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Family Members</CardTitle>
              <Users className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats.totalMembers}</div>
              <p className="text-xs text-gray-600">Connected family network</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeConnections}</div>
              <p className="text-xs text-gray-600">Recently active members</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.recentActivities}</div>
              <p className="text-xs text-gray-600">This week</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.upcomingEvents}</div>
              <p className="text-xs text-gray-600">Next 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Navigate to key features of your family network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={handleNavigateToFamilyTree}
                className="flex items-center gap-2 h-16 bg-indigo-600 hover:bg-indigo-700"
              >
                <TreePine className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold">Family Tree</div>
                  <div className="text-sm opacity-90">Explore your lineage</div>
                </div>
              </Button>
              
              <Button 
                onClick={handleNavigateToRelationships}
                variant="outline"
                className="flex items-center gap-2 h-16 border-indigo-200 hover:bg-indigo-50"
              >
                <Heart className="h-6 w-6 text-red-500" />
                <div className="text-left">
                  <div className="font-semibold">Relationships</div>
                  <div className="text-sm text-gray-600">Manage connections</div>
                </div>
              </Button>
              
              <Button 
                onClick={handleNavigateToMessages}
                variant="outline"
                className="flex items-center gap-2 h-16 border-indigo-200 hover:bg-indigo-50"
              >
                <MessageSquare className="h-6 w-6 text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold">Messages</div>
                  <div className="text-sm text-gray-600">Family conversations</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="events">Upcoming Events</TabsTrigger>
            <TabsTrigger value="profile">Profile Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Family Activity</CardTitle>
                <CardDescription>
                  Stay updated with what's happening in your family network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        {activity.type === 'join' && <UserPlus className="h-5 w-5 text-green-500" />}
                        {activity.type === 'update' && <Activity className="h-5 w-5 text-blue-500" />}
                        {activity.type === 'message' && <MessageSquare className="h-5 w-5 text-purple-500" />}
                        {activity.type === 'event' && <Calendar className="h-5 w-5 text-orange-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          <span className="font-semibold">{activity.user}</span> {activity.description}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Family Events</CardTitle>
                <CardDescription>
                  Don't miss these special family gatherings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Gift className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600">{event.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          {event.attendees} attending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>
                  Your family network profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Home className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Full Name</p>
                        <p className="text-sm text-gray-600">{user.firstName} {user.lastName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    
                    {user.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm text-gray-600">{user.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {user.dateOfBirth && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                          <p className="text-sm text-gray-600">
                            {new Date(user.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {user.location && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Location</p>
                          <p className="text-sm text-gray-600">{user.location}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Member Since</p>
                        <p className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => navigate('/profile')}
                    className="w-full md:w-auto"
                  >
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
