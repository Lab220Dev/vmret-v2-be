const sql = require("mssql");
const { logQuery } = require("../utils/logUtils");
const { sendEmail, generateEmailHTML2 ,generateEmailHTMLFrancis} = require("../utils/emailService");
const CryptoJS = require("crypto-js");
const express = require('express');
const axios = require('axios');
const router = express.Router();
let ultimo = [];

router.post('/cadastro', async (req, res) => {
    let transaction;
    
    const name = req.body['form_fields[name]'];
    const email = req.body['form_fields[email]'];
    const telefone = req.body['form_fields[Telefone]'];
    const hashMD5 = CryptoJS.MD5(telefone.slice(-4)).toString();
    const empresa = req.body['form_fields[Empresa]'];
    const cargo = req.body['form_fields[Cargo]'];
    const id_usuario = req.body.id_usuario;
    
    const queryInsert = `
        INSERT INTO funcionarios (id_cliente, nome, matricula, email, senha, empresa, cargo, sincronizado) 
        VALUES (@id_cliente, @nome, @matricula, @email, @senha, @empresa, @cargo, @sincronizado)
    `;
    
    const queryCheckDuplicate = `
        SELECT COUNT(*) as count FROM funcionarios 
        WHERE id_cliente = @id_cliente AND (nome = @nome OR matricula = @matricula)
    `;

    try {
        // Iniciando a transação
        transaction = new sql.Transaction();
        await transaction.begin();

        const sqlRequestCheck = new sql.Request(transaction);
        sqlRequestCheck.input("id_cliente", sql.Int, 80)
            .input("nome", sql.VarChar, name)
            .input("matricula", sql.VarChar, telefone);

        const checkResult = await sqlRequestCheck.query(queryCheckDuplicate);

        if (checkResult.recordset[0].count > 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "Funcionário com este telefone já cadastrado para este cliente." });
        }

        const sqlRequest = new sql.Request(transaction);
        sqlRequest.input("id_cliente", sql.Int, 80)
            .input("nome", sql.VarChar, name)
            .input("matricula", sql.VarChar, telefone)
            .input("email", sql.VarChar, email)
            .input("senha", sql.VarChar, hashMD5)
            .input("Empresa", sql.VarChar, empresa)
            .input("Cargo", sql.VarChar, cargo)
            .input("Sincronizado", sql.Bit, 0);

        const result = await sqlRequest.query(queryInsert);

        if (result.rowsAffected.length > 0) {
            const params = {
                id_cliente: 79,
                nome: name,
                matricula: telefone,
                email: email,
                senha: hashMD5,
                empresa: empresa,
                cargo: cargo,
                sincronizado: false
            };

            logQuery('info', `Funcionário ${name} inserido com sucesso pelo usuário ${id_usuario}`, 'sucesso', 'INSERT', null, id_usuario, queryInsert, params);

            // Enviar email
            const Email = generateEmailHTML2(telefone.slice(-4), name);
            await sendEmail(email, 'Sua senha', Email);
            logQuery('info', `E-mail enviado para ${email} com a senha de retirada`, 'sucesso', 'EMAIL', null, id_usuario, 'sendEmail', { email });

            const mensagemChatPro = `Olá *${name.toUpperCase()}* ,\nBem-vindo ao stand do *Lab 220*, a primeira fabricante de *Dispenser Machines* do Brasil.\nAqui está a sua senha para você poder retirar o seu brinde: *${telefone.slice(-4).toUpperCase()}*.\nAproveite e visite o nosso site: https://lab220.com.br/epi/\nObrigado!`;

            const options = {
                method: 'POST',
                url: 'https://v5.chatpro.com.br/chatpro-w2u3pnxtci/api/v1/send_message',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    Authorization: 'ac9de8b5b1f8f8cd344c8e9057e365e7'
                },
                data: {
                    number: `${telefone}`,
                    message: mensagemChatPro
                }
            };

            try {
                const response = await axios.request(options);
                if (response.status === 201) {
                    console.log('Mensagem enviada com sucesso:', response.data);
                    logQuery('info', `Mensagem enviada para o telefone ${telefone}`, 'sucesso', 'CHATPRO', null, id_usuario, 'send_message', { telefone });
                } else {
                    console.error('Falha ao enviar a mensagem:', response.status, response.statusText);
                    logQuery('error', `Falha ao enviar a mensagem para o telefone ${telefone}`, 'falha', 'CHATPRO', null, id_usuario, 'send_message', { telefone, status: response.status, statusText: response.statusText });
                }
            } catch (error) {
                console.error('Erro ao enviar a mensagem:', error.message);
                logQuery('error', `Erro ao enviar mensagem para o telefone ${telefone}`, 'falha', 'CHATPRO', null, id_usuario, 'send_message', { telefone, error: error.message, stack: error.stack });
            }

            await transaction.commit();
            res.status(200).json({ message: "Funcionário adicionado com sucesso." });
        }
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }

        if (error.number === 2627 || error.number === 2601) { // Verifica erros de duplicidade
            res.status(400).json({ error: "Funcionário já cadastrado com este telefone ou email." });
        } else {
            const errorParams = {
                id_cliente: 80,
                nome: name,
                matricula: telefone,
                email: email,
                senha: hashMD5,
                empresa: empresa,
                cargo: cargo,
                sincronizado: false
            };

            logQuery('error', `Erro ao adicionar funcionário ${name}: ${error.message}`, 'falha', 'ERROR', null, id_usuario, queryInsert, errorParams);
            logQuery('error', `Stack trace: ${error.stack}`, 'falha', 'ERROR_STACK', null, id_usuario, queryInsert, {});

            console.error("Erro ao adicionar funcionário:", error);
            res.status(500).json({ error: "Erro no servidor. Tente novamente mais tarde." });
        }
    }
});

