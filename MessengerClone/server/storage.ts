import { 
  users, chats, messages, chatMembers, calls, userSettings,
  type User, type InsertUser, type Chat, type InsertChat, 
  type Message, type InsertMessage, type Call, type InsertCall,
  type ChatMember, type UserSettings, type InsertUserSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Chats
  getChat(id: number): Promise<Chat | undefined>;
  getChatByUsername(username: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChat(id: number, updates: Partial<InsertChat>): Promise<Chat>;
  getUserChats(userId: number): Promise<any[]>;
  
  // Chat Members
  addChatMember(chatId: number, userId: number, role?: string): Promise<ChatMember>;
  removeChatMember(chatId: number, userId: number): Promise<void>;
  getChatMembers(chatId: number): Promise<(ChatMember & { user: User })[]>;
  getUserChatMembership(chatId: number, userId: number): Promise<ChatMember | undefined>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  getChatMessages(chatId: number, limit?: number, offset?: number): Promise<(Message & { sender: User })[]>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
  
  // Calls
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<InsertCall>): Promise<Call>;
  getUserCalls(userId: number): Promise<(Call & { caller: User, receiver: User })[]>;
  
  // User Settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create default user settings
    await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
    
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Delete user's messages
    await db.delete(messages).where(eq(messages.senderId, id));
    
    // Delete user's chat memberships
    await db.delete(chatMembers).where(eq(chatMembers.userId, id));
    
    // Delete user's calls
    await db.delete(calls).where(or(eq(calls.callerId, id), eq(calls.receiverId, id)));
    
    // Delete user's settings
    await db.delete(userSettings).where(eq(userSettings.userId, id));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Chats
  async getChat(id: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat || undefined;
  }

  async getChatByUsername(username: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.username, username));
    return chat || undefined;
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const [chat] = await db.insert(chats).values(insertChat).returning();
    return chat;
  }

  async updateChat(id: number, updates: Partial<InsertChat>): Promise<Chat> {
    const [chat] = await db.update(chats).set(updates).where(eq(chats.id, id)).returning();
    return chat;
  }

  async getUserChats(userId: number): Promise<any[]> {
    const userChatMemberships = await db
      .select()
      .from(chatMembers)
      .where(eq(chatMembers.userId, userId));

    const chatIds = userChatMemberships.map(membership => membership.chatId);
    
    if (chatIds.length === 0) return [];

    const userChats = await db
      .select()
      .from(chats)
      .where(inArray(chats.id, chatIds));

    // Get last message for each chat
    const chatsWithLastMessage = await Promise.all(
      userChats.map(async (chat) => {
        const lastMessages = await db
          .select()
          .from(messages)
          .where(and(eq(messages.chatId, chat.id), eq(messages.isDeleted, false)))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const lastMessage = lastMessages[0] || undefined;

        // Count unread messages
        const unreadMessages = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.chatId, chat.id),
              eq(messages.isDeleted, false)
            )
          );

        const unreadCount = unreadMessages.filter((msg: any) => 
          !msg.readBy?.includes(userId) && msg.senderId !== userId
        ).length;

        return {
          ...chat,
          lastMessage,
          unreadCount
        };
      })
    );

    return chatsWithLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime!).getTime() - new Date(aTime!).getTime();
    });
  }

  // Chat Members
  async addChatMember(chatId: number, userId: number, role = "member"): Promise<ChatMember> {
    const [member] = await db
      .insert(chatMembers)
      .values({ chatId, userId, role })
      .returning();
    return member;
  }

  async removeChatMember(chatId: number, userId: number): Promise<void> {
    await db
      .delete(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
  }

  async getChatMembers(chatId: number): Promise<(ChatMember & { user: User })[]> {
    const members = await db
      .select()
      .from(chatMembers)
      .leftJoin(users, eq(chatMembers.userId, users.id))
      .where(eq(chatMembers.chatId, chatId));

    return members.map(({ chat_members, users: user }) => ({
      ...chat_members,
      user: user!
    }));
  }

  async getUserChatMembership(chatId: number, userId: number): Promise<ChatMember | undefined> {
    const [membership] = await db
      .select()
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
    return membership || undefined;
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message> {
    const [message] = await db.update(messages).set(updates).where(eq(messages.id, id)).returning();
    return message;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, id));
  }

  async getChatMessages(chatId: number, limit = 50, offset = 0): Promise<(Message & { sender: User })[]> {
    const messagesWithSender = await db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(eq(messages.chatId, chatId), eq(messages.isDeleted, false)))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return messagesWithSender.map(({ messages: message, users: sender }) => ({
      ...message,
      sender: sender!
    })).reverse();
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) return;

    const readBy = message.readBy || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await db.update(messages).set({ readBy }).where(eq(messages.id, messageId));
    }
  }

  // Calls
  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(insertCall).returning();
    return call;
  }

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call> {
    const [call] = await db.update(calls).set(updates).where(eq(calls.id, id)).returning();
    return call;
  }

  async getUserCalls(userId: number): Promise<(Call & { caller: User, receiver: User })[]> {
    const userCalls = await db
      .select()
      .from(calls)
      .leftJoin(users, eq(calls.callerId, users.id))
      .leftJoin(users, eq(calls.receiverId, users.id))
      .where(or(eq(calls.callerId, userId), eq(calls.receiverId, userId)))
      .orderBy(desc(calls.createdAt));

    // This is a simplified version - in reality we'd need proper joins
    return [];
  }

  // User Settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async updateUserSettings(userId: number, updates: Partial<InsertUserSettings>): Promise<UserSettings> {
    const [settings] = await db
      .update(userSettings)
      .set(updates)
      .where(eq(userSettings.userId, userId))
      .returning();
    return settings;
  }
}

export const storage = new DatabaseStorage();
