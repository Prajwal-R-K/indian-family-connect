
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FamilyTreeBuilder from "./FamilyTreeBuilder";
import { 
  checkEmailExists, 
  createFamilyTree, 
  createUser, 
  getUserByEmailOrId, 
  hashPassword, 
  updateUser, 
  verifyPassword,
  createInvitedUsers,
  getUserByEmailAndFamilyTree
} from "@/lib/neo4j";
import { generateId, getCurrentDateTime } from "@/lib/utils";
import { User, InviteFormValues } from "@/types";

// Schemas for form validation
const loginSchema = z.object({
  identifier: z.string().min(1, "Email or User ID is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  userId: z.string().min(4, "User ID must be at least 4 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(4, "User ID must be at least 4 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormMode = "login" | "register";
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

interface AuthFormProps {
  onSuccess: (user: User) => void;
  defaultMode?: FormMode;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, defaultMode = "login" }) => {
  const [mode, setMode] = useState<FormMode>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showFamilyTreeBuilder, setShowFamilyTreeBuilder] = useState(false);
  const [familyTreeData, setFamilyTreeData] = useState<any>(null);
  const [showFirstTimeLogin, setShowFirstTimeLogin] = useState(false);
  const [firstTimeUser, setFirstTimeUser] = useState<User | null>(null);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      userId: "",
      password: "",
      confirmPassword: "",
    },
  });

  const updateProfileForm = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      userId: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const user = await getUserByEmailOrId(values.identifier);
      if (!user || user.status !== 'active') {
        toast({
          title: "Login failed",
          description: "User not found or account is not active",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (!user.password || !verifyPassword(values.password, user.password)) {
        toast({
          title: "Login failed",
          description: "Invalid password",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if this is a first-time login (user still has temp ID or default name)
      if (user.userId.startsWith('temp_') || user.name === 'Invited User') {
        setFirstTimeUser(user);
        setShowFirstTimeLogin(true);
        updateProfileForm.setValue('name', user.name === 'Invited User' ? '' : user.name);
        updateProfileForm.setValue('userId', user.userId.startsWith('temp_') ? '' : user.userId);
        setIsLoading(false);
        return;
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      onSuccess(user);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const onUpdateProfile = async (values: UpdateProfileValues) => {
    if (!firstTimeUser) return;
    
    setIsLoading(true);
    try {
      const updateData: Partial<User> = {
        name: values.name,
        password: hashPassword(values.newPassword)
      };

      const updatedUser = await updateUser(firstTimeUser.userId, updateData);
      
      if (values.userId && values.userId !== firstTimeUser.userId) {
        const existingUser = await getUserByEmailOrId(values.userId);
        if (existingUser) {
          toast({
            title: "Profile updated",
            description: "Your profile is updated but we couldn't change your User ID as it's already taken.",
            variant: "default",
          });
          setIsLoading(false);
          onSuccess(updatedUser);
          return;
        }
        
        try {
          const userWithNewId = await updateUser(updatedUser.userId, {
            userId: values.userId
          });
          toast({
            title: "Profile updated",
            description: `Welcome, ${values.name}! Your profile has been updated.`,
          });
          onSuccess(userWithNewId);
        } catch (idUpdateError) {
          console.error("Failed to update userId:", idUpdateError);
          toast({
            title: "Profile updated",
            description: `Welcome, ${values.name}! Your profile is updated but we couldn't update your User ID.`,
            variant: "default",
          });
          onSuccess(updatedUser);
        }
      } else {
        toast({
          title: "Profile updated",
          description: `Welcome, ${values.name}! Your profile has been updated.`,
        });
        onSuccess(updatedUser);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    if (!familyTreeData && !showFamilyTreeBuilder) {
      setShowFamilyTreeBuilder(true);
      return;
    }
    
    setIsLoading(true);
    try {
      const emailExists = await checkEmailExists(values.email);
      if (emailExists) {
        toast({
          title: "Registration failed",
          description: "Email already registered",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const familyTreeId = generateId("FAM");
      const currentDateTime = getCurrentDateTime();
      await createFamilyTree({
        familyTreeId,
        createdBy: values.userId,
        createdAt: currentDateTime
      });
      
      const hashedPassword = hashPassword(values.password);
      const newUser = await createUser({
        userId: values.userId,
        name: values.name,
        email: values.email,
        password: hashedPassword,
        status: "active",
        familyTreeId,
        createdBy: values.userId,
        createdAt: currentDateTime
      });
      
      // Process family tree data if available
      if (familyTreeData && familyTreeData.members) {
        const familyMembers: InviteFormValues[] = familyTreeData.members
          .filter((member: any) => member.email && member.email !== values.email)
          .map((member: any) => ({
            email: member.email,
            relationship: member.relationship || 'family'
          }));
        
        if (familyMembers.length > 0) {
          try {
            const result = await createInvitedUsers(newUser, familyMembers);
            if (result) {
              toast({
                title: "Invitations sent",
                description: `${familyMembers.length} family members have been invited to join your tree.`,
                variant: "default",
              });
            }
          } catch (inviteError) {
            console.error("Error processing invitations:", inviteError);
            toast({
              title: "Warning",
              description: "There was an issue sending some invitations",
              variant: "destructive",
            });
          }
        }
      }
      
      toast({
        title: "Registration successful",
        description: `Welcome to ISN, ${values.name}! Your family tree has been created.`,
      });
      onSuccess(newUser);
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleFamilyTreeComplete = (treeData: any) => {
    setFamilyTreeData(treeData);
    setShowFamilyTreeBuilder(false);
    toast({
      title: "Family tree created",
      description: "Your family tree has been built. Click 'Create My Family Tree' to complete registration.",
    });
  };

  const handleTabChange = (value: string) => {
    setMode(value as FormMode);
    if (value === "register") {
      setShowFamilyTreeBuilder(false);
      setFamilyTreeData(null);
    }
  };

  // Show first-time login profile update
  if (showFirstTimeLogin && firstTimeUser) {
    return (
      <Card className="w-full max-w-md mx-auto border-isn-light shadow-xl">
        <CardHeader className="bg-gradient-to-r from-isn-primary to-isn-secondary text-white rounded-t-lg">
          <CardTitle className="text-center text-2xl">Complete Your Profile</CardTitle>
          <CardDescription className="text-white/80 text-center">
            Update your profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-4">
            <AlertDescription>
              This appears to be your first login. Please update your profile information and set a new password.
            </AlertDescription>
          </Alert>
          <Form {...updateProfileForm}>
            <form onSubmit={updateProfileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
              <FormField
                control={updateProfileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} className="isn-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateProfileForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Choose a user ID" {...field} className="isn-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateProfileForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a new password" {...field} className="isn-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateProfileForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" {...field} className="isn-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-isn-primary hover:bg-isn-primary/90" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-isn-light shadow-xl">
      <CardHeader className="bg-gradient-to-r from-isn-primary to-isn-secondary text-white rounded-t-lg">
        <CardTitle className="text-center text-2xl">
          {mode === "login" ? "Login to ISN" : "Create Your Family Tree"}
        </CardTitle>
        <CardDescription className="text-white/80 text-center">
          {mode === "login" ? "Connect with your family network" : "Start building your family tree"}
        </CardDescription>
      </CardHeader>
      
      <Tabs value={mode} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <CardContent className="pt-6">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email or User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email or user ID" {...field} className="isn-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} className="isn-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-isn-primary hover:bg-isn-primary/90" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="register">
          <CardContent className="pt-6">
            {!showFamilyTreeBuilder ? (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a user ID" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="button" 
                    onClick={() => setShowFamilyTreeBuilder(true)} 
                    className="w-full bg-isn-primary hover:bg-isn-primary/90"
                  >
                    Create Your Family Tree
                  </Button>
                </form>
              </Form>
            ) : (
              <FamilyTreeBuilder 
                onComplete={handleFamilyTreeComplete}
                onBack={() => setShowFamilyTreeBuilder(false)}
              />
            )}
          </CardContent>
          <CardFooter className="text-sm text-gray-500 pb-4 px-6">
            {familyTreeData && !showFamilyTreeBuilder && (
              <div className="w-full">
                <p className="mb-2">Family tree created with {familyTreeData.members?.length || 0} members</p>
                <Button 
                  type="submit" 
                  onClick={registerForm.handleSubmit(onRegisterSubmit)}
                  className="w-full bg-isn-primary hover:bg-isn-primary/90" 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Family Tree..." : "Create My Family Tree"}
                </Button>
              </div>
            )}
          </CardFooter>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AuthForm;
