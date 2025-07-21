
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Smile, 
  Paperclip,
  Check,
  CheckCheck
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  senderName: string;
}

interface RealTimeMessagingProps {
  currentUser: User;
  selectedUser: {
    userId: string;
    name: string;
    profilePicture?: string;
    status: string;
  };
  onClose?: () => void;
}

const RealTimeMessaging: React.FC<RealTimeMessagingProps> = ({
  currentUser,
  selectedUser,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock initial messages
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: '1',
        senderId: selectedUser.userId,
        receiverId: currentUser.userId,
        content: 'Hey! How are you doing?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'read',
        type: 'text',
        senderName: selectedUser.name
      },
      {
        id: '2',
        senderId: currentUser.userId,
        receiverId: selectedUser.userId,
        content: "I'm doing well, thanks! How about you?",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'read',
        type: 'text',
        senderName: currentUser.name
      },
      {
        id: '3',
        senderId: selectedUser.userId,
        receiverId: currentUser.userId,
        content: 'Great! Looking forward to our next family gathering.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        status: 'delivered',
        type: 'text',
        senderName: selectedUser.name
      }
    ];
    setMessages(mockMessages);
  }, [selectedUser, currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate real-time features
  useEffect(() => {
    // Simulate typing indicator
    const typingTimeout = setTimeout(() => {
      if (Math.random() > 0.7) {
        setOtherUserTyping(true);
        setTimeout(() => setOtherUserTyping(false), 3000);
      }
    }, 5000);

    // Simulate incoming messages
    const messageTimeout = setTimeout(() => {
      if (Math.random() > 0.8) {
        const randomMessages = [
          "Thanks for sharing that!",
          "Looking forward to seeing everyone soon 😊",
          "Did you see the family photos I shared?",
          "Let's plan something for next weekend!"
        ];
        
        const newMsg: Message = {
          id: Date.now().toString(),
          senderId: selectedUser.userId,
          receiverId: currentUser.userId,
          content: randomMessages[Math.floor(Math.random() * randomMessages.length)],
          timestamp: new Date(),
          status: 'sent',
          type: 'text',
          senderName: selectedUser.name
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        // Mark as delivered after a short delay
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMsg.id ? { ...msg, status: 'delivered' } : msg
            )
          );
        }, 1000);
      }
    }, 10000);

    return () => {
      clearTimeout(typingTimeout);
      clearTimeout(messageTimeout);
    };
  }, [selectedUser, currentUser]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.userId,
      receiverId: selectedUser.userId,
      content: newMessage.trim(),
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
      senderName: currentUser.name
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'delivered' } : msg
        )
      );
    }, 1000);

    // Simulate message read
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'read' } : msg
        )
      );
    }, 3000);

    toast({
      title: "Message Sent",
      description: `Message sent to ${selectedUser.name}`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUser.profilePicture} />
            <AvatarFallback>{selectedUser.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{selectedUser.name}</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                selectedUser.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-muted-foreground">
                {selectedUser.status === 'active' ? 'Online' : 'Offline'}
              </span>
              {otherUserTyping && (
                <span className="text-xs text-blue-500 animate-pulse">typing...</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUser.userId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.senderId === currentUser.userId
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${
                  message.senderId === currentUser.userId ? 'justify-end' : 'justify-start'
                }`}>
                  <span className="text-xs opacity-70">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.senderId === currentUser.userId && getStatusIcon(message.status)}
                </div>
              </div>
            </div>
          ))}
          
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {selectedUser.name} is typing...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>
          
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMessaging;
