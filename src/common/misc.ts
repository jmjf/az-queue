const TIMEOUT_INCREMENT = parseInt(<string>process.env.TIMEOUT_INCREMENT, 10) || 1000; // 1 second
const MAX_TIMEOUT = parseInt(<string>process.env.MAX_TIMEOUT, 10) || 10000; // 10 seconds

// this expression defines a function (delay) that lets us wait
// for the specified number of milliseconds
// await delay(500); // wait 500ms before proceeding
async function delay(ms: number): Promise<void> { 
  return new Promise(res => setTimeout(res, ms));
}

function getTimeout (currentTimeout: number): number {
  return ((currentTimeout >= MAX_TIMEOUT) ? MAX_TIMEOUT : currentTimeout + TIMEOUT_INCREMENT);
}

export {
  delay,
  getTimeout
};