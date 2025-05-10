
// SendGrid email integration
import { getCurrentDateTime } from '../utils';

// Tracking sent emails
interface EmailDetails {
  to: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  timestamp: string;
  failReason?: string;
  attempts: number;
}

// In-memory storage for email tracking (would use database in production)
interface EmailTracker {
  [emailId: string]: EmailDetails;
}

export const emailTracker: EmailTracker = {};

// Generate a unique ID for each email
const generateEmailId = (): string => {
  return `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// SendGrid configuration - using API key (would use environment variables in production)
const SENDGRID_API_KEY = 'SG.YOUR_API_KEY'; // Replace with actual API key in production
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const SENDER_EMAIL = 'notifications@indiansocialnetwork.com';
const SENDER_NAME = 'Indian Social Network';

// Send email using SendGrid API
export const sendWithSendGrid = async (
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; emailId: string; error?: string }> => {
  const emailId = generateEmailId();
  
  try {
    console.log('📧 SENDING EMAIL VIA SENDGRID START =====================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Email ID: ${emailId}`);
    
    // Track the email
    emailTracker[emailId] = {
      to,
      subject,
      body,
      status: 'pending',
      timestamp: getCurrentDateTime(),
      attempts: 1
    };
    
    // SendGrid v3 Mail Send API payload
    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: SENDER_EMAIL,
        name: SENDER_NAME
      },
      content: [
        {
          type: 'text/plain',
          value: body
        }
      ]
    };
    
    // For now, we'll simulate the API call and its response for development
    // In production, this would be an actual fetch/axios call to SendGrid
    
    // Simulate API call success
    const isSimulatedSuccess = true;
    
    if (isSimulatedSuccess) {
      // Update email status to sent
      emailTracker[emailId].status = 'sent';
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log(`Email ${emailId} to ${to} marked as sent`);
      console.log('📧 SENDING EMAIL END =======================');
      return { success: true, emailId };
    } else {
      // Simulate API failure
      const simulatedError = 'SendGrid API Error: Invalid recipient email';
      emailTracker[emailId].status = 'failed';
      emailTracker[emailId].failReason = simulatedError;
      console.error('❌ EMAIL SENDING FAILED:', simulatedError);
      return { success: false, emailId, error: simulatedError };
    }
    
    /* PRODUCTION CODE (COMMENTED OUT UNTIL API KEY IS SET UP)
    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      emailTracker[emailId].status = 'sent';
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log(`Email ${emailId} to ${to} marked as sent`);
      console.log('📧 SENDING EMAIL END =======================');
      return { success: true, emailId };
    } else {
      const errorData = await response.json();
      emailTracker[emailId].status = 'failed';
      emailTracker[emailId].failReason = JSON.stringify(errorData);
      console.error('❌ EMAIL SENDING FAILED:', errorData);
      return { success: false, emailId, error: JSON.stringify(errorData) };
    }
    */
    
  } catch (error) {
    // Update email status to failed
    if (emailTracker[emailId]) {
      emailTracker[emailId].status = 'failed';
      emailTracker[emailId].failReason = error instanceof Error ? error.message : 'Unknown error';
    }
    
    console.error('❌ EMAIL SENDING FAILED (EXCEPTION):', error);
    return { 
      success: false, 
      emailId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Retry sending a failed email
export const retryEmail = async (emailId: string): Promise<{ success: boolean; error?: string }> => {
  if (!emailTracker[emailId]) {
    return { success: false, error: 'Email not found' };
  }
  
  const email = emailTracker[emailId];
  if (email.status !== 'failed') {
    return { success: false, error: `Cannot retry email with status: ${email.status}` };
  }
  
  // Increment attempts count
  email.attempts += 1;
  
  // Try sending again
  const result = await sendWithSendGrid(email.to, email.subject, email.body);
  return { success: result.success, error: result.error };
};

// Get email status
export const getEmailStatus = (emailId: string): EmailDetails | null => {
  return emailTracker[emailId] || null;
};

// Get all emails sent to a specific address
export const getEmailsForAddress = (email: string): EmailDetails[] => {
  return Object.values(emailTracker).filter(e => e.to === email);
};

// Update the delivery status (would normally happen via webhook)
export const updateDeliveryStatus = (emailId: string, status: 'delivered' | 'failed'): boolean => {
  if (emailTracker[emailId]) {
    emailTracker[emailId].status = status;
    return true;
  }
  return false;
};
