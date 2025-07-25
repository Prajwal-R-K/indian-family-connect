
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FamilyTreeBuilder from '@/components/FamilyTreeBuilder';
import { User } from '@/types';

const FamilyTreePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user data is passed from registration
    if (location.state?.user) {
      setUser(location.state.user);
    } else {
      // Check if user is logged in from localStorage
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        setUser(JSON.parse(currentUser));
      } else {
        // No user found, redirect to auth
        navigate('/auth');
      }
    }
  }, [location.state, navigate]);

  const handleComplete = (familyData: any) => {
    // This will be handled by the FamilyTreeBuilder component
    console.log('Family tree completed:', familyData);
  };

  const handleBack = () => {
    // If it's a new registration, go back to auth
    if (location.state?.isNewRegistration) {
      navigate('/auth');
    } else {
      // If it's an existing user, go to dashboard
      navigate('/dashboard');
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <FamilyTreeBuilder
      user={user}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
};

export default FamilyTreePage;
