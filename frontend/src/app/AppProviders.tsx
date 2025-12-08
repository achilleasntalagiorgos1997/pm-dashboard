// src/app/AppProviders.tsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryProvider } from "./providers/query/QueryProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <React.StrictMode>
      <QueryProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryProvider>
    </React.StrictMode>
  );
}
