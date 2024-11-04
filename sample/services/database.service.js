class DatabaseService {
  constructor(db, messageStartTime, organizationPhoneNumber) {
    this.contactsCollection = db.collection("contacts");
    this.messageCollection = db.collection("messages");
    this.organizationsCollection = db.collection("organizations");
    this.flowHistoryCollection = db.collection("flow_history");
    this.organizationPhoneNumber = organizationPhoneNumber;
    this.messageStartTime = new Date(messageStartTime);
  }
  async getContact(WaId) {
    try {
      const contactOrganization = await this.organizationsCollection.findOne({
        "organizationPhoneNumber": this.organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      const contact = await this.contactsCollection.findOne({
        "WaId": WaId,
        "organizationId": contactOrganizationId,
      });
      return contact;
    } catch (err) {
      console.log(err);
    }
  }
  async saveResponseMessage({ message, flowName, templateName }) {
    const contact = await this.getContact(message.WaId);
    const messageToSave = {
      clientSideTriggered: message.clientSideTriggered,
      trackedFlowId: message.trackedFlowId,
      Body: message?.body ?? null,
      To: `whatsapp:+${message.WaId}`,
      From: message.from,
      Direction: "outbound",
      Flow: flowName,
      ContentSID: message?.contentSid ?? null,
      ContentVariables: message?.contentVariables ?? null,
      CreatedAt: new Date(),
      Status: "sent",
      SearchableTemplateName: templateName ?? null,
      OrganizationId: contact.organizationId,
      ContactId: contact._id,
      ResponseTime: new Date() - this.messageStartTime,
    };
    const insertedMessage = await this.messageCollection.insertOne(
      messageToSave
    );
    return insertedMessage.insertedId;
  }
  async updateResponseMessageWithSid(insertedId, messageSid) {
    await this.messageCollection.findOneAndUpdate(
      { "_id": insertedId },
      { $set: { MessageSid: messageSid } }
    );
  }
}

module.exports = {
  DatabaseService,
};
