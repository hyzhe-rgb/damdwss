import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertChatSchema, insertMessageSchema, insertCallSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().min(10),
});

const verifyCodeSchema = z.object({
  phone: z.string().min(10),
  code: z.string().min(4),
});

interface AuthenticatedRequest extends Request {
  userId?: number;
}

// Simple session storage (in production, use Redis or similar)
const sessions = new Map<string, number>();

// WebSocket connections
const wsConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone } = loginSchema.parse(req.body);
      
      // In real app, send SMS code here
      // For demo, any phone number is accepted
      
      res.json({ success: true, message: "Code sent" });
    } catch (error) {
      res.status(400).json({ message: "Invalid phone number" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { phone, code } = verifyCodeSchema.parse(req.body);
      
      // Accept code 22222 or any 4+ digit code
      if (code !== "22222" && code.length < 4) {
        return res.status(400).json({ message: "Invalid code" });
      }

      // Check if user exists
      let user = await storage.getUserByPhone(phone);
      
      if (!user) {
        // Create new user
        const firstName = "User";
        const lastName = phone.slice(-4);
        user = await storage.createUser({
          phone,
          firstName,
          lastName,
          isOnline: true,
        });
      } else {
        // Update user online status
        user = await storage.updateUser(user.id, { isOnline: true });
      }

      // Create session
      const sessionId = Math.random().toString(36).substring(7);
      sessions.set(sessionId, user.id);

      res.json({ 
        success: true, 
        user,
        sessionId 
      });
    } catch (error) {
      res.status(400).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    if (sessionId) {
      const userId = sessions.get(sessionId);
      if (userId) {
        await storage.updateUser(userId, { isOnline: false });
        sessions.delete(sessionId);
        wsConnections.delete(userId);
      }
    }
    res.json({ success: true });
  });

  // Middleware to authenticate requests
  const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    if (!sessionId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = sessions.get(sessionId);
    if (!userId) {
      return res.status(401).json({ message: "Invalid session" });
    }

    req.userId = userId;
    next();
  };

  // User routes
  app.get("/api/users/me", authenticate, async (req: AuthenticatedRequest, res) => {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.put("/api/users/me", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.userId!, updates);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users", authenticate, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get("/api/users/settings", authenticate, async (req: AuthenticatedRequest, res) => {
    const settings = await storage.getUserSettings(req.userId!);
    res.json(settings);
  });

  app.put("/api/users/settings", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.updateUserSettings(req.userId!, req.body);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Failed to update settings" });
    }
  });

  // Chat routes
  app.get("/api/chats", authenticate, async (req: AuthenticatedRequest, res) => {
    const chats = await storage.getUserChats(req.userId!);
    res.json(chats);
  });

  app.post("/api/chats", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const chatData = insertChatSchema.parse(req.body);
      chatData.createdBy = req.userId!;
      
      const chat = await storage.createChat(chatData);
      
      // Add creator as admin
      await storage.addChatMember(chat.id, req.userId!, "admin");
      
      res.json(chat);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat" });
    }
  });

  app.get("/api/chats/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    const chatId = parseInt(req.params.id);
    const chat = await storage.getChat(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is member
    const membership = await storage.getUserChatMembership(chatId, req.userId!);
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(chat);
  });

  app.post("/api/chats/:id/members", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const { userId, role = "member" } = req.body;
      
      // Check if requester is admin
      const requesterMembership = await storage.getUserChatMembership(chatId, req.userId!);
      if (!requesterMembership || requesterMembership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const member = await storage.addChatMember(chatId, userId, role);
      res.json(member);
    } catch (error) {
      res.status(400).json({ message: "Failed to add member" });
    }
  });

  // Message routes
  app.get("/api/chats/:id/messages", authenticate, async (req: AuthenticatedRequest, res) => {
    const chatId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Check if user is member
    const membership = await storage.getUserChatMembership(chatId, req.userId!);
    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await storage.getChatMessages(chatId, limit, offset);
    res.json(messages);
  });

  app.post("/api/chats/:id/messages", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const chatId = parseInt(req.params.id);
      
      // Check if user is member
      const membership = await storage.getUserChatMembership(chatId, req.userId!);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        content: messageData.content,
        chatId,
        senderId: req.userId!,
        messageType: messageData.messageType || "text"
      } as any);
      
      // Broadcast message to WebSocket connections
      const chatMembers = await storage.getChatMembers(chatId);
      chatMembers.forEach(member => {
        const ws = wsConnections.get(member.userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "new_message",
            message: { ...message, sender: { id: req.userId!, firstName: "User" } }
          }));
        }
      });

      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  app.put("/api/messages/:id/read", authenticate, async (req: AuthenticatedRequest, res) => {
    const messageId = parseInt(req.params.id);
    await storage.markMessageAsRead(messageId, req.userId!);
    res.json({ success: true });
  });

  // Call routes
  app.post("/api/calls", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const callData = insertCallSchema.parse(req.body);
      callData.callerId = req.userId!;
      
      const call = await storage.createCall(callData);
      
      // Notify receiver via WebSocket
      const receiverWs = wsConnections.get(callData.receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        receiverWs.send(JSON.stringify({
          type: "incoming_call",
          call
        }));
      }

      res.json(call);
    } catch (error) {
      res.status(400).json({ message: "Failed to initiate call" });
    }
  });

  app.put("/api/calls/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const callId = parseInt(req.params.id);
      const updates = req.body;
      
      const call = await storage.updateCall(callId, updates);
      res.json(call);
    } catch (error) {
      res.status(400).json({ message: "Failed to update call" });
    }
  });

  app.get("/api/calls", authenticate, async (req: AuthenticatedRequest, res) => {
    const calls = await storage.getUserCalls(req.userId!);
    res.json(calls);
  });

  // Admin routes
  app.delete("/api/admin/users/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // WebSocket server
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      ws.close();
      return;
    }

    const userId = sessions.get(sessionId);
    if (!userId) {
      ws.close();
      return;
    }

    wsConnections.set(userId, ws);
    
    ws.on('close', () => {
      wsConnections.delete(userId);
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'typing':
            // Broadcast typing indicator
            const chatMembers = await storage.getChatMembers(message.chatId);
            chatMembers.forEach(member => {
              if (member.userId !== userId) {
                const memberWs = wsConnections.get(member.userId);
                if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                  memberWs.send(JSON.stringify({
                    type: 'user_typing',
                    userId,
                    chatId: message.chatId
                  }));
                }
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  return httpServer;
}
