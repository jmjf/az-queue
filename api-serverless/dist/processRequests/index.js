"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const supportedApiVersions_1 = require("../supportedApiVersions");
const processRequests = function (context, preparedItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const fnName = `processRequests`;
        let statusCode = '';
        let statusText = '';
        context.log(`INFO | ${fnName} | received message`);
        // REAL WORLD: Fully validate incoming message
        if (!supportedApiVersions_1.preparedApiVersions.includes(preparedItem.apiVersion)) {
            statusCode = 'ERROR';
            statusText = `invalid apiVersion ${preparedItem.apiVersion} for requestId ${preparedItem.requestId}`;
            context.log(`ERROR | ${fnName} | ${statusText}`);
        }
        else {
            // In the real world, do processing and set status based on outcome
            statusCode = 'OK';
            statusText = `${preparedItem.messageText} | processed OK`;
        }
        const statusItem = {
            apiVersion: supportedApiVersions_1.statusApiVersions[1],
            requestId: preparedItem.requestId,
            statusDatetime: (new Date()).toISOString(),
            statusCode: statusCode,
            statusText: statusText
        };
        context.bindings.statusItem = statusItem;
    });
};
exports.default = processRequests;
//# sourceMappingURL=index.js.map