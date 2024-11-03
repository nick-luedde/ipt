const MockDatabase = {

  nextKey: 1,

  db: {
    Projects: [{
      _key: '1',
      id: 'project-0',
      name: 'Portfolio',
      description: 'Developer portfolio project',
      version: '1.0',
      status: 'Development',
      categories: ['Website'],
      platforms: ['HTML', 'CSS', 'JavaScript'],
      dependsOnProjects: [],
      priority: 'High',
      accessibilityStatus: 'Open',
      iteration: '',
      planningNotes: 'Outline projects to include...',
      program: 'N/A',
      hasPII: false,
      links: [],
      owner: 'Me',
      backup: 'Me',
      isPublic: false,
      createdBy: 'Me',
      createdDate: '2024-11-03T13:50:58.758Z',
      modifiedBy: 'Me',
      modifiedDate: '2024-11-03T13:50:58.758Z'
    }],
  
    Timelines: [{
      _key: '1',
      id: 'timeline-0',
      projects: ['project-0'],
      name: 'First iteration of portfolio',
      description: 'Complete the first iteration of the portfolio',
      status: 'Open',
      effort: 7,
      priority: 2,
      magnitude: 1,
      impacts: [],
      notes: '',
      startDate: '2024-10-01',
      endDate: '2025-01-01',
      createdBy: 'Me',
      createdDate: '2024-11-03T13:50:58.758Z',
      modifiedBy: 'Me',
      modifiedDate: '2024-11-03T13:50:58.758Z'
    }],
  
    Items: [{
      _key: '1',
      id: 'item-0',
      itemNumber: 100,
      project: 'project-0',
      deployment: '',
      parent: '',
      name: 'Add projects',
      description: 'Add the projects page to the portfolio',
      tags: [],
      files: [],
      version: '1.0',
      type: 'Task',
      priority: 'Medium',
      status: 'Open',
      scheduledDate: null,
      hours: null,
      resolvedDate: '',
      closedDate: '',
      assignee: 'Me',
      createdBy: 'Me',
      createdDate: '2024-11-03T13:50:58.758Z',
      modifiedBy: 'Me',
      modifiedDate: '2024-11-03T13:50:58.758Z'
    }],
  
    Comments: [{
      _key: '1',
      id: 'comment-0',
      item: 'item-0',
      comment: 'Added the ASV project',
      createdBy: 'Me',
      createdDate: '2024-11-03T13:50:58.758Z',
      modifiedBy: 'Me',
      modifiedDate: '2024-11-03T13:50:58.758Z'
    }],
  
    Users: [{
      _key: '1',
      id: 'user-0',
      email: 'Me',
      settings: { theme: 'Dark', queue: [], favoriteProjects: [] },
      role: 'dev',
      createdDate: '2024-11-03T13:50:58.758Z',
    }],
  },

  schema: DataModel.schema(),

  Projects: {
    save(project) { 
      return MockDatabase.saveRecordInPlace(
        MockDatabase.db.Projects,
        MockDatabase.schema.Project,
        project
      );
    },
    delete(project) {
      return MockDatabase.deleteRecordInPlace(
        MockDatabase.db.Projects,
        project
      );
    },
  },

  Timelines: {
    save(timeline) { 
      return MockDatabase.saveRecordInPlace(
        MockDatabase.db.Timelines,
        MockDatabase.schema.Timeline,
        timeline
      );
    },
    delete(timeline) {
      return MockDatabase.deleteRecordInPlace(
        MockDatabase.db.Timelines,
        timeline
      );
    },
  },

  Items: {
    save(item) { 
      return MockDatabase.saveRecordInPlace(
        MockDatabase.db.Items,
        MockDatabase.schema.Item,
        item
      );
    },
    delete(item) {
      return MockDatabase.deleteRecordInPlace(
        MockDatabase.db.Items,
        item
      );
    },
  },
  
  Comments: {
    save(comment) { 
      return MockDatabase.saveRecordInPlace(
        MockDatabase.db.Comments,
        MockDatabase.schema.Comment,
        comment
      );
    },
    delete(comment) {
      return MockDatabase.deleteRecordInPlace(
        MockDatabase.db.Comments,
        comment
      );
    },
  },
  
  Users: {
    save(user) { 
      return MockDatabase.saveRecordInPlace(
        MockDatabase.db.Users,
        MockDatabase.schema.User,
        user
      );
    },
    delete(user) {
      return MockDatabase.deleteRecordInPlace(
        MockDatabase.db.Users,
        user
      );
    },
  },

  /**
   * @param {{ id: string }[]} set 
   * @param {{ id: string, [key: string]: any }} updated 
   */
  deleteRecordInPlace(set, deleted) {
    const index = set.findIndex(rec => rec.id === deleted.id);
    if (index !== -1) {
      set.splice(index, 1);
    }
  },

  /**
   * @param {{ id: string }[]} set 
   * @param {{ exec: () => object, parse: () => object }} schema
   * @param {{ id: string, [key: string]: any }} updated 
   */
  saveRecordInPlace(set, schema, updated) {
    const isNew = !updated._key;
    const value = schema.exec(updated, { isNew });
    if (isNew) {
      return MockDatabase.addRecordInPlace(set, schema, value);
    } else {
      return MockDatabase.updateRecordInPlace(set, schema, value);
    }
  },

  /**
   * @param {{ id: string }[]} set 
   * @param {{ exec: () => object, parse: () => object }} schema
   * @param {{ id: string, [key: string]: any }} updated 
   */
  addRecordInPlace(set, schema, updated) {
    set.push(updated);

    updated._key = String(MockDatabase.nextKey++);
    const saved = schema.parse(updated);
    return saved;
  },

  /**
   * @param {{ id: string }[]} set 
   * @param {{ exec: () => object, parse: () => object }} schema
   * @param {{ id: string, [key: string]: any }} updated 
   */
  updateRecordInPlace(set, schema, updated) {
    const index = set.findIndex(rec => rec.id === updated.id);
    if (index === -1) throw new Error('Not found!');

    set[index] = updated;

    const saved = schema.parse(updated);
    return saved;
  }
}