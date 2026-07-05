import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth, supabase } from './AuthContext';

interface StackContextType {
  stack: string[];
  inStack: (slug: string) => boolean;
  addToStack: (slug: string) => void;
  removeFromStack: (slug: string) => void;
  toggleStack: (slug: string) => void;
}

const StackContext = createContext<StackContextType>({
  stack: [],
  inStack: () => false,
  addToStack: () => {},
  removeFromStack: () => {},
  toggleStack: () => {},
});

export function StackProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stack, setStack] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setStack([]); return; }
    supabase
      .from('user_health_profiles')
      .select('current_stack')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setStack(data?.current_stack ?? []));
  }, [user?.id]);

  const persist = (next: string[]) => {
    setStack(next);
    if (!user) return;
    supabase
      .from('user_health_profiles')
      .upsert({ user_id: user.id, current_stack: next }, { onConflict: 'user_id' })
      .then();
  };

  const inStack = (slug: string) => stack.includes(slug);

  const addToStack = (slug: string) => {
    if (user && !stack.includes(slug)) persist([...stack, slug]);
  };

  const removeFromStack = (slug: string) => {
    if (user) persist(stack.filter(s => s !== slug));
  };

  const toggleStack = (slug: string) => {
    if (inStack(slug)) removeFromStack(slug);
    else addToStack(slug);
  };

  return (
    <StackContext.Provider value={{ stack, inStack, addToStack, removeFromStack, toggleStack }}>
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  return useContext(StackContext);
}
