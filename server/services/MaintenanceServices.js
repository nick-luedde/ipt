class MaintenanceServices {

  /**
   * Defrag datasource (designed as an overnight scheduled process, maybe once a month or so...)
   */
  static defragDatasource() {
    const datasource = CurrentEnvironment.datasource();

    console.time('defrag');
    datasource.collections.Item.defrag();
    datasource.collections.Project.defrag();
    datasource.collections.Comment.defrag();
    console.timeEnd('defrag');

    return { message: 'Defrag success!' };
  }

}