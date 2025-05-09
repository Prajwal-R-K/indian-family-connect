
import { getCurrentDateTime } from './utils';

// Email service configuration
// In a production app, you would use a real email service like SendGrid, Mailgun, etc.
// For now, we'll simulate email sending with more detailed logging and tracking

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

// Track sent emails for demo purposes with more detailed tracking
const sentEmails: Record<string, EmailOptions[]> = {};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    console.log('📧 SENDING EMAIL START =====================');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.body}`);
    console.log('-------------------------------------------');
    
    // In a real app, you would use an email service API here
    // For demo, we'll just track the email in our mock storage
    if (!sentEmails[options.to]) {
      sentEmails[options.to] = [];
    }
    
    const emailWithTimestamp = {
      ...options,
      body: options.body + `\n\nSent at: ${getCurrentDateTime()}`
    };
    
    sentEmails[options.to].push(emailWithTimestamp);
    
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log(`Email record created for ${options.to}`);
    console.log('📧 SENDING EMAIL END =======================');
    
    // For debugging: Show all sent emails
    console.log('Current email log:', Object.keys(sentEmails).map(email => ({
      email,
      count: sentEmails[email].length
    })));
    
    // Simulate email transmission success
    return true;
  } catch (error) {
    console.error('❌ EMAIL SENDING FAILED:', error);
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
