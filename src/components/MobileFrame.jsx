import React from 'react';

export const MobileFrame = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 flex flex-col transition-colors selection:bg-rust-700 selection:text-white">
      {children}
    </div>
  );
};
