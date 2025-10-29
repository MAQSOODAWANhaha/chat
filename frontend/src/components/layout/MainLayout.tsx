import { PropsWithChildren } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/toast-container";

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex flex-1 flex-col overflow-hidden bg-muted/40">
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
