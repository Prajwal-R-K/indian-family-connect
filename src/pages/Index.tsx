
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Link } from "react-router-dom";

const Index = () => {
  const features = [
    {
      title: "Create Family Trees",
      description: "Build and visualize your family connections using our interactive family tree builder.",
      icon: "👨‍👩‍👧‍👦",
    },
    {
      title: "Connect Families",
      description: "Link different family trees through marriages and relationships.",
      icon: "🔗",
    },
    {
      title: "Invite Family Members",
      description: "Easily invite relatives to join your family tree via email.",
      icon: "📧",
    },
    {
      title: "Secure & Private",
      description: "Your family data is secure and only visible to your connected family members.",
      icon: "🔒",
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-isn-primary/90 to-isn-secondary/90 z-0"></div>
        <div className="pattern-bg absolute inset-0 opacity-10 z-0"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl text-white">
            <h1 className="text-5xl font-bold mb-6">
              Connect Your Indian Family Network
            </h1>
            <p className="text-xl mb-8">
              Create and visualize your family tree, invite relatives, and discover connections across family trees.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-white text-isn-primary hover:bg-white/90">
                  Create Your Family Tree
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-isn-dark mb-4">Why Choose ISN?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Indian Social Network helps you create, connect, and explore your family connections 
              in a way that's designed specifically for Indian family structures.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border isn-card hover:shadow-xl transition-all">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-bold text-lg mb-2 text-isn-dark">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-isn-dark mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Getting started with ISN is simple and intuitive.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-isn-primary rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-bold text-lg mb-2">Register & Create</h3>
              <p className="text-gray-600">
                Sign up and create your family tree by adding at least one family member.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-isn-primary rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-bold text-lg mb-2">Invite Family</h3>
              <p className="text-gray-600">
                Invite your family members by email. They'll receive details to join your tree.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-isn-primary rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-bold text-lg mb-2">Connect & Grow</h3>
              <p className="text-gray-600">
                As members join, your family tree grows and connections expand.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link to="/auth">
              <Button size="lg" className="bg-isn-primary hover:bg-isn-primary/90">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-isn-primary to-isn-secondary text-white">
        <div className="container mx-auto px-4 text-center">
          <Logo className="mx-auto mb-6 text-white" />
          <h2 className="text-3xl font-bold mb-4">Ready to Connect Your Family?</h2>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Join thousands of Indian families who are discovering and maintaining their family connections with ISN.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-white text-isn-primary hover:bg-white/90">
              Create Your Family Tree
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
