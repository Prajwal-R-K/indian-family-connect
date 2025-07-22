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

const verifyActivationSchema = z.object({
  email: z.string().email("Invalid email format"),
  familyTreeId: z.string().min(1, "Family Tree ID is required"),
  tempPassword: z.string().min(1, "Temporary password is required"),
});

const completeActivationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(4, "User ID must be at least 4 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormMode = "login" | "register" | "activate";
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type VerifyActivationValues = z.infer<typeof verifyActivationSchema>;
type CompleteActivationValues = z.infer<typeof completeActivationSchema>;

interface AuthFormProps {
  onSuccess: (user: User) => void;
  defaultMode?: FormMode;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, defaultMode = "login" }) => {
  const [mode, setMode] = useState<FormMode>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showFamilyTreeBuilder, setShowFamilyTreeBuilder] = useState(false);
  const [familyTreeData, setFamilyTreeData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [activationStep, setActivationStep] = useState<1 | 2>(1);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);

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

  const verifyActivationForm = useForm<VerifyActivationValues>({
    resolver: zodResolver(verifyActivationSchema),
    defaultValues: {
      email: "",
      familyTreeId: "",
      tempPassword: "",
    },
  });

  const completeActivationForm = useForm<CompleteActivationValues>({
    resolver: zodResolver(completeActivationSchema),
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

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    if (!familyTreeData && !showFamilyTreeBuilder) {
      setShowFamilyTreeBuilder(true);
      toast({
        title: "Create your family tree",
        description: "Please create your family tree to continue",
        variant: "default",
      });
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
      
      console.log(`Family tree created with ID: ${familyTreeId}`);
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
      
      console.log(`User created: ${newUser.userId} (${newUser.email})`);
      
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

  const onVerifyActivation = async (values: VerifyActivationValues) => {
    setIsLoading(true);
    try {
      console.log("Starting account verification process...");
      console.log(`Checking for invited user: ${values.email} in family tree: ${values.familyTreeId}`);
      const user = await getUserByEmailAndFamilyTree(values.email, values.familyTreeId);
      if (!user) {
        console.error("User not found in this family tree");
        toast({
          title: "Verification failed",
          description: "User not found in this family tree. Please check your email and Family Tree ID.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      console.log(`Found user: ${user.userId} with status: ${user.status}`);
      if (user.status !== 'invited') {
        console.error(`User found but status is ${user.status}, not 'invited'`);
        toast({
          title: "Verification failed",
          description: user.status === 'active' ? 
            "This account is already active. Please login instead." : 
            "This account cannot be activated. Please contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      if (!user.password || !verifyPassword(values.tempPassword, user.password)) {
        console.error("Invalid temporary password");
        toast({
          title: "Verification failed",
          description: "Invalid temporary password. Please check your email for the correct password.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      setVerifiedUser(user);
      completeActivationForm.reset({
        name: "",
        userId: "",
        newPassword: "",
        confirmPassword: ""
      });
      console.log("Reset completeActivationForm before moving to step 2");
      setActivationStep(2);
      toast({
        title: "Verification successful",
        description: "Please complete your profile to activate your account.",
      });
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCompleteActivation = async (values: CompleteActivationValues) => {
    if (!verifiedUser) {
      console.error("No verified user found for activation", { values });
      toast({
        title: "Activation failed",
        description: "Verification information is missing. Please start again.",
        variant: "destructive",
      });
      setActivationStep(1);
      completeActivationForm.reset();
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Completing account activation process...");
      const updateData: Partial<User> = {
        name: values.name,
        status: "active",
        password: hashPassword(values.newPassword)
      };
      console.log(`Updating user ${verifiedUser.userId} with data:`, {
        ...updateData,
        password: "[REDACTED]"
      });
      const updatedUser = await updateUser(verifiedUser.userId, updateData);
      if (values.userId && values.userId !== verifiedUser.userId) {
        const existingUser = await getUserByEmailOrId(values.userId);
        if (existingUser) {
          console.error("UserID already exists");
          toast({
            title: "Activation partial success",
            description: "Your account is active but we couldn't change your User ID as it's already taken.",
            variant: "default",
          });
          setIsLoading(false);
          onSuccess(updatedUser);
          return;
        }
        console.log(`Now updating userId from ${updatedUser.userId} to ${values.userId}`);
        try {
          const userWithNewId = await updateUser(updatedUser.userId, {
            userId: values.userId
          });
          console.log("Account successfully activated with new userId:", userWithNewId.userId);
          toast({
            title: "Account activated",
            description: `Welcome to ISN, ${values.name}! Your account is now active.`,
          });
          onSuccess(userWithNewId);
        } catch (idUpdateError) {
          console.error("Failed to update userId:", idUpdateError);
          toast({
            title: "Account activated",
            description: `Welcome to ISN, ${values.name}! Your account is active but we couldn't update your User ID.`,
            variant: "default",
          });
          onSuccess(updatedUser);
        }
      } else {
        console.log("Account successfully activated:", updatedUser.userId);
        toast({
          title: "Account activated",
          description: `Welcome to ISN, ${values.name}! Your account is now active.`,
        });
        onSuccess(updatedUser);
      }
    } catch (error) {
      console.error("Activation error:", error);
      toast({
        title: "Activation failed",
        description: "An unexpected error occurred. Please check your details and try again.",
        variant: "destructive",
      });
    } finally {
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
    if (value === "activate") {
      setActivationStep(1);
      setVerifiedUser(null);
      verifyActivationForm.reset();
      completeActivationForm.reset();
      console.log("Reset both activation forms on tab change to 'activate'");
    } else if (value === "register") {
      setShowFamilyTreeBuilder(false);
      setFamilyTreeData(null);
    }
  };

  useEffect(() => {
    if (activationStep === 2) {
      const currentValues = completeActivationForm.getValues();
      console.log("Current step 2 form values before reset:", currentValues);
      completeActivationForm.reset({
        name: "",
        userId: "",
        newPassword: "",
        confirmPassword: ""
      });
      console.log("Reset completeActivationForm on step 2 entry");
      const resetValues = completeActivationForm.getValues();
      console.log("Step 2 form values after reset:", resetValues);
    }
  }, [activationStep, completeActivationForm]);

  return (
    <Card className="w-full max-w-4xl mx-auto border-isn-light shadow-xl">
      <CardHeader className="bg-gradient-to-r from-isn-primary to-isn-secondary text-white rounded-t-lg">
        <CardTitle className="text-center text-2xl">
          {mode === "login" ? "Login to ISN" : 
           mode === "register" ? "Create Your Family Tree" : 
           activationStep === 1 ? "Verify your invitation" : "Complete your account setup"}
        </CardTitle>
        <CardDescription className="text-white/80 text-center">
          {mode === "login" ? "Connect with your family network" : 
           mode === "register" ? "Start building your family tree" : 
           activationStep === 1 ? "Verify your invitation" : "Complete your account setup"}
        </CardDescription>
      </CardHeader>
      
      <Tabs value={mode} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="activate">Activate</TabsTrigger>
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
        
        <TabsContent value="activate">
          <CardContent className="pt-6">
            {activationStep === 1 ? (
              <Form {...verifyActivationForm} key="verify-activation-form">
                <form onSubmit={verifyActivationForm.handleSubmit(onVerifyActivation)} className="space-y-4">
                  <FormField
                    control={verifyActivationForm.control}
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
                    control={verifyActivationForm.control}
                    name="familyTreeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Tree ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Family Tree ID" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={verifyActivationForm.control}
                    name="tempPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporary Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter temporary password" {...field} className="isn-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-isn-primary hover:bg-isn-primary/90" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...completeActivationForm} key="complete-activation-form">
                <form onSubmit={completeActivationForm.handleSubmit(onCompleteActivation)} className="space-y-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded">
                    <p className="text-sm text-green-700">
                      <span className="font-bold">Verification successful!</span> Complete your profile below to activate your account.
                    </p>
                  </div>
                  <FormField
                    control={completeActivationForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            key="name-input" 
                            placeholder="Enter your full name" 
                            className="isn-input" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={completeActivationForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Choose User ID</FormLabel>
                        <FormControl>
                          <Input 
                            key="userid-input" 
                            placeholder="Create a user ID" 
                            className="isn-input"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={completeActivationForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input 
                            key="password-input"
                            type="password" 
                            placeholder="Create a new password" 
                            className="isn-input"
                            {...field}
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={completeActivationForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            key="confirm-password-input"
                            type="password" 
                            placeholder="Confirm your password" 
                            className="isn-input"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setActivationStep(1);
                        completeActivationForm.reset();
                      }} 
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-isn-primary hover:bg-isn-primary/90" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Activating..." : "Activate Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AuthForm;
