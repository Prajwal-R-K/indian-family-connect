
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
  
  // HTML formatted email for better appearance
  const body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4a5568; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #e2e8f0; }
    .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #718096; }
    .highlight { background-color: #f7fafc; padding: 10px; border-left: 4px solid #4a5568; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Indian Social Network</h2>
    </div>
    <div class="content">
      <p>Dear Family Member,</p>
      <p>You've been added to a family tree by <strong>${inviter}</strong> as their <strong>${relationship}</strong>.</p>
      
      <div class="highlight">
        <p>🔹 <strong>Family Tree ID:</strong> ${familyTreeId}</p>
        <p>🔹 <strong>Temporary Password:</strong> ${password}</p>
      </div>
      
      <p>Please activate your account by visiting our website and using these credentials.</p>
      <p>Go to: <a href="https://indian-social-network.com/auth">https://indian-social-network.com/auth</a> and click on the "Activate" tab.</p>
      
      <p>During activation, you'll be asked to confirm your relationship from your perspective.</p>
      
      <p>Warm regards,<br>
      Indian Social Network Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message, please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
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
