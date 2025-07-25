
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "@/components/Dashboard";
import { User } from "@/types";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { toast } from "@/hooks/use-toast";

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Try to get user data from location state first
    const userData = location.state?.user;
    
    if (userData) {
      console.log("Dashboard: User data found in location state", userData.userId);
      setUser(userData);
      setIsLoading(false);
    } else {
      // If no user data in location state, try to get from localStorage
      console.log("Dashboard: No user data in location state, checking localStorage");
      const storedUserId = localStorage.getItem('userId');
      
      if (storedUserId) {
        console.log("Dashboard: Found stored user ID in localStorage:", storedUserId);
        
        // Try to get from localStorage first
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          try {
            const parsedUserData = JSON.parse(storedUserData);
            console.log("Dashboard: Successfully loaded user data from localStorage", parsedUserData.userId);
            setUser(parsedUserData as User);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error("Dashboard: Failed to parse stored user data", e);
          }
        }
        
        // If localStorage userData failed, fetch from database
        console.log("Dashboard: Fetching user data from database");
        getUserByEmailOrId(storedUserId)
          .then(fetchedUser => {
            if (fetchedUser) {
              console.log("Dashboard: Successfully fetched user data from database", fetchedUser.userId);
              setUser(fetchedUser);
            } else {
              console.error("Dashboard: User not found in database");
              toast({
                title: "Session Expired",
                description: "Please login again.",
                variant: "destructive",
              });
              navigate('/auth');
            }
          })
          .catch(error => {
            console.error("Dashboard: Error fetching user data:", error);
            toast({
              title: "Connection Error",
              description: "Could not connect to the database. Please try again later.",
              variant: "destructive",
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        // If no stored user ID, redirect to login
        console.log("Dashboard: No stored user ID found, redirecting to login");
        toast({
          title: "Authentication Required",
          description: "Please login to access the dashboard.",
        });
        navigate('/auth');
        setIsLoading(false);
      }
    }
  }, [navigate, location.state]);
  
  const handleLogout = () => {
    // Clear stored user data
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-500/30 rounded-full mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>User not found. Please <button 
          className="text-blue-500 hover:underline" 
          onClick={() => navigate('/auth')}
        >
          login
        </button>.</p>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar onLogout={handleLogout} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-white px-4 shadow-sm z-10">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-xl font-bold text-indigo-800">Family Tree Platform</h1>
          </header>
          <main className="flex-1 p-0 md:p-6">
            <Dashboard user={user} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
