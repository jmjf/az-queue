import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { v4 as uuidv4 } from 'uuid';
import { requestApiVersions } from "../supportedApiVersions";
import { PostRequestsResponse } from "../interfaces/httpRequests";

const httpError = 400;
const httpAccepted = 202;

function isRequestGood(context: Context, req:HttpRequest, requestId: string): boolean {
    const logIdentifier = `postRequests | ${requestId}`;
    let result = true;
    
    if (!req.body) {
        context.log(`ERROR | ${logIdentifier} | missing req.body`);
        result = false;
    } else if (!req.body.apiVersion) {
        context.log(`ERROR | ${logIdentifier} | missing req.body.apiVersion`);
        result = false;
    } else if (!requestApiVersions.includes(req.body.apiVersion)) {
        context.log(`ERROR | ${logIdentifier} | invalid apiVersion ${req.body.apiVersion}`);
        result = false;
    } else if (!req.body.requesterId || typeof req.body.requesterId != 'string' || req.body.requesterId.trim().length === 0) {
        context.log(`ERROR | ${logIdentifier} | requesterId missing or invalid`);
        result = false;
    } else if (!req.body.messageText || typeof req.body.messageText != 'string' || req.body.requesterId.trim().length === 0) {
        context.log(`ERROR | ${logIdentifier} | messageText missing or invalid`);
        result = false;
    }
    return result;
}

// If I need a GET, PUT, DELETE, add new functions in separate directories
// ensure their functions.json handles only the specific method they support
// ensure they specify route: requests in function.json
const postRequests: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const now = new Date();
    const message = <PostRequestsResponse>{
        apiVersion: '2022-02-15', // whatever we get, we're using this API version now
        requestId: uuidv4(), 
        requestDatetime: now.toISOString(), 
        requesterId: req.body?.requesterId || ''
    };
    const logIdentifier = `postRequests | ${message.requestId}`;
    let httpStatus = httpError; // default response is error
    context.log(`INFO | ${logIdentifier} | received request`);

    // If something's wrong, I want to log it without exposing the request data in the log, so this if...else structure
    if (isRequestGood(context, req, message.requestId)) {
        httpStatus = httpAccepted; // the request is good
        switch (req.body.apiVersion) {
            case '2022-02-12': 
                // check request components for API version 2022-02-12 if needed -- example of how we'd handle version differences
                if (!req.body.only0212) {
                    context.log(`INFO | ${logIdentifier} | apiVersion 2022-02-12 missing optional only0212`);
                } else {
                    context.log(`INFO | ${logIdentifier} | apiVersion 2022-02-12 has optional only0212 ${req.body.only0212}`)
                }
                break;
            case '2022-02-15':
                // Check request components for API version 2022-02-15 if needed
                context.log(`INFO | ${logIdentifier} | apiVersion 2022-02-15`);
                break;
        }
    }


    // If we didn't get an error, add messageText and put it on the queue
    if (httpStatus === httpAccepted) {
        message.messageText = req.body.messageText
        // if we drop support for an old apiVersion, we can remove conditions in the checks above
        // if we add attributes, we make them optional until the legacy apiVersion is dropped
            
        context.log(`OK | ${logIdentifier}`);

        context.bindings.requestsQueueItem = message;
    } 
    context.res = {
        status: httpStatus,
        body: message
    }
    context.done();
};

export default postRequests;

