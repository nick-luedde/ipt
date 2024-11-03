class DataModel {

  /**
   * Data model definition for app data
   */
  static model() {
    return {
      Project: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        name: {
          required: true,
          type: 'string'
        },
        description: {
          required: true,
          type: 'string',
          client: { type: 'textarea' }
        },
        version: {
          required: true,
          type: 'string'
        },
        status: {
          required: true,
          type: 'string'
        },
        categories: {
          type: 'array',
          default: () => []
        },
        platforms: {
          required: true,
          type: 'array',
          default: () => []
        },
        dependsOnProjects: {
          type: 'array',
          default: () => []
        },
        priority: {
          required: true,
          type: 'string',
        },
        accessibilityStatus: {
          type: 'string',
        },
        iteration: {
          type: 'datestring'
        },
        planningNotes: {
          type: 'string',
          client: { type: 'textarea' }
        },
        program: {
          required: true,
          type: 'string',
        },
        hasPII: {
          type: 'boolean',
        },
        links: {
          type: 'array',
          default: () => [],
          resolver: (val) => val.map(({ name, url, type }) => ({ name, url, type }))
        },
        owner: {
          required: true,
          type: 'string',
          default: () => 'Me'
        },
        backup: {
          required: true,
          type: 'string',
        },
        isPublic: {
          type: 'boolean',
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Deployment: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        project: {
          required: true,
          type: 'string'
        },
        description: {
          type: 'string',
          client: { type: 'textarea' }
        },
        version: {
          required: true,
          type: 'string'
        },
        owner: {
          required: true,
          type: 'string',
          default: () => 'Me'
        },
        scheduled: {
          type: 'datetimestring'
        },
        date: {
          required: true,
          type: 'datestring',
        },
        tags: {
          type: 'array',
          default: () => []
        },
        notes: {
          type: 'string',
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Timeline: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        projects: {
          type: 'array',
          default: () => []
        },
        name: {
          required: true,
          type: 'string'
        },
        description: {
          type: 'string',
          client: { type: 'textarea' }
        },
        status: {
          required: true,
          type: 'string'
        },
        effort: {
          type: 'number',
        },
        priority: {
          type: 'number',
        },
        magnitude: {
          type: 'number',
        },
        impacts: {
          type: 'array',
          default: () => []
        },
        notes: {
          type: 'string',
          client: { type: 'textarea' }
        },
        startDate: {
          required: true,
          type: 'datestring',
        },
        endDate: {
          required: true,
          type: 'datestring',
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Item: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        itemNumber: {
          type: 'number',
          default: () => {
            if (typeof MockDatabase === 'undefined') return 0;
            const max = Math.max(...MockDatabase.db.Items.map(itm => itm.itemNumber));
            return max + 1;
          }
        },
        project: {
          type: 'string',
          required: true
        },
        deployment: {
          type: 'string',
        },
        parent: {
          type: 'string'
        },
        name: {
          type: 'string',
          required: true
        },
        description: {
          type: 'string',
          client: { type: 'textarea' }
        },
        tags: {
          type: 'array',
          default: () => []
        },
        files: {
          type: 'array',
          default: () => [],
          max: 10,
          schema: { type: 'file' }
        },
        version: {
          required: true,
          type: 'string'
        },
        type: {
          required: true,
          type: 'string'
        },
        priority: {
          required: true,
          type: 'string'
        },
        status: {
          required: true,
          type: 'string'
        },
        scheduledDate: {
          type: 'datetimestring'
        },
        hours: {
          type: 'number'
        },
        resolvedDate: {
          type: 'datestring'
        },
        closedDate: {
          type: 'datestring'
        },
        assignee: {
          required: true,
          type: 'string'
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      Comment: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        item: {
          required: true,
          type: 'string'
        },
        comment: {
          required: true,
          type: 'string',
          client: { type: 'textarea' }
        },
        createdBy: {
          type: 'audit',
          default: true
        },
        createdDate: {
          type: 'timestamp',
          default: true
        },
        modifiedBy: {
          type: 'audit',
          update: true
        },
        modifiedDate: {
          type: 'timestamp',
          update: true
        }
      },

      User: {
        _key: {
          type: 'string'
        },
        id: {
          type: 'id'
        },
        email: {
          required: true,
          type: 'string'
        },
        settings: {
          type: 'object',
          default: () => ({ favoriteProjects: [] })
        },
        role: {
          type: 'string'
        },
        createdDate: {
          type: 'timestamp',
          default: true
        }
      },

      Config: {
        _key: {
          type: 'string'
        },
        id: {
          required: true,
          type: 'string'
        },
        json: {
          required: true,
          type: 'object'
        }
      }
    }
  }

  /**
   * ASV compiled schemas for the data model
   */
  static schema() {
    const asv = AppsSchemaValidation.asv();
    const model = DataModel.model();

    return {
      Project: asv.compile(model.Project),
      Timeline: asv.compile(model.Timeline),
      Item: asv.compile(model.Item),
      Comment: asv.compile(model.Comment),
      User: asv.compile(model.User),
      Config: asv.compile(model.Config)
    };
  }
}