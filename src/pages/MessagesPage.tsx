import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@/types";
import { ArrowLeft, Send, MessageCircle, Users, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  fromName: string;
  toName: string;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
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
    
    // Load mock messages for this conversation
    const mockMessages: Message[] = [
      {
        id: "1",
        from: userId,
        to: user.userId,
        content: "Hey! How are you doing?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        fromName: familyMembers.find(m => m.userId === userId)?.name || "Unknown",
        toName: user.name,
      },
      {
        id: "2",
        from: user.userId,
        to: userId,
        content: "I'm doing well, thanks! How about you?",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        fromName: user.name,
        toName: familyMembers.find(m => m.userId === userId)?.name || "Unknown",
      },
      {
        id: "3",
        from: userId,
        to: user.userId,
        content: "Great! Looking forward to our next family gathering.",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        fromName: familyMembers.find(m => m.userId === userId)?.name || "Unknown",
        toName: user.name,
      },
    ];
    
    setMessages(mockMessages);
    
    // Clear unread count for this conversation
    setConversations(prev => 
      prev.map(conv => 
        conv.userId === userId 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      from: user.userId,
      to: selectedConversation,
      content: newMessage.trim(),
      timestamp: new Date(),
      fromName: user.name,
      toName: familyMembers.find(m => m.userId === selectedConversation)?.name || "Unknown",
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage("");

    // Update conversation's last message
    setConversations(prev =>
      prev.map(conv =>
        conv.userId === selectedConversation
          ? { ...conv, lastMessage: newMessage.trim(), lastMessageTime: new Date() }
          : conv
      )
    );

    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
    });
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard', { state: { user } })}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Family Messages</h1>
                <p className="text-muted-foreground">Communicate with your family members</p>
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
          <Card className="lg:col-span-1">
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
                        className={`flex items-center space-x-3 p-4 cursor-pointer transition-colors border-b hover:bg-muted/50 ${
                          selectedConversation === conversation.userId ? 'bg-muted' : ''
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          {conversation.profilePicture ? (
                            <AvatarImage src={conversation.profilePicture} alt={conversation.name} />
                          ) : (
                            <AvatarFallback className="bg-primary text-white">
                              {getNameInitials(conversation.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{conversation.name}</p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
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
          <Card className="lg:col-span-2">
            {selectedConversation && selectedMember ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {selectedMember.profilePicture ? (
                        <AvatarImage src={selectedMember.profilePicture} alt={selectedMember.name} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white text-sm">
                          {getNameInitials(selectedMember.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedMember.name}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[60vh]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.from === user.userId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.from === user.userId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 min-h-[40px] max-h-[120px]"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        size="sm"
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Select a Conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a family member from the list to start messaging.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;