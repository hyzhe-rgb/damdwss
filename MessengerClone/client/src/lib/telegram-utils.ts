export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than 24 hours, show time
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString("ru-RU", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  }
  
  // If less than 7 days, show day
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return days === 1 ? "вчера" : `${days} дн. назад`;
  }
  
  // Otherwise show date
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getMessageStatus(message: any, currentUserId: number): "sent" | "delivered" | "read" {
  if (message.senderId !== currentUserId) return "read";
  
  if (message.readBy && message.readBy.length > 1) {
    return "read";
  }
  
  return "delivered";
}

export function formatPhoneNumber(phone: string): string {
  if (phone.startsWith("+7")) {
    const digits = phone.slice(2);
    if (digits.length === 10) {
      return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
    }
  }
  
  return phone;
}

export function generateUsername(firstName: string, lastName?: string): string {
  const base = firstName.toLowerCase();
  const suffix = lastName ? lastName.toLowerCase() : Math.random().toString(36).substring(2, 6);
  return `${base}_${suffix}`;
}

export function getOnlineStatus(isOnline: boolean, lastSeen?: string): string {
  if (isOnline) return "в сети";
  
  if (lastSeen) {
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 1000) return "только что";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} мин. назад`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} ч. назад`;
    
    return formatTime(lastSeen);
  }
  
  return "был(а) недавно";
}

export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 5) {
    return { valid: false, message: "Имя пользователя должно содержать минимум 5 символов" };
  }
  
  if (username.length > 32) {
    return { valid: false, message: "Имя пользователя не может содержать более 32 символов" };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: "Имя пользователя может содержать только латинские буквы, цифры и подчеркивания" };
  }
  
  if (!/^[a-zA-Z]/.test(username)) {
    return { valid: false, message: "Имя пользователя должно начинаться с буквы" };
  }
  
  return { valid: true };
}
