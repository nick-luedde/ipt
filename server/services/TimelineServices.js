class TimelineServices {

  /**
   * Requests to create a new timeline in the datasource
   * @param {ITimeline} timeline - object containing all properties of a Timeline
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveTimeline(timeline, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const savedTimeline = datasource.collections.Timeline.upsertOne(timeline);

    return savedTimeline;
  }

  /**
   * Requests to delete an existing timeline in the datasource
   * @param {ITimeline} timeline - object containing all properties of an Timeline
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteTimeline(timeline, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Timeline.data()
      .find(ms => ms.id === timeline.id);

    if (!existing)
      return null;

    datasource.collections.Timeline.delete([timeline]);

    return null;
  }

}