import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CoupleContextType, CoupleProfile } from '../types';
import { db } from '../services/firebaseConfig';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

export const useCouple = () => {
  const context = useContext(CoupleContext);
  if (!context) {
    throw new Error('useCouple must be used within a CoupleProvider');
  }
  return context;
};

interface CoupleProviderProps {
  children: ReactNode;
}

export const CoupleProvider: React.FC<CoupleProviderProps> = ({ children }) => {
  const [coupleId, setCoupleIdState] = useState<string | null>(() => localStorage.getItem('ourbliss_couple_id'));
  const [currentUserRole, setCurrentUserRole] = useState<'partner1' | 'partner2' | null>(() => 
    localStorage.getItem('ourbliss_role') as 'partner1' | 'partner2' | null
  );
  const [coupleData, setCoupleData] = useState<CoupleProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to persist to local storage
  const setCoupleId = (id: string) => {
    localStorage.setItem('ourbliss_couple_id', id);
    setCoupleIdState(id);
  };

  const signIn = (role: 'partner1' | 'partner2', id: string) => {
    localStorage.setItem('ourbliss_role', role);
    setCurrentUserRole(role);
    setCoupleId(id);
  };

  const signOut = () => {
    localStorage.removeItem('ourbliss_couple_id');
    localStorage.removeItem('ourbliss_role');
    setCoupleIdState(null);
    setCurrentUserRole(null);
    setCoupleData(null);
  };

  // Sync with Firestore
  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Real-time listener
    const unsubscribe = onSnapshot(doc(db, "couples", coupleId), (docSnap) => {
      if (docSnap.exists()) {
        setCoupleData(docSnap.data() as CoupleProfile);
      } else {
        // Create initial data if it doesn't exist (simulating new account creation flow)
        const initialData: CoupleProfile = {
          id: coupleId,
          partner1Name: '大寶',
          partner2Name: '小寶',
          anniversaryDate: new Date().toISOString(),
          passCode: Math.floor(100000 + Math.random() * 900000).toString(),
        };
        setDoc(doc(db, "couples", coupleId), initialData);
        setCoupleData(initialData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleId]);

  const updateCoupleData = async (data: Partial<CoupleProfile>) => {
    if (!coupleId) return;
    const ref = doc(db, "couples", coupleId);
    await updateDoc(ref, data);
  };

  return (
    <CoupleContext.Provider value={{
      coupleId,
      currentUserRole,
      coupleData,
      loading,
      setCoupleId,
      updateCoupleData,
      signIn,
      signOut
    }}>
      {children}
    </CoupleContext.Provider>
  );
};
