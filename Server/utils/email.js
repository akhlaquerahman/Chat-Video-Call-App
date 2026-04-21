const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: `"Chat App Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Email Verification OTP',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #00a884; text-align: center;">Verify Your Email</h2>
                <p>Hello,</p>
                <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 30px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0;" />
                <p style="font-size: 12px; color: #888; text-align: center;">This is an automated email. Please do not reply.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send verification email.');
    }
};

module.exports = { sendOTP };