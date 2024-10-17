import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core';
import Oas from 'oas';
import APICore from 'api/dist/core';
declare class SDK {
    spec: Oas;
    core: APICore;
    constructor();
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config: ConfigOptions): void;
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
    auth(...values: string[] | number[]): this;
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
    server(url: string, variables?: {}): void;
    /**
     * Retorna o status da conexão entre a instância e o WhatsApp.
     *
     * @summary status
     * @throws FetchError<401, types.StatusResponse401> 401
     */
    status(metadata: types.StatusMetadataParam): Promise<FetchResponse<200, types.StatusResponse200>>;
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
    generate_qrcode(metadata: types.GenerateQrcodeMetadataParam): Promise<FetchResponse<200, types.GenerateQrcodeResponse200>>;
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
    reload(metadata: types.ReloadMetadataParam): Promise<FetchResponse<200, types.ReloadResponse200>>;
    /**
     * Remove a sessão (desconecta-se do WhatsApp)
     *
     * @summary remove_session
     * @throws FetchError<401, types.RemoveSessionResponse401> 401
     */
    remove_session(metadata: types.RemoveSessionMetadataParam): Promise<FetchResponse<200, types.RemoveSessionResponse200>>;
    /**
     * Retorna informações de um contato
     *
     * @summary get_profile
     * @throws FetchError<401, types.GetProfileResponse401> 401
     */
    get_profile(body: types.GetProfileBodyParam, metadata: types.GetProfileMetadataParam): Promise<FetchResponse<200, types.GetProfileResponse200>>;
    /**
     * Retorna os contatos do WhatsApp conectado
     *
     * @summary contacts
     * @throws FetchError<401, types.ContactsResponse401> 401
     */
    contacts(metadata: types.ContactsMetadataParam): Promise<FetchResponse<200, types.ContactsResponse200>>;
    /**
     * Cria um grupo para o WhatsApp conectado
     *
     * @summary create_group
     * @throws FetchError<401, types.CreateGroupResponse401> 401
     */
    create_group(body: types.CreateGroupBodyParam, metadata: types.CreateGroupMetadataParam): Promise<FetchResponse<200, types.CreateGroupResponse200>>;
    /**
     * Sai de um grupo do WhatsApp
     *
     * @summary leave_group
     * @throws FetchError<401, types.LeaveGroupResponse401> 401
     */
    leave_group(body: types.LeaveGroupBodyParam, metadata: types.LeaveGroupMetadataParam): Promise<FetchResponse<200, types.LeaveGroupResponse200>>;
    /**
     * Retorna todos os chats do WhatsApp conectado
     *
     * @summary chats
     * @throws FetchError<401, types.ChatsResponse401> 401
     */
    chats(metadata: types.ChatsMetadataParam): Promise<FetchResponse<200, types.ChatsResponse200>>;
    /**
     * Envia uma mensagem de texto
     *
     * @summary send_message
     * @throws FetchError<400, types.SendMessageResponse400> 400
     * @throws FetchError<401, types.SendMessageResponse401> 401
     * @throws FetchError<500, types.SendMessageResponse500> 500
     */
    send_message(body: types.SendMessageBodyParam, metadata: types.SendMessageMetadataParam): Promise<FetchResponse<201, types.SendMessageResponse201>>;
    /**
     * Envia um arquivo a partir de uma URL
     *
     * @summary send_message_file_from_url
     * @throws FetchError<400, types.SendMessageFileFromUrlResponse400> 400
     * @throws FetchError<401, types.SendMessageFileFromUrlResponse401> 401
     * @throws FetchError<500, types.SendMessageFileFromUrlResponse500> 500
     */
    send_message_file_from_url(body: types.SendMessageFileFromUrlBodyParam, metadata: types.SendMessageFileFromUrlMetadataParam): Promise<FetchResponse<200, types.SendMessageFileFromUrlResponse200>>;
    /**
     * Envia uma localização
     *
     * @summary send_location
     * @throws FetchError<400, types.SendLocationResponse400> 400
     * @throws FetchError<401, types.SendLocationResponse401> 401
     * @throws FetchError<500, types.SendLocationResponse500> 500
     */
    send_location(body: types.SendLocationBodyParam, metadata: types.SendLocationMetadataParam): Promise<FetchResponse<200, types.SendLocationResponse200>>;
    /**
     * Envia um vcard (contato)
     *
     * @summary send_vcard
     * @throws FetchError<400, types.SendVcardResponse400> 400
     * @throws FetchError<401, types.SendVcardResponse401> 401
     * @throws FetchError<500, types.SendVcardResponse500> 500
     */
    send_vcard(body: types.SendVcardBodyParam, metadata: types.SendVcardMetadataParam): Promise<FetchResponse<200, types.SendVcardResponse200>>;
    /**
     * Encaminha uma mensagem
     *
     * @summary send_forward_message
     * @throws FetchError<400, types.SendForwardMessageResponse400> 400
     * @throws FetchError<401, types.SendForwardMessageResponse401> 401
     * @throws FetchError<500, types.SendForwardMessageResponse500> 500
     */
    send_forward_message(body: types.SendForwardMessageBodyParam, metadata: types.SendForwardMessageMetadataParam): Promise<FetchResponse<200, types.SendForwardMessageResponse200>>;
    /**
     * Apaga uma mensagem
     *
     * @summary delete_message
     * @throws FetchError<400, types.DeleteMessageResponse400> 400
     * @throws FetchError<401, types.DeleteMessageResponse401> 401
     * @throws FetchError<500, types.DeleteMessageResponse500> 500
     */
    delete_message(body: types.DeleteMessageBodyParam, metadata: types.DeleteMessageMetadataParam): Promise<FetchResponse<200, types.DeleteMessageResponse200>>;
    /**
     * Retorna informações detalhadas de mensagens enviadas ou recebidas
     *
     * @summary get_message_byid
     * @throws FetchError<400, types.GetMessageByidResponse400> 400
     */
    get_message_byid(body: types.GetMessageByidBodyParam, metadata: types.GetMessageByidMetadataParam): Promise<FetchResponse<200, types.GetMessageByidResponse200>>;
    get_message_byid(metadata: types.GetMessageByidMetadataParam): Promise<FetchResponse<200, types.GetMessageByidResponse200>>;
    /**
     * Envia uma mensagem de texto com até três botões **(indisponível temporariamente)**
     *
     * @summary send_button_message
     * @throws FetchError<400, types.SendButtonMessageResponse400> 400
     * @throws FetchError<401, types.SendButtonMessageResponse401> 401
     * @throws FetchError<500, types.SendButtonMessageResponse500> 500
     */
    send_button_message(body: types.SendButtonMessageBodyParam, metadata: types.SendButtonMessageMetadataParam): Promise<FetchResponse<200, types.SendButtonMessageResponse200>>;
    /**
     * Envia uma mensagem do tipo lista. **(indisponível temporariamente)**
     *
     * @summary send_list_message
     * @throws FetchError<400, types.SendListMessageResponse400> 400
     * @throws FetchError<401, types.SendListMessageResponse401> 401
     * @throws FetchError<500, types.SendListMessageResponse500> 500
     */
    send_list_message(body: types.SendListMessageBodyParam, metadata: types.SendListMessageMetadataParam): Promise<FetchResponse<200, types.SendListMessageResponse200>>;
}
declare const createSDK: SDK;
export = createSDK;
