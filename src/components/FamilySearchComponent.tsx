
import React, { useState } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Users, UserPlus, Bell, Send, Family } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SearchResult {
  userId: string;
  name: string;
  email: string;
  familyTreeId: string;
  profilePicture?: string;
  type: 'user' | 'family';
  status?: string;
}

interface FamilySearchComponentProps {
  user: User;
}

const FamilySearchComponent: React.FC<FamilySearchComponentProps> = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'user' | 'family'>('user');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  // Mock search function - in real app, this would call API
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock results
    const mockResults: SearchResult[] = [
      {
        userId: 'user_001',
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        familyTreeId: 'family_001',
        type: searchType,
        status: 'active',
        profilePicture: undefined
      },
      {
        userId: 'user_002',
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        familyTreeId: 'family_002',
        type: searchType,
        status: 'active',
        profilePicture: undefined
      },
      {
        userId: 'user_003',
        name: 'Amit Patel',
        email: 'amit.patel@email.com',
        familyTreeId: 'family_003',
        type: searchType,
        status: 'active',
        profilePicture: undefined
      }
    ];

    // Filter results based on search query
    const filteredResults = mockResults.filter(result =>
      result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (searchType === 'family' && result.familyTreeId.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setSearchResults(filteredResults);
    setIsSearching(false);

    if (filteredResults.length === 0) {
      toast({
        title: "No Results Found",
        description: `No ${searchType}s found matching "${searchQuery}"`,
      });
    }
  };

  const handleConnectRequest = async (result: SearchResult) => {
    setSelectedResult(result);
    setConnectionMessage(`Hi ${result.name}, I'd like to connect our family trees. I'm ${user.name} from the ${user.familyTreeId} family tree.`);
    setConnectionDialogOpen(true);
  };

  const sendConnectionRequest = async () => {
    if (!selectedResult || !connectionMessage.trim()) return;

    try {
      // Mock API call to send connection request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Connection Request Sent",
        description: `Your connection request has been sent to ${selectedResult.name}`,
      });

      setConnectionDialogOpen(false);
      setConnectionMessage('');
      setSelectedResult(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search & Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search for ${searchType}s by ${searchType === 'user' ? 'name, email, or User ID' : 'Family Tree ID'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'user' | 'family')}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value="user">Users</option>
              <option value="family">Families</option>
            </select>
            
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-600">
              Search Results ({searchResults.length})
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(result => (
                <div
                  key={result.userId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.profilePicture} />
                      <AvatarFallback>
                        {result.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{result.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {result.type === 'user' ? <Users className="h-3 w-3 mr-1" /> : <Family className="h-3 w-3 mr-1" />}
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{result.email}</p>
                      <p className="text-xs text-gray-400">Family Tree: {result.familyTreeId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {result.status && (
                      <Badge variant={result.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {result.status}
                      </Badge>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => handleConnectRequest(result)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      Connect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Connections or Tips */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium text-sm text-blue-800">Connection Tips</h4>
          </div>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• Search by exact User ID or Family Tree ID for best results</li>
            <li>• Connection requests help expand your family network</li>
            <li>• You'll receive notifications when others want to connect</li>
          </ul>
        </div>
      </CardContent>

      {/* Connection Request Dialog */}
      <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Send Connection Request
            </DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedResult.profilePicture} />
                  <AvatarFallback>
                    {selectedResult.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedResult.name}</h4>
                  <p className="text-sm text-gray-500">{selectedResult.email}</p>
                  <p className="text-xs text-gray-400">Family Tree: {selectedResult.familyTreeId}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Connection Message</label>
                <textarea
                  value={connectionMessage}
                  onChange={(e) => setConnectionMessage(e.target.value)}
                  placeholder="Write a message to introduce yourself..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConnectionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendConnectionRequest} disabled={!connectionMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FamilySearchComponent;
