import React, { useState } from "react";
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
import InviteMembersForm from "./InviteMembersForm";
import { 
  checkEmailExists, 
  createFamilyTree, 
  createUser, 
  getUserByEmailOrId, 
  hashPassword, 
  updateUser, 
  verifyPassword,
  createInvitedUsers,
  getUserByEmailAndFamilyTree,
  getLatestEmail
} from "@/lib/neo4j";
import { generateId, getCurrentDateTime, isValidPassword } from "@/lib/utils";
import { User, InviteFormValues } from "@/types";
import { Badge } from "@/components/ui/badge";

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

const activateSchema = z.object({
  email: z.string().email("Invalid email format"),
  familyTreeId: z.string().min(1, "Family Tree ID is required"),
  tempPassword: z.string().min(1, "Temporary password is required"),
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(4, "User ID must be at least 4 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  myRelationship: z.string().min(1, "Please confirm your relationship"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormMode = "login" | "register" | "activate";
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ActivateFormValues = z.infer<typeof activateSchema>;

interface AuthFormProps {
  onSuccess: (user: User) => void;
  defaultMode?: FormMode;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, defaultMode = "login" }) => {
  const [mode, setMode] = useState<FormMode>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<InviteFormValues[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // Register form
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

  // Activate form
  const activateForm = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: {
      email: "",
      familyTreeId: "",
      tempPassword: "",
      name: "",
      userId: "",
      newPassword: "",
      confirmPassword: "",
      myRelationship: "",
    },
  });

  // Handle login submit
  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      // Check if user exists
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
      
      // Verify password
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

  // Handle register submit
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    if (familyMembers.length === 0 && !showInviteForm) {
      setShowInviteForm(true);
      toast({
        title: "Add family members",
        description: "Please add at least one family member to create your family tree",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if email already exists
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
      
      // Create family tree
      const familyTreeId = generateId("FAM");
      const currentDateTime = getCurrentDateTime();
      
      await createFamilyTree({
        familyTreeId,
        createdBy: values.userId,
        createdAt: currentDateTime
      });
      
      console.log(`Family tree created with ID: ${familyTreeId}`);
      
      // Create user
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
      
      // Store the newly created user for family member processing
      setCurrentUser(newUser);
      
      if (familyMembers.length > 0) {
        console.log(`Processing ${familyMembers.length} family member invitations`);
        // Process family member invitations - explicitly wait for this to complete
        try {
          const result = await createInvitedUsers(newUser, familyMembers);
          
          if (result) {
            toast({
              title: "Invitations sent",
              description: `${familyMembers.length} family members have been invited to join your tree.`,
              variant: "default",
            });
            console.log("All invitations processed successfully");
          } else {
            toast({
              title: "Warning",
              description: "Some invitations might not have been sent successfully",
              variant: "destructive",
            });
            console.log("Some invitations might not have been sent successfully");
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

  // Handle activate submit
  const onActivateSubmit = async (values: ActivateFormValues) => {
    setIsLoading(true);
    
    try {
      console.log("Starting account activation process...");
      console.log(`Checking for invited user: ${values.email} in family tree: ${values.familyTreeId}`);
      
      // Get invited user - this checks if email exists in the specified family tree
      const user = await getUserByEmailAndFamilyTree(values.email, values.familyTreeId);
      
      if (!user) {
        console.error("User not found in this family tree");
        toast({
          title: "Activation failed",
          description: "User not found in this family tree. Please check your email and Family Tree ID.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log(`Found user: ${user.userId} with status: ${user.status}`);
      
      // Check if user is invited
      if (user.status !== 'invited') {
        console.error(`User found but status is ${user.status}, not 'invited'`);
        toast({
          title: "Activation failed",
          description: user.status === 'active' ? 
            "This account is already active. Please login instead." : 
            "This account cannot be activated. Please contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Verify temporary password
      if (!user.password || !verifyPassword(values.tempPassword, user.password)) {
        console.error("Invalid temporary password");
        toast({
          title: "Activation failed",
          description: "Invalid temporary password. Please check your email for the correct password.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log("Temporary password verified, updating user details...");
      
      // Create the update payload with all fields except userId
      const updateData: Partial<User> = {
        name: values.name,
        status: "active",
        password: hashPassword(values.newPassword),
        myRelationship: values.myRelationship // Store user's self-defined relationship
      };
      
      // FIXED: First update everything except userId
      console.log(`Updating user ${user.userId} with data:`, {
        ...updateData,
        password: "[REDACTED]"
      });
      
      // First update basic information
      const updatedUser = await updateUser(user.userId, updateData);
      
      // If user wants a different userId, update it separately
      if (values.userId) {
        // Check if new userId already exists
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
        
        console.log(`Now updating userId from ${user.userId} to ${values.userId}`);
        
        // Update userId separately
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
          // User is still activated but with original ID
          toast({
            title: "Account activated",
            description: `Welcome to ISN, ${values.name}! Your account is active but we couldn't update your User ID.`,
            variant: "default",
          });
          
          onSuccess(updatedUser);
        }
      } else {
        // No userId change needed
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
      setIsLoading(false);
    }
  };

  const handleAddFamilyMember = (member: InviteFormValues) => {
    // Check if email already exists in the list
    const emailExists = familyMembers.some(existing => existing.email === member.email);
    if (emailExists) {
      toast({
        title: "Member already added",
        description: `${member.email} is already in your invite list.`,
        variant: "destructive",
      });
      return;
    }
    
    setFamilyMembers([...familyMembers, member]);
    toast({
      title: "Family member added",
      description: `${member.email} will be invited as your ${member.relationship}`,
    });
  };

  const handleRemoveMember = (email: string) => {
    const updatedMembers = familyMembers.filter(member => member.email !== email);
    setFamilyMembers(updatedMembers);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-isn-light shadow-xl">
      <CardHeader className="bg-gradient-to-r from-isn-primary to-isn-secondary text-white rounded-t-lg">
        <CardTitle className="text-center text-2xl">
          {mode === "login" ? "Login to ISN" : 
           mode === "register" ? "Create Your Family Tree" : 
           "Activate Your Account"}
        </CardTitle>
        <CardDescription className="text-white/80 text-center">
          {mode === "login" ? "Connect with your family network" : 
           mode === "register" ? "Start building your family tree" : 
           "Complete your account setup"}
        </CardDescription>
      </CardHeader>
      
      <Tabs value={mode} onValueChange={(value) => setMode(value as FormMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="activate">Activate</TabsTrigger>
        </TabsList>
        
        {/* Login Form */}
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
        
        {/* Register Form */}
        <TabsContent value="register">
          <CardContent className="pt-6">
            {!showInviteForm ? (
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
                    onClick={() => setShowInviteForm(true)} 
                    className="w-full bg-isn-secondary hover:bg-isn-secondary/90"
                  >
                    Continue to Add Family Members
                  </Button>
                </form>
              </Form>
            ) : (
              <InviteMembersForm 
                onAddMember={handleAddFamilyMember}
                onRemoveMember={handleRemoveMember}
                members={familyMembers}
                onComplete={() => {
                  if (familyMembers.length > 0) {
                    registerForm.handleSubmit(onRegisterSubmit)();
                  } else {
                    toast({
                      title: "Add family members",
                      description: "Please add at least one family member to create your family tree",
                      variant: "destructive",
                    });
                  }
                }}
                onBack={() => setShowInviteForm(false)}
              />
            )}
          </CardContent>
          <CardFooter className="text-sm text-gray-500 pb-4 px-6">
            {familyMembers.length > 0 && !showInviteForm && (
              <div className="w-full">
                <p className="mb-2">Family members to invite: {familyMembers.length}</p>
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
        
        {/* Activate Form */}
        <TabsContent value="activate">
          <CardContent className="pt-6">
            <Form {...activateForm}>
              <form onSubmit={activateForm.handleSubmit(onActivateSubmit)} className="space-y-4">
                <FormField
                  control={activateForm.control}
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
                  control={activateForm.control}
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
                  control={activateForm.control}
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
                
                <div className="border-t border-gray-200 my-4 pt-4">
                  <h3 className="font-medium mb-3">Complete Your Profile</h3>
                </div>
                
                <FormField
                  control={activateForm.control}
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
                  control={activateForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Choose User ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Create a user ID" {...field} className="isn-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={activateForm.control}
                  name="myRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Your Relationship in the Family</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-isn-primary focus:border-isn-primary"
                        >
                          <option value="">Select your relationship</option>
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="son">Son</option>
                          <option value="daughter">Daughter</option>
                          <option value="husband">Husband</option>
                          <option value="wife">Wife</option>
                          <option value="brother">Brother</option>
                          <option value="sister">Sister</option>
                          <option value="grandfather">Grandfather</option>
                          <option value="grandmother">Grandmother</option>
                          <option value="grandson">Grandson</option>
                          <option value="granddaughter">Granddaughter</option>
                          <option value="uncle">Uncle</option>
                          <option value="aunt">Aunt</option>
                          <option value="nephew">Nephew</option>
                          <option value="niece">Niece</option>
                          <option value="cousin">Cousin</option>
                          <option value="other">Other</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={activateForm.control}
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
                  control={activateForm.control}
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
                  {isLoading ? "Activating Account..." : "Activate My Account"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AuthForm;
