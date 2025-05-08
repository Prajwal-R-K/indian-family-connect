
import { getCurrentDateTime } from './utils';

// Email service configuration
// In a production app, you would use a real email service like SendGrid, Mailgun, etc.
// For now, we'll simulate email sending with logging and tracking

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

// Track sent emails for demo purposes
const sentEmails: Record<string, EmailOptions[]> = {};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    console.log('📧 Sending Email:');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.body}`);
    
    // In a real app, you would use an email service API here
    // For demo, we'll just track the email in our mock storage
    if (!sentEmails[options.to]) {
      sentEmails[options.to] = [];
    }
    
    sentEmails[options.to].push({
      ...options,
      body: options.body + `\n\nSent at: ${getCurrentDateTime()}`
    });
    
    console.log('✅ Email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
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
  const subject = `You've been invited to join the Indian Social Network Family Tree`;
  
  const body = `
Dear Family Member,

You've been added to a family tree by ${inviter} as their ${relationship}.

🔹 Family Tree ID: ${familyTreeId}
🔹 Temporary Password: ${password}

Please activate your account by visiting our website and using these credentials.

Warm regards,
Indian Social Network Team
  `;
  
  return sendEmail({
    to: email,
    subject,
    body
  });
};

export const getEmailLogs = (email?: string): Record<string, EmailOptions[]> | EmailOptions[] => {
  if (email && sentEmails[email]) {
    return sentEmails[email];
  }
  return sentEmails;
};
