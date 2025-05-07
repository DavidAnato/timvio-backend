const nodemailer = require('nodemailer');
const EMAIL_USER = "david1anato@gmail.com"
const EMAIL_PASSWORD = "qypaxhrqfixwuocn"

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: email,
      subject: 'Code de vérification pour votre compte',
      html: `
        <h1>Vérification de votre compte</h1>
        <p>Votre code de vérification est : <strong>${otp}</strong></p>
        <p>Ce code expirera dans 10 minutes.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Erreur d\'envoi d\'email:', error);
    return false;
  }
};

const sendPasswordResetEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h1>Réinitialisation de votre mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Votre code de vérification est : <strong>${otp}</strong></p>
        <p>Ce code expirera dans 10 minutes.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Erreur d\'envoi d\'email:', error);
    return false;
  }
};

module.exports = { 
  sendOTPEmail,
  sendPasswordResetEmail 
}; 