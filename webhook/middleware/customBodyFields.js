const { DatabaseService } = require("../services/DatabaseService");
const buildFlowTriggerRequest = async (req, res, next) => {
  const dbService = new DatabaseService(req.app.locals.db);
  const now = new Date(); // Current date and time
  const reminderTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const flowName = req.body.flowName;
  const { organizationId } = req.query;
  const env = process.env.NODE_ENV;
  console.log("env", env);
  const { flow, contactList } = await dbService.getUnresponsiveContacts(
    flowName,
    reminderTime,
    organizationId,
    env
  );
  req.body.flow = flow;
  req.body.contactList = contactList;
  next();
};

module.exports = {
  buildFlowTriggerRequest,
};
