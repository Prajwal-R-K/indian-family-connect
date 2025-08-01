import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, isLoggedIn = false, onLogout }) => {
  const handleProfileClick = () => {
    toast({
      title: "Profile",
      description: "Profile management coming soon!",
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-isn-light pattern-bg">
      <header className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/">
            <Logo />
          </Link>
          
          <nav>
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleProfileClick}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onLogout}
                  className="flex items-center gap-2 text-isn-primary hover:text-isn-primary/80"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Removed "Create Family Tree" button for not logged in users */}
              </div>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-white shadow-inner py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Logo size="sm" />
            <p className="text-gray-600 text-sm mt-4 md:mt-0">
              Connecting Indian Families &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
