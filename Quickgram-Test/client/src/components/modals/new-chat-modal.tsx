import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Users, Megaphone, Bot } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserType;
}

type ChatType = "private" | "group" | "channel" | "bot";

export function NewChatModal({ open, onOpenChange, currentUser }: NewChatModalProps) {
  const [selectedType, setSelectedType] = useState<ChatType | null>(null);
  const [chatName, setChatName] = useState("");
  const [chatDescription, setChatDescription] = useState("");
  const [botName, setBotName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateChat = async () => {
    if (!selectedType) return;

    setIsLoading(true);
    try {
      if (selectedType === "bot") {
        // Create bot
        const bot = await apiRequest("POST", "/api/bots", {
          name: botName,
          username: botName.toLowerCase().replace(/\s+/g, '_') + '_bot',
          description: `Bot created by ${currentUser.firstName}`,
          createdBy: currentUser.id,
        });

        toast({
          title: "Bot Created",
          description: `${botName} has been created successfully!`,
        });
      } else {
        // Create chat
        const response = await apiRequest("POST", "/api/chats", {
          type: selectedType,
          name: chatName,
          description: chatDescription,
          createdBy: currentUser.id,
        });

        // Refresh chats list
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });

        const inviteLinkMessage = response.inviteLink 
          ? `\n\nInvite link: ${response.inviteLink}` 
          : "";

        toast({
          title: "Chat Created",
          description: `${selectedType === "group" ? "Group" : "Channel"} "${chatName}" has been created successfully${inviteLinkMessage}`,
        });
      }

      // Invalidate chats query
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });

      // Reset form
      setSelectedType(null);
      setChatName("");
      setChatDescription("");
      setBotName("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepOne = () => (
    <div className="space-y-3">
      <Button
        variant="ghost"
        className="w-full justify-start p-3 h-auto"
        onClick={() => setSelectedType("private")}
      >
        <User className="w-5 h-5 mr-3 text-[var(--telegram-blue)]" />
        <span>New Private Chat</span>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-3 h-auto"
        onClick={() => setSelectedType("group")}
      >
        <Users className="w-5 h-5 mr-3 text-[var(--telegram-blue)]" />
        <span>New Group</span>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-3 h-auto"
        onClick={() => setSelectedType("channel")}
      >
        <Megaphone className="w-5 h-5 mr-3 text-[var(--telegram-blue)]" />
        <span>New Channel</span>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start p-3 h-auto"
        onClick={() => setSelectedType("bot")}
      >
        <Bot className="w-5 h-5 mr-3 text-[var(--telegram-blue)]" />
        <span>New Bot</span>
      </Button>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-4">
      {selectedType === "bot" ? (
        <>
          <div>
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Enter bot name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="botDescription">Description (Optional)</Label>
            <Textarea
              id="botDescription"
              value={chatDescription}
              onChange={(e) => setChatDescription(e.target.value)}
              placeholder="Describe what your bot does"
              className="mt-2"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="chatName">{selectedType === "channel" ? "Channel" : "Group"} Name</Label>
            <Input
              id="chatName"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder={`Enter ${selectedType} name`}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="chatDescription">Description (Optional)</Label>
            <Textarea
              id="chatDescription"
              value={chatDescription}
              onChange={(e) => setChatDescription(e.target.value)}
              placeholder={`Describe your ${selectedType}`}
              className="mt-2"
            />
          </div>
        </>
      )}

      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={() => setSelectedType(null)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleCreateChat}
          disabled={isLoading || (selectedType === "bot" ? !botName.trim() : !chatName.trim())}
          className="flex-1 bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)]"
        >
          {isLoading ? "Creating..." : "Create"}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedType ? `New ${selectedType === "bot" ? "Bot" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : "New Chat"}
          </DialogTitle>
        </DialogHeader>

        {selectedType ? renderStepTwo() : renderStepOne()}
      </DialogContent>
    </Dialog>
  );
}