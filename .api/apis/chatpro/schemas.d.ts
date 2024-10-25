declare const Chats: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const Contacts: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const CreateGroup: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["name", "phones"];
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Nome do grupo  (ex: `Grupo da Família`)";
            };
            readonly phones: {
                readonly type: "array";
                readonly description: "Números a serem adicionados no grupo (ex: `[\"1198884444\", \"1196881111\"]`)";
                readonly items: {
                    readonly type: "string";
                };
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (exemplo: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["É uma mensagem formatada da seguinte forma: 'Criou grupo com sucesso, com o id: groupId' "];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly groupId: {
                            readonly type: "string";
                            readonly examples: readonly ["ID do grupo no WhatsApp"];
                        };
                    };
                };
                readonly invalidParticipantsMessage: {
                    readonly type: "string";
                    readonly examples: readonly ["Informa se foi inserido algum número inválido"];
                };
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["É um boolean, que informa se a requisição foi bem sucedida ou não"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const DeleteMessage: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["message_id"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp que consta a mensagem a ser apagada (ex: `62953907197`)";
            };
            readonly message_id: {
                readonly type: "string";
                readonly description: "ID da mensagem a ser apagada (ex: `3EB0D2C0DF1DB21406FF`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Deletada para todos"];
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GenerateQrcode: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetMessageByid: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário (ex: `62953907197`)";
            };
            readonly id: {
                readonly type: "string";
                readonly description: "id da mensagem que deseja consultar (ex: `3EB03BE5888ACBE15BBB`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly id: {
                    readonly type: "string";
                    readonly examples: readonly ["false_5527998278888@c.us_3AA6415C5F4DDB233EEE"];
                };
                readonly body: {
                    readonly type: "string";
                    readonly examples: readonly ["Exemplo de mensagem recebida"];
                };
                readonly type: {
                    readonly type: "string";
                    readonly examples: readonly ["chat"];
                };
                readonly t: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [1672775086];
                };
                readonly notifyName: {
                    readonly type: "string";
                    readonly examples: readonly ["Exemplo Nome 🏄🏻‍♂️"];
                };
                readonly from: {
                    readonly type: "string";
                    readonly examples: readonly ["5527998278888@c.us"];
                };
                readonly to: {
                    readonly type: "string";
                    readonly examples: readonly ["5511969079999@c.us"];
                };
                readonly self: {
                    readonly type: "string";
                    readonly examples: readonly ["in"];
                };
                readonly ack: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [1];
                };
                readonly isNewMsg: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
                readonly star: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly kicNotified: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly recvFresh: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
                readonly isFromTemplate: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly broadcast: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly mentionedJidList: {
                    readonly type: "array";
                    readonly items: {};
                };
                readonly isVcardOverMmsDocument: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly isForwarded: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly labels: {
                    readonly type: "array";
                    readonly items: {};
                };
                readonly hasReaction: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly ephemeralOutOfSync: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly productHeaderImageRejected: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly lastPlaybackProgress: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [0];
                };
                readonly isDynamicReplyButtonsMsg: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly isMdHistoryMsg: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly requiresDirectConnection: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly pttForwardedFeaturesEnabled: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
                readonly chatId: {
                    readonly type: "object";
                    readonly properties: {
                        readonly server: {
                            readonly type: "string";
                            readonly examples: readonly ["c.us"];
                        };
                        readonly user: {
                            readonly type: "string";
                            readonly examples: readonly ["5527998278888"];
                        };
                        readonly _serialized: {
                            readonly type: "string";
                            readonly examples: readonly ["552799829999@c.us"];
                        };
                    };
                };
                readonly fromMe: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly sender: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "object";
                            readonly properties: {
                                readonly server: {
                                    readonly type: "string";
                                    readonly examples: readonly ["c.us"];
                                };
                                readonly user: {
                                    readonly type: "string";
                                    readonly examples: readonly ["5527998278888"];
                                };
                                readonly _serialized: {
                                    readonly type: "string";
                                    readonly examples: readonly ["5527998279999@c.us"];
                                };
                            };
                        };
                        readonly pushname: {
                            readonly type: "string";
                            readonly examples: readonly ["Exemplo Nome 🏄🏻‍♂️"];
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly examples: readonly ["in"];
                        };
                        readonly labels: {
                            readonly type: "array";
                            readonly items: {};
                        };
                        readonly formattedName: {
                            readonly type: "string";
                            readonly examples: readonly ["+55 27 99827-8888"];
                        };
                        readonly isMe: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [false];
                        };
                        readonly isMyContact: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [false];
                        };
                        readonly isPSA: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [false];
                        };
                        readonly isUser: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [true];
                        };
                        readonly isWAContact: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [true];
                        };
                        readonly profilePicThumbObj: {
                            readonly type: "object";
                            readonly properties: {
                                readonly id: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly server: {
                                            readonly type: "string";
                                            readonly examples: readonly ["c.us"];
                                        };
                                        readonly user: {
                                            readonly type: "string";
                                            readonly examples: readonly ["552799828888"];
                                        };
                                        readonly _serialized: {
                                            readonly type: "string";
                                            readonly examples: readonly ["5527998278888@c.us"];
                                        };
                                    };
                                };
                                readonly tag: {
                                    readonly type: "string";
                                    readonly examples: readonly [""];
                                };
                            };
                        };
                        readonly msgs: {};
                    };
                };
                readonly timestamp: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [1672775086];
                };
                readonly content: {
                    readonly type: "string";
                    readonly examples: readonly ["Exemplo de mensagem recebida"];
                };
                readonly isGroupMsg: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly isMedia: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly isNotification: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly isPSA: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly mediaData: {
                    readonly type: "object";
                    readonly properties: {};
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetProfile: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp (ex: `62953907197`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (exemplo: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly eurl: {
                    readonly type: "string";
                    readonly examples: readonly ["Link da imagem de perfil"];
                };
                readonly imgUrl: {
                    readonly type: "string";
                    readonly examples: readonly ["Link da imagem de perfil"];
                };
                readonly jid: {
                    readonly type: "string";
                    readonly examples: readonly ["ID do usuário no WhatsApp"];
                };
                readonly name: {
                    readonly type: "string";
                    readonly examples: readonly ["Nome que você deu para o contato"];
                };
                readonly pushname: {
                    readonly type: "string";
                    readonly examples: readonly ["Nome definido pelo contato quando ele criou a sua conta"];
                };
                readonly setAt: {
                    readonly type: "string";
                    readonly examples: readonly [""];
                };
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly [""];
                };
                readonly tag: {
                    readonly type: "string";
                    readonly examples: readonly [""];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const LeaveGroup: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["jid"];
        readonly properties: {
            readonly jid: {
                readonly type: "string";
                readonly description: "ID do grupo que deseja sair";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["É uma mensagem formatada da seguinte forma: 'Saiu do grupo, com o id: groupID' "];
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const Reload: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["OK"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const RemoveSession: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Sessão removida"];
                };
                readonly status: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [200];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendButtonMessage: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "message", "buttons"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário  (ex: `62953907197`)";
            };
            readonly message: {
                readonly type: "string";
                readonly description: "Mensagem a ser enviada. Emojis são permitidos. (ex: `Bom dia! 😉`)";
            };
            readonly buttons: {
                readonly type: "array";
                readonly description: "Array com até três strings, indicando o título do botão. Ex.: [ { \"id\": \"1\",  \"text\": \"Comercial\" },     { \"id\": \"2\",  \"text\": \"Suporte\" }]";
                readonly items: {
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly description: "Id do botão";
                        };
                        readonly text: {
                            readonly type: "string";
                            readonly description: "Texto do botão";
                        };
                    };
                    readonly required: readonly ["id", "text"];
                    readonly type: "object";
                };
            };
            readonly title: {
                readonly type: "string";
                readonly description: "Título da mensagem de botão";
            };
            readonly footer: {
                readonly type: "string";
                readonly description: "Rodapé da mensagem de botão.";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["ID da mensagem enviada"];
                        };
                        readonly timestamp: {
                            readonly type: "string";
                            readonly examples: readonly ["Data de envio da mensagem em timestamp"];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendForwardMessage: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "forward_id"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário (ex: `11953907197`)";
            };
            readonly forward_id: {
                readonly type: "string";
                readonly description: "ID da mensagem a ser encaminhada (ex: `3EB0D2C0DF1DB21406FF`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["ID da mensagem enviada"];
                        };
                        readonly timestamp: {
                            readonly type: "string";
                            readonly examples: readonly ["Data de envio da mensagem em timestamp"];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendListMessage: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "message", "button_text", "list_sections"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário  (ex: `62953907197`)";
            };
            readonly message: {
                readonly type: "string";
                readonly description: "Mensagem a ser enviada. Emojis são permitidos. (ex: `Bom dia! 😉`)";
            };
            readonly title: {
                readonly type: "string";
                readonly description: "Título da mensagem de botão";
            };
            readonly footer: {
                readonly type: "string";
                readonly description: "Rodapé da mensagem de botão.";
            };
            readonly button_text: {
                readonly type: "string";
                readonly description: "Botão para abrir as opções da lista";
                readonly default: "Opções";
            };
            readonly list_sections: {
                readonly type: "array";
                readonly items: {
                    readonly properties: {
                        readonly title: {
                            readonly type: "string";
                            readonly description: "Título da seção da lista";
                        };
                        readonly rows: {
                            readonly type: "array";
                            readonly items: {
                                readonly properties: {
                                    readonly title: {
                                        readonly type: "string";
                                        readonly description: "Título da opção";
                                    };
                                    readonly description: {
                                        readonly type: "string";
                                        readonly description: "Descrição da opção";
                                    };
                                };
                                readonly required: readonly ["title"];
                                readonly type: "object";
                            };
                        };
                    };
                    readonly type: "object";
                };
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["ID da mensagem enviada"];
                        };
                        readonly timestamp: {
                            readonly type: "string";
                            readonly examples: readonly ["Data de envio da mensagem em timestamp"];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendLocation: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "lat", "lng"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário (ex: `62953907197`)";
            };
            readonly lat: {
                readonly type: "string";
                readonly description: "Coordenada da latitude (ex: `-19.8012712`)";
            };
            readonly lng: {
                readonly type: "string";
                readonly description: "Coordenada da longitude (ex: `-40.7039535`)";
            };
            readonly address: {
                readonly type: "string";
                readonly description: "Endereço a ser exibido (ex: `Av. Paulista, 1005. São Paulo-SP`)";
            };
            readonly name: {
                readonly type: "string";
                readonly description: "Nome do local a ser exibido (ex:  `Ed. São Miguel`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["ID da mensagem enviada "];
                        };
                        readonly timestamp: {
                            readonly type: "string";
                            readonly examples: readonly ["Data de envio da mensagem em timestamp"];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendMessage: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "message"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário  (ex: `62953907197`)";
            };
            readonly message: {
                readonly type: "string";
                readonly description: "Mensagem a ser enviada. Emojis são permitidos. (ex: `Bom dia! 😉`)";
            };
            readonly quoted_message_id: {
                readonly type: "string";
                readonly description: "Opcional. ID da mensagem a ser respondida (ex: `3EB0D2C0DF1DB21406FF`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "201": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["ID da mensagem enviada"];
                        };
                        readonly timestamp: {
                            readonly type: "string";
                            readonly examples: readonly ["Data de envio da mensagem em timestamp"];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendMessageFileFromUrl: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "url"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário (ex: `62953907197`)";
            };
            readonly url: {
                readonly type: "string";
                readonly description: "URL do arquivo a ser enviado (ex: `https://api.chatpro.com.br/img/icone1.png`)";
            };
            readonly caption: {
                readonly type: "string";
                readonly description: "Legenda do arquivo. Permitido ao enviar imagens e documentos (ex: `Foto da reunião de ontem`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["ID da mensagem enviada"];
                        };
                        readonly timestamp: {
                            readonly type: "string";
                            readonly examples: readonly ["Data de envio da mensagem em timestamp"];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const SendVcard: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["number", "contact_name", "contact_number"];
        readonly properties: {
            readonly number: {
                readonly type: "string";
                readonly description: "Número do WhatsApp do destinatário  (ex: \"11963907197`)";
            };
            readonly contact_name: {
                readonly type: "string";
                readonly description: "Nome do contato a ser compartilhado (ex: `João da Silva`)";
            };
            readonly contact_number: {
                readonly type: "string";
                readonly description: "Número do contato a ser compartilhado (ex: `+55 68 94462-1573`)";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (ex: `chatpro-fx5qbe2hah`)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Mensagem Enviada"];
                };
                readonly resposeMessage: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly examples: readonly ["3EB0632F1F51261D2360"];
                        };
                        readonly timestamp: {
                            readonly type: "integer";
                            readonly default: 0;
                            readonly examples: readonly [1661362613058];
                        };
                    };
                };
                readonly status: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: NotFoundException: O número {número informado} não está cadastrado no WhatsApp"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly statusCode: {
                        readonly type: "integer";
                        readonly default: 0;
                        readonly examples: readonly [400];
                    };
                    readonly message: {
                        readonly type: "string";
                        readonly examples: readonly ["error: Error: Invalid WID value for {número informado}"];
                    };
                    readonly error: {
                        readonly type: "string";
                        readonly examples: readonly ["Bad Request"];
                    };
                };
            }];
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "500": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [500];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Internal server error"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const Status: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly instance_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                    readonly description: "Código da sua instância (exemplo: chatpro-fx5qbe2hah)";
                };
            };
            readonly required: readonly ["instance_id"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly connected: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [true];
                };
                readonly power_save: {
                    readonly type: "boolean";
                    readonly default: true;
                    readonly examples: readonly [false];
                };
                readonly name: {
                    readonly type: "string";
                    readonly examples: readonly ["Nome da sua instância"];
                };
                readonly info: {
                    readonly type: "object";
                    readonly properties: {
                        readonly Battery: {
                            readonly type: "integer";
                            readonly default: 0;
                            readonly examples: readonly [100];
                        };
                        readonly Platform: {
                            readonly type: "string";
                            readonly examples: readonly ["A plataforma na qual você escaneou o QR Code, podendo ser IOS ou Android"];
                        };
                        readonly Connected: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [true];
                        };
                        readonly Pushname: {
                            readonly type: "string";
                            readonly examples: readonly ["O seu nome no WhatsApp, definido por você no momento da criação da sua conta"];
                        };
                        readonly Wid: {
                            readonly type: "string";
                            readonly examples: readonly ["É o seu ID no WhatsApp"];
                        };
                        readonly Lc: {
                            readonly type: "string";
                            readonly examples: readonly ["BR"];
                        };
                        readonly Phone: {
                            readonly type: "object";
                            readonly properties: {
                                readonly Mcc: {
                                    readonly type: "string";
                                    readonly examples: readonly ["000"];
                                };
                                readonly Mnc: {
                                    readonly type: "string";
                                    readonly examples: readonly ["000"];
                                };
                                readonly OsVersion: {
                                    readonly type: "string";
                                    readonly examples: readonly ["9"];
                                };
                                readonly DeviceManufacturer: {
                                    readonly type: "string";
                                    readonly examples: readonly ["Web Beta"];
                                };
                                readonly DeviceModel: {
                                    readonly type: "string";
                                    readonly examples: readonly ["octopus_cheets"];
                                };
                                readonly OsBuildNumber: {
                                    readonly type: "string";
                                    readonly examples: readonly ["R92-13982.82.0 release-keys"];
                                };
                                readonly WaVersion: {
                                    readonly type: "string";
                                    readonly examples: readonly ["2.21.21.19"];
                                };
                            };
                        };
                        readonly Plugged: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [true];
                        };
                        readonly Tos: {
                            readonly type: "integer";
                            readonly default: 0;
                            readonly examples: readonly [0];
                        };
                        readonly Lg: {
                            readonly type: "string";
                            readonly examples: readonly ["pt"];
                        };
                        readonly Is24h: {
                            readonly type: "boolean";
                            readonly default: true;
                            readonly examples: readonly [true];
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "401": {
            readonly type: "object";
            readonly properties: {
                readonly statusCode: {
                    readonly type: "integer";
                    readonly default: 0;
                    readonly examples: readonly [401];
                };
                readonly message: {
                    readonly type: "string";
                    readonly examples: readonly ["Unauthorized"];
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
export { Chats, Contacts, CreateGroup, DeleteMessage, GenerateQrcode, GetMessageByid, GetProfile, LeaveGroup, Reload, RemoveSession, SendButtonMessage, SendForwardMessage, SendListMessage, SendLocation, SendMessage, SendMessageFileFromUrl, SendVcard, Status };
