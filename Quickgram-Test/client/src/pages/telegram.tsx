import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { NewChatModal } from "@/components/modals/new-chat-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import type { User, ChatWithMembers } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function TelegramPage() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatWithMembers | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const queryClient = useQueryClient();

  const { connect, disconnect, sendMessage, isConnected, wsClient } = useWebSocket();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("telegramUser");
    if (!userData) {
      setLocation("/");
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Connect to WebSocket
    connect(user.id);

    return () => {
      disconnect();
    };
  }, [connect, disconnect, setLocation]);

  useEffect(() => {
    if (currentUser && wsClient) {
      wsClient.connect(currentUser.id);

      // Handle new messages
      wsClient.on('new_message', (data) => {
        // Refetch messages for the affected chat
        queryClient.invalidateQueries({ 
          queryKey: ["/api/chats", data.chatId, "messages"] 
        });
        // Also refetch chats list to update last message
        queryClient.invalidateQueries({ 
          queryKey: ["/api/chats"] 
        });
      });
    }

    return () => {
      if (wsClient) {
        wsClient.disconnect();
      }
    };
  }, [currentUser, wsClient, queryClient]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar
        currentUser={currentUser}
        selectedChat={selectedChat}
        onChatSelect={setSelectedChat}
        onNewChat={() => setShowNewChatModal(true)}
        onSettings={() => setShowSettingsModal(true)}
      />

      <ChatArea
        currentUser={currentUser}
        selectedChat={selectedChat}
        onSendMessage={sendMessage}
        isConnected={isConnected}
      />

      <NewChatModal
        open={showNewChatModal}
        onOpenChange={setShowNewChatModal}
        currentUser={currentUser}
      />

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        currentUser={currentUser}
      />
    </div>
  );
}