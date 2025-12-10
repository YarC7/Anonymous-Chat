import { RequestHandler } from "express";
import {
  AuthResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserPreferences,
} from "@shared/auth";
import { getDb } from "../db";

const db = getDb();
const SESSION_EXPIRY_DAYS = 7;

// Exchange authorization code for tokens and user info
export const handleGoogleCallback: RequestHandler = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "No authorization code provided" });
    }

    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing OAuth credentials in environment variables");
      return res.status(500).json({
        error: "Server configuration error",
        details: "OAuth credentials not configured",
      });
    }

    if (clientSecret === "your_google_client_secret_here") {
      console.error("GOOGLE_CLIENT_SECRET is still set to placeholder value!");
      console.error(
        "Please update .env file with your actual Google Client Secret",
      );
      return res.status(500).json({
        error: "Server configuration error",
        details:
          "OAuth credentials not properly configured. Check server logs.",
      });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: "postmessage", // Required for authorization code flow from frontend
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      console.error(
        "Make sure your Google Client Secret is correct in the .env file",
      );
      return res.status(401).json({
        error: "Failed to exchange authorization code",
        details:
          "Invalid OAuth credentials. Please check your Google Cloud Console settings.",
      });
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: "Failed to get user info" });
    }

    const googleUser = await userInfoResponse.json();

    // Check if user exists
    let user = await db("users").where({ google_id: googleUser.id }).first();

    if (user) {
      // Update existing user
      await db("users").where({ id: user.id }).update({
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        updated_at: db.fn.now(),
      });
    } else {
      // Create new user
      [user] = await db("users")
        .insert({
          id: googleUser.id,
          google_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          is_profile_complete: false,
        })
        .returning("*");
    }

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await db("sessions").insert({
      id: sessionId,
      user_id: user.id,
      expires_at: expiresAt,
    });

    // Set session cookie
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    // Return user data with camelCase
    const response: AuthResponse = {
      user: {
        id: user.id,
        googleId: user.google_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isProfileComplete: user.is_profile_complete,
      },
    };
    res.json(response);
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Get current user
export const handleGetMe: RequestHandler = async (req, res) => {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ user: null });
  }

  // Check session exists and not expired
  const session = await db("sessions")
    .where({ id: sessionId })
    .where("expires_at", ">", db.fn.now())
    .first();

  if (!session) {
    return res.status(401).json({ user: null });
  }

  // Get user
  const user = await db("users").where({ id: session.user_id }).first();

  if (!user) {
    return res.status(401).json({ user: null });
  }

  const response: AuthResponse = {
    user: {
      id: user.id,
      googleId: user.google_id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isProfileComplete: user.is_profile_complete,
    },
  };
  res.json(response);
};

// Logout
export const handleLogout: RequestHandler = async (req, res) => {
  const sessionId = req.cookies?.sessionId;

  if (sessionId) {
    await db("sessions").where({ id: sessionId }).delete();
  }

  res.clearCookie("sessionId");
  res.json({ success: true });
};

// Update user profile
export const handleUpdateProfile: RequestHandler = async (req, res) => {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Check session
  const session = await db("sessions")
    .where({ id: sessionId })
    .where("expires_at", ">", db.fn.now())
    .first();

  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const user = await db("users").where({ id: session.user_id }).first();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { preferences } = req.body as UpdateProfileRequest;

  if (!preferences) {
    return res.status(400).json({ error: "Preferences are required" });
  }

  // Save or update preferences
  const existingPrefs = await db("user_preferences")
    .where({ user_id: user.id })
    .first();

  if (existingPrefs) {
    await db("user_preferences")
      .where({ user_id: user.id })
      .update({
        gender: preferences.gender,
        chat_style: preferences.chatStyle,
        match_gender: preferences.matchGender || "random",
        interests: preferences.interests
          ? JSON.stringify(preferences.interests)
          : null,
        updated_at: db.fn.now(),
      });
  } else {
    await db("user_preferences").insert({
      user_id: user.id,
      gender: preferences.gender,
      chat_style: preferences.chatStyle,
      match_gender: preferences.matchGender || "random",
      interests: preferences.interests
        ? JSON.stringify(preferences.interests)
        : null,
    });
  }

  // Mark profile as complete
  await db("users").where({ id: user.id }).update({
    is_profile_complete: true,
    updated_at: db.fn.now(),
  });

  const updatedUser = await db("users").where({ id: user.id }).first();

  const response: UpdateProfileResponse = {
    user: {
      id: updatedUser.id,
      googleId: updatedUser.google_id,
      email: updatedUser.email,
      name: updatedUser.name,
      picture: updatedUser.picture,
      isProfileComplete: updatedUser.is_profile_complete,
    },
    preferences,
  };
  res.json(response);
};
