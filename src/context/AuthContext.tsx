import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebaseConfig";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => { throw new Error("AuthProvider missing"); },
  loginWithEmail: async () => { throw new Error("AuthProvider missing"); },
  registerWithEmail: async () => { throw new Error("AuthProvider missing"); },
  logout: async () => {},
});

const saveUserToFirestore = async (user: User, extra: Record<string, any> = {}) => {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp(),
        ...extra,
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to save user to Firestore:", err);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result (for mobile Google login)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await saveUserToFirestore(result.user, { provider: "google" });
        }
      })
      .catch((err) => console.error("Redirect result error:", err));

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    // Popup em todos os dispositivos. O signInWithRedirect quebra no celular
    // (partição de armazenamento do Safari/Chrome quando o authDomain é outro
    // origin, *.firebaseapp.com) — o retorno volta sem a sessão. O popup
    // devolve o resultado via postMessage, que não sofre disso, então funciona
    // também no mobile.
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user, { provider: "google" });
    return result.user;
  };

  const loginWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(result.user, { provider: "password" });
    return result.user;
  };

  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    await saveUserToFirestore(result.user, {
      provider: "password",
      displayName: displayName || result.user.displayName,
      createdAt: serverTimestamp(),
    });
    return result.user;
  };

  const logout = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