router.post('/francis', async (req, res) => {
    let transaction;
    const name = req.body['form_fields[name]'];
    const telefone = req.body['form_fields[Telefone]'];
    const email = req.body['form_fields[email]'];


    const randomNumbers = Math.floor(10 + Math.random() * 90).toString();
    const senhaComRandom =randomNumbers + telefone.slice(-4);
    //const hashMD5 = CryptoJS.MD5(senhaComRandom).toString(); 

    const queryInsert = `
        INSERT INTO EventoFrancis (nome, telefone, email, senha) 
        VALUES (@nome, @telefone, @email, @senha)
    `;
    
    const queryCheckDuplicate = `
        SELECT COUNT(*) as count FROM EventoFrancis 
        WHERE telefone = @telefone OR email = @email
    `;

    try {
        transaction = new sql.Transaction();
        await transaction.begin();

        // Validação de duplicidade
        const sqlRequestCheck = new sql.Request(transaction);
        sqlRequestCheck.input("telefone", sql.VarChar, telefone)
                       .input("email", sql.VarChar, email);

        const checkResult = await sqlRequestCheck.query(queryCheckDuplicate);

        if (checkResult.recordset[0].count > 0) {
            await transaction.rollback();
            logQuery('error', `Tentativa de cadastro duplicado para o telefone ${telefone} ou email ${email}`, 'falha', 'DUPLICATE', null, null, queryCheckDuplicate, { telefone, email });
            return res.status(400).json({ error: "Registro já existente com este telefone ou email." });
        }

        const sqlRequest = new sql.Request(transaction);
        sqlRequest.input("nome", sql.VarChar, name)
                  .input("telefone", sql.VarChar, telefone)
                  .input("email", sql.VarChar, email)
                  .input("senha", sql.VarChar, senhaComRandom); 

        const result = await sqlRequest.query(queryInsert);

        if (result.rowsAffected.length > 0) {
            await transaction.commit();
            logQuery('info', `Registro inserido para ${name}`, 'sucesso', 'INSERT', null, null, queryInsert, { nome: name, telefone, email });

            const emailContent = generateEmailHTMLFrancis(senhaComRandom, name);
            await sendEmail(email, 'Sua senha de acesso', emailContent);
            logQuery('info', `E-mail enviado para ${email}`, 'sucesso', 'EMAIL', null, null, 'sendEmail', { email });

            const mensagemChatProFrancis = `Olá *${name.trim().toUpperCase()}*,\nBem-vindo(a) a Vending Machine dos novos desodorantes Francis, com proteção de 72 horas contra o suor e o mau odor, além da perfumação ativa por 24 horas dos novos desodorantes Francis.\n\nAqui está a sua senha para você poder gravar o vídeo e retirar seu brinde exclusivo: *${senhaComRandom}*.\n\nNão deixe de visitar nosso site para saber mais: https://www.francis.com.br/francis/desodorantes/desodorantes-aerosol\n\nEsperamos que aproveite!`;

            const options = {
                method: 'POST',
                url: 'https://v5.chatpro.com.br/chatpro-w2u3pnxtci/api/v1/send_message',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    Authorization: 'ac9de8b5b1f8f8cd344c8e9057e365e7'
                },
                data: {
                    number:  `${telefone}`,
                    message: mensagemChatProFrancis
                }
            };

            try {
                const response = await axios.request(options);
                if (response.status === 201) {
                    logQuery('info', `Mensagem enviada para o telefone ${telefone}`, 'sucesso', 'CHATPRO', null, null, 'send_message', { telefone });
                } else {
                    logQuery('error', `Falha ao enviar a mensagem para o telefone ${telefone}`, 'falha', 'CHATPRO', null, null, 'send_message', { telefone, status: response.status, statusText: response.statusText });
                }
            } catch (error) {
                logQuery('error', `Erro ao enviar mensagem para o telefone ${telefone}`, 'falha', 'CHATPRO', null, null, 'send_message', { telefone, error: error.message });
            }

            res.status(200).json({ message: "Registro inserido com sucesso e mensagens enviadas." });
        } else {
            await transaction.rollback();
            logQuery('error', `Falha na inserção do registro para ${name}`, 'falha', 'INSERT', null, null, queryInsert, { nome: name, telefone, email });
            res.status(500).json({ error: "Erro ao inserir registro." });
        }
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        logQuery('error', `Erro ao inserir registro: ${error.message}`, 'falha', 'ERROR', null, null, 'INSERT', {});
        res.status(500).json({ error: "Erro no servidor. Tente novamente mais tarde." });
    }
});

