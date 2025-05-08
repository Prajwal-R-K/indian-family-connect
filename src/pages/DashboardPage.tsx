
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import { User } from "@/types";
import { getUserByEmailOrId } from "@/lib/neo4j";

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Try to get user data from location state first
    const userData = location.state?.user;
    
    if (userData) {
      setUser(userData);
      setIsLoading(false);
    } else {
      // If no user data in location state, try to get from localStorage
      const storedUserId = localStorage.getItem('userId');
      
      if (storedUserId) {
        // Fetch user data from database
        getUserByEmailOrId(storedUserId)
          .then(fetchedUser => {
            if (fetchedUser) {
              setUser(fetchedUser);
            } else {
              // If user not found, redirect to login
              navigate('/auth');
            }
          })
          .catch(error => {
            console.error("Error fetching user data:", error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        // If no stored user ID, redirect to login
        navigate('/auth');
        setIsLoading(false);
      }
    }
  }, [navigate, location.state]);
  
  const handleLogout = () => {
    // Clear stored user data
    localStorage.removeItem('userId');
    navigate("/");
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p>User not found. Please <button 
            className="text-isn-primary hover:underline" 
            onClick={() => navigate('/auth')}
          >
            login
          </button>.</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout isLoggedIn={true} onLogout={handleLogout}>
      <Dashboard user={user} />
    </Layout>
  );
};

export default DashboardPage;
