const fs = require("fs");

function logMessageAsJSON(message, filePath) {
  let jsonArray = [];
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    if (data.trim()) {
      jsonArray = JSON.parse(data);
    }
  }
  jsonArray.push(message);
  fs.writeFileSync(filePath, JSON.stringify(jsonArray, null, 2), "utf8");
}

function logFlowStatus(flowId, statusUpdate, isBulkUpdate) {
  if (process.env.NODE_ENV === "development") {
    if (statusUpdate === "completed") {
      if (isBulkUpdate) {
        console.log(
          `Bulk update operation being executed, flow with ${flowId} being updated to ${statusUpdate}`
        );
      } else {
        console.log(
          `No bulk update operation, flow with ${flowId} being updated to ${statusUpdate}`
        );
      }
    } else if (statusUpdate === "delivered") {
      console.log(
        `No bulk update operation and flow not yet completed, flow with ${flowId} being updated to ${statusUpdate} if it is not in_progress", read or completed `
      );
    } else {
      console.log(
        `No bulk update operation, flow with ${flowId} being updated to ${statusUpdate} if it is not in_progress or completed `
      );
    }
  }
}

module.exports = {
  logMessageAsJSON,
  logFlowStatus,
};
