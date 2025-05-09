
import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import AuthForm from "@/components/AuthForm";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types";

const AuthPage = () => {
  const navigate = useNavigate();
  
  const handleAuthSuccess = (user: User) => {
    // Store user ID in localStorage for session management
    localStorage.setItem('userId', user.userId);
    
    // Store full user data for easier access (don't include password)
    const { password, ...safeUserData } = user;
    localStorage.setItem('userData', JSON.stringify(safeUserData));
    
    // Show a success message
    toast({
      title: "Authentication Successful",
      description: `Welcome to Indian Social Network, ${user.name}!`,
    });
    
    console.log(`User authenticated successfully: ${user.userId} (${user.email})`);
    
    // Redirect to dashboard with user data
    navigate("/dashboard", { state: { user } });
  };
  
  return (
    <Layout>
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <AuthForm onSuccess={handleAuthSuccess} />
        </div>
      </div>
    </Layout>
  );
};

export default AuthPage;
