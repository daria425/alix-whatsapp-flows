class ContactModel {
  constructor(db, messageStartTime) {
    this.collection = db.collection("contacts");
    this.messageCollection = db.collection("messages");
    this.messageStartTime = new Date(messageStartTime);
  }
  async saveContact(contactData) {
    try {
      const contact = await this.collection.findOne({
        "WaId": contactData.WaId,
      });
      if (contact) {
        return;
      } else
        await this.collection.insertOne({
          "WaId": contactData.WaId,
          "ProfileName": contactData.ProfileName,
        });
    } catch (err) {
      console.log(err);
    }
  }

  async getContact(recipient) {
    try {
      const contact = await this.collection.findOne({ "WaId": recipient });
      return contact;
    } catch (err) {
      console.log(err);
    }
  }

  async getContactDetail(recipient, detailField) {
    const contact = await this.collection.findOne({ "WaId": recipient });
    return contact[detailField];
  }

  async updateContact(recipient, updateDoc) {
    const update = { ...updateDoc, "LastSeenAt": new Date() };
    try {
      await this.collection.findOneAndUpdate(
        { "WaId": recipient },
        { "$set": update }
      );
    } catch (err) {
      console.log(err);
    }
  }
  async incrementContactField(recipient, update) {
    try {
      await this.collection.findOneAndUpdate(
        { "WaId": recipient },
        { "$inc": update }
      );
    } catch (err) {
      console.log(err);
    }
  }
  async saveContactMessage(recipient, message) {
    const contact = await this.getContact(recipient);
    const messageToSave = {
      ...message,
      OrganizationId: contact.organizationId,
      ContactId: contact._id,
      ResponseTime: new Date() - this.messageStartTime,
    };
    await this.messageCollection.insertOne(messageToSave);
  }
}

module.exports = {
  ContactModel,
};
