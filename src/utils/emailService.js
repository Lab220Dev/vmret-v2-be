const nodemailer = require('nodemailer');

const generateEmailHTML = (senha) => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sua Senha DM Web - Lab220</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          width: 80%;
          margin: auto;
          padding: 20px;
          background: #ffffff;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        .content {
          margin: 20px 0;
        }
        .footer {
          font-size: 0.9em;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Senha Enviada</h1>
        <div class="content">
          <p>Olá,</p>
          <p>Sua senha é: <strong>${senha}</strong></p>
          <p>Se você não solicitou esta senha, por favor, ignore este e-mail.</p>
        </div>
        <div class="footer">
          <p>Atenciosamente,</p>
          <p>Equipe de Suporte Lab220</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
const generateEmailHTML2 = (senha) => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sua Senha DM Web - Lab220</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          width: 80%;
          margin: auto;
          padding: 20px;
          background: #ffffff;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        .content {
          margin: 20px 0;
        }
        .footer {
          font-size: 0.9em;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Senha Enviada</h1>
        <div class="content">
          <p>Olá,</p>
          <p>Sua senha é: <strong>${senha}</strong></p>
          <p>Faça a sua retirada com a senha fornecida</p>
        </div>
        <div class="footer">
          <p>Atenciosamente,</p>
          <p>Equipe da Lab220</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
const transporter = nodemailer.createTransport({
  host: 'email-ssl.com.br',
  port: 465,
  secure: true,
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
  },
  tls: {
      rejectUnauthorized: false
  }
});


const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail, generateEmailHTML,generateEmailHTML2 };
