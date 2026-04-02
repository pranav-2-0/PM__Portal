import React from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      <main className="pt-16 pl-60 transition-all duration-300">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;