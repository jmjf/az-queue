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
const uuid_1 = require("uuid");
const supportedApiVersions_1 = require("../supportedApiVersions");
// If I need a GET, PUT, DELETE, add new functions in separate directories
// ensure their functions.json handles only the specific method they support
// ensure they specify route: requests in function.json
const postRequests = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const fnName = 'postRequests';
        let httpStatus = 0;
        context.log(`INFO | ${fnName} | received request`);
        // request validation
        if (!req.body) {
            context.log(`ERROR | ${fnName} | req.body falsey`);
            httpStatus = 400;
        }
        else if (!req.body.apiVersion) {
            context.log(`ERROR | ${fnName} | req.body.apiVersion falsey`);
            httpStatus = 400;
        }
        else {
            // we have a body (data payload) and API version
            if (!supportedApiVersions_1.requestApiVersions.includes(req.body.apiVersion)) {
                context.log(`ERROR | ${fnName} | invalid apiVersion ${req.body.apiVersion}`);
                httpStatus = 400;
            }
            else {
                // common to all supported API versions
                if (!req.body.requesterId || typeof req.body.requesterId != 'string' || req.body.requesterId.trim().length === 0) {
                    context.log(`ERROR | ${fnName} | requesterId missing or invalid`);
                    httpStatus = 400;
                }
                else if (!req.body.messageText || typeof req.body.messageText != 'string' || req.body.requesterId.trim().length === 0) {
                    context.log(`ERROR | ${fnName} | messageText missing or invalid`);
                    httpStatus = 400;
                }
                else if (req.body.apiVersion == '2022-02-12') {
                    // check request components for API version 2022-02-12 if needed
                    if (!req.body.only0212) {
                        context.log(`INFO | ${fnName} | apiVersion 2022-02-12 missing optional only0212`);
                    }
                    else {
                        context.log(`INFO | ${fnName} | apiVersion 2022-02-12 has optional only0212 ${req.body.only0212}`);
                    }
                }
                else if (req.body.apiVersion == '2022-02-15') {
                    // Check request components for API version 2022-02-15 if needed
                    context.log(`INFO | ${fnName} | apiVersion 2022-02-15`);
                }
            }
        }
        // did we get an error?
        if (httpStatus) {
            context.res = {
                status: 400
            };
        }
        else {
            const message = {
                apiVersion: '2022-02-15',
                requestId: (0, uuid_1.v4)(),
                requestDatetime: now.toISOString(),
                requesterId: req.body.requesterId,
                messageText: req.body.messageText
                // if we drop only0212, then we can leave it out of the message
                // if we add attributes, we optionally add them to the message
            };
            context.log(`INFO | ${fnName} | requestId ${message.requestId} at ${message.requestDatetime}`);
            context.bindings.requestsQueueItem = message;
            context.res = {
                status: 200,
                body: message
            };
        }
        context.done();
    });
};
exports.default = postRequests;
//# sourceMappingURL=index.js.map