
import { getCurrentDateTime } from './utils';
import { 
  sendWithSendGrid, 
  getEmailStatus, 
  getEmailsForAddress, 
  retryEmail, 
  emailTracker 
} from './email/sendgrid';

// Email service configuration
interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

// Track sent emails for demo purposes with more detailed tracking
const sentEmails: Record<string, EmailOptions[]> = {};

// Send email using SendGrid
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    console.log('📧 SENDING EMAIL START =====================');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.body}`);
    console.log('-------------------------------------------');
    
    // Use SendGrid to send the actual email
    const result = await sendWithSendGrid(
      options.to, 
      options.subject, 
      options.body
    );
    
    // Store in our local tracking for backward compatibility
    if (!sentEmails[options.to]) {
      sentEmails[options.to] = [];
    }
    
    const emailWithTimestamp = {
      ...options,
      body: options.body + `\n\nSent at: ${getCurrentDateTime()}`
    };
    
    sentEmails[options.to].push(emailWithTimestamp);
    
    if (result.success) {
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log(`Email record created for ${options.to} with ID: ${result.emailId}`);
      console.log('📧 SENDING EMAIL END =======================');
      return true;
    } else {
      console.error('❌ EMAIL SENDING FAILED:', result.error);
      console.log('📧 SENDING EMAIL END =======================');
      return false;
    }
  } catch (error) {
    console.error('❌ EMAIL SENDING FAILED (EXCEPTION):', error);
    return false;
  }
};

export const sendInvitationEmail = async (
  email: string, 
  familyTreeId: string, 
  password: string, 
  inviter: string,
  relationship: string
): Promise<boolean> => {
  console.log(`🔔 Preparing invitation email for ${email} from ${inviter}`);
  
  const subject = `You've been invited to join the Indian Social Network Family Tree`;
  
  const body = `
Dear Family Member,

You've been added to a family tree by ${inviter} as their ${relationship}.

🔹 Family Tree ID: ${familyTreeId}
🔹 Temporary Password: ${password}

Please activate your account by visiting our website and using these credentials.
Go to: https://indian-social-network.com/auth and click on "Activate" tab.

Warm regards,
Indian Social Network Team
  `;
  
  try {
    console.log(`Starting email sending process for ${email}...`);
    // Make sure we're actually sending the email and awaiting the result
    const result = await sendEmail({
      to: email,
      subject,
      body
    });
    
    console.log(`Invitation email to ${email} status: ${result ? 'Sent ✅' : 'Failed ❌'}`);
    return result;
  } catch (err) {
    console.error(`Error in sendInvitationEmail for ${email}:`, err);
    return false;
  }
};

// Legacy functions for backward compatibility
export const getEmailLogs = (email?: string): Record<string, EmailOptions[]> | EmailOptions[] => {
  if (email && sentEmails[email]) {
    return sentEmails[email];
  }
  return sentEmails;
};

// Function to check if an email has been sent (for debugging)
export const hasEmailBeenSent = (email: string): boolean => {
  return !!sentEmails[email] && sentEmails[email].length > 0;
};

// Function to get the latest email sent (for testing)
export const getLatestEmail = (email: string): EmailOptions | null => {
  if (sentEmails[email] && sentEmails[email].length > 0) {
    return sentEmails[email][sentEmails[email].length - 1];
  }
  return null;
};

// New email tracking functions
export const getEmailTrackingInfo = (email: string) => {
  return getEmailsForAddress(email);
};

export const retryFailedEmail = async (emailId: string) => {
  return await retryEmail(emailId);
};

export const getAllTrackedEmails = () => {
  return emailTracker;
};
