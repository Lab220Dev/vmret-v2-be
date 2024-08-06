const sql = require("mssql");
const { format } = require("date-fns");

async function listarDM(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query =
      "SELECT *  FROM DMS WHERE IDcliente = @id_cliente AND Deleted = 0";

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function adicionar(request, response) {
  const { id_cliente, numero, identificação, ativo,
    voucher, facial, senha, biometria, integracao, userID, ClienteID, chave } = request.body;
  if (!id_cliente) {
    response.status(401).json("ID do cliente não enviado");
    return;
  }
  const query = `INSERT INTO DMs ( IDcliente, Numero, Identificacao, Ativo, Deleted, Created, 
      Updated, Versao, Enviada, OP_Senha, OP_Biometria, OP_Facial, Integracao, ClienteID, UserID, Chave)
      Values (@IDcliente, @Numero, @Identificacao, @Ativo, @Deleted, @Created, @Updated, @Versao, @Enviada,
      @OP_Senha, @OP_Biometria, @OP_Facial, @Integracao, @Integracao, @ClienteID, @UserID,@Chave)`

  request = new sql.Request();
  request.input('IDcliente', sql.VarChar, id_cliente);
  request.input('Numero', sql.VarChar, numero);
  request.input('Identificacao', sql.Bit, convertToBoolean(identificação));
  request.input('Ativo', sql.Bit, convertToBoolean(ativo));
  request.input('Deleted', sql.Bit, false);
  request.input('Created', sql.DateTime, new Date());
  request.input('Updated', sql.DateTime, '1900-01-01 00:00:00.000');
  request.input('Versao', sql.Int, 1);
  request.input('Enviada', sql.Bit, false);
  request.input('OP_Senha', sql.Bit, convertToBoolean(senha));
  request.input('OP_Biometria', sql.Bit, convertToBoolean(biometria));
  request.input('OP_Facial', sql.Bit, convertToBoolean(facial));
  request.input('Integracao', sql.Bit, convertToBoolean(integracao));
  request.input('ClienteID', sql.DateTime,ClienteID);
  request.input('UserID', sql.DateTime, userID);
  request.input('Chave', sql.NVarChar, chave);
  request = new sql.Request();

  const result = await request.query(query);
  if (result) {
      response.status(201).send("DM criado com sucesso!");
      return
  }
  response.status(400).send("Falha ao criar a DM!");


}
module.exports = {
  adicionar, listarDM
}