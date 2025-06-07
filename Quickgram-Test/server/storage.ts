import { users, chats, chatMembers, messages, bots, type User, type InsertUser, type Chat, type InsertChat, type Message, type InsertMessage, type ChatWithMembers, type MessageWithSender, type Bot, type InsertBot } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  searchUsersByUsername(query: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;

  // Chat methods
  getUserChats(userId: number): Promise<ChatWithMembers[]>;
  getChat(chatId: number): Promise<Chat | undefined>;
  getPrivateChat(user1Id: number, user2Id: number): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  addUserToChat(chatId: number, userId: number, role?: string): Promise<void>;

  // Message methods
  getChatMessages(chatId: number, limit?: number): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Bot methods
  getBotByUsername(username: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  getUserBots(userId: number): Promise<Bot[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(
        eq(users.username, username),
        sql`${username} = ANY(${users.additionalUsernames})`
      )
    );
    return user || undefined;
  }

  async searchUsersByUsername(query: string): Promise<User[]> {
    const searchPattern = `%${query}%`;
    return await db.select().from(users).where(
      or(
        sql`${users.username} ILIKE ${searchPattern}`,
        sql`EXISTS (SELECT 1 FROM unnest(${users.additionalUsernames}) AS username WHERE username ILIKE ${searchPattern})`
      )
    ).limit(10);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(userId: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isOnline, 
        lastSeen: isOnline ? null : new Date() 
      })
      .where(eq(users.id, userId));
  }

  async getUserChats(userId: number): Promise<ChatWithMembers[]> {
    const userChats = await db
      .select({
        id: chats.id,
        type: chats.type,
        name: chats.name,
        description: chats.description,
        avatar: chats.avatar,
        isPublic: chats.isPublic,
        createdBy: chats.createdBy,
        createdAt: chats.createdAt,
      })
      .from(chats)
      .innerJoin(chatMembers, eq(chats.id, chatMembers.chatId))
      .where(eq(chatMembers.userId, userId))
      .orderBy(desc(chats.createdAt));

    // Get last message for each chat
    const chatsWithDetails = await Promise.all(
      userChats.map(async (chat) => {
        const [lastMessage] = await db
          .select({
            id: messages.id,
            chatId: messages.chatId,
            senderId: messages.senderId,
            content: messages.content,
            type: messages.type,
            metadata: messages.metadata,
            isEdited: messages.isEdited,
            replyToId: messages.replyToId,
            createdAt: messages.createdAt,
            updatedAt: messages.updatedAt,
            senderFirstName: users.firstName,
            senderLastName: users.lastName,
            senderUsername: users.username,
          })
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.chatId, chat.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const members = await db
          .select({
            id: chatMembers.id,
            chatId: chatMembers.chatId,
            userId: chatMembers.userId,
            role: chatMembers.role,
            joinedAt: chatMembers.joinedAt,
            user: {
              id: users.id,
              phone: users.phone,
              firstName: users.firstName,
              lastName: users.lastName,
              username: users.username,
              additionalUsernames: users.additionalUsernames,
              isAnonymous: users.isAnonymous,
              avatar: users.avatar,
              bio: users.bio,
              isOnline: users.isOnline,
              lastSeen: users.lastSeen,
              createdAt: users.createdAt,
            }
          })
          .from(chatMembers)
          .innerJoin(users, eq(chatMembers.userId, users.id))
          .where(eq(chatMembers.chatId, chat.id));

        return {
          ...chat,
          members,
          lastMessage: lastMessage ? {
            ...lastMessage,
            sender: {
              id: lastMessage.senderId,
              firstName: lastMessage.senderFirstName,
              lastName: lastMessage.senderLastName,
              username: lastMessage.senderUsername,
            }
          } : undefined,
          unreadCount: 0, // TODO: Implement unread count
        } as ChatWithMembers;
      })
    );

    return chatsWithDetails;
  }

  async getChat(chatId: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
    return chat || undefined;
  }

  async createChat(chatData: typeof chats.$inferInsert) {
    // Generate invite link for groups and channels
    let inviteLink = null;
    if (chatData.type === 'group' || chatData.type === 'channel') {
      inviteLink = `https://t.me/+${this.generateRandomString(22)}`;
    }

    const [chat] = await db.insert(chats).values({
      ...chatData,
      inviteLink
    }).returning();
    return chat;
  }

  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getPrivateChat(user1Id: number, user2Id: number): Promise<Chat | undefined> {
    const [chat] = await db
      .select()
      .from(chats)
      .innerJoin(chatMembers, eq(chats.id, chatMembers.chatId))
      .where(
        and(
          eq(chats.type, "private"),
          or(
            and(
              eq(chatMembers.userId, user1Id),
              sql`EXISTS (SELECT 1 FROM ${chatMembers} cm2 WHERE cm2.chat_id = ${chats.id} AND cm2.user_id = ${user2Id})`
            )
          )
        )
      )
      .limit(1);
    return chat?.chats || undefined;
  }

  async addUserToChat(chatId: number, userId: number, role: string = "member"): Promise<void> {
    await db
      .insert(chatMembers)
      .values({
        chatId,
        userId,
        role,
      });
  }

  async getChatMessages(chatId: number, limit: number = 50): Promise<MessageWithSender[]> {
    const messagesList = await db
      .select({
        id: messages.id,
        chatId: messages.chatId,
        senderId: messages.senderId,
        content: messages.content,
        type: messages.type,
        metadata: messages.metadata,
        isEdited: messages.isEdited,
        replyToId: messages.replyToId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        sender: {
          id: users.id,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          additionalUsernames: users.additionalUsernames,
          isAnonymous: users.isAnonymous,
          avatar: users.avatar,
          bio: users.bio,
          isOnline: users.isOnline,
          lastSeen: users.lastSeen,
          createdAt: users.createdAt,
        }
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return messagesList.reverse();
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getBotByUsername(username: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.username, username));
    return bot || undefined;
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const [bot] = await db
      .insert(bots)
      .values(insertBot)
      .returning();
    return bot;
  }

  async getUserBots(userId: number): Promise<Bot[]> {
    return await db
      .select()
      .from(bots)
      .where(eq(bots.createdBy, userId));
  }
}

export const storage = new DatabaseStorage();