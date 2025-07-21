
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Search, 
  Users, 
  UserPlus, 
  Bell, 
  TreePine,
  Heart,
  Send,
  Check,
  X
} from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  type: 'user' | 'family';
  familyTreeId?: string;
  profilePicture?: string;
  memberCount?: number;
  description?: string;
  status?: 'connected' | 'pending' | 'available';
}

const FamilySearchComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'users' | 'families'>('users');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<SearchResult[]>([]);

  // Mock data for demonstration
  const mockUsers: SearchResult[] = [
    {
      id: 'user_1',
      name: 'Priya Sharma',
      type: 'user',
      familyTreeId: 'tree_456',
      profilePicture: '/placeholder.svg',
      status: 'available',
      description: 'Software Engineer from Mumbai'
    },
    {
      id: 'user_2',
      name: 'Raj Patel',
      type: 'user',
      familyTreeId: 'tree_789',
      profilePicture: '/placeholder.svg',
      status: 'connected',
      description: 'Teacher from Gujarat'
    },
    {
      id: 'user_3',
      name: 'Anita Kumar',
      type: 'user',
      familyTreeId: 'tree_321',
      profilePicture: '/placeholder.svg',
      status: 'pending',
      description: 'Doctor from Delhi'
    }
  ];

  const mockFamilies: SearchResult[] = [
    {
      id: 'tree_456',
      name: 'Sharma Family',
      type: 'family',
      familyTreeId: 'tree_456',
      memberCount: 15,
      description: 'Traditional Punjabi family from Delhi',
      status: 'available'
    },
    {
      id: 'tree_789',
      name: 'Patel Clan',
      type: 'family',
      familyTreeId: 'tree_789',
      memberCount: 23,
      description: 'Gujarati business family',
      status: 'connected'
    },
    {
      id: 'tree_321',
      name: 'Kumar Lineage',
      type: 'family',
      familyTreeId: 'tree_321',
      memberCount: 8,
      description: 'South Indian Brahmin family',
      status: 'pending'
    }
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      const results = searchType === 'users' 
        ? mockUsers.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.id.includes(searchTerm)
          )
        : mockFamilies.filter(family => 
            family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            family.familyTreeId?.includes(searchTerm)
          );
      
      setSearchResults(results);
      setIsSearching(false);
    }, 1000);
  };

  const handleConnect = (result: SearchResult) => {
    // Add to connection requests
    setConnectionRequests(prev => [...prev, { ...result, status: 'pending' }]);
    
    // Update search results
    setSearchResults(prev => 
      prev.map(item => 
        item.id === result.id 
          ? { ...item, status: 'pending' }
          : item
      )
    );

    toast({
      title: "Connection Request Sent",
      description: `Your request to connect with ${result.name} has been sent.`,
    });
  };

  const handleAcceptRequest = (requestId: string) => {
    setConnectionRequests(prev => 
      prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'connected' }
          : req
      )
    );

    toast({
      title: "Connection Accepted",
      description: "You are now connected!",
    });
  };

  const handleRejectRequest = (requestId: string) => {
    setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
    
    toast({
      title: "Connection Declined",
      description: "Connection request has been declined.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 text-white">Connected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
          <Search className="h-4 w-4 mr-2" />
          Find Families & Users
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Discover Families & Connect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={searchType === 'users' ? 'default' : 'outline'}
                onClick={() => setSearchType('users')}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Search Users
              </Button>
              <Button
                variant={searchType === 'families' ? 'default' : 'outline'}
                onClick={() => setSearchType('families')}
                className="flex-1"
              >
                <TreePine className="h-4 w-4 mr-2" />
                Search Families
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={searchType === 'users' ? 'Enter user ID or name...' : 'Enter family tree ID or name...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Connection Requests */}
          {connectionRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Pending Requests ({connectionRequests.filter(r => r.status === 'pending').length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {connectionRequests.filter(req => req.status === 'pending').map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.profilePicture} />
                        <AvatarFallback>{request.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.name}</p>
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {searchResults.length > 0 ? `Search Results (${searchResults.length})` : 'Search Results'}
            </h3>
            
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.type === 'user' ? (
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={result.profilePicture} />
                              <AvatarFallback>{result.name[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                              <TreePine className="h-6 w-6 text-white" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{result.name}</h4>
                              {getStatusBadge(result.status || 'available')}
                            </div>
                            <p className="text-sm text-muted-foreground">{result.description}</p>
                            {result.type === 'family' && (
                              <p className="text-xs text-muted-foreground">
                                {result.memberCount} members • ID: {result.familyTreeId}
                              </p>
                            )}
                            {result.type === 'user' && (
                              <p className="text-xs text-muted-foreground">
                                Family Tree ID: {result.familyTreeId}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {result.status === 'connected' ? (
                            <Badge className="bg-green-500 text-white">
                              <Heart className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          ) : result.status === 'pending' ? (
                            <Badge variant="secondary">
                              <Send className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleConnect(result)}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchTerm && !isSearching ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{searchTerm}"</p>
                <p className="text-sm">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start searching to find families and users</p>
                <p className="text-sm">Connect with your extended family network</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FamilySearchComponent;
