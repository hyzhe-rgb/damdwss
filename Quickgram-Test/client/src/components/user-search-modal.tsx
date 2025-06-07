import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User as UserIcon, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onChatCreated?: () => void;
}

export function UserSearchModal({ open, onOpenChange, currentUser, onChatCreated }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { toast } = useToast();

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleStartChat = async (user: User) => {
    setIsCreatingChat(true);
    try {
      await apiRequest("POST", "/api/chats/private", {
        userId1: currentUser.id,
        userId2: user.id,
      });

      // Refresh chats list
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });

      toast({
        title: "Chat Created",
        description: `Started conversation with ${user.firstName}`,
      });

      onOpenChange(false);
      onChatCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create chat",
        variant: "destructive",
      });
    } finally {
      setIsCreatingChat(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("+888")) {
      return `Anonymous Number: ${phone}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading && searchQuery.length >= 2 && (
            <div className="text-center py-4 text-muted-foreground">
              Searching...
            </div>
          )}

          {!isLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No users found
            </div>
          )}

          {searchQuery.length < 2 && (
            <div className="text-center py-4 text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}

          {searchResults
            .filter((user: User) => user.id !== currentUser.id)
            .map((user: User) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-12 h-12 bg-purple-500">
                  <AvatarFallback className="bg-purple-500">
                    <UserIcon className="w-6 h-6 text-white" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold truncate">
                      {user.firstName} {user.lastName}
                    </h3>
                    {user.isAnonymous && (
                      <Badge variant="secondary" className="text-xs">
                        Anonymous
                      </Badge>
                    )}
                  </div>
                  
                  {user.username && (
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  )}
                  
                  {user.additionalUsernames && user.additionalUsernames.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      also: {user.additionalUsernames.map(u => `@${u}`).join(", ")}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {formatPhoneNumber(user.phone)}
                  </p>
                  
                  {user.bio && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user.bio}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleStartChat(user)}
                  disabled={isCreatingChat}
                  className="bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)] text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}