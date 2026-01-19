import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Gender = "male" | "female" | "other";

type SessionUser = {
  id: string;
  username: string;
  profilePhoto?: string;
  dateOfBirth?: string;
};

type AuthResponse = {
  _id: string;
  username: string;
  profilePhoto?: string;
  dateOfBirth?: string;
};

type AuthResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type SignUpPayload = {
  username: string;
  password: string;
  confirmPassword: string;
  gender: Gender;
  dateOfBirth: string;
  profilePhoto?: string;
  interests?: string[];
};

export type UpdateProfilePayload = {
  username?: string;
  profilePhoto?: string;
  gender?: Gender;
  dateOfBirth?: string; // ISO string
  interests?: string[];
};


type AuthContextValue = {
  user: SessionUser | null;
  initializing: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthResult>;
  uploadProfilePhoto: (image: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
};

const SESSION_KEY = "whoami.session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseSession = (raw: string | null): SessionUser | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.username) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const rawSession = await AsyncStorage.getItem(SESSION_KEY);
        const session = parseSession(rawSession);
        if (session) {
          setUser(session);
        }
      } finally {
        setInitializing(false);
      }
    };

    loadSession();
  }, []);

  const persistSession = async (session: SessionUser | null) => {
    if (!session) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return;
    }
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const signIn = async (username: string, password: string): Promise<AuthResult> => {
    try {
      const payload = await api.post<AuthResponse>("/user/login", { username, password });

      const session = {
        id: payload._id,
        username: payload.username,
        profilePhoto: payload.profilePhoto,
        dateOfBirth: payload.dateOfBirth,
      };

      setUser(session);
      await persistSession(session);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      return { ok: false, error: message };
    }
  };

  const signUp = async (payload: SignUpPayload): Promise<AuthResult> => {
    try {
      const response = await api.post<AuthResponse>("/user/register", payload);
      const session = {
        id: response._id,
        username: response.username,
        profilePhoto: response.profilePhoto,
        dateOfBirth: response.dateOfBirth,
      };

      setUser(session);
      await persistSession(session);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register.";
      return { ok: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      await api.get("/user/logout");
    } catch {
      // Ignore network issues; clear local session regardless.
    } finally {
      setUser(null);
      await persistSession(null);
    }
  };

const updateProfile = async (
  payload: UpdateProfilePayload,
): Promise<AuthResult> => {
  try {
    const response = await api.patch<AuthResponse>("/user/profile", payload);

    const session = {
      id: response._id,
      username: response.username,
      profilePhoto: response.profilePhoto,
      dateOfBirth: response.dateOfBirth ?? user?.dateOfBirth,
    };

    setUser(session);
    await persistSession(session);

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update profile.";
    return { ok: false, error: message };
  }
};


  const uploadProfilePhoto = async (image: string): Promise<AuthResult> => {
    try {
      const response = await api.post<AuthResponse>("/user/profile/photo", { image });
      const session = {
        id: response._id,
        username: response.username,
        profilePhoto: response.profilePhoto,
        dateOfBirth: response.dateOfBirth ?? user?.dateOfBirth,
      };

      setUser(session);
      await persistSession(session);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload photo.";
      return { ok: false, error: message };
    }
  };

  const deleteAccount = async (): Promise<AuthResult> => {
    try {
      await api.del("/user/profile");
      setUser(null);
      await persistSession(null);
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete account.";
      return { ok: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        signIn,
        signUp,
        signOut,
        updateProfile,
        uploadProfilePhoto,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
