
import { User, InviteFormValues } from '@/types';
import { sendInvitationEmail } from '../email';
import { generateId, getCurrentDateTime } from '../utils';
import { createUser } from './users';
import { createRelationship } from './relationships';
import { getUserByEmailOrId } from './users';
import { hashPassword, generateTempPassword } from './auth';

// Create invited users
export const createInvitedUsers = async (
  inviter: User,
  members: InviteFormValues[]
): Promise<boolean> => {
  try {
    for (const member of members) {
      // Check if user with this email already exists
      const existingUser = await getUserByEmailOrId(member.email);
      if (existingUser) {
        console.log(`User with email ${member.email} already exists. Skipping.`);
        continue;
      }
      
      const userId = generateId('U');
      const tempPassword = generateTempPassword();
      const hashedPassword = hashPassword(tempPassword);
      const currentDateTime = getCurrentDateTime();
      
      // Create invited user
      const newUser = await createUser({
        userId,
        name: `Guest (${member.relationship})`,
        email: member.email,
        password: hashedPassword,
        status: 'invited',
        familyTreeId: inviter.familyTreeId,
        createdBy: inviter.userId,
        invitedBy: inviter.userId,
        createdAt: currentDateTime
      });
      
      // Create relationship
      await createRelationship({
        from: inviter.email,
        to: member.email,
        type: member.relationship,
        fromUserId: inviter.userId
      });
      
      // Send invitation email - ensure this happens correctly
      const emailSent = await sendInvitationEmail(
        member.email,
        inviter.familyTreeId,
        tempPassword,
        inviter.name,
        member.relationship
      );
      
      if (!emailSent) {
        console.error(`Failed to send email to ${member.email}`);
      } else {
        console.log(`Successfully sent invitation email to ${member.email}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error creating invited users:", error);
    return false;
  }
};
