import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageItem } from "@/components/message-item";
import { Phone, Video, MoreVertical, Paperclip, Mic, Send, Bookmark, Bot, Users, Megaphone } from "lucide-react";
import type { User, ChatWithMembers, MessageWithSender } from "@shared/schema";

interface ChatAreaProps {
  currentUser: User;
  selectedChat: ChatWithMembers | null;
  onSendMessage: (message: { chatId: number; content: string; type?: string }) => void;
  isConnected: boolean;
}

export function ChatArea({ currentUser, selectedChat, onSendMessage, isConnected }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["/api/chats", selectedChat?.id, "messages"],
    queryFn: async () => {
      if (!selectedChat) return [];
      const response = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!selectedChat,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;

    onSendMessage({
      chatId: selectedChat.id,
      content: message.trim(),
      type: "text",
    });

    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const getChatIcon = (chat: ChatWithMembers) => {
    switch (chat.type) {
      case "self":
        return <Bookmark className="w-6 h-6 text-white" />;
      case "bot":
        return <Bot className="w-6 h-6 text-white" />;
      case "group":
        return <Users className="w-6 h-6 text-white" />;
      case "channel":
        return <Megaphone className="w-6 h-6 text-white" />;
      default:
        return <div className="w-6 h-6 bg-white rounded-full" />;
    }
  };

  const getChatStatus = (chat: ChatWithMembers) => {
    switch (chat.type) {
      case "bot":
        return "bot";
      case "self":
        return "self";
      case "group":
        return `${chat.members.length} members`;
      case "channel":
        return "channel";
      default:
        return "online";
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Welcome to Telegram Clone
          </h2>
          <p className="text-muted-foreground">
            Select a chat to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10 bg-[var(--telegram-blue)]">
              <AvatarFallback className="bg-[var(--telegram-blue)]">
                {getChatIcon(selectedChat)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{selectedChat.name}</h2>
              <p className="text-sm text-muted-foreground">
                {getChatStatus(selectedChat)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <ScrollArea className="flex-1 p-4 bg-gray-50 dark:bg-gray-800">
        <div className="space-y-4">
          {/* Welcome message */}
          <div className="flex justify-center">
            <div className="bg-background px-4 py-2 rounded-full shadow-sm">
              <p className="text-sm text-muted-foreground">
                {selectedChat.type === "self" 
                  ? "This is your space for notes, files, and other things you want to keep."
                  : `This is the beginning of your conversation with ${selectedChat.name}`
                }
              </p>
              {(selectedChat.type === "group" || selectedChat.type === "channel") && selectedChat.inviteLink && (
                <p className="text-xs text-blue-500 mt-1">
                  Invite link: {selectedChat.inviteLink}
                </p>
              )}
            </div>
          </div>

          {messages.map((msg: MessageWithSender) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUser={currentUser}
              chat={selectedChat}
            />
          ))}

          {isTyping && (
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8 bg-gray-400">
                <AvatarFallback className="bg-gray-400">
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="message-bubble-received rounded-2xl rounded-tl-md px-4 py-3 max-w-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-indicator"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-indicator" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-indicator" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Composer */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-end space-x-3">
          <Button variant="ghost" size="icon">
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              className="min-h-[42px] max-h-[120px] resize-none rounded-2xl"
              rows={1}
            />
          </div>
          <Button variant="ghost" size="icon">
            <Mic className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected}
            className="bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)] text-white"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
