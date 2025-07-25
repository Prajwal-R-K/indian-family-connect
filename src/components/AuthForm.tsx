
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserByEmailOrId, verifyPassword } from "@/lib/neo4j";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "./ui/password-input";
import FamilyTreeBuilder from "./FamilyTreeBuilder";

const AuthForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [showFamilyTreeBuilder, setShowFamilyTreeBuilder] = useState<boolean>(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [input, setInput] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput({
      ...input,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.email || !input.password) {
      toast({
        title: "Missing fields",
        description: "Please enter all the required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(input.email)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const existingUser = await getUserByEmailOrId(input.email);

      if (!existingUser) {
        toast({
          title: "Invalid credentials",
          description: "Incorrect email or password.",
          variant: "destructive",
        });
        return;
      }

      const isPasswordValid = await verifyPassword(
        input.password,
        existingUser.password
      );

      if (!isPasswordValid) {
        toast({
          title: "Invalid credentials",
          description: "Incorrect email or password.",
          variant: "destructive",
        });
        return;
      }

      if (existingUser.status === "invited") {
        toast({
          title: "Account not activated",
          description: "Please activate your account to continue.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("userId", existingUser.userId);
      localStorage.setItem("userData", JSON.stringify(existingUser));
      toast({
        title: "Login successful",
        description: "You have successfully logged in.",
      });
      navigate("/dashboard", { state: { user: existingUser } });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "Failed to log in. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.name || !input.email || !input.password || !input.confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please enter all the required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(input.email)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (input.password !== input.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (input.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Phase 1: Just validate and store in temp state, no DB operations yet
      const existingUser = await getUserByEmailOrId(input.email);
      if (existingUser) {
        toast({
          title: "Email already exists",
          description: "Please use a different email address.",
          variant: "destructive",
        });
        return;
      }

      // Store registration data and move to family tree builder
      const tempUserData = {
        name: input.name,
        email: input.email,
        password: input.password,
      };

      setRegistrationData(tempUserData);
      setShowFamilyTreeBuilder(true);

      toast({
        title: "Registration data validated",
        description: "Now let's build your family tree!",
      });
    } catch (error) {
      console.error("Registration validation error:", error);
      toast({
        title: "Registration failed",
        description: "Failed to validate registration. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFamilyTreeComplete = (familyData: any) => {
    console.log('Family tree created:', familyData);
    toast({
      title: "Family Tree Created!",
      description: "Your family tree has been saved successfully.",
    });
    
    // Navigate to dashboard
    navigate('/dashboard', { 
      state: { 
        user: familyData.rootUser 
      } 
    });
  };

  const handleBackToAuth = () => {
    setShowFamilyTreeBuilder(false);
    setRegistrationData(null);
  };

  return (
    <>
      {showFamilyTreeBuilder ? (
        <FamilyTreeBuilder 
          onComplete={handleFamilyTreeComplete}
          onBack={handleBackToAuth}
          registrationData={registrationData}
        />
      ) : (
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>
              {isRegister ? "Create an account" : "Login to your account"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Enter your credentials below to create your account"
                : "Enter your email and password below to login"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRegister ? null : (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  required
                  name="name"
                  value={input.name}
                  onChange={handleChange}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="Enter your email"
                required
                type="email"
                name="email"
                value={input.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                required
                name="password"
                value={input.password}
                onChange={handleChange}
              />
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  required
                  name="confirmPassword"
                  value={input.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            )}
            <Button
              className="w-full"
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {isRegister ? "Build Your Family Tree" : "Login"}
                  {!isRegister ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-right ml-2"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  ) : null}
                </>
              )}
            </Button>
            <Separator />
            <Button
              variant="link"
              className="w-full"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AuthForm;
