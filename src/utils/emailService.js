const nodemailer = require("nodemailer");

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
const generateEmailHTML2 = (senha, nome) => {
  return `
   <!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao Lab 220</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 10px;
        }
        a {
            color: #1e88e5;
            text-decoration: none;
        }
        .highlight {
            font-weight: bold;
            color: #000;
        }
    </style>
</head>
<body>
    <div class="container">
        <p>Olá <span class="highlight">${nome}</span>,</p>
        
        <p>Bem-vindo ao stand do <strong>Lab 220</strong>, a primeira fabricante de <strong>Dispenser Machines</strong> do Brasil.</p>
        
        <p>Aqui está a sua senha para você poder retirar o seu brinde: <span class="highlight">${senha}</span></p>
        
        <p>Aproveite e visite o nosso site: <a href="https://lab220.com.br/epi/" target="_blank">https://lab220.com.br/epi/</a></p>
        
        <p>Obrigado!</p>
    </div>
</body>
</html>

  `;
};
const generateEmailHTMLFrancis = (senha, nome) => {
  return `
   <!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo a Experiência Francis</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 10px;
        }
        a {
            color: #1e88e5;
            text-decoration: none;
        }
        .highlight {
            font-weight: bold;
            color: #000;
        }
    </style>
</head>
<body>
    <div class="container">
        <p>Olá <span class="highlight">${nome}</span>,</p>
        
        <p>Bem-vindo ao stand dos novos <strong>desodorantes Francis</strong>, com proteção de 72h contra o suor e o mau odor e perfumação ativa por 24h.</p>
        
        <p>Aqui está a sua senha para você poder gravar o vídeo e retirar seu brinde: <span class="highlight">${senha}</span></p>
        
        <p>Aproveite e visite o nosso site: <a href="https://www.francis.com.br/francis/desodorantes/desodorantes-aerosol" target="_blank">https://www.francis.com.br/francis/desodorantes/desodorantes-aerosol</a></p>
        
        <p>Obrigado!</p>
    </div>
</body>
</html>
  `;
};
const transporter = nodemailer.createTransport({
  host: "email-ssl.com.br",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail, generateEmailHTML, generateEmailHTML2 ,generateEmailHTMLFrancis};
