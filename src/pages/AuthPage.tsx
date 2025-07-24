
import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import AuthForm from "@/components/AuthForm";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types";

const AuthPage = () => {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
      </div>
    </Layout>
  );
};

export default AuthPage;
