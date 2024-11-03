class ScheduledServices {

  /**
   * Sweeps batch logs
   */
  static sweepBatchLogs() {
    const logger = CurrentEnvironment.logger();
    logger.batch.sweep();
  }

  /**
   * defrags datasource
   */
  static defragDatasource() {
    const response = JSON.parse(api({
      method: 'post',
      route: '/auth/ds/maintenance/defrag'
    }));

    if (response.status !== 200)
      throw new Error(response.body.message);
  }

}

/**
 * Public function for scheduling log sweep
 */
function timedSweepBatchLogs() {
  ScheduledServices.sweepBatchLogs();
}

/**
 * Public function that can be hooked into a timed event
 */
function defragDatasource() {
  ScheduledServices.defragDatasource();
}