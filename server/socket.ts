import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { matchingQueue, QueueUser } from "./matchingQueue";
import db from "./db";

interface SocketData {
  userId?: string;
  sessionId?: string;
}

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join queue and find match
    socket.on("join_queue", async (data: { userId: string }) => {
      try {
        const { userId } = data;
        console.log(`User ${userId} joining queue...`);

        // Get user preferences from database
        const user = await db("users").where({ id: userId }).first();
        const prefs = await db("user_preferences")
          .where({ user_id: userId })
          .first();

        if (!user) {
          socket.emit("error", { message: "User not found" });
          return;
        }

        // Check if user already has an active session
        const existingSession = await matchingQueue.getUserSession(userId);
        if (existingSession) {
          socket.emit("match_found", {
            sessionId: existingSession.sessionId,
            icebreakers: existingSession.icebreakers || [],
          });
          return;
        }

        const queueUser: QueueUser = {
          userId,
          socketId: socket.id,
          gender: prefs?.gender,
          chatStyle: prefs?.chat_style,
          joinedAt: Date.now(),
        };

        // Store socket data
        (socket.data as SocketData).userId = userId;

        // Try to find immediate match
        const match = await matchingQueue.findMatch(queueUser);

        if (match) {
          // Match found! Create session
          const session = await matchingQueue.createSession(queueUser, match);

          // Generate AI icebreakers (TODO: integrate AI service)
          const icebreakers = generateMockIcebreakers();
          await matchingQueue.setIcebreakers(session.sessionId, icebreakers);

          // Notify both users
          socket.emit("match_found", {
            sessionId: session.sessionId,
            icebreakers,
          });

          io.to(match.socketId).emit("match_found", {
            sessionId: session.sessionId,
            icebreakers,
          });

          console.log(`Match created: ${session.sessionId}`);
        } else {
          // No match found, add to queue
          await matchingQueue.addToQueue(queueUser);
          socket.emit("searching", {
            queuePosition: await matchingQueue.getQueueLength(),
          });
        }
      } catch (error) {
        console.error("Error in join_queue:", error);
        socket.emit("error", { message: "Failed to join queue" });
      }
    });

    // Join chat room
    socket.on("join_session", async (data: { sessionId: string }) => {
      const { sessionId } = data;
      const session = await matchingQueue.getSession(sessionId);

      if (session) {
        socket.join(sessionId);
        (socket.data as SocketData).sessionId = sessionId;
        console.log(`Socket ${socket.id} joined session ${sessionId}`);
      }
    });

    // Send message
    socket.on(
      "send_message",
      async (data: { sessionId: string; message: string }) => {
        const { sessionId, message } = data;
        const userId = (socket.data as SocketData).userId;

        if (!userId || !sessionId) {
          socket.emit("error", { message: "Invalid session" });
          return;
        }

        const session = await matchingQueue.getSession(sessionId);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Broadcast message to room (including sender for confirmation)
        const messageData = {
          id: crypto.randomUUID(),
          sessionId,
          senderId: userId,
          message,
          timestamp: Date.now(),
        };

        io.to(sessionId).emit("new_message", messageData);
        console.log(`Message sent in session ${sessionId}`);
      },
    );

    // User is typing
    socket.on("typing", (data: { sessionId: string; isTyping: boolean }) => {
      const { sessionId, isTyping } = data;
      const userId = (socket.data as SocketData).userId;

      if (userId && sessionId) {
        socket.to(sessionId).emit("stranger_typing", { isTyping });
      }
    });

    // Leave session / Skip
    socket.on("leave_session", async () => {
      const userId = (socket.data as SocketData).userId;
      const sessionId = (socket.data as SocketData).sessionId;

      if (sessionId) {
        // Notify other user
        socket.to(sessionId).emit("stranger_left");

        // End session
        await matchingQueue.endSession(sessionId);
        socket.leave(sessionId);

        console.log(`User ${userId} left session ${sessionId}`);
      }

      // Remove from queue if in queue
      if (userId) {
        await matchingQueue.removeFromQueue(userId);
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      const userId = (socket.data as SocketData).userId;
      const sessionId = (socket.data as SocketData).sessionId;

      console.log(`Socket disconnected: ${socket.id}`);

      if (sessionId) {
        socket.to(sessionId).emit("stranger_disconnected");
      }

      if (userId) {
        await matchingQueue.removeFromQueue(userId);
      }
    });
  });

  return io;
}

// Mock icebreaker generator (replace with AI service later)
function generateMockIcebreakers(): string[] {
  const icebreakers = [
    "What's the most interesting thing that happened to you this week?",
    "If you could travel anywhere right now, where would you go?",
    "What's your favorite way to spend a weekend?",
    "Do you prefer cats or dogs? (Or neither!)",
    "What's the last movie or show that made you laugh?",
    "If you could have any superpower, what would it be?",
    "What's your go-to comfort food?",
    "Are you a morning person or a night owl?",
    "What's something you're really good at?",
    "What book or podcast would you recommend?",
  ];

  // Return 3 random icebreakers
  const shuffled = icebreakers.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
