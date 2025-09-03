import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type Role = "superadmin" | "admin" | "member" | null;

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
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          // User document exists, proceed with login
          setUser(firebaseUser);
          setRole(userDoc.data().role || "member");
        } else {
          // User document doesn't exist - this could mean:
          // 1. First-time user (legitimate)
          // 2. Deleted user (should be signed out)
          
          // Check if this is a legitimate first-time user by checking if they have a recent creation time
          const userCreationTime = firebaseUser.metadata.creationTime;
          const now = new Date();
          const timeDiff = userCreationTime ? now.getTime() - new Date(userCreationTime).getTime() : Infinity;
          const isRecentUser = timeDiff < 5 * 60 * 1000; // 5 minutes
          
          if (isRecentUser) {
            // This is likely a legitimate first-time user
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
            setUser(firebaseUser);
            setRole("member");
          } else {
            // This is likely a deleted user - sign them out
            console.log("User document not found for existing user, signing out:", firebaseUser.uid);
            await auth.signOut();
            setUser(null);
            setRole(null);
          }
        }
      } else {
        setUser(null);
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