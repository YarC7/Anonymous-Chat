import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import crypto from "crypto";
import { matchingQueue, QueueUser } from "./matchingQueue";
import { getDb } from "./db";
import {
  generateIcebreakers,
  generateContextualIcebreakers,
} from "./services/icebreakers";

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

    const db = getDb();
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
          console.log(
            `Found existing session ${existingSession.sessionId} for user ${userId}`,
          );

          // Verify the session is still valid (not deleted) AND recently active
          const sessionStillExists = await matchingQueue.getSession(
            existingSession.sessionId,
          );
          const isActive = await matchingQueue.isSessionActive(
            existingSession.sessionId,
          );

          if (!sessionStillExists || !isActive) {
            if (!sessionStillExists) {
              console.log(
                `Session ${existingSession.sessionId} was deleted but mapping exists, cleaning up...`,
              );
            } else {
              console.log(
                `Session ${existingSession.sessionId} is inactive (no activity > 5 min), cleaning up...`,
              );
              // Delete the inactive session
              await matchingQueue.endSession(existingSession.sessionId);
            }
            // Clear the stale mapping so user can find new match
            await matchingQueue.clearUserSessionMapping(userId);
            // Continue to matching logic below (don't return)
          } else {
            // User is reconnecting to valid existing session
            // Update the socket ID in the session
            await matchingQueue.updateSocketId(
              existingSession.sessionId,
              userId,
              socket.id,
            );

            // Update last activity timestamp
            await matchingQueue.updateSessionActivity(
              existingSession.sessionId,
            );

            // Store socket data
            (socket.data as SocketData).userId = userId;
            (socket.data as SocketData).sessionId = existingSession.sessionId;

            // Rejoin the socket room
            socket.join(existingSession.sessionId);

            console.log(
              `User ${userId} reconnected to session ${existingSession.sessionId} with new socket ${socket.id}`,
            );

            // Get all previous messages from Redis (if any)
            let previousMessages = [];
            try {
              previousMessages = await matchingQueue.getAllMessages(
                existingSession.sessionId,
              );
              console.log(
                `Loaded ${previousMessages.length} previous messages`,
              );
            } catch (error) {
              //   console.error("Error loading previous messages:", error);
              // Continue without messages - not a critical error
            }

            socket.emit("match_found", {
              sessionId: existingSession.sessionId,
              icebreakers: existingSession.icebreakers || [],
              messages: previousMessages, // Send previous messages (empty array if none)
            });

            // Notify other user in session that this user reconnected
            socket.to(existingSession.sessionId).emit("stranger_reconnected");

            return;
          }
        }

        const queueUser: QueueUser = {
          userId,
          socketId: socket.id,
          gender: prefs?.gender,
          chatStyle: prefs?.chat_style,
          matchGender: prefs?.match_gender || "random",
          joinedAt: Date.now(),
        };

        // Store socket data
        (socket.data as SocketData).userId = userId;

        // Add user to queue first
        await matchingQueue.addToQueue(queueUser);

        // Try to find immediate match
        const match = await matchingQueue.findMatch(queueUser);

        if (match) {
          // Match found! Remove both users from queue
          await matchingQueue.removeFromQueue(userId);
          await matchingQueue.removeFromQueue(match.userId);

          // Create session
          const session = await matchingQueue.createSession(queueUser, match);

          // Get preferences for both users
          const matchPrefs = await db("user_preferences")
            .where({ user_id: match.userId })
            .first();

          // Generate AI-powered icebreakers based on preferences
          const icebreakers = await generateIcebreakers(
            { gender: prefs?.gender, chatStyle: prefs?.chat_style },
            { gender: matchPrefs?.gender, chatStyle: matchPrefs?.chat_style },
          );
          await matchingQueue.setIcebreakers(session.sessionId, icebreakers);

          // Notify current user (who just joined)
          socket.emit("match_found", {
            sessionId: session.sessionId,
            icebreakers,
          });

          // Notify matched user (who was waiting in queue)
          io.to(match.socketId).emit("match_found", {
            sessionId: session.sessionId,
            icebreakers,
          });

          console.log(`Match created: ${session.sessionId}`, {
            user1: userId,
            user1Socket: socket.id,
            user2: match.userId,
            user2Socket: match.socketId,
          });
        } else {
          // No match found, user is already in queue from earlier
          const queueStats = await matchingQueue.getQueueStats(userId);
          socket.emit("searching", queueStats);

          // Send periodic updates every 3 seconds while in queue
          const queueUpdateInterval = setInterval(async () => {
            // Check if user is still in queue (not matched yet)
            const currentSession = (socket.data as SocketData).sessionId;
            if (!currentSession) {
              try {
                const updatedStats = await matchingQueue.getQueueStats(userId);
                socket.emit("searching", updatedStats);
              } catch (error) {
                console.error("Error updating queue stats:", error);
                clearInterval(queueUpdateInterval);
              }
            } else {
              // User found a match, stop sending updates
              clearInterval(queueUpdateInterval);
            }
          }, 3000);

          // Clean up interval on disconnect
          socket.on("disconnect", () => {
            clearInterval(queueUpdateInterval);
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

        // Ensure userId is set from session if not already set
        const currentUserId = (socket.data as SocketData).userId;
        if (!currentUserId) {
          // Check which user in the session this socket belongs to
          if (session.user1.socketId === socket.id) {
            (socket.data as SocketData).userId = session.user1.userId;
          } else if (session.user2.socketId === socket.id) {
            (socket.data as SocketData).userId = session.user2.userId;
          }
        }

        console.log(
          `Socket ${socket.id} joined session ${sessionId}, userId: ${(socket.data as SocketData).userId}`,
        );

        // Log how many users are now in the room
        const socketsInRoom = await io.in(sessionId).fetchSockets();
        console.log(
          `Session ${sessionId} now has ${socketsInRoom.length} connected users`,
        );
      } else {
        console.log(`Session ${sessionId} not found for socket ${socket.id}`);
        socket.emit("error", { message: "Session not found" });
      }
    });

    // Send message
    socket.on(
      "send_message",
      async (data: { sessionId: string; message: string }) => {
        const { sessionId, message } = data;
        const userId = (socket.data as SocketData).userId;

        console.log(
          `send_message event: userId=${userId}, sessionId=${sessionId}, socketId=${socket.id}`,
        );

        if (!userId || !sessionId) {
          console.error(
            `Invalid session: userId=${userId}, sessionId=${sessionId}`,
          );
          socket.emit("error", { message: "Invalid session" });
          return;
        }

        const session = await matchingQueue.getSession(sessionId);
        if (!session) {
          console.error(`Session not found: ${sessionId}`);
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

        // Store message with full metadata in Redis
        await matchingQueue.addMessage(sessionId, messageData);

        // Update session activity
        await matchingQueue.updateSessionActivity(sessionId);

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

    // Generate new icebreakers based on conversation
    socket.on(
      "request_new_icebreakers",
      async (data: { sessionId: string }) => {
        try {
          const { sessionId } = data;
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

          // Get conversation history
          const conversationHistory = await matchingQueue.getRecentMessages(
            sessionId,
            15,
          );

          if (conversationHistory.length < 3) {
            socket.emit("error", {
              message: "Not enough conversation history yet",
            });
            return;
          }

          // Get user preferences
          const user1Prefs = await db("user_preferences")
            .where({ user_id: session.user1.userId })
            .first();
          const user2Prefs = await db("user_preferences")
            .where({ user_id: session.user2.userId })
            .first();

          // Generate context-aware icebreakers
          const newIcebreakers = await generateContextualIcebreakers(
            conversationHistory,
            { gender: user1Prefs?.gender, chatStyle: user1Prefs?.chat_style },
            { gender: user2Prefs?.gender, chatStyle: user2Prefs?.chat_style },
          );

          // Update session with new icebreakers
          await matchingQueue.setIcebreakers(sessionId, newIcebreakers);

          // Send new icebreakers to both users
          io.to(sessionId).emit("new_icebreakers", {
            icebreakers: newIcebreakers,
          });

          console.log(
            `Generated new context-aware icebreakers for session ${sessionId}`,
          );
        } catch (error) {
          console.error("Error generating new icebreakers:", error);
          socket.emit("error", {
            message: "Failed to generate new icebreakers",
          });
        }
      },
    );

    // Leave session / Skip
    socket.on("leave_session", async () => {
      const userId = (socket.data as SocketData).userId;
      const sessionId = (socket.data as SocketData).sessionId;

      console.log(`User ${userId} leaving session ${sessionId}`);

      if (sessionId) {
        // Get users in room before deleting
        const socketsInRoom = await io.in(sessionId).fetchSockets();
        console.log(
          `Notifying ${socketsInRoom.length - 1} other users in session ${sessionId}`,
        );

        // Notify other user BEFORE deleting session
        socket.to(sessionId).emit("stranger_left");

        // Small delay to ensure the event is delivered before we delete everything
        await new Promise((resolve) => setTimeout(resolve, 200));

        // End session (deletes session, mappings, and messages)
        await matchingQueue.endSession(sessionId);

        // Leave socket room
        socket.leave(sessionId);

        // Clear session from socket data
        (socket.data as SocketData).sessionId = undefined;

        console.log(
          `User ${userId} left session ${sessionId} - session fully deleted`,
        );
      }

      // Remove from queue if in queue
      if (userId) {
        await matchingQueue.removeFromQueue(userId);
      }

      // Confirm session left to client
      socket.emit("session_left");
    });

    // Disconnect
    socket.on("disconnect", async () => {
      const userId = (socket.data as SocketData).userId;
      const sessionId = (socket.data as SocketData).sessionId;

      console.log(`Socket disconnected: ${socket.id}, userId: ${userId}`);

      // Check if session should be deleted (both users offline)
      if (sessionId) {
        const session = await matchingQueue.getSession(sessionId);
        if (session) {
          // Get all sockets in the session room
          const socketsInRoom = await io.in(sessionId).fetchSockets();

          console.log(
            `Session ${sessionId} has ${socketsInRoom.length} connected users after disconnect`,
          );

          // If no one left in room, delete the session
          if (socketsInRoom.length === 0) {
            console.log(
              `No users left in session ${sessionId}, deleting session...`,
            );
            await matchingQueue.endSession(sessionId);
          } else {
            // Still has users, just notify them
            socket.to(sessionId).emit("stranger_disconnected");
          }
        }
      }

      // Remove from queue if they were in queue (not in active session)
      if (userId && !sessionId) {
        await matchingQueue.removeFromQueue(userId);
      }
    });
  });

  return io;
}
