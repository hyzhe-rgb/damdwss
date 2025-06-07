import { useRef, useCallback } from "react";
import { WebSocketClient } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket() {
  const wsRef = useRef<WebSocketClient | null>(null);

  const connect = useCallback((userId: number) => {
    if (!wsRef.current) {
      wsRef.current = new WebSocketClient();

      // Listen for new messages
      wsRef.current.on("new_message", (data) => {
        // Invalidate messages query to refetch
        queryClient.invalidateQueries({ 
          queryKey: ["/api/chats", data.chatId, "messages"] 
        });
        // Also invalidate chats list to update last message
        queryClient.invalidateQueries({ 
          queryKey: ["/api/chats"] 
        });
      });

      // Listen for typing indicators
      wsRef.current.on("typing", (message) => {
        // Handle typing indicators if needed
        console.log("User is typing:", message);
      });
    }

    return wsRef.current.connect(userId);
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: { chatId: number; content: string; type?: string }) => {
    if (wsRef.current) {
      wsRef.current.send({
        type: "send_message",
        chatId: message.chatId,
        content: message.content,
        messageType: message.type || "text",
      });

      // Join the chat if not already joined
      wsRef.current.send({
        type: "join_chat",
        chatId: message.chatId,
      });
    }
  }, []);

  const joinChat = useCallback((chatId: number) => {
    if (wsRef.current) {
      wsRef.current.send({
        type: "join_chat",
        chatId,
      });
    }
  }, []);

  const sendTyping = useCallback((chatId: number) => {
    if (wsRef.current) {
      wsRef.current.send({
        type: "typing",
        chatId,
      });
    }
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    joinChat,
    sendTyping,
    isConnected: wsRef.current?.isConnected ?? false,
  };
}