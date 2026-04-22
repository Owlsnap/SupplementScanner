import React, { createContext, useContext, useState, useCallback } from 'react';

const STACK_KEY = 'ss_my_stack';

function readStack(): string[] {
  try { return JSON.parse(localStorage.getItem(STACK_KEY) || '[]'); } catch { return []; }
}
function writeStack(slugs: string[]) {
  localStorage.setItem(STACK_KEY, JSON.stringify(slugs));
}

interface StackContextValue {
  stack: string[];
  addToStack: (slug: string) => void;
  removeFromStack: (slug: string) => void;
  inStack: (slug: string) => boolean;
}

const StackContext = createContext<StackContextValue>({
  stack: [],
  addToStack: () => {},
  removeFromStack: () => {},
  inStack: () => false,
});

export function StackProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<string[]>(readStack);

  const addToStack = useCallback((slug: string) => {
    setStack(prev => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      writeStack(next);
      return next;
    });
  }, []);

  const removeFromStack = useCallback((slug: string) => {
    setStack(prev => {
      const next = prev.filter(s => s !== slug);
      writeStack(next);
      return next;
    });
  }, []);

  const inStack = useCallback((slug: string) => stack.includes(slug), [stack]);

  return (
    <StackContext.Provider value={{ stack, addToStack, removeFromStack, inStack }}>
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  return useContext(StackContext);
}
