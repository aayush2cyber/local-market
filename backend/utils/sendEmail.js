const nodemailer = require('nodemailer');

/**
 * ----------------------------------------
 * 📧 GMAIL APP PASSWORD INSTRUCTIONS
 * ----------------------------------------
 * To send emails via Gmail, you CANNOT use your normal password.
 * You must generate an "App Password":
 * 
 * 1. Go to your Google Account -> Security (https://myaccount.google.com/security)
 * 2. Ensure "2-Step Verification" is turned ON.
 * 3. Search for "App Passwords" in the top search bar.
 * 4. Create a new App Password (select "Mail" and "Other (Custom name)", e.g., "Nirjuli Market").
 * 5. Copy the 16-character generated password.
 * 6. Open the `.env` file in the root of your project.
 * 7. Paste your email in EMAIL_USER and the 16-character password in EMAIL_PASS.
 *    Example:
 *    EMAIL_USER=myname@gmail.com
 *    EMAIL_PASS=abcd efgh ijkl mnop
 * ----------------------------------------
 */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email plain text body
 */
async function sendEmail(to, subject, text) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️  Email not sent: EMAIL_USER or EMAIL_PASS is missing in .env');
      return false;
    }

    const mailOptions = {
      from: `"Nirjuli Market Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('  ✓ Email sent: ' + info.messageId);
    return true;
  } catch (error) {
    console.error('  ✗ Error sending email:', error.message);
    return false;
  }
}

module.exports = sendEmail;
