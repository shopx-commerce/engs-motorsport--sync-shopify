import { promises as fsPromises } from "fs";

const createLogger = (filePrefix = "response") => {
  const responseBuffer = [];
  const logFilename = `${filePrefix}-${new Date().toISOString().split("T")[0]}.jsonl`;

  const logResponse = (response) => {
    responseBuffer.push(JSON.stringify(response, null, 2));
  };

  const flushLogs = async () => {
    if (responseBuffer.length === 0) return;

    try {
      const logData = responseBuffer.join("\n") + "\n";
      await fsPromises.appendFile(logFilename, logData);
      console.log(
        `Flushed ${responseBuffer.length} log entries to ${logFilename}`
      );
      responseBuffer.length = 0; // Clear the buffer
    } catch (error) {
      console.error(`Error writing logs to file ${logFilename}:`, error);
    }
  };

  const getBufferSize = () => responseBuffer.length;

  return { logResponse, flushLogs, getBufferSize };
};

export default createLogger;
