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
  matchGender?: string; // Preference: 'male', 'female', or 'random'
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
  lastActivity: number; // Timestamp of last activity (message, reconnect, etc)
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

  // Find a match for user based on gender preferences
  async findMatch(currentUser: QueueUser): Promise<QueueUser | null> {
    const queueLength = await redis.llen(QUEUE_KEY);

    // Need at least 2 users in queue (including current user)
    if (queueLength < 2) {
      return null;
    }

    // Get all users in queue
    const allUsersJson = await redis.lrange(QUEUE_KEY, 0, -1);

    for (const userJson of allUsersJson) {
      const potentialMatch = JSON.parse(userJson) as QueueUser;

      // Don't match with self
      if (potentialMatch.userId === currentUser.userId) {
        continue;
      }

      // Check if gender preferences match
      const currentUserWants = currentUser.matchGender || "random";
      const potentialMatchWants = potentialMatch.matchGender || "random";
      const currentUserGender = currentUser.gender || "other";
      const potentialMatchGender = potentialMatch.gender || "other";

      // Check if they are compatible:
      // 1. Current user wants random OR wants the potential match's gender
      // 2. Potential match wants random OR wants the current user's gender
      const currentUserCompatible =
        currentUserWants === "random" ||
        currentUserWants === potentialMatchGender;

      const potentialMatchCompatible =
        potentialMatchWants === "random" ||
        potentialMatchWants === currentUserGender;

      if (currentUserCompatible && potentialMatchCompatible) {
        // Match found! Remove from queue
        await redis.lrem(QUEUE_KEY, 1, userJson);
        console.log(
          `Match found: ${currentUser.userId} <-> ${potentialMatch.userId}`,
          {
            currentUser: { gender: currentUserGender, wants: currentUserWants },
            match: { gender: potentialMatchGender, wants: potentialMatchWants },
          },
        );
        return potentialMatch;
      }
    }

    // No compatible match found
    console.log(`No compatible match found for user ${currentUser.userId}`, {
      gender: currentUser.gender,
      wants: currentUser.matchGender,
    });
    return null;
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
      lastActivity: Date.now(),
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

  // Check if session is active (has recent activity within last 30 seconds FOR TESTING)
  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    const INACTIVE_TIMEOUT = 30 * 1000; // 30 seconds (for testing, change to 5 * 60 * 1000 for production)
    const timeSinceLastActivity = Date.now() - session.lastActivity;

    return timeSinceLastActivity < INACTIVE_TIMEOUT;
  }

  // Get user's current session
  async getUserSession(userId: string): Promise<ChatSession | null> {
    const sessionId = await redis.get(`${USER_SESSION_PREFIX}${userId}`);
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  // Clear stale user session mapping (when session deleted but mapping remains)
  async clearUserSessionMapping(userId: string): Promise<void> {
    await redis.del(`${USER_SESSION_PREFIX}${userId}`);
    console.log(`Cleared stale session mapping for user ${userId}`);
  }

  // Update session's last activity timestamp
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      await redis.setex(
        `${SESSION_PREFIX}${sessionId}`,
        24 * 60 * 60,
        JSON.stringify(session),
      );
    }
  }

  // End session
  async endSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      // Delete session data
      await redis.del(`${SESSION_PREFIX}${sessionId}`);

      // Delete user session mappings
      await redis.del(`${USER_SESSION_PREFIX}${session.user1.userId}`);
      await redis.del(`${USER_SESSION_PREFIX}${session.user2.userId}`);

      // Delete session messages
      await redis.del(`${SESSION_PREFIX}${sessionId}:messages`);

      console.log(
        `Session ended: ${sessionId} (including messages and mappings)`,
      );
    }
  }

  // Get queue length
  async getQueueLength(): Promise<number> {
    return await redis.llen(QUEUE_KEY);
  }

  // Get queue statistics (position, gender counts, etc)
  async getQueueStats(userId: string): Promise<{
    position: number;
    totalInQueue: number;
    maleCount: number;
    femaleCount: number;
  }> {
    const queueLength = await redis.llen(QUEUE_KEY);
    const allUsersJson = await redis.lrange(QUEUE_KEY, 0, -1);

    let position = -1;
    let maleCount = 0;
    let femaleCount = 0;

    allUsersJson.forEach((userJson, index) => {
      const user = JSON.parse(userJson) as QueueUser;

      // Find user's position
      if (user.userId === userId) {
        position = index + 1; // 1-indexed position
      }

      // Count genders
      if (user.gender === "male") {
        maleCount++;
      } else if (user.gender === "female") {
        femaleCount++;
      }
    });

    return {
      position: position === -1 ? queueLength : position,
      totalInQueue: queueLength,
      maleCount,
      femaleCount,
    };
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

  // Update socket ID for a user in session (when reconnecting)
  async updateSocketId(
    sessionId: string,
    userId: string,
    newSocketId: string,
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      if (session.user1.userId === userId) {
        session.user1.socketId = newSocketId;
      } else if (session.user2.userId === userId) {
        session.user2.socketId = newSocketId;
      }
      await redis.setex(
        `${SESSION_PREFIX}${sessionId}`,
        24 * 60 * 60,
        JSON.stringify(session),
      );
      console.log(
        `Updated socketId for user ${userId} in session ${sessionId}`,
      );
    }
  }

  // Store conversation message with metadata
  async addMessage(
    sessionId: string,
    messageData: {
      id: string;
      senderId: string;
      message: string;
      timestamp: number;
    },
  ): Promise<void> {
    const key = `${SESSION_PREFIX}${sessionId}:messages`;
    await redis.lpush(key, JSON.stringify(messageData));
    await redis.expire(key, 24 * 60 * 60); // 24 hour expiry
  }

  // Get all conversation messages
  async getAllMessages(sessionId: string): Promise<any[]> {
    const key = `${SESSION_PREFIX}${sessionId}:messages`;
    const messagesJson = await redis.lrange(key, 0, -1); // Get all messages
    const messages = messagesJson.map((json) => JSON.parse(json));
    return messages.reverse(); // Reverse to get chronological order
  }

  // Get recent conversation messages (text only, for icebreaker generation)
  async getRecentMessages(
    sessionId: string,
    count: number = 10,
  ): Promise<string[]> {
    const key = `${SESSION_PREFIX}${sessionId}:messages`;
    const messagesJson = await redis.lrange(key, 0, count - 1);
    const messages = messagesJson.map((json) => {
      const data = JSON.parse(json);
      return data.message; // Extract just the message text
    });
    return messages.reverse(); // Reverse to get chronological order
  }
}

export const matchingQueue = new MatchingQueue();