router.get('/updateDados', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    logQuery('info', `Início do SSE para updateDados`, 'sucesso', 'SSE', null, null, '/updateDados', {});

    try {
        const primeirosDados = await checkForUpdates();
        if (primeirosDados) {
            res.write(`data: ${JSON.stringify(primeirosDados)}\n\n`);
            //logQuery('info', `Dados iniciais enviados`, 'sucesso', 'SSE', null, null, 'checkForUpdates', { primeirosDados });
        } else {
            res.write(`data: ${JSON.stringify({ message: "Nenhum dado inicial disponível." })}\n\n`);
            //logQuery('info', `Nenhum dado inicial disponível`, 'info', 'SSE', null, null, 'checkForUpdates', {});
        }

        const intervalId = setInterval(async () => {
            try {
                const atualizacoes = await checkForUpdates();
                if (atualizacoes) {
                    res.write(`data: ${JSON.stringify(atualizacoes)}\n\n`);
                    //logQuery('info', `Atualizações enviadas`, 'sucesso', 'SSE', null, null, 'checkForUpdates', { atualizacoes });
                }
            } catch (error) {
                console.error("Erro ao verificar atualizações no intervalo:", error);
                res.write(`data: ${JSON.stringify({ error: "Erro ao verificar atualizações." })}\n\n`);
                //logQuery('error', `Erro ao verificar atualizações: ${error.message}`, 'falha', 'SSE', null, null, 'checkForUpdates', { error: error.message });
            }
        }, 45000);

        req.on('close', () => {
            clearInterval(intervalId);
            //logQuery('info', `Conexão SSE fechada pelo cliente`, 'info', 'SSE', null, null, '/updateDados', {});
        });

    } catch (error) {
        console.error("Erro ao inicializar SSE:", error);
        res.status(500).send("Erro ao iniciar a conexão de dados.");
        //logQuery('error', `Erro ao inicializar SSE: ${error.message}`, 'falha', 'SSE', null, null, '/updateDados', { error: error.message });
    }
});

async function checkForUpdates() {
    const query = `SELECT * FROM EventoFrancis`;

    try {
        const request = new sql.Request();
        const result = await request.query(query);
        const atual = result.recordset;
        if (ultimo.length === 0) {
            ultimo = atual; 
            return atual; 
        }

        const fullRecords = atual.map(record => {
            const existingRecord = ultimo.find(r => r.Telefone === record.Telefone);

            if (!existingRecord) {
                return { ...record, isNew: true };
            }

             const updatedColumns = [];
            if (existingRecord.arquivo !== record.arquivo) updatedColumns.push('arquivo');
            if (existingRecord.Retirada !== record.Retirada) updatedColumns.push('Retirada');
            if (existingRecord.Video !== record.Video) updatedColumns.push('Video');

            return updatedColumns.length > 0 
                ? { ...record, isNew: false, updatedColumns } 
                : { ...record, isNew: false };
        });

        ultimo = atual;

        return fullRecords;
    } catch (error) {
        console.error("Erro ao verificar atualizações:", error);
        throw error; 
    }
}
module.exports = router;
