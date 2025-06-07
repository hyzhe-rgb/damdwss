import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { chatMembers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { insertUserSchema, insertChatSchema, insertMessageSchema, insertBotSchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  chatId?: number;
}

const connectedUsers = new Map<number, AuthenticatedWebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            ws.userId = message.userId;
            connectedUsers.set(message.userId, ws);
            await storage.updateUserOnlineStatus(message.userId, true);
            break;

          case 'join_chat':
            ws.chatId = message.chatId;
            break;

          case 'send_message':
            if (ws.userId) {
              const newMessage = await storage.createMessage({
                chatId: message.chatId,
                senderId: ws.userId,
                content: message.content,
                type: message.messageType || 'text',
                metadata: message.metadata,
              });

              // Get the complete message with sender info
              const chatMessages = await storage.getChatMessages(message.chatId, 1);
              const fullMessage = chatMessages[0];
              
              // Broadcast to all connected clients
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId) {
                  client.send(JSON.stringify({
                    type: 'new_message',
                    message: fullMessage,
                    chatId: message.chatId,
                  }));
                }
              });

              // Handle bot responses
              if (message.content.startsWith('/') && message.chatId) {
                setTimeout(async () => {
                  await handleBotCommand(message.content, message.chatId, wss, ws.userId);
                }, 1000);
              }
            }
            break;

          case 'typing':
            wss.clients.forEach((client: AuthenticatedWebSocket) => {
              if (client.readyState === WebSocket.OPEN && 
                  client.chatId === message.chatId && 
                  client.userId !== ws.userId) {
                client.send(JSON.stringify({
                  type: 'typing',
                  userId: ws.userId,
                  chatId: message.chatId,
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        connectedUsers.delete(ws.userId);
        await storage.updateUserOnlineStatus(ws.userId, false);
      }
    });
  });

  // Authentication routes
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { phone, code, password } = req.body;
      
      if (code !== "22222") {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      let user = await storage.getUserByPhone(phone);
      
      // Check password if user exists and has password set
      if (user && user.password && !password) {
        return res.status(401).json({ message: "Password required", requiresPassword: true });
      }
      
      if (user && user.password && password !== user.password) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      if (!user) {
        const isAnonymous = phone.startsWith("+888");
        user = await storage.createUser({
          phone,
          firstName: isAnonymous ? "Anonymous" : "User",
          lastName: isAnonymous ? "User" : "",
          username: `user${Date.now()}`,
          isAnonymous,
        });

        // Create "Saved Messages" chat for new user
        const savedChat = await storage.createChat({
          type: "self",
          name: "Saved Messages",
          createdBy: user.id,
        });
        await storage.addUserToChat(savedChat.id, user.id, "owner");

        // Create BotFather chat
        let botFather = await storage.getBotByUsername("botfather");
        if (!botFather) {
          botFather = await storage.createBot({
            name: "BotFather",
            username: "botfather",
            token: "mock_token",
            description: "Use this bot to create and manage your other bots.",
            createdBy: user.id,
          });
        }

        const botChat = await storage.createChat({
          type: "bot",
          name: "BotFather",
          createdBy: user.id,
        });
        await storage.addUserToChat(botChat.id, user.id, "member");

        // Add initial BotFather message
        await storage.createMessage({
          chatId: botChat.id,
          senderId: user.id,
          content: "Hello! I'm BotFather. I can help you create and manage Telegram bots. Use /newbot to create a new bot.",
          type: "text",
        });
      }

      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Check if username is already taken
      if (updates.username) {
        const existingUser = await storage.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put("/api/user/:id/password", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check current password if user has one
      if (user.password && currentPassword !== user.password) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateUser(userId, { password: newPassword });
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const users = await storage.searchUsersByUsername(query);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.post("/api/chats/private", async (req, res) => {
    try {
      const { userId1, userId2 } = req.body;
      
      // Check if private chat already exists
      let chat = await storage.getPrivateChat(userId1, userId2);
      
      if (!chat) {
        // Create new private chat
        const user2 = await storage.getUser(userId2);
        if (!user2) {
          return res.status(404).json({ message: "User not found" });
        }

        chat = await storage.createChat({
          type: "private",
          name: `${user2.firstName} ${user2.lastName || ''}`.trim(),
          createdBy: userId1,
        });

        // Add both users to the chat
        await storage.addUserToChat(chat.id, userId1, "member");
        await storage.addUserToChat(chat.id, userId2, "member");
      }

      res.json(chat);
    } catch (error) {
      console.error("Create private chat error:", error);
      res.status(500).json({ message: "Failed to create private chat" });
    }
  });

  // Chat routes
  app.get("/api/chats", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      const chats = await storage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const chatData = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(chatData);
      
      // Add creator to chat
      await storage.addUserToChat(chat.id, chatData.createdBy!, "owner");
      
      res.json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid chat data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create chat" });
      }
    }
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getChatMessages(chatId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Bot routes
  app.get("/api/bots", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      const bots = await storage.getUserBots(userId);
      res.json(bots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bots" });
    }
  });

  app.post("/api/bots", async (req, res) => {
    try {
      const botData = insertBotSchema.parse(req.body);
      const bot = await storage.createBot({
        ...botData,
        token: `mock_token_${Date.now()}`,
      });

      // Create a chat for the bot
      const botChat = await storage.createChat({
        type: "bot",
        name: bot.name,
        createdBy: botData.createdBy,
      });
      await storage.addUserToChat(botChat.id, botData.createdBy, "owner");

      res.json({ bot, chat: botChat });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid bot data", errors: error.errors });
      } else {
        console.error("Bot creation error:", error);
        res.status(500).json({ message: "Failed to create bot" });
      }
    }
  });

  return httpServer;
}

// Store bot creation state for users
const botCreationState = new Map<number, { step: string; botData: any }>();

async function handleBotCommand(command: string, chatId: number, wss: WebSocketServer, userId?: number) {
  let response = "";
  
  if (!userId) return;
  
  const userState = botCreationState.get(userId);
  
  if (userState && userState.step === "waiting_for_name") {
    // User is providing bot name
    const botName = command.trim();
    botCreationState.set(userId, {
      step: "waiting_for_username",
      botData: { name: botName }
    });
    response = `Good. Now let's choose a username for your bot. It must end in 'bot'. Like this, for example: TetrisBot or tetris_bot.`;
  } else if (userState && userState.step === "waiting_for_username") {
    // User is providing bot username
    const username = command.trim();
    if (!username.toLowerCase().endsWith('bot')) {
      response = "Sorry, the username must end in 'bot'. Try again.";
    } else {
      try {
        // Create the bot
        const bot = await storage.createBot({
          name: userState.botData.name,
          username: username,
          description: `Bot created by user ${userId}`,
          createdBy: userId,
          token: `mock_token_${Date.now()}`,
        });

        // Create a chat for the bot
        const botChat = await storage.createChat({
          type: "bot",
          name: bot.name,
          createdBy: userId,
        });
        await storage.addUserToChat(botChat.id, userId, "owner");

        botCreationState.delete(userId);
        response = `Done! Congratulations on your new bot. You will find it at t.me/${username}. You can now add a description, about section and profile picture for your bot, see /help for a list of commands. By the way, when you've finished creating your cool bot, ping our Bot Support if you want a better username for it. Just make sure the bot is fully operational before you do this.

Use this token to access the HTTP API:
${bot.token}
Keep your token secure and store it safely, it can be used by anyone to control your bot.

For a description of the Bot API, see this page: https://core.telegram.org/bots/api`;
      } catch (error) {
        response = "Sorry, there was an error creating your bot. Please try again later.";
      }
    }
  } else {
    // Handle regular commands
    switch (command.toLowerCase()) {
      case "/newbot":
        botCreationState.set(userId, { step: "waiting_for_name", botData: {} });
        response = "Alright, a new bot. How are we going to call it? Please choose a name for your bot.";
        break;
      case "/help":
        response = "I can help you create and manage Telegram bots. Here are the available commands:\n/newbot - create a new bot\n/mybots - manage your bots\n/help - show this help message";
        break;
      case "/mybots":
        try {
          const bots = await storage.getUserBots(userId);
          if (bots.length === 0) {
            response = "You don't have any bots yet. Use /newbot to create your first bot.";
          } else {
            response = `Your bots:\n${bots.map(bot => `@${bot.username} - ${bot.name}`).join('\n')}`;
          }
        } catch (error) {
          response = "You don't have any bots yet. Use /newbot to create your first bot.";
        }
        break;
      default:
        response = "I don't understand that command. Use /help to see available commands.";
    }
  }

  // Create bot response message
  const botMessage = await storage.createMessage({
    chatId,
    senderId: 1, // BotFather ID (assuming it's 1)
    content: response,
    type: "text",
  });

  // Get full message with sender info
  const messages = await storage.getChatMessages(chatId, 1);
  const fullMessage = messages[0];

  // Broadcast bot response
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'new_message',
        message: fullMessage,
        chatId: chatId,
      }));
    }
  });
}
