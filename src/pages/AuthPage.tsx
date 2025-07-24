
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import FamilyTreeBuilder from '@/components/FamilyTreeBuilder';
import Dashboard from '@/components/Dashboard';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, Users, Heart } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'auth' | 'builder' | 'dashboard'>('auth');
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('familyTreeUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setCurrentView('dashboard');
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('familyTreeUser');
      }
    }
  }, []);

  const handleAuthSuccess = (userData: User) => {
    console.log('Auth success with user:', userData);
    setUser(userData);
    localStorage.setItem('familyTreeUser', JSON.stringify(userData));
    
    // If user is new (invited status), go to builder; otherwise go to dashboard
    if (userData.status === 'invited') {
      setCurrentView('builder');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleTreeBuilderComplete = (familyData: any) => {
    console.log('Family tree completed:', familyData);
    if (user) {
      const updatedUser = { ...user, status: 'active' as const };
      setUser(updatedUser);
      localStorage.setItem('familyTreeUser', JSON.stringify(updatedUser));
    }
    setCurrentView('dashboard');
  };

  const handleBackToAuth = () => {
    setCurrentView('auth');
    setUser(null);
    localStorage.removeItem('familyTreeUser');
  };

  const handleNavigateToBuilder = () => {
    setCurrentView('builder');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (currentView === 'builder' && user) {
    return (
      <FamilyTreeBuilder
        user={user}
        onComplete={handleTreeBuilderComplete}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'dashboard' && user) {
    return (
      <Dashboard 
        user={user} 
        onNavigateToBuilder={handleNavigateToBuilder}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-sm border border-slate-200">
            <TreePine className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FamilyTree
            </span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Build Your
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Family Legacy
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
              Connect with your family, build beautiful family trees, and preserve your heritage for future generations.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <Card className="bg-white/70 backdrop-blur border-slate-200">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                  <TreePine className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <h3 className="font-semibold text-gray-900 mb-1">Visual Trees</h3>
                <p className="text-sm text-gray-600">Create beautiful, interactive family trees</p>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur border-slate-200">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <h3 className="font-semibold text-gray-900 mb-1">Connect Family</h3>
                <p className="text-sm text-gray-600">Invite and connect with family members</p>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur border-slate-200">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mx-auto">
                  <Heart className="w-5 h-5 text-pink-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <h3 className="font-semibold text-gray-900 mb-1">Preserve Legacy</h3>
                <p className="text-sm text-gray-600">Keep family stories and memories alive</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md">
            <AuthForm onSuccess={handleAuthSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
