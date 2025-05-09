
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
    console.log(`Starting to process ${members.length} invitations from ${inviter.email}`);
    
    for (const member of members) {
      console.log(`Processing invitation for ${member.email} as ${member.relationship}`);
      
      // Check if user with this email already exists
      const existingUser = await getUserByEmailOrId(member.email);
      if (existingUser) {
        console.log(`User with email ${member.email} already exists. Skipping user creation.`);
        
        // If user exists, still create relationship if needed
        try {
          await createRelationship({
            from: inviter.email,
            to: member.email,
            type: member.relationship,
            fromUserId: inviter.userId
          });
          console.log(`Created relationship between ${inviter.email} and ${member.email}`);
        } catch (relationshipError) {
          console.error(`Error creating relationship for existing user: ${relationshipError}`);
        }
        continue;
      }
      
      const userId = generateId('U');
      const tempPassword = generateTempPassword();
      const hashedPassword = hashPassword(tempPassword);
      const currentDateTime = getCurrentDateTime();
      
      console.log(`Generated temp password for ${member.email}: ${tempPassword}`);
      
      // Create invited user
      try {
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
        
        console.log(`Successfully created user: ${newUser.userId} for ${member.email}`);
        
        // Create relationship
        await createRelationship({
          from: inviter.email,
          to: member.email,
          type: member.relationship,
          fromUserId: inviter.userId
        });
        
        console.log(`Created relationship between ${inviter.email} and ${member.email}`);
        
        // Send invitation email - with explicit await to ensure it completes
        console.log(`Attempting to send email to ${member.email}`);
        try {
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
        } catch (emailError) {
          console.error(`Error sending email to ${member.email}: ${emailError}`);
        }
      } catch (userError) {
        console.error(`Error creating user ${member.email}: ${userError}`);
      }
    }
    
    console.log('Completed processing all invitations');
    return true;
  } catch (error) {
    console.error("Error creating invited users:", error);
    return false;
  }
};
