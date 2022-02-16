import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { v4 as uuidv4 } from 'uuid';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const now = new Date();
    const fnName = 'post-requests';
    const supportedApiVersions = ['2022-02-12', '2022-02-15'];
    let httpStatus = 0;
    context.log(`| INFO | ${fnName} | received request`);

    // request validation
    if (!req.body) {
        context.log(`| ERROR | ${fnName} | req.body falsey`);
        httpStatus = 400;
    } else if (!req.body.apiVersion) {
        context.log(`| ERROR | ${fnName} | req.body.apiVersion falsey`);
        httpStatus = 400;
    } else {
        // we have a body (data payload) and API version
        if (!supportedApiVersions.includes(req.body.apiVersion)) {
            context.log(`| ERROR | ${fnName} | invalid apiVersion ${req.body.apiVersion}`);
            httpStatus = 400;
        } else {
            // common to all supported API versions
            if (!req.body.requesterId || typeof req.body.requesterId != 'string' || req.body.requesterId.trim().length === 0) {
                context.log(`ERROR | ${fnName} | requesterId missing or invalid`);
                httpStatus = 400;
            } else if (!req.body.messageText || typeof req.body.messageText != 'string' || req.body.requesterId.trim().length === 0) {
                context.log(`ERROR | ${fnName} | messageText missing or invalid`);
                httpStatus = 400;
            } else if (req.body.apiVersion == '2022-02-12') {
                // check request components for API version 2022-02-12 if needed
                if (!req.body.only0212) {
                    context.log(`INFO | ${fnName} | apiVersion 2022-02-12 missing optional only0212`);
                } else {
                    context.log(`INFO | ${fnName} | apiVersion 2022-02-12 has optional only0212 ${req.body.only021}`)
                }
            } else if (req.body.apiVersion == '2022-02-15') {
                // Check request components for API version 2022-02-15 if needed
                context.log(`INFO | ${fnName} | apiVersion 2022-02-15`);
            }
        }
    }

    // did we get an error?
    if (httpStatus) {
        context.res = {
            status: 400
        }
    } else {
        const message = {
            apiVersion: '2022-02-15', // whatever we get, we're using this API version now
            requestId: uuidv4(), 
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
};

export default httpTrigger;

