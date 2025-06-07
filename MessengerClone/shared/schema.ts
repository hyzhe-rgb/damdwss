import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  username: text("username").unique(),
  avatar: text("avatar"),
  isOnline: boolean("is_online").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  showPhone: boolean("show_phone").default(false),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  username: text("username").unique(),
  type: text("type").notNull(), // 'private', 'group', 'channel'
  avatar: text("avatar"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMembers = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chats.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member"), // 'admin', 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chats.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text', 'image', 'file', 'voice'
  replyToId: integer("reply_to_id").references(() => messages.id),
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false),
  readBy: jsonb("read_by").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'voice', 'video'
  status: text("status").notNull(), // 'missed', 'answered', 'declined'
  duration: integer("duration").default(0), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  notifications: boolean("notifications").default(true),
  autoDownload: boolean("auto_download").default(true),
  theme: text("theme").default("light"), // 'light', 'dark'
  language: text("language").default("ru"),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sentMessages: many(messages),
  chatMemberships: many(chatMembers),
  createdChats: many(chats),
  callerCalls: many(calls, { relationName: "callerCalls" }),
  receiverCalls: many(calls, { relationName: "receiverCalls" }),
  settings: one(userSettings),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  members: many(chatMembers),
  creator: one(users, {
    fields: [chats.createdBy],
    references: [users.id],
  }),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [chatMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  caller: one(users, {
    fields: [calls.callerId],
    references: [users.id],
    relationName: "callerCalls",
  }),
  receiver: one(users, {
    fields: [calls.receiverId],
    references: [users.id],
    relationName: "receiverCalls",
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type ChatMember = typeof chatMembers.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
