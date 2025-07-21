
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Users, MessageCircle, Phone, Video } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  userId: string;
  userName: string;
  userEmail: string;
  profilePicture?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  status: 'online' | 'offline';
}

interface RealTimeMessagingProps {
  user: User;
  familyMembers: any[];
}

const RealTimeMessaging: React.FC<RealTimeMessagingProps> = ({ user, familyMembers }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversations from family members
  useEffect(() => {
    const initConversations = familyMembers
      .filter(member => member.userId !== user.userId && member.status === 'active')
      .map(member => ({
        userId: member.userId,
        userName: member.name,
        userEmail: member.email,
        profilePicture: member.profilePicture,
        unreadCount: Math.floor(Math.random() * 5), // Mock unread count
        status: Math.random() > 0.5 ? 'online' : 'offline' as 'online' | 'offline',
        lastMessage: 'Hello! How are you?',
        lastMessageTime: new Date(Date.now() - Math.random() * 86400000) // Random time in last 24h
      }));
    
    setConversations(initConversations);
  }, [familyMembers, user.userId]);

  // Mock real-time message simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8 && conversations.length > 0) {
        const randomConversation = conversations[Math.floor(Math.random() * conversations.length)];
        const mockMessages = [
          "How are you doing?",
          "Hope you're having a great day!",
          "Let's catch up soon!",
          "Thanks for the photos!",
          "See you at the family gathering!"
        ];
        
        const newMsg: Message = {
          id: Date.now().toString(),
          senderId: randomConversation.userId,
          receiverId: user.userId,
          content: mockMessages[Math.floor(Math.random() * mockMessages.length)],
          timestamp: new Date(),
          read: false
        };

        if (selectedConversation === randomConversation.userId) {
          setMessages(prev => [...prev, newMsg]);
        }

        // Update conversation
        setConversations(prev => prev.map(conv => 
          conv.userId === randomConversation.userId 
            ? { 
                ...conv, 
                lastMessage: newMsg.content,
                lastMessageTime: newMsg.timestamp,
                unreadCount: selectedConversation === conv.userId ? 0 : conv.unreadCount + 1
              }
            : conv
        ));
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [conversations, selectedConversation, user.userId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation messages
  const loadMessages = (conversationUserId: string) => {
    // Mock messages
    const mockMessages: Message[] = [
      {
        id: '1',
        senderId: user.userId,
        receiverId: conversationUserId,
        content: 'Hello! How have you been?',
        timestamp: new Date(Date.now() - 3600000),
        read: true
      },
      {
        id: '2',
        senderId: conversationUserId,
        receiverId: user.userId,
        content: 'Hi! I\'m doing great, thanks for asking!',
        timestamp: new Date(Date.now() - 3000000),
        read: true
      },
      {
        id: '3',
        senderId: user.userId,
        receiverId: conversationUserId,
        content: 'That\'s wonderful to hear!',
        timestamp: new Date(Date.now() - 2400000),
        read: true
      }
    ];
    
    setMessages(mockMessages);
    
    // Mark conversation as read
    setConversations(prev => prev.map(conv => 
      conv.userId === conversationUserId ? { ...conv, unreadCount: 0 } : conv
    ));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: user.userId,
      receiverId: selectedConversation,
      content: newMessage.trim(),
      timestamp: new Date(),
      read: false
    };

    setMessages(prev => [...prev, message]);
    
    // Update conversation
    setConversations(prev => prev.map(conv => 
      conv.userId === selectedConversation 
        ? { ...conv, lastMessage: message.content, lastMessageTime: message.timestamp }
        : conv
    ));

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConvData = conversations.find(conv => conv.userId === selectedConversation);

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-full">
          {filteredConversations.map(conversation => (
            <div
              key={conversation.userId}
              className={`p-4 border-b cursor-pointer transition-colors ${
                selectedConversation === conversation.userId 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => {
                setSelectedConversation(conversation.userId);
                loadMessages(conversation.userId);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.profilePicture} />
                    <AvatarFallback>
                      {conversation.userName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    conversation.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate">{conversation.userName}</h3>
                    <div className="flex items-center gap-1">
                      {conversation.lastMessageTime && (
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessageTime.toLocaleDateString() === new Date().toLocaleDateString()
                            ? conversation.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : conversation.lastMessageTime.toLocaleDateString()
                          }
                        </span>
                      )}
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConvData?.profilePicture} />
                    <AvatarFallback>
                      {selectedConvData?.userName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    selectedConvData?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium">{selectedConvData?.userName}</h3>
                  <p className="text-sm text-gray-500 capitalize">{selectedConvData?.status}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user.userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === user.userId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderId === user.userId ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a family member to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeMessaging;
