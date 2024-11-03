class ItemServices {

  /**
   * Requests to create a new item in the datasource
   * @param {IItem} item - object containing all properties of a item
   * @param {IUser} user - object containing all properties of a item
   * @param {{ ds: SheetDataAccessModel, quiet: boolean }} [options] - options
   */
  static saveItem(item, user, { ds, quiet } = {}) {
    const datasource = ds || CurrentEnvironment.datasource();

    const changeEvent = ItemServices.onItemSave(item, user, datasource, { quiet });
    const savedItem = datasource.collections.Item.upsertOne(item);

    if (changeEvent)
      changeEvent(savedItem);

    return savedItem;
  }

  /**
   * Requests to delete an existing item in the datasource
   * @param {IItem} item - object containing all properties of an Item
   * @param {IUser} user - user
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteItem(item, user, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Item.data()
      .find(itm => itm.id === item.id);

    if (!existing)
      return null;

    if (existing.createdBy !== user.email && existing.asignee !== user.email)
      throw new ApiError('Not authorized to delete this item!', { code: 403 });

    datasource.collections.Item.delete([item]);

    return null;
  }

  /**
   * creates a new file in Google Drive for the provided blob
   * @param {object} file - object containing file info to create
   * @param {string} file.data - base 64 encoded file data
   * @param {string} file.type - mime type
   * @param {string} file.name - file name
   */
  static createItemFile({ data, type, name }) {
    const decoded = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decoded, type, name);

    const files = DriveFileSystem.dfs({ dir: CurrentEnvironment.filesFolder() });

    const file = files.file.create({ path: '/' }, { blob });

    return files.file.inspect({ src: file });
  }

  /**
   * Gets the Drive file details by url
   * @param {object} options - options
   * @param {string} [options.id] - optional id of file details to get
   * @param {string} [options.url] - optional url of file details to get
   */
  static getDriveFileDetails({ id, url }) {
    const dfs = DriveFileSystem.dfs();
    const file = dfs.file.get({ id, url });
    if (!file)
      throw new ApiError(`Could not find file with resource ${url || id}`, { code: 404 });
    return dfs.file.inspect({ src: file });
  }

  // /** DEPRECATED
  //  * deletes a file in Google Drive by the provided id
  //  * @param {string} fileId - Drive id of the file to delete
  //  */
  // static deleteItemFile(fileId) {
  //   const config = CurrentEnvironment.config();
  //   const dfs = DriveFileSystem.dfs();
  //   const file = dfs.file.get({ id: fileId });

  //   const [parent] = dfs.file.parents({ src: file });
  //   if (parent && parent.getId() === config.filesFolderId)
  //     dfs.file.remove({ src: file });

  //   return dfs.file.inspect({ src: file });
  // }

  /**
   * Event handler for item save
   * @param {IItem} item 
   * @param {SheetDataAccessModel} datasource - datasource object
   * @param {object} [options] - options
   * @param {boolean} [options.quiet] - do not send notifications
   */
  static onItemSave(item, user, datasource, { quiet } = {}) {

    const config = CurrentEnvironment.config();
    const isProd = config.environment === 'production';

    if (!!quiet || item.assignee === user.email)
      return null;

    const assignee = datasource.collections.User.data()
      .find(usr => usr.email === item.assignee);

    if (assignee && assignee.settings.getItemEmailNotifications) {
      const existing = datasource.collections.Item.find(item._key);

      if (isProd && (!existing || existing.assignee !== item.assignee))
        return (savedItemState) => IntegrationServices.sendItemEmail({
          item: savedItemState,
          emailMessage: {
            to: assignee.email,
            message: `This item has been assigned to ${assignee.email}!`
          }
        }, datasource);
    }

    return null;
  }

}