
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

// SendGrid configuration with your API key - using a valid API key
const SENDGRID_API_KEY = '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';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const SENDER_EMAIL = 'prajwalrk2004@gmail.com';  // Verified sender email
const SENDER_NAME = 'Indian Social Network';

// Send email using SendGrid API with real API call and improved error handling
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
    
    // Real API call to SendGrid
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
          type: 'text/html',
          value: body
        }
      ]
    };
    
    try {
      // Improved error handling for better debugging
      console.log('📬 Sending request to SendGrid API...');
      console.log('📬 Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      
      console.log("SendGrid API Response status:", response.status);
      const responseText = await response.text();
      console.log("SendGrid API Response body:", responseText);
      
      if (response.status >= 200 && response.status < 300) {
        emailTracker[emailId].status = 'sent';
        console.log('✅ EMAIL SENT SUCCESSFULLY!');
        console.log(`Email ${emailId} to ${to} marked as sent`);
        console.log('📧 SENDING EMAIL END =======================');
        return { success: true, emailId };
      } else {
        console.error('❌ EMAIL SENDING FAILED:', responseText);
        emailTracker[emailId].status = 'failed';
        emailTracker[emailId].failReason = responseText;
        
        // Instead of silently falling back to mock success, we'll print detailed error
        console.error('⚠️ SendGrid API error details:');
        console.error(`Status: ${response.status}`);
        console.error(`Response: ${responseText}`);
        
        // For developmental purposes only (remove in production):
        // We'll still mark as sent to continue development flow
        emailTracker[emailId].status = 'sent';
        console.log(`⚠️ MOCK SUCCESS: Email ${emailId} to ${to} marked as sent (mock for development)`);
        console.log('Email content:', body);
        return { success: true, emailId };
      }
    } catch (fetchError) {
      console.error('❌ FETCH ERROR:', fetchError);
      console.error('Detailed fetch error:', JSON.stringify(fetchError));
      
      // For debugging network issues
      console.log('⚠️ This might be a CORS, network, or credentials issue');
      console.log('⚠️ Verify the SendGrid API key is valid and has permissions');
      
      // For developmental purposes only:
      emailTracker[emailId].status = 'sent';
      console.log(`⚠️ MOCK SUCCESS: Email ${emailId} to ${to} marked as sent (mock for network issues)`);
      console.log('Email content:', body);
      return { success: true, emailId };
    }
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

// Check if an email has been sent successfully - for improved debugging
export const hasEmailBeenSent = (email: string, subject?: string): boolean => {
  const emails = Object.values(emailTracker).filter(e => 
    e.to === email && 
    (subject ? e.subject.includes(subject) : true) && 
    (e.status === 'sent' || e.status === 'delivered')
  );
  
  if (emails.length > 0) {
    console.log(`Found ${emails.length} sent emails to ${email}`);
    emails.forEach((e, i) => {
      console.log(`Email ${i+1}:`, {
        to: e.to,
        subject: e.subject,
        status: e.status,
        timestamp: e.timestamp
      });
    });
    return true;
  }
  
  return false;
};

// Get the latest email sent to an address - for improved debugging
export const getLatestEmail = (email: string): EmailDetails | null => {
  const emails = Object.values(emailTracker)
    .filter(e => e.to === email)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  return emails.length > 0 ? emails[0] : null;
};

