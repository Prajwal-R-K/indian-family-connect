
export interface User {
  userId: string;
  name: string;
  email: string;
  password?: string;
  status: 'active' | 'invited';
  familyTreeId: string;
  createdBy?: string;
  createdAt?: string;
  invitedBy?: string;
  phone?: string;
  profession?: string;
  location?: string;
  profilePicture?: string;
  address?: string;
  dateOfBirth?: string;
  bio?: string;
  occupation?: string;
  myRelationship?: string; // Added missing property for user's relationship in the family
  gender?: string; // Added gender field
}

export interface FamilyTree {
  familyTreeId: string;
  createdBy: string;
  createdAt: string;
}

export interface FamilyMember {
  email: string;
  relationship: string;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
  fromUserId: string;
}

export interface AuthFormValues {
  name?: string;
  email: string;
  userId?: string;
  password: string;
  confirmPassword?: string;
  familyTreeId?: string;
}

export interface InviteFormValues {
  email: string;
  relationship: string;
}
