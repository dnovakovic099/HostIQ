# SMTP Email Configuration

This document describes the SMTP email configuration required for the backend server to enable email functionality.

## Overview

The mobile app uses the `/email/dispute-report` endpoint to send emails. The backend server must be configured with SMTP settings to enable this functionality.

## Required Environment Variables

Add these environment variables to your backend server's `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@hostiq.com
SMTP_FROM_NAME=HostIQ

# Optional: For production Gmail, use App Password
# Generate App Password: https://myaccount.google.com/apppasswords
```

## SMTP Provider Examples

### Gmail

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=HostIQ
```

**Note:** Gmail requires an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password when using SMTP.

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@hostiq.com
SMTP_FROM_NAME=HostIQ
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_FROM_NAME=HostIQ
```

### AWS SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_FROM_NAME=HostIQ
```

## Backend Implementation

The backend should implement the email endpoint as follows:

### Endpoint: `POST /api/email/dispute-report`

**Request Body:**
```json
{
  "inspectionId": "123",
  "recipientEmail": "recipient@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

### Example Backend Code (Node.js with nodemailer)

```javascript
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Email endpoint handler
app.post('/api/email/dispute-report', async (req, res) => {
  const { inspectionId, recipientEmail } = req.body;

  // Validate SMTP configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return res.status(503).json({
      error: 'Email service not configured',
      message: 'Server email is not configured yet. Please use "Share Text" and send manually.',
    });
  }

  try {
    // Generate PDF or fetch report data
    const reportData = await generateDisputeReport(inspectionId);

    // Send email
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipientEmail,
      subject: 'Airbnb Dispute Report',
      html: reportData.html,
      attachments: [
        {
          filename: `dispute-report-${inspectionId}.pdf`,
          content: reportData.pdf,
        },
      ],
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
    });
  }
});
```

## Testing

1. Configure SMTP settings in backend `.env`
2. Restart backend server
3. Test from mobile app:
   - Navigate to Airbnb Dispute Report screen
   - Click "Email PDF"
   - Enter recipient email
   - Verify email is received

## Security Notes

1. **Never commit `.env` files** to version control
2. Use **App Passwords** for Gmail (not regular passwords)
3. Store SMTP credentials securely (use environment variables or secret management)
4. Use **TLS/SSL** for SMTP connections (SMTP_SECURE=true for port 465)
5. Consider using **OAuth2** for Gmail instead of App Passwords for better security

## Troubleshooting

### "Email service not configured"
- Check that all SMTP environment variables are set
- Verify backend server has been restarted after adding env vars

### "Authentication failed"
- Verify SMTP_USER and SMTP_PASSWORD are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Check that "Less secure app access" is enabled (if not using App Password)

### "Connection timeout"
- Verify SMTP_HOST and SMTP_PORT are correct
- Check firewall settings
- Ensure SMTP_SECURE matches the port (false for 587, true for 465)

### "Email not received"
- Check spam/junk folder
- Verify recipient email address is correct
- Check SMTP provider logs/dashboard for delivery status
- Verify FROM_EMAIL is authorized in your SMTP provider

