
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import AuthForm from "@/components/AuthForm";

const AuthPage = () => {
  const navigate = useNavigate();
  
  const handleAuthSuccess = (userId: string) => {
    // In a real application, you would store the user session
    // For now, we'll just redirect to the dashboard
    navigate("/dashboard");
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
