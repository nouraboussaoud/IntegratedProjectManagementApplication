/**
 * Email templates for user-related notifications
 */

// Verification email template
const getVerificationEmailTemplate = (userName, verificationToken) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 1px solid #eaeaea;
      }
      .logo {
        max-width: 150px;
        height: auto;
      }
      .content {
        padding: 30px 20px;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #4f46e5;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 600;
        margin: 20px 0;
        text-align: center;
      }
      .button:hover {
        background-color: #4338ca;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #eaeaea;
      }
      .highlight {
        color: #4f46e5;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>FlowPi</h1>
      </div>
      <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${userName || 'there'},</p>
        <p>Thank you for registering with FlowPi. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
          <a href="http://localhost:5000/api/users/verify-email/${verificationToken}" class="button">Verify Email Address</a>
        </div>
        
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; font-size: 14px;">http://localhost:5000/api/users/verify-email/${verificationToken}</p>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        
        <p>If you didn't create an account with FlowPi, you can safely ignore this email.</p>
        
        <p>Best regards,<br>The FlowPi Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} FlowPi. All rights reserved.</p>
        <p>This is an automated email, please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Password reset email template
const getPasswordResetTemplate = (userName, newPassword) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your New Password</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 1px solid #eaeaea;
      }
      .content {
        padding: 30px 20px;
      }
      .password-box {
        background-color: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 15px;
        margin: 20px 0;
        text-align: center;
        font-family: monospace;
        font-size: 18px;
        letter-spacing: 1px;
      }
      .warning {
        color: #b91c1c;
        font-weight: 600;
        margin-top: 20px;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #eaeaea;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>FlowPi</h1>
      </div>
      <div class="content">
        <h2>Your New Password</h2>
        <p>Hello ${userName || 'there'},</p>
        <p>We've received a request to reset your password. Here is your new temporary password:</p>
        
        <div class="password-box">
          ${newPassword}
        </div>
        
        <p>Please use this password to log in to your account. We recommend changing it immediately after logging in for security reasons.</p>
        
        <p class="warning">Important: If you did not request a password reset, please contact our support team immediately.</p>
        
        <p>Best regards,<br>The FlowPi Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} FlowPi. All rights reserved.</p>
        <p>This is an automated email, please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Account status change (ban/unban) email template
const getAccountStatusTemplate = (userName, isBanned) => {
  const subject = isBanned ? 'Your Account Has Been Suspended' : 'Your Account Has Been Reactivated';
  const message = isBanned 
    ? 'Your account has been suspended due to a violation of our terms of service. If you believe this is an error, please contact our support team for assistance.'
    : 'Your account has been reactivated. You can now log in and access all features of FlowPi.';
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 1px solid #eaeaea;
      }
      .content {
        padding: 30px 20px;
      }
      .status-indicator {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
        background-color: ${isBanned ? '#ef4444' : '#10b981'};
      }
      .status-text {
        color: ${isBanned ? '#b91c1c' : '#047857'};
        font-weight: 600;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #eaeaea;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #4f46e5;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 600;
        margin: 20px 0;
        text-align: center;
      }
      .button:hover {
        background-color: #4338ca;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>FlowPi</h1>
      </div>
      <div class="content">
        <h2>${subject}</h2>
        <p>Hello ${userName || 'there'},</p>
        
        <p>
          <span class="status-indicator"></span>
          <span class="status-text">Account ${isBanned ? 'Suspended' : 'Reactivated'}</span>
        </p>
        
        <p>${message}</p>
        
        ${!isBanned ? `
        <div style="text-align: center;">
          <a href="http://localhost:3000/login" class="button">Log In Now</a>
        </div>
        ` : ''}
        
        <p>If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>The FlowPi Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} FlowPi. All rights reserved.</p>
        <p>This is an automated email, please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = {
  getVerificationEmailTemplate,
  getPasswordResetTemplate,
  getAccountStatusTemplate
};