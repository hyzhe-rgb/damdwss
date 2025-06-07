import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Menu, Search, Settings } from "lucide-react";

interface SidebarProps {
  onOpenChat: (chat: any) => void;
  currentChat: any;
  onShowMenu: () => void;
  onShowSettings: () => void;
}

export default function Sidebar({ onOpenChat, currentChat, onShowMenu, onShowSettings }: SidebarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    refetchInterval: 3000, // Обновление каждые 3 секунды
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    refetchInterval: 2000, // Обновление каждые 2 секунды
  });

  // Create private chats for all users and combine with actual chats
  const allChats = [
    ...chats,
    ...users
      .filter((user: any) => !chats.some((chat: any) => chat.type === "private" && chat.name?.includes(user.firstName)))
      .map((user: any) => ({
        id: `user-${user.id}`,
        name: `${user.firstName} ${user.lastName || ""}`.trim(),
        type: "private",
        avatar: user.avatar,
        isOnline: user.isOnline,
        isPremium: user.isPremium,
        lastMessage: null,
        unreadCount: 0,
      })),
  ];

  const filteredChats = allChats.filter((chat: any) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now.getTime() - messageDate.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return messageDate.toLocaleTimeString("ru-RU", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    }
    
    return "вчера";
  };

  const getAvatarFallback = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowMenu}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowSettings}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {showSearch && (
          <div className="mt-3 slide-in-left">
            <Input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-100 dark:bg-gray-700 border-none rounded-full"
            />
          </div>
        )}
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filteredChats.map((chat: any) => (
          <div
            key={chat.id}
            onClick={() => onOpenChat(chat)}
            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors ${
              currentChat?.id === chat.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={chat.avatar} alt={chat.name} />
                  <AvatarFallback className="telegram-blue text-white">
                    {getAvatarFallback(chat.name)}
                  </AvatarFallback>
                </Avatar>
                {chat.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 telegram-green rounded-full border-2 border-white dark:border-gray-800"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-1">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {chat.name}
                    </h3>
                    {chat.isPremium && (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {chat.lastMessage?.content || "Начните переписку"}
                  </p>
                  {chat.unreadCount > 0 && (
                    <Badge className="telegram-blue text-white text-xs">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
