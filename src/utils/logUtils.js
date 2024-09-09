const { logWithOperation } = require('../../src/middleware/Logger');

function buildQuery(query, params) {
    let queryWithValues = query;
    Object.keys(params).forEach(key => {
        const value = params[key];
        const formattedValue = typeof value === 'string' ? `'${value}'` : value;
        queryWithValues = queryWithValues.replace(new RegExp(`@${key}`, 'g'), formattedValue);
    });
    return queryWithValues;
}
function logQuery(level, message, resultado, operacao, id_cliente, id_usuario, query, params) {
    const loggedQuery = buildQuery(query, params);
    logWithOperation(level, message, resultado, operacao, id_cliente, id_usuario, loggedQuery);
}

module.exports = {
    logQuery
};
