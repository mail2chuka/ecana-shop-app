'use client';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

function ScrollPreventionHandler({ children }) {
  useEffect(() => {
    const preventScroll = (e) => {
      if (e.target.type === 'number') {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventScroll, { passive: false });
    return () => document.removeEventListener('wheel', preventScroll);
  }, []);

  return children;
}

export default function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <ScrollPreventionHandler>{children}</ScrollPreventionHandler>
    </SessionProvider>
  );
}
