class ProjectServices {

  /**
   * Requests to create a new project in the datasource
   * @param {IProject} project - object containing all properties of a Project
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveProject(project, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const savedProject = datasource.collections.Project.upsertOne(project);

    return savedProject;
  }

  /**
   * Requests to delete an existing project in the datasource
   * @param {IProject} project - object containing all properties of the existing Project
   * @param {IUser} user - user object
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteProject(project, user, { cascade = false, force = false } = {}, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Project.data()
      .find(proj => proj.id === project.id);

    if (!existing)
      return null;

    if (existing.owner !== user.email && !force)
      throw new ApiError('Not authorized to delete this project!', { code: 403 });

    datasource.collections.Project.delete([project]);

    if (cascade) {
      const items = datasource.collections.Item.data()
        .filter(itm => itm.project === project.id);
      const comments = datasource.collections.Comment.data()
        .filter(cmt => items.some(itm => itm.id === cmt.item));

      datasource.collections.Item.delete(items);
      datasource.collections.Comment.delete(comments);
    }

    return null;
  }

  /**
   * Updates all outstanding items for a project to a new version
   * @param {IProject} project - project with the desired new version set as the version prop
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static updateOutstandingItemsVersion(project, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const items = datasource.collections.Item.data()
      .filter(item => item.project === project.id && item.status !== 'Closed');

    const itemsToUpdate = items.map(item => {
      item.version = project.version;
      return item;
    });

    const savedItems = datasource.collections.Item.update(itemsToUpdate);

    return savedItems;
  }

  /**
   * Creates a new template PRD (defaults to users 'My Drive')
   * @param {Object} [options] - options
   * @param {GoogleAppsScript.Drive.Folder} [options.folder] - folder
   * @param {String} [options.folderId] - folder id
   * @param {String} [options.name] - optional file name
   */
  static createTemplatePrd({ folder, folderId, name } = {}) {
    const config = CurrentEnvironment.config();
    const dfs = DriveFileSystem.dfs();

    const destination = {
      path: (!folder && !folderId) ? '/' : undefined,
      id: folderId,
      src: folder
    };
    const prd = dfs.file.copy({ id: config.templatePrdId }, destination, name);

    return dfs.file.inspect({ src: prd });
  }

}