class AppsServerTests {

  static run() {
    const registry = new AutomatedTestRegistry();

    registry.registerTest('AppsServer routes', (test) => {
      const server = AppsServer.create();
      const calls = {
        get: 0,
        post: 0,
        delete: 0
      };

      //SECTION: server setup
      server.get('/get-route', (req, res) => {
        test.is('req.by is caller email').assert.isEqual(req.by, '');

        calls.get++;
        res.status(server.STATUS_CODE.SUCCESS).send({ message: 'success to /get-route' });
      });

      server.post('/post-route', (req, res) => {
        const {
          obj,
          arr,
          str
        } = req.body;

        test.is('obj body is object').assert.isTrue(typeof obj === 'object');
        test.is('arr body is array').assert.isTrue(Array.isArray(arr));
        test.is('str body is string value text').assert.isEqual(str, 'value text');

        calls.post++;
        res.status(server.STATUS_CODE.SUCCESS).send({ message: 'success to /post-route' });
      });

      server.delete('/delete-route', (req, res) => {
        calls.delete++;
        res.status(server.STATUS_CODE.SUCCESS).send({ message: 'success to /delete-route' });
      });

      server.get('/param-route', (req, res) => {
        res.status(server.STATUS_CODE.SUCCESS).send(req.params);
      });

      server.get('/error-route', (req, res) => {
        throw new Error('Testing error');
      });

      //NOT IMPLEMENTED FEATURE YET
      // server.get('/id-route/:id', (req, res) => {
      //   res.status(server.STATUS_CODE.SUCCESS).send(req.params);
      // });

      // server.get('/id-route/:id/extra', (req, res) => {
      //   res.status(server.STATUS_CODE.SUCCESS).send(req.params);
      // });

      const get_res = server.request({
        method: 'get',
        route: '/get-route'
      });
      test.is('get-route success').assert.isEqual(get_res.status, 200);
      test.is('get-route response body').assert.isEqual(get_res.body.message, 'success to /get-route');
      test.is('get-route route fn run').assert.isEqual(calls.get, 1);

      const post_res = server.request({
        method: 'post',
        route: '/post-route',
        body: { obj: {}, arr: [], str: 'value text' }
      });
      test.is('post-route success').assert.isEqual(post_res.status, 200);
      test.is('post-route response body').assert.isEqual(post_res.body.message, 'success to /post-route');
      test.is('post-route route fn run').assert.isEqual(calls.post, 1);

      const delete_res = server.request({
        method: 'delete',
        route: '/delete-route'
      });
      test.is('delete-route success').assert.isEqual(delete_res.status, 200);
      test.is('delete-route response body').assert.isEqual(delete_res.body.message, 'success to /delete-route');
      test.is('delete-route route fn run').assert.isEqual(calls.delete, 1);

      const invalid_get = server.request({
        method: 'get',
        route: '/does-not/exist'
      });
      test.is('invalid_get response 404').assert.isEqual(invalid_get.status, 404);

      const invalid_post = server.request({
        method: 'post',
        route: '/invalid'
      });
      test.is('invalid_post response 404').assert.isEqual(invalid_post.status, 404);

      const invalid_delete = server.request({
        method: 'delete',
        route: '/missing/route/again'
      });
      test.is('invalid_delete response 404').assert.isEqual(invalid_delete.status, 404);

      let param_res = server.request({
        method: 'get',
        route: '/param-route?test=%20space%20another'
      });
      test.is('param_res test param').assert.isEqual(param_res.body.test, ' space another');

      param_res = server.request({
        method: 'get',
        route: '/param-route?one=1&two=2&three=3'
      });
      test.is('param_res one param').assert.isEqual(param_res.body.one, '1');
      test.is('param_res two param').assert.isEqual(param_res.body.two, '2');
      test.is('param_res three param').assert.isEqual(param_res.body.three, '3');


      param_res = server.request({
        method: 'get',
        route: '/param-route?space%20param=something here too'
      });
      test.is('param_res space param param').assert.isEqual(param_res.body['space param'], 'something here too');

      const error_res = server.request({
        method: 'get',
        route: '/error-route'
      });
      test.is('error_res status').assert.isEqual(error_res.status, 500);
      test.is('error_res body').assert.isEqual(error_res.body.message, 'Something went wrong!');

    });

    registry.registerTest('AppsServer middleware', (test) => {
      const server = AppsServer.create();
      const mw = {
        '.*': 0
      };

      //SECTION: server setup
      server.use('.*', (req, res, next) => {
        mw['.*']++;
        next();
      });

      server.use('.*/before-after/.*', (req, res, next) => {
        // before
        test.is('before-after mw before status').assert.isEqual(res.res.status, 999);
        next();
        test.is('before-after mw before status').assert.isEqual(res.res.status, 200);
        // after
      });

      server.use('.*/no-next', (req, res, next) => {
        //Doesnt call next so the mwstack ends here and is unwound back up the stack from here
        res.status(server.STATUS_CODE.FORBIDDEN).send({ nonext: true });
      });

      server.use('.*/0/.*', (req, res, next) => {
        res.locals.count = 0;
        next();
        test.is('/0/ mw after count').assert.isEqual(res.locals.count, 4);
      });

      server.use('.*/1/.*', (req, res, next) => {
        res.locals.count++;
        test.is('/1/ mw before count').assert.isEqual(res.locals.count, 1);
        next();
        test.is('/1/ mw after count').assert.isEqual(res.locals.count, 3);
        res.locals.count++;
      });

      server.use('.*/2/.*', (req, res, next) => {
        res.locals.count++;
        test.is('/2/ mw before count').assert.isEqual(res.locals.count, 2);
        next();
        test.is('/2/ mw after count').assert.isEqual(res.locals.count, 2);
        res.locals.count++;
      });

      server.get('/count/0/1/2/whatever', (req, res) => {
        res.status(server.STATUS_CODE.SUCCESS).send({ someResponse: 'text' });
      });

      server.get('/something/no-next', (req, res) => {
        //Will never get here because of /no-next mw!
        res.status(server.STATUS_CODE.SUCCESS).send({ someResponse: 'text' });
      });

      server.get('/something', (req, res) => {
        res.status(server.STATUS_CODE.SUCCESS).send({ someResponse: 'text' });
      });

      server.get('/another/before-after/route', (req, res) => {
        res.status(server.STATUS_CODE.SUCCESS).send({ beforeafter: 'testing text response' });
      });

      const inlinemw = (req, res, next) => {
        res.locals.inlinemw = true;
        next();
      };

      server.post('/inline', inlinemw, (req, res) => {
        test.is('res.locals.inlinemw is true').assert.isEqual(res.locals.inlinemw, true);
        res.status(server.STATUS_CODE.SUCCESS).send({ inline: 'worked' });
      });

      let something_res = server.request({
        method: 'get',
        route: '/something'
      });
      test.is('something_res status').assert.isEqual(something_res.status, 200);
      test.is('something_res body').assert.isEqual(something_res.body.someResponse, 'text');
      test.is('all mw 1').assert.isEqual(mw['.*'], 1);

      something_res = server.request({
        method: 'get',
        route: '/something/no-next'
      });
      test.is('something_res/no-next status').assert.isEqual(something_res.status, 403);
      test.is('something_res/no-next body').assert.isEqual(something_res.body.nonext, true);
      test.is('all mw 2').assert.isEqual(mw['.*'], 2);

      const before_after_res = server.request({
        method: 'get',
        route: '/another/before-after/route'
      });
      test.is('before_after_res status').assert.isEqual(before_after_res.status, 200);
      test.is('all mw 3').assert.isEqual(mw['.*'], 3);

      const inline_res = server.request({
        method: 'post',
        route: '/inline'
      });
      test.is('inline_res status').assert.isEqual(inline_res.status, 200);
      test.is('all mw 4').assert.isEqual(mw['.*'], 4);

      const mw_count_res = server.request({
        method: 'post',
        route: '/count/0/1/2/whatever'
      });
      test.is('all mw 5').assert.isEqual(mw['.*'], 5);

    });


    registry.runAllTests();
    registry.consoleFailures();
  }

}

