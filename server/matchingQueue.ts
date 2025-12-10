import redis from "./redis";
import crypto from "crypto";

const QUEUE_KEY = "chat:waiting_queue";
const SESSION_PREFIX = "chat:session:";
const USER_SESSION_PREFIX = "user:session:";

export interface QueueUser {
  userId: string;
  socketId: string;
  gender?: string;
  chatStyle?: string;
  joinedAt: number;
}

export interface ChatSession {
  sessionId: string;
  user1: {
    userId: string;
    socketId: string;
  };
  user2: {
    userId: string;
    socketId: string;
  };
  createdAt: number;
  icebreakers?: string[];
}

class MatchingQueue {
  // Add user to waiting queue
  async addToQueue(user: QueueUser): Promise<void> {
    await redis.lpush(QUEUE_KEY, JSON.stringify(user));
    console.log(`User ${user.userId} added to queue`);
  }

  // Remove user from queue
  async removeFromQueue(userId: string): Promise<void> {
    const queueLength = await redis.llen(QUEUE_KEY);

    for (let i = 0; i < queueLength; i++) {
      const userJson = await redis.lindex(QUEUE_KEY, i);
      if (userJson) {
        const user = JSON.parse(userJson) as QueueUser;
        if (user.userId === userId) {
          await redis.lrem(QUEUE_KEY, 1, userJson);
          console.log(`User ${userId} removed from queue`);
          break;
        }
      }
    }
  }

  // Find a match for user (simple FIFO for MVP)
  async findMatch(currentUser: QueueUser): Promise<QueueUser | null> {
    const queueLength = await redis.llen(QUEUE_KEY);

    // Need at least 2 users in queue (including current user)
    if (queueLength < 2) {
      return null;
    }

    // Get the first user in queue (FIFO)
    const userJson = await redis.rpop(QUEUE_KEY);

    if (!userJson) {
      return null;
    }

    const matchedUser = JSON.parse(userJson) as QueueUser;

    // Don't match with self
    if (matchedUser.userId === currentUser.userId) {
      // Put user back and try again
      await redis.rpush(QUEUE_KEY, userJson);
      return null;
    }

    console.log(`Match found: ${currentUser.userId} <-> ${matchedUser.userId}`);
    return matchedUser;
  }

  // Create chat session
  async createSession(
    user1: QueueUser,
    user2: QueueUser,
  ): Promise<ChatSession> {
    const sessionId = crypto.randomUUID();

    const session: ChatSession = {
      sessionId,
      user1: {
        userId: user1.userId,
        socketId: user1.socketId,
      },
      user2: {
        userId: user2.userId,
        socketId: user2.socketId,
      },
      createdAt: Date.now(),
    };

    // Store session (expires in 24 hours)
    await redis.setex(
      `${SESSION_PREFIX}${sessionId}`,
      24 * 60 * 60,
      JSON.stringify(session),
    );

    // Map users to session
    await redis.setex(
      `${USER_SESSION_PREFIX}${user1.userId}`,
      24 * 60 * 60,
      sessionId,
    );
    await redis.setex(
      `${USER_SESSION_PREFIX}${user2.userId}`,
      24 * 60 * 60,
      sessionId,
    );

    console.log(`Session created: ${sessionId}`);
    return session;
  }

  // Get session by ID
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const sessionJson = await redis.get(`${SESSION_PREFIX}${sessionId}`);
    return sessionJson ? JSON.parse(sessionJson) : null;
  }

  // Get user's current session
  async getUserSession(userId: string): Promise<ChatSession | null> {
    const sessionId = await redis.get(`${USER_SESSION_PREFIX}${userId}`);
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  // End session
  async endSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await redis.del(`${SESSION_PREFIX}${sessionId}`);
      await redis.del(`${USER_SESSION_PREFIX}${session.user1.userId}`);
      await redis.del(`${USER_SESSION_PREFIX}${session.user2.userId}`);
      console.log(`Session ended: ${sessionId}`);
    }
  }

  // Get queue length
  async getQueueLength(): Promise<number> {
    return await redis.llen(QUEUE_KEY);
  }

  // Update session with icebreakers
  async setIcebreakers(
    sessionId: string,
    icebreakers: string[],
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.icebreakers = icebreakers;
      await redis.setex(
        `${SESSION_PREFIX}${sessionId}`,
        24 * 60 * 60,
        JSON.stringify(session),
      );
    }
  }
}

export const matchingQueue = new MatchingQueue();
