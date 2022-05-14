# az-queue

A proof of concept experiment with Azure Storage queues.

Demo parts:
* Send request messages (JSON) to a request queue
  * Calls an Azure Function (`api-serverles/postRequests`) that ensures requests conform to the API and returns a request id
  * Random delay of two to ten seconds between each request
* Read the request queue and put them on a prepared request queue
  * Simulates a process that reads the request, does something to it then sends it to another process
* Read requests from the prepared request queue and put them on a status queue
  * An Azure Function (`api-serverless/processRequests`) triggered when a message arrives in the prepared request queue
  * Simulates the other process that receives the prepared request and puts status messages on a queue
* Read requests from the status queue
  * Simulates a process that reads the status messages to build a log or other data store

The demo includes an `AzureQueue` class with a `waitForMessages()` method that polls the queue.
* If no message is waiting, the loop increments a delay up to a maximum delay.
* If a message is found, the loop calls a queue handler function (parameter) and resets the delay.
  * If the handler succeeds, the loop deletes the message from the queue.
  * If the handler fails, the loop does not delete the message (message will automatically requeue after a timeout) and proceeds to the next message.
  * If the handler fails on the same message five times, the loop moves the message to a poison queue and deletes it from the main queue.

The demo also includes a `DelayManager` class that allows configurable delay behavior.

## Setup

```bash
git clone https://github.com/jmjf/az-queue
cd az-queue

npm install

npx tsc

mkdir env
cp SAMPLE.env env/local.env
cp SAMPLE.env env/azure.env
```

Decide if you'll use local mode or Azure mode.

### Local mode
Local mode uses emulators so you can experiment without connecting to Azure. 

To use local mode, you must have:
* VS Code and the Azurite and Azure Tools extensions

  **OR**

* [Azurite](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite) (pick your tab) and [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Clinux%2Ccsharp%2Cportal%2Cbash)

**NOTE:** I've tested with VS Code only. If you'd like to send a PR with instructions for non-VS Code, I'll probably accept it.

Set your credential information in `env/local.env`. Azurite requires `AUTH_METHOD='sharedkey'`. Default Azurite shared key credentials are in the Azurite documentation. 

In the `#### queue-demo settings` section set timeout values as you see fit, set queue names and `REQUESTS_URL`. The Azure Functions default URL for local emulation is `http://localhost:7071/api/requests`. You don't need `REQUESTS_KEY` for local emulation.

Start VS Code. Ensure the Azurite Queue Service is running. Run the debugger and wait for the function emulator to start.

If you aren't using VS Code, I'd welcome a PR with instructions explaining how to start Azurite and Azure Core Functions on Linux or other platforms.

### Azure mode
Azure mode uses queues and functions running on Azure. You will need an Azure storage account and an Azure Functions app to which you can deploy the functions.

Set your credential information in `env/azure.env`. Azure mode works with `sharedkey` authentication or `ad` authentication. `env` is in `.gitignore` so your credentials won't appear in the `git` repo unless you change `.gitignore` or move the file.
* If you use `sharedkey` authentication, you need a storage account name and key. (Storage account keys give you full access to the whole storage account.)
* If you use `ad` authentication, you need Azure AD credentials that give you access to the queues in the storage account.

In the `#### queue-demo settings` section set timeouts as you see fit, set queue names, `REQUESTS_URL`, and `REQUESTS_KEY` (required for Azure mode). If using `ad`, your RBAC roles must include read and write access to the named queues on the storage account. If they queues do not exist, you RBAC roles must allow you to create queues on the storage account.

## Running the demo

* Open three terminal windows or tabs.
* **Local mode only**: Ensure Azurite and the local Azure Functions emulator are running.
* In the first terminal, run `APP_ENV=local node dist/az-queue send-requests 3` (or 5, 11, etc.).
* In the second terminal, run `APP_ENV=local node dist/az-queue prepare-requests`.
* In the third terminal, run `APP_ENV=local node dist/az-queue read-statuses`.
* Trace requests across terminals by request id.

For Azure mode, replace `APP_ENV=local` with `APP_ENV=azure`.

I recommend starting with 1-3 requests to make tracing easier. Larger numbers are most useful when you need the demo to run longer.

## Command line
```
Usage: az-queue [options] [command]

demonstates sending and receiving messages with Azure Storage Queues

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  send-requests <messageCount>  Generate messages and send them to an Azure queue using an Azure function
  read-statuses                 Read messages from an Azure queue and delete them from the queue
  prepare-requests              Read messages from the received queue, prepare them, publish to the prepared queue, delete them
                                from the received queue
  help [command]                display help for command
```

Set `APP_ENV=<mode>` where `<mode>` is either `local` or `azure`. (`<mode>` selects the env file to use, so if you name your env files `env/fred.env` and `env/barney.env`, you'd use `fred` and `barney`. I find `local` and `azure` easier to understand.)

Example: `APP_ENV=local node dist/az-queue.js send-requests 10` sends 10 requests to the request queue in local mode

## License

MIT
