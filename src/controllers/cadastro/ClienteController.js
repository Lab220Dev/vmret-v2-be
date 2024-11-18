const sql = require('mssql');  // pacote para se conectar e executar consultas em um banco de dados SQL
const { logQuery } = require('../../utils/logUtils'); // função para logar consultas
const crypto = require('crypto');  // Módulo nativo do Node.js para criptografia e geração de valores aleatórios
const convertToBoolean = (value) => {
    return value === 'true';  // Converte uma string para um valor booleano.
};

function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');  //Gera uma chave API aleatória de 32 bytes e converte pra uma string hexadecimal
}

function getMenuOrderByProfile(perfil) {
    const menuOrderMaster = {
        'Dashboard': { id_item: 1, icone: 'pi pi-fw pi-chart-pie' },
        'Relatórios': { id_item: 2, icone: 'pi pi-fw pi-list' },
        'Configurações': { id_item: 3, icone: 'pi pi-fw pi-cog' },
        'Importações': { id_item: 4, icone: 'pi pi-fw pi-upload' },
        'EndPoints': { id_item: 5, icone: 'pi pi-fw pi-cloud' },
        'Cadastros': { id_item: 6, icone: 'pi pi-fw pi-user-plus' }
    };

    const menuOrderOperador = {
        'Dashboard': { id_item: 1, icone: 'pi pi-fw pi-chart-pie' },
        'Dispenser Machines': { id_item: 3, icone: 'pi pi-fw pi-box' },
        'Produtos': { id_item: 4, icone: 'pi pi-fw pi-tags' },
        'Relatórios': { id_item: 2, icone: 'pi pi-fw pi-list' }
    };

    const menuOrderAvulso = {
        'Dashboard': { id_item: 1, icone: 'pi pi-fw pi-chart-pie' },
        'Liberação Avulsa': { id_item: 2, icone: 'pi pi-fw pi-key' },
        'Consulta Status de Liberação Avulsa': { id_item: 3, icone: 'pi pi-fw pi-search' }
    };

    switch (perfil) {
        case 1: // Master
            return menuOrderMaster;  //menu para o perfil Master
        case 3: // Operador
            return menuOrderOperador;  //menu para o perfil Operador
        case 4: // Avulso
            return menuOrderAvulso;  //menu para o perfil Avulso
        default:
            throw new Error('Perfil não reconhecido');  //erro se o perfil não for reconhecido
    }
}
async function inserirMenuPrincipal(transaction, id_cliente, perfil, nome, order) {
    let sqlRequest = new sql.Request(transaction);//criação de uma nova requisição SQL associada à transação recebida
    
    //definindo os parâmetros da consulta SQL. Esses parâmetros são utilizados para prevenir SQL Injection e melhoram a segurança.
    sqlRequest.input('Cod_Cli', sql.Int, id_cliente)  //Cod_Cli é um parâmetro do tipo inteiro que representa o ID do cliente.
        .input('Nome', sql.VarChar, nome)  //nome é um parâmetro do tipo varchar que representa o nome do menu.
        .input('Perfil', sql.Int, perfil)  //perfil é um parâmetro do tipo inteiro que representa o perfil associado ao menu.
        .input('Icone', sql.VarChar, order.icone)  //icone é um parâmetro do tipo varchar que representa o ícone associado ao menu.
        .input('ID_item', sql.Int, order.id_item);  //ID_item é um parâmetro do tipo inteiro que representa o ID do item do menu.

    console.log(`Inserindo menu: ${nome}`);  //logando a inserção do menu para monitoramento

    //Execução da consulta SQL que insere os dados na tabela 'Menu' usando os parâmetros fornecidos.
    await sqlRequest.query(`
        INSERT INTO Menu (ID_item, Cod_Cli, Nome, Perfil, Icone)
        VALUES (@ID_item, @Cod_Cli, @Nome, @Perfil, @Icone)
    `);

    console.log(`Menu ${nome} inserido com sucesso`);  //Logando que a inserção foi bem-sucedida
}
//Função para inserir o submenu
async function inserirSubmenu(transaction, id_cliente, perfil, id_item, submenu, referenciaCliente) {
    let sqlRequest = new sql.Request(transaction);//Criação de uma requisição SQL associada à transação recebida 
    let submenuTo = null;  //Variável que vai armazenar o valor 'to' do submenu, caso ele seja necessário

    //Verifica se o submenu não possui subsubmenus ou se a lista de subsubmenus está vazia
    if (!submenu.subsubmenus || submenu.subsubmenus.length === 0) {
        // Consulta SQL para buscar o valor 'to' de um submenu específico, dado o nome do submenu e o código do cliente
        const result = await sqlRequest.query(`
            SELECT [to] FROM Menu_Itens WHERE Nome = '${submenu.name}' AND Cod_Cli = ${referenciaCliente}
        `);
        //se houver um valor para 'to', armazena ele e caso contrário, mantém como uma string vazia
        submenuTo = result.recordset[0]?.to || '';
    }

    //definindo os parâmetros para a requisição SQL com os valores fornecidos
    sqlRequest.input('ID_Item', sql.Int, id_item)  //id do item do menu ao qual o submenu pertence
        .input('Cod_Cli', sql.Int, id_cliente)  //id do cliente associado ao submenu
        .input('Nome', sql.VarChar, submenu.name)  //Nome do submenu
        .input('Perfil', sql.Int, perfil)  //Perfil associado ao submenu
        .input('to', sql.VarChar, submenuTo);  //'to' do submenu 
    console.log(`Inserindo submenu: ${submenu.name}`);  //log para monitorar qual submenu está sendo inserido

    //Verifica se o submenu possui subsubmenus. Caso tenha, trata a inserção de forma diferente
    if (submenu.subsubmenus && submenu.subsubmenus.length > 0) {
        //o submenu possui subsubmenus, insere o submenu como um item na tabela Menu_Itens
        //e gera um ID para o submenu usando a cláusula OUTPUT
        const resultSubmenu = await sqlRequest.query(`
            INSERT INTO Menu_Itens (ID_Item, Cod_Cli, Nome, Perfil, [to], ID_Sub_Item)
            OUTPUT INSERTED.ID
            VALUES (@ID_Item, @Cod_Cli, @Nome, @Perfil, NULL, 0)
        `);

        //Recupera o ID do submenu inserido e o armazena na variável submenuId
        const submenuId = resultSubmenu.recordset[0].ID;
        console.log(`Submenu ${submenu.name} inserido com ID_Sub_Item: ${submenuId}`);
        //Retorna o ID do submenu inserido
        return submenuId;
    } else {
        //Caso o submenu não tenha subsubmenus, insere diretamente na tabela Menu_Itens
        await sqlRequest.query(`
            INSERT INTO Menu_Itens (ID_Item, ID_Sub_Item, Cod_Cli, Nome, Perfil, [to])
            VALUES (@ID_Item, 0, @Cod_Cli, @Nome, @Perfil, @to)
        `);

        console.log(`Submenu ${submenu.name} inserido com ID_Sub_Item 0`);  //Log indicando que o submenu foi inserido com ID_Sub_Item 0 (ou seja, não tem subsubmenus
        //retorna 0 indicando que não há subsubmenus
        return 0;
    }
}
//Função para inserir o subsubmenu
async function inserirSubsubmenu(transaction, id_cliente, perfil, id_item, id_sub_item, subsubmenu, referenciaCliente) {
    let sqlRequest = new sql.Request(transaction);// Cria uma requisição SQL associada à transação recebida. Isso permite que a consulta ao banco de dados seja feita dentro da transação.

    //Realiza uma consulta SQL para buscar o valor de 'to' associado ao submenu. O nome do subsubmenu e o código do cliente são usados para a busca.
    const result = await sqlRequest.query(`
        SELECT [to] FROM Menu_Itens WHERE Nome = '${subsubmenu.name}' AND Cod_Cli = ${referenciaCliente}
    `);

    //Se o resultado da consulta encontrar um valor para 'to', ele será atribuído à variável 'subsubmenuTo'. Caso contrário, a variável ficará vazia.
    const subsubmenuTo = result.recordset[0]?.to || '';

    //Log para acompanhar a inserção do subsubmenu, fornecendo o nome do subsubmenu que está sendo inserido.
    console.log(`Inserindo subsubmenu: ${subsubmenu.name}`);

    //Define os parâmetros que serão passados para a consulta SQL.
    sqlRequest.input('ID_Item', sql.Int, id_item)  // ID do item de menu ao qual o subsubmenu pertence.
        .input('ID_Sub_Item', sql.Int, id_sub_item)  // ID do submenu ao qual o subsubmenu pertence.
        .input('Cod_Cli', sql.Int, id_cliente)  // ID do cliente.
        .input('Nome', sql.VarChar, subsubmenu.name)  // Nome do subsubmenu.
        .input('Perfil', sql.Int, perfil)  // Perfil associado ao subsubmenu.
        .input('to', sql.VarChar, subsubmenuTo);  // Valor 'to' que foi obtido na consulta anterior.

    //Executa a consulta SQL para inserir o subsubmenu na tabela Menu_Itens.
    await sqlRequest.query(`
        INSERT INTO Menu_Itens (ID_Item, ID_Sub_Item, Cod_Cli, Nome, Perfil, [to])
        VALUES (@ID_Item, @ID_Sub_Item, @Cod_Cli, @Nome, @Perfil, @to)
    `);

    //Log indicando que o subsubmenu foi inserido com sucesso.
    console.log(`Subsubmenu ${subsubmenu.name} inserido com sucesso`);
}
async function listaSimples(request, response) {
    //tenta executar a lógica da função. Caso algo falhe, o erro será tratado no bloco 'catch'.
    try {
        //definindo a consulta SQL para buscar os clientes não excluídos. A consulta retorna apenas o id_cliente e nome de cada cliente.
        //o 'WHERE deleted = 0' garante que somente os clientes não excluídos ejam retornados.
        const query = 'SELECT id_cliente,nome FROM clientes WHERE deleted = 0';

        //executa a consulta SQL usando o objeto Request do pacote 'mssql'.
        //a função query() executa a consulta no banco de dados SQL Server e aguarda a resposta com 'await'.
        const result = await new sql.Request().query(query);

        //quando a consulta é bem-sucedida, envia a resposta ao cliente com o status HTTP 200 (OK).
        //a resposta é enviada no formato JSON, utilizando o 'recordset' que contém o resultado da consulta.
        //'recordset' é um array de objetos, e nesse caso, contém os dados dos clientes (id_cliente e nome).
        response.status(200).json(result.recordset);
    } catch (error) {
        //caso ocorra algum erro durante a execução da consulta ou da resposta:
        //exibe a mensagem de erro no console para que os desenvolvedores possam verificar o problema.
        console.error('Erro ao executar consulta:', error.message);

        //retorna uma resposta de erro com status HTTP 500 indicando que houve um problema no servidor.
        //a mensagem genérica 'Erro ao executar consulta' é enviada para o cliente.
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listarClienteComServicos(request, response) {
    //tenta executar a lógica da função. Caso algo falhe, o erro será tratado no bloco 'catch'.
    try {
        let query;
        //pega o 'id_cliente' da requisição para identificar o cliente
        const id_cliente = request.body.id_cliente;
        //pega a role do usuário
        const userRole = request.roles;

        //vverifica se o usuário tem a role 'Administrador'
        if (userRole.includes('Administrador')) {
            //Se o usuário for 'Administrador', ele pode ver todos os clientes e seus serviços, mesmo os que não têm notificações
            query = `
                SELECT 
                    c.id_cliente, c.nome AS cliente_nome,
                    ns.id_servico, ns.nome AS servico_nome, 
                    ns.frequencia, ns.tipo_notificacao, 
                    ns.id_funcionario_responsavel, ns.hora_notificacao, ns.nome
                FROM 
                    clientes c
                LEFT JOIN 
                    Notificacoes_Servicos ns ON c.id_cliente = ns.id_cliente
                WHERE 
                    c.deleted = 0
                    AND (ns.deleted = 0 OR ns.deleted IS NULL)
            `;
        } else {
            //Caso o usuário não seja 'Administrador', ele só poderá ver os serviços do cliente especificado
            query = `
                SELECT 
                    c.id_cliente, c.nome AS cliente_nome,
                    ns.id_servico, ns.nome AS servico_nome, 
                    ns.frequencia, ns.tipo_notificacao, 
                    ns.id_funcionario_responsavel, ns.hora_notificacao, ns.nome
                FROM 
                    clientes c
                LEFT JOIN 
                    Notificacoes_Servicos ns ON c.id_cliente = ns.id_cliente
                WHERE 
                    c.id_cliente = @id_cliente AND c.deleted = 0 AND ns.deleted = 0
            `;
        }

        //executa a consulta SQL com o parâmetro 'id_cliente' inserido na query
        const result = await new sql.Request()
            .input('id_cliente', sql.Int, id_cliente)  // Define o parâmetro 'id_cliente' da consulta
            .query(query);  // Executa a consulta SQL e espera o resultado

        //mapeia o resultado para um formato mais adequado (isso é feito pela função 'mapClientesComServicos')
        const clientesComServicos = mapClientesComServicos(result.recordset);

        //retorna a resposta ao cliente com status HTTP 200 (OK), enviando os dados dos clientes e serviços
        response.status(200).json(clientesComServicos);
    } catch (error) {
        //caso ocorra algum erro, captura a falha e exibe no console para diagnóstico
        console.error('Erro ao executar consulta:', error.message);

        //envia uma resposta de erro para o cliente com status HTTP 500 (Erro Interno do Servidor)
        response.status(500).send('Erro ao executar consulta');
    }
}
async function adicionar(request, response) {
    //desestrutura os dados recebidos no corpo da requisição
    const { nome, cpfcnpj, ativo, usar_api, id_usuario } = request.body;

    //gera uma chave de API única para o cliente
    const apiKey = generateApiKey();

    //define a consulta SQL para inserir um novo cliente na tabela 'clientes'
    const queryCliente = `
        INSERT INTO clientes 
        (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
        VALUES (@id_cliente, @nome, @cpfcnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)
    `;

    //define a consulta SQL para inserir uma chave de API associada ao cliente
    const queryApiKey = `
        INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
        VALUES (@id_cliente, @api_key, @nome_cliente)
    `;

    //inicia uma transação no banco de dados
    const transaction = new sql.Transaction();
    try {
        //começa a transação 
        await transaction.begin();

        //cria uma instância do sql.Request para executar a consulta de inserção do cliente
        let sqlRequest = new sql.Request(transaction);

        //consulta o maior id de cliente existente para gerar um novo ID 
        const resultId = await sqlRequest.query(`SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`);
        const lastId = resultId.recordset[0].lastId;
        const newIdCliente = lastId + 1; // Incrementa o id para o novo cliente

        //prepara os parâmetros necessários para a inserção na tabela 'clientes'
        sqlRequest.input('id_cliente', sql.Int, newIdCliente);
        sqlRequest.input('nome', sql.VarChar, nome);
        sqlRequest.input('cpfcnpj', sql.VarChar, cpfcnpj);
        sqlRequest.input('ativo', sql.Bit, ativo);
        sqlRequest.input('deleted', sql.Bit, false); //define que o cliente não foi excluído
        sqlRequest.input('created', sql.DateTime, new Date()); //data de criação
        sqlRequest.input('updated', sql.DateTime, new Date()); //data de atualização
        sqlRequest.input('last_login', sql.DateTime, new Date('1900-01-01 00:00:00.000')); //data de último login 
        sqlRequest.input('usar_api', sql.Bit, usar_api);
        sqlRequest.input('atualizado', sql.Bit, false); //define que o cliente não foi atualizado

        //executa a query para inserir o cliente no banco de dados
        await sqlRequest.query(queryCliente);

        //cria uma nova instância de sql.Request para inserir a chave de API
        sqlRequest = new sql.Request(transaction);

        //prepara os parâmetros necessários para a inserção na tabela 'API_KEY'
        sqlRequest.input('id_cliente', sql.Int, newIdCliente);
        sqlRequest.input('api_key', sql.VarChar, apiKey); //chave de API gerada
        sqlRequest.input('nome_cliente', sql.VarChar, nome);

        //executa a query para inserir a chave de API
        await sqlRequest.query(queryApiKey);

        //se tudo ocorrer bem, confirma a transação 
        await transaction.commit();

        //retorna uma resposta de sucesso para o cliente
        response.status(201).send('Cliente criado com sucesso e API Key gerada!');
    } catch (error) {
        //se ocorrer qualquer erro, desfaz a transação (rollback), revertendo as alterações no banco
        await transaction.rollback();

        //registra o erro no console para que o time de desenvolvimento possa analisar
        console.error('Erro ao inserir o usuário:', error.message);

        //retorna um erro para o cliente com status HTTP 500 
        response.status(500).send('Erro ao inserir o usuário');
    }
}
async function adicionar(request, response) {
    //desestrutura os dados recebidos no corpo da requisição
    const { nome, cpfcnpj, ativo, usar_api, id_usuario } = request.body;

    //gera uma chave de API única para o cliente
    const apiKey = generateApiKey();

    //define a consulta SQL para inserir um novo cliente na tabela 'clientes'
    const queryCliente = `
        INSERT INTO clientes 
        (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
        VALUES (@id_cliente, @nome, @cpfcnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)
    `;

    //define a consulta SQL para inserir uma chave de API associada ao cliente
    const queryApiKey = `
        INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
        VALUES (@id_cliente, @api_key, @nome_cliente)
    `;

    //inicia uma transação no banco de dados
    const transaction = new sql.Transaction();
    try {
        //começa a transação (inicia os blocos de inserção)
        await transaction.begin();

        //cia uma instância do sql.Request para executar a consulta de inserção do cliente
        let sqlRequest = new sql.Request(transaction);

        //consulta o maior ID de cliente existente para gerar um novo ID (evitando duplicação)
        const resultId = await sqlRequest.query(`SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`);
        const lastId = resultId.recordset[0].lastId;
        const newIdCliente = lastId + 1; //incrementa o ID para o novo cliente

        //prepara os parâmetros necessários para a inserção na tabela 'clientes'
        sqlRequest.input('id_cliente', sql.Int, newIdCliente);
        sqlRequest.input('nome', sql.VarChar, nome);
        sqlRequest.input('cpfcnpj', sql.VarChar, cpfcnpj);
        sqlRequest.input('ativo', sql.Bit, ativo);
        sqlRequest.input('deleted', sql.Bit, false); //define que o cliente não foi excluído
        sqlRequest.input('created', sql.DateTime, new Date()); //data de criação
        sqlRequest.input('updated', sql.DateTime, new Date()); //data de atualização
        sqlRequest.input('last_login', sql.DateTime, new Date('1900-01-01 00:00:00.000')); //data de último login (inicialmente setada para uma data padrão)
        sqlRequest.input('usar_api', sql.Bit, usar_api);
        sqlRequest.input('atualizado', sql.Bit, false); //define que o cliente não foi atualizado

        //Executa a query para inserir o cliente no banco de dados
        await sqlRequest.query(queryCliente);

        //Cria uma nova instância de sql.Request para inserir a chave de API
        sqlRequest = new sql.Request(transaction);

        //Prepara os parâmetros necessários para a inserção na tabela 'API_KEY'
        sqlRequest.input('id_cliente', sql.Int, newIdCliente);
        sqlRequest.input('api_key', sql.VarChar, apiKey); //chave de API gerada
        sqlRequest.input('nome_cliente', sql.VarChar, nome);

        //executa a query para inserir a chave de API
        await sqlRequest.query(queryApiKey);

        //se tudo ocorrer bem, confirma a transação (commita as alterações no banco)
        await transaction.commit();

        //retorna uma resposta de sucesso para o cliente
        response.status(201).send('Cliente criado com sucesso e API Key gerada!');
    } catch (error) {
        //se ocorrer qualquer erro, desfaz a transação (rollback), revertendo as alterações no banco
        await transaction.rollback();

        //registra o erro no console para que o time de desenvolvimento possa analisar
        console.error('Erro ao inserir o usuário:', error.message);

        //retorna um erro para o cliente com status HTTP 500
        response.status(500).send('Erro ao inserir o usuário');
    }
}
async function buscarServicosExistentes(transaction, id_cliente) {
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input('id_cliente', sql.Int, id_cliente);

    const result = await sqlRequest.query(`
        SELECT id_servico, id_funcionario_responsavel 
        FROM Notificacoes_Servicos 
        WHERE id_cliente = @id_cliente AND deleted = 0
    `);

    return result.recordset;
}
async function marcarServicosDeletados(transaction, id_cliente, existingServices, servicos) {
    for (const existing of existingServices) {
        const found = servicos.some(servico =>
            servico.id_servico === existing.id_servico &&
            servico.destinatarios.includes(existing.id_funcionario_responsavel)
        );

        if (!found) {
            const sqlRequest = new sql.Request(transaction);
            sqlRequest.input('id_cliente', sql.Int, id_cliente);
            sqlRequest.input('id_servico', sql.Int, existing.id_servico);
            sqlRequest.input('id_funcionario_responsavel', sql.Int, existing.id_funcionario_responsavel);

            await sqlRequest.query(`
                UPDATE Notificacoes_Servicos
                SET deleted = 1
                WHERE id_cliente = @id_cliente 
                AND id_servico = @id_servico
                AND id_funcionario_responsavel = @id_funcionario_responsavel
            `);
        }
    }
}
async function verificarServicoExistente(transaction, id_cliente, id_servico, id_funcionario_responsavel) {
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input('id_cliente', sql.Int, id_cliente);
    sqlRequest.input('id_servico', sql.Int, id_servico);
    sqlRequest.input('id_funcionario_responsavel', sql.Int, id_funcionario_responsavel);

    const result = await sqlRequest.query(`
        SELECT deleted 
        FROM Notificacoes_Servicos 
        WHERE id_cliente = @id_cliente 
        AND id_servico = @id_servico 
        AND id_funcionario_responsavel = @id_funcionario_responsavel
    `);
    // console.log("resultado do verifica Serviço :",result.recordset)
    return result.recordset.length > 0 ? result.recordset[0] : null;
}
async function reativarServico(transaction, id_cliente, servico, destinatario) {
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input('frequencia', sql.VarChar, servico.frequencia_notificacao);
    sqlRequest.input('tipo_notificacao', sql.VarChar, servico.metodos_notificacao.join(', '));
    sqlRequest.input('hora_notificacao', sql.Time, servico.horario_notificacao);
    sqlRequest.input('id_cliente', sql.Int, id_cliente);
    sqlRequest.input('id_servico', sql.Int, servico.id_servico);
    sqlRequest.input('id_funcionario_responsavel', sql.Int, destinatario);

    await sqlRequest.query(`
        UPDATE Notificacoes_Servicos 
        SET frequencia = @frequencia,
            tipo_notificacao = @tipo_notificacao,
            hora_notificacao = @hora_notificacao,
            deleted = 0
        WHERE id_cliente = @id_cliente 
        AND id_servico = @id_servico 
        AND id_funcionario_responsavel = @id_funcionario_responsavel
    `);
}
function validarHoraNotificacao(hora) {
    if (!hora) {
        return null;  // Se a hora for null, retorna null para o banco de dados
    }

    // Verifica se a string está no formato HH:MM
    const timeFormat = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeFormat.test(hora)) {
        // Adiciona ":00" para completar no formato HH:MM:SS
        return `${hora}:00`;
    }

    // Se a string já estiver no formato HH:MM:SS, não faz modificações
    const fullTimeFormat = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    if (fullTimeFormat.test(hora)) {
        return hora;
    }

    throw new Error("Invalid time format");  // Se não estiver em nenhum formato válido, lança erro
}
async function atualizarServicoExistente(transaction, id_cliente, servico, destinatario) {
    const sqlRequest = new sql.Request(transaction);
    const horaNotificacao = validarHoraNotificacao(servico.horario_notificacao);
    sqlRequest.input('frequencia', sql.VarChar, servico.frequencia_notificacao);
    sqlRequest.input('tipo_notificacao', sql.VarChar, servico.metodos_notificacao.join(', '));
    //validarHoraNotificacao(servico.horario_notificacao)
    console.log(horaNotificacao)
    sqlRequest.input('hora_notificacao', sql.VarChar, horaNotificacao); 
    sqlRequest.input('id_cliente', sql.Int, id_cliente);
    sqlRequest.input('id_servico', sql.Int, servico.id_servico);
    sqlRequest.input('id_funcionario_responsavel', sql.Int, destinatario);

    await sqlRequest.query(`
        UPDATE Notificacoes_Servicos 
        SET frequencia = @frequencia,
            tipo_notificacao = @tipo_notificacao,
            hora_notificacao = @hora_notificacao
        WHERE id_cliente = @id_cliente 
        AND id_servico = @id_servico 
        AND id_funcionario_responsavel = @id_funcionario_responsavel
    `);
}
async function inserirNovoServico(transaction, id_cliente, servico, destinatario) {
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input('nome', sql.VarChar, servico.nome_servico);
    sqlRequest.input('frequencia', sql.VarChar, servico.frequencia_notificacao);
    sqlRequest.input('tipo_notificacao', sql.VarChar, servico.metodos_notificacao.join(', '));
    sqlRequest.input('hora_notificacao', sql.Time, servico.horario_notificacao);
    sqlRequest.input('id_cliente', sql.Int, id_cliente);
    sqlRequest.input('id_servico', sql.Int, servico.id_servico);
    sqlRequest.input('id_funcionario_responsavel', sql.Int, destinatario);
    sqlRequest.input('deleted', sql.Bit, 0);

    await sqlRequest.query(`
        INSERT INTO Notificacoes_Servicos 
        (nome, id_cliente, frequencia, tipo_notificacao, id_funcionario_responsavel, hora_notificacao, id_servico, deleted)
        VALUES (@nome, @id_cliente, @frequencia, @tipo_notificacao, @id_funcionario_responsavel, @hora_notificacao, @id_servico, @deleted)
    `);
}
async function atualizar(request, response) {
    const { id_cliente, nome, cpfcnpj, ativo, usarapi, id_usuario } = request.body;
    const params = {
        nome: nome,
        cpfcnpj: cpfcnpj,
        ativo: convertToBoolean(ativo),
        updated: new Date(),
        usar_api: convertToBoolean(usarapi),
        atualizado: true,
        id_cliente: id_cliente
    };
    const query = `
    UPDATE clientes
    SET 
        nome = @nome,
        cpfcnpj = @cpfcnpj,
        ativo = @ativo,
        updated = @updated,
        usar_api = @usar_api,
        atualizado = @atualizado
    WHERE id_cliente = @id_cliente`;
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, (ativo));
        request.input('updated', sql.DateTime, new Date());
        request.input('usar_api', sql.Bit, (usarapi));
        request.input('atualizado', sql.Bit, true);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} atualizou o cliente:${id_cliente}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Cliente atualizado com sucesso");
        } else {
            logQuery('error', `O usuário ${id_usuario} falhou em atualizar o cliente:${id_cliente}`, 'falha', 'UPDATE', id_cliente, id_usuario, query, params);
        }
    } catch (error) {
        logQuery('error', error.message, 'falha', 'UPDATE', id_cliente, id_usuario, query, params);
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function deletar(request, response) {
    const { id_cliente, id_usuario } = request.body;
    const query = "UPDATE clientes SET deleted = 1 WHERE id_cliente = @id_cliente";
    const params = {
        id_cliente: id_cliente
    };
    try {

        if (!id_cliente) {
            return response.status(400).json({ error: "ID do cliente não foi enviado" });
        }

        const sqlRequest = new sql.Request();
        sqlRequest.input('id_cliente', sql.Int, id_cliente);

        const result = await sqlRequest.query(query);

        if (result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} deletou o cliente ${id_cliente}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(200).json({ message: "cliente excluído com sucesso" });
        } else {
            logQuery('error', `O usuário ${id_usuario} falhou em deletar o cliente ${id_cliente}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(404).json({ error: "cliente não encontrado" });
        }

    } catch (error) {
        logQuery('error', error.message, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}
async function salvarMenus(request, response) {
    const { id_cliente, perfil, menus, id_usuario } = request.body; // Certifique-se de que `id_usuario` é passado no body
    const referenciaCliente = 57;
    let transaction;
    const query = "Operação de salvar menus"; // Descrição genérica, já que há múltiplas operações
    const params = { id_cliente, perfil, menus };

    try {
        console.log("Perfil recebido:", perfil);
        const menuOrder = getMenuOrderByProfile(perfil); // Obter o menuOrder com base no perfil
        console.log("Menu Order selecionado:", menuOrder);

        transaction = new sql.Transaction();
        await transaction.begin();
        console.log("Transação iniciada");

        if (!menuOrder['Dashboard']) {
            throw new Error('Menu "Dashboard" não encontrado no menuOrder para o perfil especificado');
        }

        await inserirMenuPrincipal(transaction, id_cliente, perfil, 'Dashboard', menuOrder['Dashboard']);

        for (let menu of menus) {
            const order = menuOrder[menu.name];
            if (!order) {
                console.log(`Menu ${menu.name} não encontrado no menuOrder para o perfil ${perfil}`);
                continue;
            }

            await inserirMenuPrincipal(transaction, id_cliente, perfil, menu.name, order);

            for (let submenu of menu.submenus) {
                const submenuId = await inserirSubmenu(transaction, id_cliente, perfil, order.id_item, submenu, referenciaCliente);

                if (submenuId > 0 && submenu.subsubmenus) {
                    for (let subsubmenu of submenu.subsubmenus) {
                        await inserirSubsubmenu(transaction, id_cliente, perfil, order.id_item, submenuId, subsubmenu, referenciaCliente);
                    }
                }
            }
        }

        await transaction.commit();
        console.log("Transação concluída com sucesso");
        response.status(200).send('Menus salvos com sucesso!');
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Erro ao salvar menus:', error.message);
        response.status(500).send('Erro ao salvar menus');
    }
}
async function listarComMenu(request, response) {
    try {
        const queryClientes = `
            SELECT *
            FROM clientes
            WHERE deleted = 0`;

        const resultClientes = await new sql.Request().query(queryClientes);
        const clientes = resultClientes.recordset;

        // Array para armazenar os clientes com seus menus
        const clientesComMenu = [];

        for (const cliente of clientes) {
            const id_cliente = cliente.id_cliente;

            // Consulta para os menus principais deste cliente
            const queryMenu = `
                SELECT * FROM Menu
                WHERE Cod_cli = @id_cliente`;

            // Consulta para os itens de menu deste cliente
            const queryMenuItem = `
                SELECT * FROM menu_itens
                WHERE Cod_cli = @id_cliente`;

            const requestSql = new sql.Request();
            requestSql.input('id_cliente', sql.Int, id_cliente);

            const MenuR = await requestSql.query(queryMenu);
            const Menu = MenuR.recordset;

            const MenuItemR = await requestSql.query(queryMenuItem);
            const MenuItem = MenuItemR.recordset;

            // Construir a árvore de menus (ou vazio se não houver menus/itens)
            const menuTree = Menu.length > 0 || MenuItem.length > 0 ? buildMenuTree(Menu, MenuItem) : [];
            menuTree.forEach(cleanItems);

            // Adicionar a árvore de menus ao cliente
            clientesComMenu.push({
                ...cliente,
                menus: menuTree
            });
        }

        // Retornar os clientes com seus menus
        response.status(200).json(clientesComMenu);

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
function buildMenuTree(menus, menuItems) {
    const menuMap = {};
    const itemMap = {};

    // Popula o menuMap com os menus principais
    menus.forEach(menu => {
        menuMap[menu.ID_item] = {
            label: menu.Nome,
            icon: menu.Icone || null,
            to: menu.Nome.toLowerCase() === 'dashboard' ? '/dashboard' : (menu.To || null),
            items: []
        };
    });

    // Popula o itemMap com os itens do menu
    menuItems.forEach(item => {
        itemMap[item.ID] = {
            label: item.Nome,
            icon: item.Icone || null,
            to: item.to || null,
            items: []
        };
    });

    // Adiciona os itens aos seus menus ou sub-itens correspondentes
    menuItems.forEach(item => {
        if (item.ID_Sub_Item && item.ID_Sub_Item !== 0) {
            if (itemMap[item.ID_Sub_Item]) {
                itemMap[item.ID_Sub_Item].items.push(itemMap[item.ID]);
            }
        } else {
            if (menuMap[item.ID_Item]) {
                menuMap[item.ID_Item].items.push(itemMap[item.ID]);
            }
        }
    });

    // Converte o menuMap em um array de menus
    const menuTree = Object.values(menuMap);

    return menuTree;
}
function mapClientesComServicos(recordset) {
    return recordset.reduce((acc, row) => {
        const clienteIndex = acc.findIndex(c => c.id_cliente === row.id_cliente);

        if (clienteIndex === -1) {
            acc.push({
                id_cliente: row.id_cliente,
                nome: row.cliente_nome,
                servicos: row.id_servico ? [mapServico(row)] : []
            });
        } else {
            const serviceIndex = acc[clienteIndex].servicos.findIndex(s => s.id_servico === row.id_servico);

            if (serviceIndex === -1) {
                acc[clienteIndex].servicos.push(mapServico(row));
            } else {
                acc[clienteIndex].servicos[serviceIndex].notificacoes.push(mapNotificacao(row));
            }
        }

        return acc;
    }, []);
}
function mapServico(row) {
    return {
        id_servico: row.id_servico,
        nome: row.servico_nome,
        notificacoes: [mapNotificacao(row)]
    };
}
function mapNotificacao(row) {
    return {
        nome: row.nome,
        frequencia: row.frequencia,
        tipo_notificacao: row.tipo_notificacao,
        id_funcionario_responsavel: row.id_funcionario_responsavel,
        hora_notificacao: row.hora_notificacao
    };
}
function cleanItems(menu) {
    if (menu.items) {
        if (menu.items.length === 0) {
            delete menu.items;
        } else {
            menu.items.forEach(cleanItems);
        }
    }
}
async function deletarServico(request, response) {
    const { id_cliente, id_servico, id_usuario} = request.body;
    
    
    if (!id_cliente || !id_servico ) {
        return response.status(400).json({ error: "Parâmetros insuficientes. id_cliente, id_servico e id_funcionario_responsavel são obrigatórios." });
    }

    try {
        // Verificando se o serviço existe
        const checkQuery = `
            SELECT 1 
            FROM Notificacoes_Servicos 
            WHERE id_cliente = @id_cliente 
            AND id_servico = @id_servico 
            AND deleted = 0
        `;
        
        const checkSqlRequest = new sql.Request();
        checkSqlRequest.input('id_cliente', sql.Int, id_cliente);
        checkSqlRequest.input('id_servico', sql.Int, id_servico);
        
        const checkResult = await checkSqlRequest.query(checkQuery);
        
        if (checkResult.recordset.length === 0) {
            console.log('Serviço não encontrado ou já está deletado.');
            return response.status(404).json({ error: "Serviço não encontrado ou já está deletado." });
        }

        //tentar deletar
        const query = `
            UPDATE Notificacoes_Servicos 
            SET deleted = 1 
            WHERE id_cliente = @id_cliente 
            AND id_servico = @id_servico 
        `;
        
        const sqlRequest = new sql.Request();
        sqlRequest.input('id_cliente', sql.Int, id_cliente);
        sqlRequest.input('id_servico', sql.Int, id_servico);
        
        const result = await sqlRequest.query(query);

        if (result.rowsAffected[0] > 0) {
            console.log(`Serviço ${id_servico} para o cliente ${id_cliente} removido com sucesso.`);
            logQuery('info', `O usuário ${id_usuario} deletou o serviço ${id_servico} para o cliente ${id_cliente}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, { id_cliente, id_servico });
            return response.status(200).json({ message: "Serviço excluído com sucesso" });
        } else {
            console.log('Falha ao excluir o serviço: Nenhuma linha foi afetada.');
            logQuery('error', `O usuário ${id_usuario} falhou em deletar o serviço ${id_servico} para o cliente ${id_cliente}`, 'erro', 'DELETE', id_cliente, id_usuario, query, { id_cliente, id_servico});
            return response.status(404).json({ error: "Serviço não encontrado" });
        }
    } catch (error) {
        // Log do erro detalhado e resposta
        logQuery('error', error.message, 'erro', 'DELETE', id_cliente, id_usuario, error.stack, { "id_cliente":id_cliente, "id_servico":id_servico});
        console.error('Erro ao excluir:', error.message);
        return response.status(500).send('Erro ao excluir serviço');
    }
}
module.exports = {
    listar,
    listaSimples,
    atualizar,
    deletar,
    adicionar,
    salvarMenus,
    listarClienteComServicos,
    listarComMenu,
    adicionarServico,
    atualizarServico,
    deletarServico
};