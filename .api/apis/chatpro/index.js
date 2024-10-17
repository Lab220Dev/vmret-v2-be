"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var oas_1 = __importDefault(require("oas"));
var core_1 = __importDefault(require("api/dist/core"));
var openapi_json_1 = __importDefault(require("./openapi.json"));
var SDK = /** @class */ (function () {
    function SDK() {
        this.spec = oas_1.default.init(openapi_json_1.default);
        this.core = new core_1.default(this.spec, 'chatpro/unknown (api/6.1.2)');
    }
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    SDK.prototype.config = function (config) {
        this.core.setConfig(config);
    };
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    SDK.prototype.auth = function () {
        var _a;
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        (_a = this.core).setAuth.apply(_a, values);
        return this;
    };
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    SDK.prototype.server = function (url, variables) {
        if (variables === void 0) { variables = {}; }
        this.core.setServer(url, variables);
    };
    /**
     * Retorna o status da conexão entre a instância e o WhatsApp.
     *
     * @summary status
     * @throws FetchError<401, types.StatusResponse401> 401
     */
    SDK.prototype.status = function (metadata) {
        return this.core.fetch('/{instance_id}/api/v1/status', 'get', metadata);
    };
    /**
     * Gera um QR Code para conectar-se ao chatPro
     *
     * O QR Code gerado está no formato `base64`
     *
     * _Obs: o QR Code também é exibido no <a href="https://api.chatpro.com.br/painel"
     * target="_blank">Painel da API</a>._
     *
     * @summary generate_qrcode
     * @throws FetchError<401, types.GenerateQrcodeResponse401> 401
     */
    SDK.prototype.generate_qrcode = function (metadata) {
        return this.core.fetch('/{instance_id}/api/v1/generate_qrcode', 'get', metadata);
    };
    /**
     * Reinicia os processos da instância. Caso a instância esteja conectada, após o reinício
     * ela será reconectada automaticamente.
     *
     * Este processo é indicado quando sua instância apresenta alguma instabilidade ou não gera
     * QR Code.
     *
     * @summary reload
     * @throws FetchError<401, types.ReloadResponse401> 401
     */
    SDK.prototype.reload = function (metadata) {
        return this.core.fetch('/{instance_id}/api/v1/reload', 'get', metadata);
    };
    /**
     * Remove a sessão (desconecta-se do WhatsApp)
     *
     * @summary remove_session
     * @throws FetchError<401, types.RemoveSessionResponse401> 401
     */
    SDK.prototype.remove_session = function (metadata) {
        return this.core.fetch('/{instance_id}/api/v1/remove_session', 'get', metadata);
    };
    /**
     * Retorna informações de um contato
     *
     * @summary get_profile
     * @throws FetchError<401, types.GetProfileResponse401> 401
     */
    SDK.prototype.get_profile = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/get_profile', 'post', body, metadata);
    };
    /**
     * Retorna os contatos do WhatsApp conectado
     *
     * @summary contacts
     * @throws FetchError<401, types.ContactsResponse401> 401
     */
    SDK.prototype.contacts = function (metadata) {
        return this.core.fetch('/{instance_id}/api/v1/contacts', 'get', metadata);
    };
    /**
     * Cria um grupo para o WhatsApp conectado
     *
     * @summary create_group
     * @throws FetchError<401, types.CreateGroupResponse401> 401
     */
    SDK.prototype.create_group = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/create_group', 'post', body, metadata);
    };
    /**
     * Sai de um grupo do WhatsApp
     *
     * @summary leave_group
     * @throws FetchError<401, types.LeaveGroupResponse401> 401
     */
    SDK.prototype.leave_group = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/leave_group', 'post', body, metadata);
    };
    /**
     * Retorna todos os chats do WhatsApp conectado
     *
     * @summary chats
     * @throws FetchError<401, types.ChatsResponse401> 401
     */
    SDK.prototype.chats = function (metadata) {
        return this.core.fetch('/{instance_id}/api/v1/chats', 'get', metadata);
    };
    /**
     * Envia uma mensagem de texto
     *
     * @summary send_message
     * @throws FetchError<400, types.SendMessageResponse400> 400
     * @throws FetchError<401, types.SendMessageResponse401> 401
     * @throws FetchError<500, types.SendMessageResponse500> 500
     */
    SDK.prototype.send_message = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_message', 'post', body, metadata);
    };
    /**
     * Envia um arquivo a partir de uma URL
     *
     * @summary send_message_file_from_url
     * @throws FetchError<400, types.SendMessageFileFromUrlResponse400> 400
     * @throws FetchError<401, types.SendMessageFileFromUrlResponse401> 401
     * @throws FetchError<500, types.SendMessageFileFromUrlResponse500> 500
     */
    SDK.prototype.send_message_file_from_url = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_message_file_from_url', 'post', body, metadata);
    };
    /**
     * Envia uma localização
     *
     * @summary send_location
     * @throws FetchError<400, types.SendLocationResponse400> 400
     * @throws FetchError<401, types.SendLocationResponse401> 401
     * @throws FetchError<500, types.SendLocationResponse500> 500
     */
    SDK.prototype.send_location = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_location', 'post', body, metadata);
    };
    /**
     * Envia um vcard (contato)
     *
     * @summary send_vcard
     * @throws FetchError<400, types.SendVcardResponse400> 400
     * @throws FetchError<401, types.SendVcardResponse401> 401
     * @throws FetchError<500, types.SendVcardResponse500> 500
     */
    SDK.prototype.send_vcard = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_vcard', 'post', body, metadata);
    };
    /**
     * Encaminha uma mensagem
     *
     * @summary send_forward_message
     * @throws FetchError<400, types.SendForwardMessageResponse400> 400
     * @throws FetchError<401, types.SendForwardMessageResponse401> 401
     * @throws FetchError<500, types.SendForwardMessageResponse500> 500
     */
    SDK.prototype.send_forward_message = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_forward_message', 'post', body, metadata);
    };
    /**
     * Apaga uma mensagem
     *
     * @summary delete_message
     * @throws FetchError<400, types.DeleteMessageResponse400> 400
     * @throws FetchError<401, types.DeleteMessageResponse401> 401
     * @throws FetchError<500, types.DeleteMessageResponse500> 500
     */
    SDK.prototype.delete_message = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/delete_message', 'post', body, metadata);
    };
    SDK.prototype.get_message_byid = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/get_message_byid', 'post', body, metadata);
    };
    /**
     * Envia uma mensagem de texto com até três botões **(indisponível temporariamente)**
     *
     * @summary send_button_message
     * @throws FetchError<400, types.SendButtonMessageResponse400> 400
     * @throws FetchError<401, types.SendButtonMessageResponse401> 401
     * @throws FetchError<500, types.SendButtonMessageResponse500> 500
     */
    SDK.prototype.send_button_message = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_button_message', 'post', body, metadata);
    };
    /**
     * Envia uma mensagem do tipo lista. **(indisponível temporariamente)**
     *
     * @summary send_list_message
     * @throws FetchError<400, types.SendListMessageResponse400> 400
     * @throws FetchError<401, types.SendListMessageResponse401> 401
     * @throws FetchError<500, types.SendListMessageResponse500> 500
     */
    SDK.prototype.send_list_message = function (body, metadata) {
        return this.core.fetch('/{instance_id}/api/v1/send_list_message', 'post', body, metadata);
    };
    return SDK;
}());
var createSDK = (function () { return new SDK(); })();
module.exports = createSDK;
