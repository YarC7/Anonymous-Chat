export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleId: string;
  isProfileComplete?: boolean;
}

export interface UserPreferences {
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  chatStyle?: "friendly" | "casual" | "professional" | "fun";
  interests?: string[];
}

export interface AuthResponse {
  user: User | null;
}

export interface UpdateProfileRequest {
  preferences: UserPreferences;
}

export interface UpdateProfileResponse {
  user: User;
  preferences: UserPreferences;
}
