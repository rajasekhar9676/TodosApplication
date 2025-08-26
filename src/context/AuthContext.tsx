import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type Role = "admin" | "member" | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setRole(userDoc.data().role || "member");
        } else {
          // Create user doc for first-time users
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            role: "member",
            teams: [],
            phoneNumber: "", // Will be collected later
            phoneNumberVerified: false,
            dueDateReminder: true,
            overdueReminder: true,
            dailyDigest: false,
            reminderTime: "09:00"
          });
          setRole("member");
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};