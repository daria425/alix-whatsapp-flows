class SupportOptionService {
  constructor(db) {
    this.db = db;
    this.supportOptionsCollection = this.db.collection("support_options");
    this.projection = {
      "_id": 0,
      "Name": 1,
      "Postcode": 1,
      "Local / National": 1,
      "Website": 1,
      "Email": 1,
      "Phone - call": 1,
      "Category tags": 1,
      "Logo-link": 1,
      "Short text description": 1,
      "longitude": 1,
      "latitude": 1,
    };
    this.defaultRegion = "Cornwall";
  }

  async getTags() {
    try {
      const collection = this.db.collection("tags");
      const allTags = await collection.distinct("Tag");
      return allTags;
    } catch (err) {
      console.log(err);
    }
  }

  async getPaginatedNationalOptions(tag, page, pageSize) {
    try {
      const foundOptions = await this.supportOptionsCollection.aggregate([
        {
          $facet: {
            meta: [
              {
                $match: {
                  $and: [
                    { "Category tags": tag },
                    { "Local / National": "National" },
                  ],
                },
              },
              { $count: "totalCount" },
            ],
            results: [
              {
                $match: {
                  $and: [
                    { "Category tags": tag },
                    { "Local / National": "National" },
                  ],
                },
              },
              { $skip: (parseInt(page) - 1) * pageSize },
              { $limit: pageSize },
              { $project: this.projection },
            ],
          },
        },
      ]);
      const taggedOptions = await foundOptions.toArray();
      taggedOptions[0].page = page;
      const totalCount = taggedOptions[0].meta[0]?.totalCount || 0;
      taggedOptions[0].remaining = totalCount - pageSize * page;
      return taggedOptions;
    } catch (err) {
      console.log(err);
    }
  }

  async getPaginatedLocalOptions(tag, page, pageSize, region) {
    try {
      const foundOptions = await this.supportOptionsCollection.aggregate([
        {
          $facet: {
            meta: [
              {
                $match: {
                  $and: [{ "Category tags": tag }, { "location": region }],
                },
              },
              { $count: "totalCount" },
            ],
            results: [
              {
                $match: {
                  $and: [{ "Category tags": tag }, { "location": region }],
                },
              },
              { $skip: (parseInt(page) - 1) * pageSize },
              { $limit: pageSize },
              { $project: this.projection },
            ],
          },
        },
      ]);
      const taggedOptions = await foundOptions.toArray();
      taggedOptions[0].page = page;
      const totalCount = taggedOptions[0].meta[0]?.totalCount || 0;
      taggedOptions[0].remaining = totalCount - pageSize * page;
      return taggedOptions;
    } catch (err) {
      console.log(err);
    }
  }

  async getPaginatedLocalAndNationalOptions(tag, page, pageSize, region) {
    try {
      const foundOptions = await this.supportOptionsCollection.aggregate([
        {
          $facet: {
            meta: [
              {
                $match: {
                  $and: [
                    { "Category tags": tag },
                    {
                      $or: [
                        { "Local / National": "National" },
                        { location: region },
                      ],
                    },
                  ],
                },
              },
              { $count: "totalCount" },
            ],
            results: [
              {
                $match: {
                  $and: [
                    { "Category tags": tag },
                    {
                      $or: [
                        { "Local / National": "National" },
                        { location: region },
                      ],
                    },
                  ],
                },
              },
              { $skip: (parseInt(page) - 1) * pageSize },
              { $limit: pageSize },
              { $sort: { "Local / National": 1 } },
              { $project: this.projection },
            ],
          },
        },
      ]);
      const taggedOptions = await foundOptions.toArray();
      taggedOptions[0].page = page;
      const totalCount = taggedOptions[0].meta[0]?.totalCount || 0;
      taggedOptions[0].remaining = totalCount - pageSize * page;
      return taggedOptions;
    } catch (err) {
      console.log(err);
    }
  }

  async selectOptions({
    tag,
    location,
    region = this.defaultRegion,
    page,
    pageSize,
  }) {
    const locationFunctions = {
      "national only": this.getPaginatedNationalOptions.bind(this),
      "local only": this.getPaginatedLocalOptions.bind(this),
      "local and national": this.getPaginatedLocalAndNationalOptions.bind(this),
    };

    if (locationFunctions[location]) {
      const result = await locationFunctions[location](
        tag,
        page,
        pageSize,
        region
      );
      const remaining = result[0].remaining;
      const resultPage = result[0].page;
      return {
        result: result[0].results,
        remaining: remaining,
        page: resultPage,
      };
    }
  }
}

module.exports = {
  SupportOptionService,
};
