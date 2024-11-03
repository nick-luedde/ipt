class AppsDrivePicker {

  /**
   * Returns the content of a Drive folder (directory)
   * @param {Object} [options] - optional options 
   * @param {Object} [options.id] - optional id of directory 
   */
  static dir({ id } = {}) {
    const dfs = DriveFileSystem.dfs({ id });
    const { files, folders } = dfs.folder.tree({ path: '/' });
    return [...folders, ...files];
  }

  /**
   * Searches Drive for matching resource name
   * @param {string} term -search term
   */
  static search(term) {
    const dfs = DriveFileSystem.dfs();
    const files = dfs.file.find({ path: '/' }, `title contains "${term.replace(/'/g, "\'")}"`);
    const folders = dfs.folder.find({ path: '/' }, `title contains "${term.replace(/'/g, "\'")}"`);

    const fileInfo = files.map(f => dfs.file.inspect({ src: f }));
    const folderInfo = folders.map(f => dfs.folder.inspect({ src: f }));

    return [...folderInfo, ...fileInfo];
  }

  /**
   * Setup for AppsServer
   */
  static use(server) {

    server.post('/apps-drive-picker/dir', (req, res) => {
      const { id } = (req.body || {});
      const results = AppsDrivePicker.dir({ id });
      res.status(server.STATUS_CODE.SUCCESS).send(results);
    });

    server.post('/apps-drive-picker/search', (req, res) => {
      const { term } = (req.body || {});
      const results = AppsDrivePicker.search(term);
      res.status(server.STATUS_CODE.SUCCESS).send(results);
    });

  }

  /**
   * middleware for AppsServer
   */
  static middleware(req, res, next) {
    if (req.route === '/apps-drive-picker/dir') {
      const { id } = (req.body || {});
      const results = AppsDrivePicker.dir({ id });
      return res.status(server.STATUS_CODE.SUCCESS).send(results);
    } else if (req.route === '/apps-drive-picker/search') {
      const { term } = (req.body || {});
      const results = AppsDrivePicker.search(term);
      return res.status(server.STATUS_CODE.SUCCESS).send(results);
    }

    next();
  }

}