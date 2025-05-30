const nodemailer = require('nodemailer');

const EMAIL_USER = "david1anato@gmail.com";
const EMAIL_PASSWORD = "qypaxhrqfixwuocn";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

/**
 * Envoie une notification par email
 * @param {string} toEmail - Adresse email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} htmlContent - Contenu HTML de l'email
 * @returns {Promise<boolean>}
 */
const sendEmailNotification = async (toEmail, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: toEmail,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Erreur d'envoi d'email de notification:", error);
    return false;
  }
};

module.exports = { sendEmailNotification };