class AppsDataPollTests {

  static run() {

    const registry = new AutomatedTestRegistry();

    registry.registerTest('AppsDataPoll', (test) => {
      const cacheMock = CacheService.getScriptCache();
      const KEY = '_test__data_poll_cache';

      // SECTION: basic setup
      const p = AppsDataPoll.create({ cachePrefix: '_test' });
      p.cache.clear();

      p.cache.set({ session: 'session-id-mock', records: [{ model: 'TEST', id: 'id-test-123', record: { id: 'id-test-123' } }] });
      const test_updates = p.cache.load();

      test.is('set() should result in session in cache context').assert.isTrue(!!test_updates.TEST['id-test-123session-id-mock']);
      p.cache.clear();

      // SECTION: polling
      cacheMock.put(KEY + '-0', JSON.stringify({
        MOD: {
          '1234': {
            sess: 'session-123',
            rec: { id: 1234 },
            id: 1234,
            ts: Date.now() - 1000 * 60 * 3
          }
        }
      }));

      p.cache.sessionInfo.set('different.session', { ts: Date.now() - 1000 * 60 * 5 });
      const true_at_5_min = p.poll('different.session');
      test.is('poll() is true because last success was prior to another session store').assert.isTrue(true_at_5_min);

      p.cache.sessionInfo.set('different.session', { ts: Date.now() - 1000 * 60 * 1 });
      const false_at_1_min = p.poll('different.session');
      test.is('poll() is false because last success after any other session store').assert.isFalse(false_at_1_min);

      p.cache.sessionInfo.set('session-123', { ts: Date.now() - 1000 * 60 * 3.2 });
      const false_same_user = p.poll('session-123');
      test.is('poll() is false there are no other session stores').assert.isFalse(false_same_user);

      p.cache.clear();
      p.cache.sessionInfo.set('whoever.session', { ts: Date.now() - 1000 * 60 * 1 });
      const false_no_users = p.poll('whoever.session');
      test.is('poll() is false there are no session stores').assert.isFalse(false_no_users);

      p.cache.sessionInfo.set('whoever.session', { ts: Date.now() - 1000 * 60 * 61 });
      const true_too_long = p.poll('whoever.session');
      test.is('poll() is true, it was too long since last success').assert.isTrue(true_too_long);

      p.cache.clear();

      const lp = AppsDataPoll.create({ cachePrefix: '_test', longPollSeconds: 10 });

      // SECTION: long polling
      cacheMock.put(KEY + '-0', JSON.stringify({
        LONG: {
          '5555': {
            sess: 'long-session-123',
            rec: { id: 5555 },
            id: 5555,
            ts: Date.now() - 1000 * 60 * 2
          }
        },
        TEXT: {
          '9999': {
            sess: 'long-session-123',
            rec: { id: 9999 },
            id: 9999,
            ts: Date.now() - 1000 * 60 * 3
          }
        }
      }));

      const long_poll_start = Date.now();
      lp.cache.sessionInfo.set('another-session-id', { ts: Date.now() - 1000 * 1 });
      const long_poll_no_result = lp.longPoll('another-session-id');
      const long_poll_end = Date.now();

      test.is('longPoll() wait ~10s').assert.isTrue((long_poll_end - long_poll_start) / 1000 > 9);
      test.is('longPoll() empty, no new updates').assert.isTrue(long_poll_no_result.length === 0);

      lp.cache.sessionInfo.set('another-session-id', { ts: Date.now() - 1000 * 60 * 2.5 });
      const long_poll_one_result = lp.longPoll('another-session-id');
      test.is('longPoll() results, 1 new update').assert.isEqual(long_poll_one_result.length, 1);

      lp.cache.sessionInfo.set('another-session-id', { ts: Date.now() - 1000 * 60 * 4 });
      const long_poll_two_results = lp.longPoll('another-session-id');
      test.is('longPoll() results, 2 new updates').assert.isEqual(long_poll_two_results.length, 2);

      lp.cache.clear();

      //TODO somehow test that cache gets expanded yeah?
      const ep = AppsDataPoll.create({ cachePrefix: '_test' });

      const records = new Array(150).fill(null).map((_, i) => ({ model: 'MODEL', id: i, record: { id: i, text: 'a'.repeat(1000) } }));
      ep.cache.set({ session: 'expanded.session', records });

      // test that the cache is expanded to 0, 1?
      const block1 = cacheMock.get(`${KEY}-0`);
      const block2 = cacheMock.get(`${KEY}-1`);
      const block3 = cacheMock.get(`${KEY}-2`);

      test.is('expanded cache block 1 exists').assert.isTrue(!!block1);
      test.is('expanded cache block 2 exists').assert.isTrue(!!block2);
      test.is('expanded cache block 3 does not exists').assert.isFalse(!!block3);

      const info = ep.cache.load();
      test.is('expanded cache has all 150 records').assert.isEqual(Object.keys(info.MODEL).length, 150);

      ep.cache.clear();

    });


    registry.runAllTests();
    registry.consoleFailures();
  }

}

function run_tst_() {
  AppsDataPollTests.run();
}