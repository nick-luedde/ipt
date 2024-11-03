class AppDataServices {

  /**
   * Gets the current environment and the current logged in users object from the datasource
   * @param {IUser} user 
   */
  static getAppInit(user) {
    const config = CurrentEnvironment.config();

    return {
      user,
      environment: config.environment
    };
  }

  /**
   * Gets all the models to return to the client
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static getAppData(ds) {
    const datasource = ds || CurrentEnvironment.datasource();
    const config = CurrentEnvironment.config();

    const models = AppDataServices.getAllModels(datasource);

    return {
      DataModel,
      config: {
        datasourceUrl: `#`
      },
      lists: AppDataServices.getAppLists(models.users),
      models
    };
  }

  /**
   * Gets all of the individual models
   * @param {SheetDataAccessModel} datasource - datasource object
   */
  static getAllModels(datasource) {
    //keep other user settings private
    const users = AppDataServices.getUsers(datasource);

    const projects = datasource.collections.Project.data();
    const items = datasource.collections.Item.data();
    const comments = datasource.collections.Comment.data();
    const timelines = datasource.collections.Timeline.data();
    // const deployments = datasource.collections.Deployment.data();

    return {
      users,
      projects,
      items,
      comments,
      timelines,
      // deployments
    };

  }

  /**
   * Gets latest changed data
   * @param {string} from - time string
   * @param {string} by - user
   * @param {SheetDataAccessModel} [ds] - datasource object
   */
  static getLatestChanges(from, by, ds) {
    //keep other user settings private
    const datasource = ds || CurrentEnvironment.datasource();

    const projects = datasource.collections.Project.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    const items = datasource.collections.Item.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    const comments = datasource.collections.Comment.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    const timelines = datasource.collections.Timeline.data()
      .filter(r => r.modifiedBy !== by && r.modifiedDate >= from);
    // const deployments = datasource.collections.Deployment.data();


    return {
      projects,
      items,
      comments,
      timelines,
      // deployments
    };
  }

  /**
   * Gets app lists
   * @param {IUser[]} users - list of users
   */
  static getAppLists(users) {
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
        'All'
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
      users: users.filter(u => u.role !== 'service').map(u => u.email).sort()
    };

    return lists;
  }

  /**
   * Gets all users
   * @param {SheetDataAccessModel} datasource - datasource object 
   */
  static getUsers(datasource) {
    return datasource.collections.User.data()
      .map(user => ({
        _key: user._key,
        id: user.id,
        email: user.email,
        role: user.role,
      })).sort((a, b) => (
        a.email < b.email ? -1 : 1)
      );
  }

}