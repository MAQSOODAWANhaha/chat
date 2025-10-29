import { PropsWithChildren } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ToastContainer } from "@/components/ui/toast-container";
import { useAppStore } from "@/store/useAppStore";

export function MainLayout({ children }: PropsWithChildren) {
  const { isSettingsOpen } = useAppStore();

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex flex-1 flex-col overflow-hidden bg-muted/40">
          {children}
        </main>
      </div>
      {isSettingsOpen ? <SettingsPanel /> : null}
      <ToastContainer />
    </div>
  );
}
