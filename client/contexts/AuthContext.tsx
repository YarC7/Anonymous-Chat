import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useGoogleLogin, CodeResponse } from "@react-oauth/google";
import { UserPreferences } from "@shared/auth";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isProfileComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
  updateUserProfile: (preferences: UserPreferences) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeResponse = async (codeResponse: CodeResponse) => {
    try {
      setLoading(true);
      console.log("Sending authorization code to backend...");

      // Send authorization code to backend
      const response = await fetch("/api/auth/google/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code: codeResponse.code }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        console.log("Authentication successful!", data.user);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Authentication failed:", errorData);
        alert(
          `Authentication failed: ${errorData.details || errorData.error || "Please check server configuration"}`,
        );
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Authentication error: Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleCodeResponse,
    onError: (error) => console.error("Login Failed:", error),
    flow: "auth-code",
  });

  const signInWithGoogle = () => {
    googleLogin();
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const updateUserProfile = async (preferences: UserPreferences) => {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signOut, updateUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
