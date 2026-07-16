import { ReactNode } from "react";
import AppSidebar, { AppPage } from "./AppSidebar";

type AppShellProps = {
  activePage: AppPage;
  children: ReactNode;
};

export default async function AppShell({
  activePage,
  children,
}: AppShellProps) {
  return (
    <main className="app-shell">
      <AppSidebar activePage={activePage} />

      <section className="content">
        {children}
      </section>
    </main>
  );
}