class MockServer {

  static server() {
    const server = MockAppsServer.create({
      debug: true
    });

    // -------------------------------------------------------
    // |                     APP DATA                        |
    // -------------------------------------------------------

    server.get('/auth/app-init', (req, res) => {
      const data = {
        user: MockDatabase.Users[0],
        environment: 'development'
      }
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data', (req, res) => {
      const models = {
        users: [...MockDatabase.db.Users],
        projects: [...MockDatabase.db.Projects],
        items: [...MockDatabase.db.Items],
        comments: [...MockDatabase.db.Comments],
        timelines: [...MockDatabase.db.Timelines],
      };

      const data = {
        DataModel,
        config: {
          datasourceUrl: `#`
        },
        lists: MockServer.getAppLists(),
        models
      };
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-data/latest', (req, res) => {
      const data = {
        users: [],
        projects: [],
        items: [],
        comments: [],
        timelines: [],
      };

      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    server.get('/auth/ds/app-lists', (req, res) => {
      const data = MockServer.getAppLists();
      res.status(server.STATUS_CODE.SUCCESS).send(data);
    });

    // -------------------------------------------------------
    // |                      PROJECT                        |
    // -------------------------------------------------------

    server.post('/auth/ds/project/save', (req, res) => {
      /** @type {IProject} */
      const proj = req.body;
      const saved = MockDatabase.Projects.save(proj);

      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.post('/auth/ds/project/update-items-version', (req, res) => {
      /** @type {IProject} */
      const project = req.body;
      const items = MockDatabase.db.Items.filter(item => item.project === project.id && item.status !== 'Closed')
        .map(item => MockDatabase.Items.save({
          ...item,
          version: project.version,
        }));

      res.status(server.STATUS_CODE.SUCCESS).send(items);
    });

    server.delete('/auth/ds/project/delete', (req, res) => {
      const project = req.body;
      MockDatabase.Projects.delete(project);

      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                       ITEM                          |
    // -------------------------------------------------------

    server.post('/auth/ds/item/save', (req, res) => {
      const item = req.body;
      const saved = MockDatabase.Items.save(item);

      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/item/delete', (req, res) => {
      const item = req.body;
      MockDatabase.Items.save(item);

      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/item/email', (req, res) => {
      //NOOP
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/item/calendar-event', (req, res) => {
      //NOOP
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/file/create', (req, res) => {
      //Hmm
      const blob = req.body;

      const info = {
        resource: 'file',
        id: '1234567890',
        url: null,
        download: null,
        name: blob.name,
        size: blob.size,
        type: blob.type,
        owner: 'Me',
        created: new Date().toJSON(),
        updated: new Date().toJSON(),
        viewers: ['Me'],
        editors: ['Me'],
        trashed: false,
        target: '',
        targetType: ''
      };

      // const info = ItemServices.createItemFile(req.body);
      res.status(server.STATUS_CODE.SUCCESS).send(info);
    });

    // -------------------------------------------------------
    // |                     TIMELINE                        |
    // -------------------------------------------------------

    server.post('/auth/ds/timeline/save', (req, res) => {
      const tl = req.body;
      const saved = MockDatabase.Timelines.save(tl);

      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/timeline/delete', (req, res) => {
      const timeline = req.body;
      MockDatabase.Timelines.delete(timeline);

      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                     COMMENT                         |
    // -------------------------------------------------------

    server.post('/auth/ds/comment/save', (req, res) => {
      const cmt = req.body;
      const saved = MockDatabase.Comments.save(cmt);

      res.status(server.STATUS_CODE.SUCCESS).send(saved);
    });

    server.delete('/auth/ds/comment/delete', (req, res) => {
      const comment = req.body;
      MockDatabase.Comments.delete(comment);

      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    // -------------------------------------------------------
    // |                        UTIL                         |
    // -------------------------------------------------------

    server.post('/auth/ds/files/create-prd', (req, res) => {
      //NOOP
      res.status(server.STATUS_CODE.SUCCESS).send(null);
    });

    server.post('/auth/ds/user/save', (req, res) => {
      const user = req.body;

      res.status(server.STATUS_CODE.SUCCESS).send(user);
    });

    // -------------------------------------------------------
    // |                      ERROR                          |
    // -------------------------------------------------------

    server.error((err, req) => {
      console.error({
        message: err.message,
        route: req.rawRoute,
        stack: err.stack
      });
    });

    return server;
  }

  /**
   * Gets app lists
   */
  static getAppLists() {
    const lists = {
      types: [
        'Feature',
        'Epic',
        'Story',
        'Bug',
        'Issue',
        'Enhancement',
        'Task',
        'Accessibility',
        'Planning',
        'Support'
      ],
      priorities: [
        'Low',
        'Medium',
        'High',
        'Critical'
      ],
      statuses: [
        'New',
        'Open',
        'Hold',
        'Testing',
        'Closed'
      ],
      themes: [
        'Dark',
        'Light',
        'Red',
        'Blue'
      ],
      projectStatuses: [
        'Backlog',
        'Planning',
        'Development',
        'System testing',
        'UAT',
        'Stable',
        'Inactive'
      ],
      projectPrograms: [
        'All',
      ],
      accessibilityStatuses: [
        'N/A',
        'Planning',
        'Remediation',
        'Maintenance',
        'Resolved'
      ],
      timelineStatuses: [
        'Open',
        'Closed'
      ],
      timelineEfforts: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      timelinePriorities: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      timelineMagnitudes: [
        1,
        2,
        3,
        4,
        5
      ],
      users: ['Me']
    };

    return lists;
  }

}