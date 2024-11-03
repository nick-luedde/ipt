class AppsProjects {

  static server() {
    const config = CurrentEnvironment.config();
    const debug = config.environment !== 'production';
    const maintenance = config.environment === 'maintenance';

    const server = AppsServer.create({
      debug
    });

    // -------------------------------------------------------
    // |                    MIDDLEWARE                       |
    // -------------------------------------------------------

    if (maintenance) {
      // if maintenace, only register one catchall middleware
      server.use('/.*', (req, res, next) => {

        if (req.route === '/auth/ds/index.html') {
          const viewport = 'width=device-width, initial-scale=1';
          const themeFile = `bulma-themes/bulma-light`;

          res.status(server.STATUS_CODE.SUCCESS)
            .render({ file: 'client/maintenance.html' }, {
              bulmaThemeCss: HtmlService.createHtmlOutputFromFile(themeFile).getContent()
            }).body.setTitle('AP under maintenance')
            .addMetaTag('viewport', viewport);
        } else {
          res.status(server.STATUS_CODE.FORBIDDEN)
            .send({ message: 'AP is under maintenance, try again later.' });

        }
      });

      return server;
    }

    server.use('/.*', (req, res, next) => {
      const start = Date.now();
      next();
      const end = Date.now();
      res.headers({ 'ap-response-time': end - start });
    });

    server.use('/.*', (req, res, next) => {
      console.log(`Request to: ${req.route} at ${new Date()}`);
      if (debug)
        console.log(req);
      next();
      console.log(res);
    });

    server.use('.*/ds/.*', (req, res, next) => {
      res.locals.datasource = CurrentEnvironment.datasource();
      next();
    });

    server.use('.*/auth/.*', (req, res, next) => {
      const datasource = res.locals.datasource || CurrentEnvironment.datasource();
      const user = datasource.collections.User.data()
        .find(u => u.email === req.by);

      if (user) {
        req.auth.user = user;
        next();
      } else {
        res.status(server.STATUS_CODE.FORBIDDEN).send({ message: 'Not authorized' });
      }

    });

    // const serverpoll = (req, res, next) => {
    //   next();
    //   if (res.isSuccess()) {
    //     const poller = CurrentEnvironment.poller();
    //     poller.cache.set(req.by);
    //   }
    // };

    const serverpollCache = (session, updates) => {
      // const poller = CurrentEnvironment.poller();
      
      // HOTFIX DISABLE SERVER POLL LOGGING
      // const logger = CurrentEnvironment.logger();
      // logger.info.batch({ message: `${session}-session server poll cached (${updates.length}) updates`, json: updates });

      // poller.cache.set({ session, records: updates });
    };

    // -------------------------------------------------------
    // |                      INDEX                          |
    // -------------------------------------------------------

    server.get('/auth/ds/index.html', (req, res) => {
      const user = req.auth.user;

      const title = `${config.environment === 'development' ? 'Dev - ' : ''}Information Services Projects`;
      const viewport = 'width=device-width, initial-scale=1';

      if (user) {

        const theme = user.settings.theme || "Light";
        const themeFile = `bulma-themes/bulma-${theme.toLowerCase()}`;

        const datasource = res.locals.datasource || CurrentEnvironment.datasource();
        const appDataConfig = datasource.collections.Config.data().find(c => c.id === 'app');

        res.status(server.STATUS_CODE.SUCCESS)
          .render({ file: 'client/index.html' }, {
            bulmaThemeCss: HtmlService.createHtmlOutputFromFile(themeFile).getContent(),
            themeVariableClass: `${theme.toLowerCase()}-theme`,
            environment: config.environment,
            session: Utilities.getUuid(),
            dataPolling: appDataConfig.json.dataPolling || {},
            userjson: JSON.stringify(user)
          }).body.setTitle(title)
          .setFaviconUrl(config.faviconUrl)
          .addMetaTag('viewport', viewport);

      } else {

        res.status(server.STATUS_CODE.SUCCESS)
          .render({
            html: `
            <div style="margin-top: 2rem;">
              <h1>Cannot log you in!</h1>
            <div>
            <script>google = {};</script>`
          }).body.setTitle(title)
          .addMetaTag('viewport', viewport);

      }
    });

    // -------------------------------------------------------
    // |                     APP DATA                        |
    // -------------------------------------------------------

    server.get('/auth/app-init', (req, res) => {
      const data = AppDataServices.getAppInit(req.auth.user);
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data', (req, res) => {
      const { session } = req.params;

      const poller = CurrentEnvironment.poller();
      poller.cache.sessionInfo.set(session, { ts: Date.now() });

      const data = AppDataServices.getAppData(res.locals.datasource);
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data/latest', (req, res) => {
      const { start = new Date().toJSON() } = req.params;

      const data = AppDataServices.getLatestChanges(start, req.by, res.locals.datasource);
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-lists', (req, res) => {
      const data = AppDataServices.getAppLists(res.locals.datasource.collections.User.data());
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/projects', (req, res) => {
      const data = res.locals.datasource.collections.Project.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/items', (req, res) => {
      const data = res.locals.datasource.collections.Item.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/comments', (req, res) => {
      const data = res.locals.datasource.collections.Comment.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/timelines', (req, res) => {
      const data = res.locals.datasource.collections.Timeline.data();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data-poll', (req, res) => {
      const { lastSuccess } = req.body;
      const { session } = req.params;

      const poller = CurrentEnvironment.poller();
      const data = poller.poll(session, lastSuccess)
        ? AppDataServices.getAppData(res.locals.datasource)
        : null;

      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/long-poll', (req, res) => {
      const { session } = req.params;

      const logger = CurrentEnvironment.logger();
      logger.info.batch({ message: `${session}-session server long polling start` });

      const poller = CurrentEnvironment.poller();

      let incrementals, all;
      if (poller.cache.sessionInfo.stale(session)) {
        poller.cache.sessionInfo.set(session, { ts: Date.now() });
        all = AppDataServices.getAppData();
      } else {
        incrementals = poller.longPoll(session);
      }

      if (incrementals && incrementals.length > 0) {
        logger.info.batch({ message: `${session}-session server long polling (${incrementals.length}) updates found`, json: incrementals });
      } else if (incrementals) {
        logger.info.batch({ message: `${session}-session server long polling empty` });
      } else {
        logger.info.batch({ message: `${session}-session server long polling all data refresh` });
      }

      res.status(server.STATUS_CODE.SUCCESS).send({ incrementals, all });
    });

    server.post('/auth/ds/cancel-poll', (req, res) => {
      const { session } = req.params;

      const logger = CurrentEnvironment.logger();
      logger.info.batch({ message: `${session}-session server long polling session cancel` });

      const poller = CurrentEnvironment.poller();
      poller.cancel(session);

      res.status(server.STATUS_CODE.SUCCESS).send();
    });

    // -------------------------------------------------------
    // |                      PROJECT                        |
    // -------------------------------------------------------

    server.post('/auth/ds/project/save', (req, res) => {
      const saved = ProjectServices.saveProject(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Project', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.post('/auth/ds/project/update-items-version', (req, res) => {
      const items = ProjectServices.updateOutstandingItemsVersion(req.body, res.locals.datasource);

      serverpollCache(req.params.session, items.map(item => ({ model: 'Item', record: item, id: item.id })));
      res.status(server.STATUS_CODE.SUCCESS).send(items);
    });

    server.delete('/auth/ds/project/delete', (req, res) => {
      const project = req.body;
      ProjectServices.deleteProject(project, req.auth.user, req.params, res.locals.datasource)

      serverpollCache(req.params.session, [{ model: 'Project', record: project, id: project.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                      PROJECT                        |
    // -------------------------------------------------------

    server.post('/auth/ds/deployment/save', (req, res) => {
      const saved = DeploymentServices.saveDeployment(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Deployment', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/deployment/delete', (req, res) => {
      const deployment = req.body;
      DeploymentServices.deleteDeployment(deployment, req.auth.user, req.params, res.locals.datasource)

      serverpollCache(req.params.session, [{ model: 'Deployment', record: deployment, id: deployment.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                       ITEM                          |
    // -------------------------------------------------------

    server.post('/auth/ds/item/save', (req, res) => {
      const saved = ItemServices.saveItem(req.body, req.auth.user, { ds: res.locals.datasource });

      serverpollCache(req.params.session, [{ model: 'Item', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    const handleItemPost = ({ item, comments, user, quiet }, datasource) => {
      const project = datasource.collections.Project.data()
        .find(proj => proj.id === item.project);

      if (!project)
        throw new ApiError(`Project ${item.project} not found!`, { code: 404 });

      //defaults
      item.type = item.type || 'Task';
      item.priority = item.priority || 'Medium';
      item.status = item.status || 'New';
      item.version = item.version || project.version;

      const saved = ItemServices.saveItem(item, user, { ds: datasource, quiet });
      /** @type {{ item: IItem, comments: IComment[] }} */
      const response = {
        item: saved,
        comments: []
      };

      if (comments && comments.length > 0)
        response.comments = comments.map(comment => {
          comment.item = saved.id;
          const saveResponse = CommentServices.saveComment(comment, datasource);
          return saveResponse.comment;
        });

      return response;
    }

    server.post('/auth/ds/item/post', (req, res) => {
      const { quiet } = req.params;
      const { item } = handleItemPost({ item: req.body, user: req.auth.user, quiet: !!quiet }, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Item', record: item, id: item.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(item);
    });

    server.post('/auth/ds/item/post-with-comments', (req, res) => {
      const { item, comments } = handleItemPost({
        item: req.body.item,
        comments: req.body.comments,
        user: req.auth.user,
        quiet: !!req.params.quiet
      }, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Item', record: item, id: item.id }, ...comments.map(c => ({ model: 'Comment', record: c, id: c.id }))]);
      res.status(server.STATUS_CODE.SUCCESS).send({ item, comments });
    });

    server.delete('/auth/ds/item/delete', (req, res) => {
      const item = req.body;
      ItemServices.deleteItem(item, req.auth.user, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Item', record: item, id: item.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/item/email', (req, res) => {
      ItemServices.sendItemEmail(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/item/calendar-event', (req, res) => {
      const event = IntegrationServices.createItemCalendarEvent(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(event);
    });

    server.post('/auth/file/create', (req, res) => {
      const info = ItemServices.createItemFile(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    // DEPRECATED, no longer deleting files, just references
    // server.delete('/auth/file/delete', (req, res) => {
    //   const trashed = ItemServices.deleteItemFile(req.body);
    //   res.status(server.STATUS_CODE.SUCCESS).send(trashed);
    // });

    server.post('/auth/file/drive/details', (req, res) => {
      const { url, id } = req.body;
      const info = ItemServices.getDriveFileDetails({ url, id });
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    // -------------------------------------------------------
    // |                     TIMELINE                        |
    // -------------------------------------------------------

    server.post('/auth/ds/timeline/save', (req, res) => {
      const saved = TimelineServices.saveTimeline(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Timeline', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/timeline/delete', (req, res) => {
      const timeline = req.body;
      TimelineServices.deleteTimeline(timeline, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Timeline', record: timeline, id: timeline.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                     COMMENT                         |
    // -------------------------------------------------------

    server.post('/auth/ds/comment/save', (req, res) => {
      const saved = CommentServices.saveComment(req.body, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Comment', record: saved, id: saved.id }]);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/comment/delete', (req, res) => {
      const comment = req.body;
      CommentServices.deleteComment(comment, res.locals.datasource);

      serverpollCache(req.params.session, [{ model: 'Comment', record: comment, id: comment.id, del: true }]);
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                        UTIL                         |
    // -------------------------------------------------------

    server.post('/auth/ds/files/create-prd', (req, res) => {
      const { type, name } = (req.body || {});

      const config = CurrentEnvironment.config();
      const folderId = type === 'item-attachment' ? config.filesFolderId : undefined;
      const info = ProjectServices.createTemplatePrd({ folderId, name });
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    server.post('/auth/ds/user/save', (req, res) => {
      const user = req.body;

      if (req.auth.user.id !== user.id)
        throw new ApiError('Not authorized to edit another user!', { code: 403 });

      const saved = UserServices.saveUser(user, res.locals.datasource);
      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.post('/auth/ds/maintenance/defrag', (req, res) => {
      // if (req.by !== '')
      //   throw new ApiError('Not authorized to run maintenance/defrag', { code: 401 });

      const result = MaintenanceServices.defragDatasource();
      res.status(server.STATUS_CODE.SUCCESS).send(result);
    });

    // -------------------------------------------------------
    // |               APPS DRIVE PICKER                     |
    // -------------------------------------------------------

    // NOT IN USE!
    // server.use('/.*', AppsDrivePicker.middleware);
    // AppsDrivePicker.use(server);

    // -------------------------------------------------------
    // |                      ERROR                          |
    // -------------------------------------------------------

    if (config.environment === 'production')
      server.error((err, req) => {
        const logger = CurrentEnvironment.logger();
        logger.error.data({ message: err.message, json: { route: req.rawRoute, stack: err.stack } });
      });

    return server;
  }

}

/**
 * Main client entry point for requests
 * @param {AppsRequest} req - request object
 */
function api(req) {
  return AppsProjects.server().handleClientRequest(req);
}

/**
 * Handles get requests
 * @param {Object} event - Apps script GET event parameter
 * @returns {HTMLOutput} Evaluated HTML output of the primary index.html file
 */
function doGet(event = {}) {
  return AppsProjects.server().handleDoGet(event, { homeroute: '/auth/ds/index.html' });
}

/**
 * Handles post requests
 * @param {Object} event - post event
 */
function doPost(event = {}) {
  return AppsProjects.server().handleDoPost(event);
}