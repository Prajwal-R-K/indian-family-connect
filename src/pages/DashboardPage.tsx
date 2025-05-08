
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import { User } from "@/types";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  
  // Mock user data (in a real app, you'd get this from your auth system)
  useEffect(() => {
    // Simulate loading user data
    const mockUser: User = {
      userId: "U123",
      name: "Raj Kumar",
      email: "raj@example.com",
      status: "active",
      familyTreeId: "FAM001",
    };
    
    setUser(mockUser);
  }, []);
  
  const handleLogout = () => {
    // In a real app, you'd clear the auth session
    navigate("/");
  };
  
  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p>Loading...</p>
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
