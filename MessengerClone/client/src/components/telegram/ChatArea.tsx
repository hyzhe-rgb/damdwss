import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, Video, MoreVertical } from "lucide-react";
import MessageInput from "./MessageInput";
import { formatTime } from "@/lib/telegram-utils";
import { useTelegram } from "@/hooks/useTelegram";

interface ChatAreaProps {
  currentChat: any;
  onStartCall: (type: "voice" | "video") => void;
}

export default function ChatArea({ currentChat, onStartCall }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useTelegram();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/chats", currentChat?.id, "messages"],
    enabled: !!currentChat?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/chats/${currentChat.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("telegram_session")}`,
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/chats", currentChat.id, "messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/chats"],
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string) => {
    if (!currentChat || !content.trim()) return;
    sendMessageMutation.mutate(content);
  };

  const getAvatarFallback = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-32 h-32 telegram-blue bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-16 h-16 telegram-blue text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.789L24 5.562c.321-1.288-.492-1.858-1.335-1.845z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Добро пожаловать в Telegram
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Выберите чат, чтобы начать общение
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentChat.avatar} alt={currentChat.name} />
              <AvatarFallback className="telegram-blue text-white text-sm">
                {getAvatarFallback(currentChat.name)}
              </AvatarFallback>
            </Avatar>
            {currentChat.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 telegram-green rounded-full border-2 border-white dark:border-gray-800"></div>
            )}
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">
              {currentChat.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentChat.isOnline ? "в сети" : "был(а) недавно"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall("voice")}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall("video")}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 bg-gray-50 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 telegram-blue"></div>
          </div>
        ) : (
          <>
            {messages.map((message: any) => {
              const isOwn = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex mb-4 message-animation ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwn
                        ? "chat-bubble-sent text-white rounded-br-sm"
                        : "chat-bubble-received text-gray-800 dark:text-white rounded-bl-sm"
                    }`}
                  >
                    <div>{message.content}</div>
                    <div
                      className={`text-xs mt-1 flex items-center justify-end space-x-1 ${
                        isOwn
                          ? "text-white/70"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {isOwn && (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                          <path
                            fillRule="evenodd"
                            d="M19.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-1-1a1 1 0 111.414-1.414l.293.293 7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={sendMessageMutation.isPending}
      />
    </div>
  );
}
