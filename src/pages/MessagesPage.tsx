
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import { ArrowLeft, Search, MessageCircle, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import RealTimeMessaging from "@/components/RealTimeMessaging";

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  profilePicture?: string;
  status: string;
}

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as User;
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const loadFamilyData = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembers(user.familyTreeId);
        const activeMembers = members.filter(member => 
          member.status === 'active' && member.userId !== user.userId
        );
        setFamilyMembers(activeMembers);
        
        // Create mock conversations for demo
        const mockConversations: Conversation[] = activeMembers.map(member => ({
          userId: member.userId,
          name: member.name,
          lastMessage: "Hey! How are you doing?",
          lastMessageTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          unreadCount: Math.floor(Math.random() * 5),
          profilePicture: member.profilePicture,
          status: member.status,
        }));
        
        setConversations(mockConversations);
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

  const handleSelectConversation = (userId: string) => {
    setSelectedConversation(userId);
    
    // Clear unread count for this conversation
    setConversations(prev => 
      prev.map(conv => 
        conv.userId === userId 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const getNameInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMember = selectedConversation 
    ? familyMembers.find(m => m.userId === selectedConversation)
    : null;

  if (!user) {
    return null;
  }

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
                  Family Messages
                </h1>
                <p className="text-muted-foreground">Real-time communication with your family</p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {familyMembers.length} Active Members
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversations
              </CardTitle>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search family members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 animate-pulse">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  <div className="space-y-1">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.userId}
                        onClick={() => handleSelectConversation(conversation.userId)}
                        className={`flex items-center space-x-3 p-4 cursor-pointer transition-all duration-200 border-b hover:bg-blue-50 ${
                          selectedConversation === conversation.userId ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {conversation.profilePicture ? (
                              <AvatarImage src={conversation.profilePicture} alt={conversation.name} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                {getNameInitials(conversation.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            conversation.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{conversation.name}</p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {conversation.lastMessageTime.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No family members found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConversation && selectedMember ? (
              <RealTimeMessaging
                currentUser={user}
                selectedUser={selectedMember}
                onClose={() => setSelectedConversation(null)}
              />
            ) : (
              <Card className="h-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Select a Conversation
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Choose a family member from the list to start a real-time conversation with enhanced features.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground">
                      <Badge variant="outline">🔔 Real-time notifications</Badge>
                      <Badge variant="outline">✓ Read receipts</Badge>
                      <Badge variant="outline">📱 Mobile friendly</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
