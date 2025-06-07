import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { UserSearchModal } from "@/components/user-search-modal";
import { Menu, Search, Plus, Settings, Moon, Sun, Bookmark, Bot, Users, Megaphone } from "lucide-react";
import type { User, ChatWithMembers } from "@shared/schema";

interface SidebarProps {
  currentUser: User;
  selectedChat: ChatWithMembers | null;
  onChatSelect: (chat: ChatWithMembers) => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export function Sidebar({ currentUser, selectedChat, onChatSelect, onNewChat, onSettings }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["/api/chats", currentUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/chats?userId=${currentUser.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch chats");
      return response.json();
    },
  });

  const filteredChats = chats.filter((chat: ChatWithMembers) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChatIcon = (chat: ChatWithMembers) => {
    switch (chat.type) {
      case "self":
        return <Bookmark className="w-5 h-5 text-white" />;
      case "bot":
        return <Bot className="w-5 h-5 text-white" />;
      case "group":
        return <Users className="w-5 h-5 text-white" />;
      case "channel":
        return <Megaphone className="w-5 h-5 text-white" />;
      default:
        return <div className="w-5 h-5 bg-white rounded-full" />;
    }
  };

  const getChatAvatarColor = (chat: ChatWithMembers) => {
    switch (chat.type) {
      case "self":
        return "bg-[var(--telegram-blue)]";
      case "bot":
        return "bg-green-500";
      case "group":
        return "bg-orange-500";
      case "channel":
        return "bg-red-500";
      default:
        return "bg-purple-500";
    }
  };

  const formatTime = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="w-80 telegram-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onSettings}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Telegram</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowUserSearch(true)}>
            <Search className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading chats...</div>
        ) : (
          <div>
            {filteredChats.map((chat: ChatWithMembers) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`p-4 hover:bg-muted/50 cursor-pointer border-b border-border transition-colors ${
                  selectedChat?.id === chat.id ? "bg-blue-50 dark:bg-blue-950/30" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className={`w-12 h-12 ${getChatAvatarColor(chat)}`}>
                    <AvatarFallback className={getChatAvatarColor(chat)}>
                      {getChatIcon(chat)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold truncate">{chat.name}</h3>
                        {currentUser.isAnonymous && chat.type === "private" && (
                          <Badge variant="secondary" className="text-xs">
                            Anonymous Number
                          </Badge>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage
                          ? `${chat.lastMessage.sender.firstName}: ${chat.lastMessage.content}`
                          : "No messages yet"
                        }
                      </p>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <Badge className="bg-[var(--telegram-blue)] text-white min-w-[20px] h-5 text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <Button
            onClick={onNewChat}
            className="bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={onSettings}>
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <UserSearchModal
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        currentUser={currentUser}
        onChatCreated={() => {
          // Refresh chats when a new chat is created
        }}
      />
    </div>
  );
}
