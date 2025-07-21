
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { ArrowLeft } from "lucide-react";

const GroupViewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as User;

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p>Please <button 
            className="text-blue-600 hover:underline" 
            onClick={() => navigate('/auth')}
          >
            login
          </button> to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard', { state: { user } })}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Group View</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Family Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Group view functionality will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GroupViewPage;
