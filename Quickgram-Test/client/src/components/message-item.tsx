import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, CheckCheck, Bot, Bookmark, Users, Megaphone } from "lucide-react";
import type { User, ChatWithMembers, MessageWithSender } from "@shared/schema";

interface MessageItemProps {
  message: MessageWithSender;
  currentUser: User;
  chat: ChatWithMembers;
}

export function MessageItem({ message, currentUser, chat }: MessageItemProps) {
  const isOwnMessage = message.senderId === currentUser.id;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getSenderIcon = () => {
    switch (chat.type) {
      case "self":
        return <Bookmark className="w-4 h-4 text-white" />;
      case "bot":
        return <Bot className="w-4 h-4 text-white" />;
      case "group":
        return <Users className="w-4 h-4 text-white" />;
      case "channel":
        return <Megaphone className="w-4 h-4 text-white" />;
      default:
        return message.sender.name.charAt(0).toUpperCase();
    }
  };

  const getSenderAvatarColor = () => {
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

  if (isOwnMessage) {
    return (
      <div className="flex items-end justify-end space-x-3">
        <div className="flex-1 flex flex-col items-end">
          <div className="message-bubble-sent text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-md">
            {message.type === "file" && (
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                  <i className="text-white text-sm">📎</i>
                </div>
                <div>
                  <p className="font-semibold text-sm">{message.metadata?.fileName || "File"}</p>
                  <p className="text-xs opacity-75">{message.metadata?.fileSize || "Unknown size"}</p>
                </div>
              </div>
            )}
            <p>{message.content}</p>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            <CheckCheck className="w-4 h-4 text-[var(--telegram-blue)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3">
      <Avatar className={`w-8 h-8 ${getSenderAvatarColor()} flex-shrink-0`}>
        <AvatarFallback className={getSenderAvatarColor()}>
          {getSenderIcon()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="message-bubble-received rounded-2xl rounded-tl-md px-4 py-3 max-w-md">
          {message.type === "file" && (
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                <i className="text-white text-sm">📎</i>
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{message.metadata?.fileName || "File"}</p>
                <p className="text-xs text-muted-foreground">{message.metadata?.fileSize || "Unknown size"}</p>
              </div>
            </div>
          )}
          <p className="text-foreground">{message.content}</p>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-muted-foreground">{message.sender.firstName}</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
