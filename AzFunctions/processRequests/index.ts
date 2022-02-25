import { AzureFunction, Context } from "@azure/functions";
import { preparedApiVersions, statusApiVersions } from "../supportedApiVersions";
import { PreparedMessage } from "../interfaces/queueMessages";

const processRequests: AzureFunction = async function (context: Context, preparedItem: PreparedMessage): Promise<void> {
    const fnName = `processRequests`;
    let statusCode = '';
    let statusText = '';

    context.log(`INFO | ${fnName} | received message`)

    // REAL WORLD: Fully validate incoming message

    if (!preparedApiVersions.includes(preparedItem.apiVersion)) {
        statusCode = 'ERROR';
        statusText = `invalid apiVersion ${preparedItem.apiVersion} for requestId ${preparedItem.requestId}`;
        context.log(`ERROR | ${fnName} | ${statusText}`);
    } else {
        // In the real world, do processing and set status based on outcome
        statusCode = 'OK';
        statusText = `${preparedItem.messageText} | processed OK`;
    }

    const statusItem = {
        apiVersion: statusApiVersions[1],
        requestId: preparedItem.requestId,
        statusDatetime: (new Date()).toISOString(),
        statusCode: statusCode,
        statusText: statusText
    }
    context.bindings.statusItem = statusItem;
};

export default processRequests;
