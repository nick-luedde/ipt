const ClientTestHelper = {

  async AppsPolling() {
    const registry = new AutomatedTestRegistry();

    registry.registerTest('AppsDataPollRequest', async (test) => {

      let poll_runs = 0;
      const p = AppsDataPollRequest({
        pollfn: (ls) => {
          console.log(ls);
          poll_runs++;
        },
        interval: 1000
      });

      p.scheduler.start();
      test.is('scheduler has started with a status of "active"').assert.isEqual(p.scheduler.status(), 'active');

      p.scheduler.pause();
      test.is('scheduler has paused with a status of "paused"').assert.isEqual(p.scheduler.status(), 'paused');
      
      await new Promise(resolve => setTimeout(resolve, 1010 * 5));

      p.scheduler.unpause();
      test.is('scheduler has unpaused with a status of "active"').assert.isEqual(p.scheduler.status(), 'active');

      p.scheduler.cancel();
      test.is('scheduler has cancelled with a status of "cancelled"').assert.isEqual(p.scheduler.status(), 'cancelled');

      test.is('should not have actually run a poll (in the time it took to get here)').assert.isEqual(poll_runs, 0);

      p.scheduler.start();
      await new Promise(resolve => setTimeout(resolve, 1010 * 5));
      
      test.is('should have run ~5 polls').assert.isEqual(poll_runs, 5);
      p.scheduler.cancel();

      const p_err = AppsDataPollRequest({
        pollfn: (ls) => {
          throw Error('poll err');
        },
        interval: 500
      });

      p_err.scheduler.start();
      await new Promise(resolve => setTimeout(resolve, 500 * 4));

      test.is('should auto cancel after 3 errors').assert.isEqual(p_err.scheduler.status(), 'cancelled');

    });
    console.log('Running tests async...');
    await registry.runAllTests();
    registry.consoleFailures();
  },


};

ClientTestHelper.AppsPolling();