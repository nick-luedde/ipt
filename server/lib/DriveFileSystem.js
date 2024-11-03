class DriveFileSystem {

  /** @typedef {'bytes' | 'base64' | 'string' | 'json' | 'csv'} DfsAsOption */

  /**
   * Drive File System (dfs) functional resources
   * @param {object} resource - resource identifier 
   * @param {string} [resource.id] - resource id 
   * @param {string} [resource.path] - resource directory path 
   * @param {GoogleAppsScript.Drive.Folder} [resource.dir] - resource folder itself 
   */
  static dfs({ id, path, dir } = {}) {
    const helpers = {

      /**
       * Parses a Drive url to a file id
       * @param {string} url - url to parse
       */
      parseUrlToId(url) {
        const regex = /((?<=\/folders\/)[^\/\?]*)|((?<=\/d\/)[^\/\?]*)/;
        const match = regex.exec(url || '');
        const [id] = (match || []);
        return id;
      },

      /**
       * Gets file metadata
       * @param {GoogleAppsScript.Drive.File} file - file to get metadata for
       */
      getFileMeta(file) {
        const id = file.getId();
        const type = file.getMimeType();
        if (type === 'application/vnd.google-apps.folder')
          throw new Error(`Resource with id ${id} is not a file! Cannot get file metadata.`);

        return {
          resource: 'file',
          id,
          url: file.getUrl(),
          download: file.getDownloadUrl(),
          name: file.getName(),
          size: file.getSize(),
          type,
          owner: file.getOwner().getEmail(),
          created: file.getDateCreated().toJSON(),
          updated: file.getLastUpdated().toJSON(),
          viewers: file.getViewers().map(u => u.getEmail()),
          editors: file.getEditors().map(u => u.getEmail()),
          trashed: file.isTrashed(),
          target: file.getTargetId(),
          targetType: file.getTargetMimeType(),
          file: () => file
        };
      },

      /**
       * Attempts to resolve a set of given { id, path } arguments to a file resource
       * @param {object} arg 
       * @param {string} [arg.id] - id of resource 
       * @param {string} [arg.path] - path to resource
       * @param {GoogleAppsScript.Drive.File} [arg.src] - resource src obj
       * @param {object} options 
       * @param {boolean} [options.create] - create any necessary directory structure if not exists 
       * @param {boolean} [options.throwErr] - throw an error if given resource not located 
       */
      resolveFileIdPathArgs(arg, { create = true, throwErr = true } = {}) {
        if (arg.src)
          return arg.src;

        if (arg.id) {
          const file = helpers.quietGetFileById(arg.id);
          if (!file && throwErr)
            throw new Error(`No file found at ${arg.id}`);
          return file;
        }

        if (arg.path) {
          const file = helpers.resolvePathToFile(arg.path, { create });
          if (!file && throwErr)
            throw new Error(`No file found at ${arg.path}`);
          return file;
        }
      },

      /**
       * Attempts to retrieve a file by id, returns null if cannot retrieve
       * @param {string} id - id of file
       */
      quietGetFileById(id) {
        try {
          return DriveApp.getFileById(id);
        } catch (error) {
          //TODO eat access error, throw others...
          console.error(error);
          return null;
        }
      },

      /**
       * helper to resolve a given path, and return the result
       * @param {GoogleAppsScript.Drive.Folder} [root] - root to work form
       * @param {string} name - name of file
       * @param {object} options
       * @param {boolean} [options.create] - create resources as needed
       */
      quietGetFileByName(root, name, { create }) {
        const folder = root || wd;
        const fileIter = folder.getFilesByName(name);

        try {
          return fileIter.next();
        } catch (error) {
          if (create)
            return folder.createFile(name);

          console.error(error);
          return null;
        }
      },

      /**
       * helper to resolve a given path, and return the result
       * @param {string} path - path to resolve
       * @param {object} options
       * @param {boolean} [options.create] - create resources as needed
       */
      resolvePathToFile(path, { create }) {
        const parts = path.split('/');

        const fileName = parts.pop();
        const resolvedFolder = helpers.resolvePathToFolder(parts.join('/'), { create });

        if (!resolvedFolder)
          return null;

        return helpers.quietGetFileByName(resolvedFolder, fileName, { create });
      },

      /**
       * Gets folder metadata
       * @param {GoogleAppsScript.Drive.Folder} folder - folder to get metadata for
       */
      getFolderMeta(folder) {
        return {
          resource: 'folder',
          id: folder.getId(),
          url: folder.getUrl(),
          name: folder.getName(),
          size: folder.getSize(),
          owner: folder.getOwner().getEmail(),
          created: folder.getDateCreated().toJSON(),
          updated: folder.getLastUpdated().toJSON(),
          viewers: folder.getViewers().map(u => u.getEmail()),
          editors: folder.getEditors().map(u => u.getEmail()),
          trashed: folder.isTrashed(),
          folder: () => folder
        };
      },

      /**
       * Attempts to resolve a set of given { id, path } arguments to a folder resource
       * @param {object} arg 
       * @param {string} [arg.id] - id of resource 
       * @param {string} [arg.path] - path to resource
       * @param {GoogleAppsScript.Drive.Folder} [arg.src] - resource src obj
       * @param {object} options 
       * @param {boolean} [options.create] - create any necessary directory structure if not exists 
       * @param {boolean} [options.throwErr] - throw an error if given resource not located 
       */
      resolveFolderIdPathArgs(arg = { id, path = '.', src } = {}, { create = true, throwErr = true } = {}) {
        if (arg.src)
          return arg.src;

        if (arg.id) {
          const folder = helpers.quietGetFolderById(arg.id);
          if (!folder && throwErr)
            throw new Error(`No folder at ${arg.id}`);
          return folder;
        }

        if (arg.path) {
          const folder = helpers.resolvePathToFolder(arg.path, { create });
          if (!folder && throwErr)
            throw new Error(`No folder at ${arg.path}`);

          return folder;
        }
      },

      /**
       * Attempts to retrieve a folder by id, returns null if cannot retrieve
       * @param {string} id - id of folder
       */
      quietGetFolderById(id) {
        try {
          return DriveApp.getFolderById(id);
        } catch (error) {
          //TODO eat access error, throw others...
          console.error(error);
          return null;
        }

      },

      /**
       * helper to resolve a given path, and return the result
       * @param {GoogleAppsScript.Drive.Folder} [root] - root to work form
       * @param {string} name - name of folder
       * @param {object} options
       * @param {boolean} [options.create] - create resources as needed
       */
      quietGetFolderByName(root, name, { create }) {
        const folderIter = root.getFoldersByName(name);

        try {
          return folderIter.next();
        } catch (error) {
          if (create)
            return root.createFolder(name);

          console.error(error);
          return null;
        }
      },

      /**
       * private helper to resolve a given path, and return the result
       * @param {string} path - path to resolve
       */
      resolvePathToFolder(path, { create }) {
        if (!path || path === '.')
          return wd;

        const parts = path.split('/').filter(p => !!p);
        const relative = path.startsWith('/');

        const root = relative ? wd : DriveApp.getRootFolder();

        return helpers.resolvePathParts(parts, root, { create });
      },

      /**
       * Resolves an array of parts to a folder
       * @param {string[]} parts - parts string array
       * @param {GoogleAppsScript.Drive.Folder} root - starting folder
       */
      resolvePathParts(parts, root, { create }) {
        let resolution = root;
        parts.forEach(part => {
          if (resolution)
            resolution = helpers.quietGetFolderByName(resolution, part, { create });
        });

        return resolution;
      }
    };

    /**
     * resolves set of args to a Drive.Folder
     * @param {object} [resource] - resource identifier 
     * @param {string} [resource.id] - resource id 
     * @param {string} [resource.path] - resource directory path 
     * @param {GoogleAppsScript.Drive.Folder} [resource.dir] - resource folder itself 
     * @param {GoogleAppsScript.Drive.Folder} [root] - optional root for case where resource.path is relative 
     */
    const resolveArgsToWd = ({ id, path, dir } = {}) => {
      if (dir)
        return dir;

      else if (id) {
        const folder = helpers.quietGetFolderById(id);
        if (!folder)
          throw new Error(`Folder with id ${id} was not found or is inaccessible!`);

        return folder;
      } else if (path) {
        const folder = helpers.resolvePathParts(path.split('/').filter(p => !!p), DriveApp.getRootFolder(), { create: false });
        if (!folder)
          throw new Error(`${path} not found`);

        return folder;
      }

      return DriveApp.getRootFolder();
    };

    const wd = resolveArgsToWd({ id, path, dir });

    /**
     * Returns current dfs or new if resources provided
     * @param {object} resource - resource identifier 
     * @param {string} [resource.id] - resource id 
     * @param {string} [resource.path] - resource directory path 
     * @param {GoogleAppsScript.Drive.Folder} [resource.dir] - resource folder itself 
     */
    const cwd = ({ id, path, dir } = {}) => {
      if (!id && !path && !dir)
        return api;

      return DriveFileSystem.dfs({ id, path, dir });
    };

    const currentPath = () => {
      let parentIter = wd.getParents();
      const route = [wd.getName()];

      while (parentIter && parentIter.hasNext()) {
        const parent = parentIter.next();
        route.push(parent.getName());
        parentIter = parent.getParents();
      };

      return route.reverse().join('/');
    };

    const sharing = ({ id, res }, type) => {
      const resourceId = id || res.getId();
      let notify = false;
      let permissions;

      const roles = {
        read: 'reader',
        comment: 'reader',
        write: 'writer'
      };

      let resource = res;
      const getResource = () => {
        if (resource)
          return resource;

        return type === 'file'
          ? DriveApp.getFileById(id)
          : DriveApp.getFolderById(id);
      };

      const quiet = (val = true) => {
        notify = !val;
        return ret;
      };

      const details = (force) => {
        if (!permissions || force)
          permissions = Drive.Permissions.list(resourceId).items;

        return permissions;
      };

      const patchPermissionDetails = (perm) => {
        if (!permissions)
          return;

        const index = permissions.findIndex(d => d.id === perm.id);
        if (index !== -1)
          permissions.splice(index, 1, perm);
        else
          permissions.push(perm);
      };

      const revoke = (email) => {
        try {
          getResource().revokePermissions(email);
          if (permissions)
            permissions = permissions.filter(d => d.emailAddress !== email);
        } catch (err) { }

        return ret;
      };

      const actions = (role) => {
        const additionalRoles = role === 'comment'
          ? ['commenter']
          : undefined;

        const add = (email) => {
          const res = Drive.Permissions.insert({
            type: 'user',
            role: roles[role],
            value: email,
            additionalRoles
          }, resourceId, { sendNotificationEmails: notify });

          patchPermissionDetails(res);
          return ret;
        };

        const update = (email) => {
          const dets = details();
          const permission = dets.find(d => d.emailAddress === email);

          //TODO: if none, should we add or fail?
          if (!permission)
            return add(email);

          const res = Drive.Permissions.update({
            role: roles[role]
          },
            resourceId,
            permission.id
          );

          patchPermissionDetails(res);
          return ret;
        };

        return {
          add,
          update
        };
      };

      const read = actions('read');
      const comment = actions('comment');
      const write = actions('write');

      const unshare = () => {
        const res = getResource();

        const { editors, viewers } = type === 'file'
          ? helpers.getFileMeta(res)
          : helpers.getFolderMeta(res);

        editors.forEach(revoke);
        viewers.forEach(revoke);

        if (permissions)
          permissions = permissions.filter(d => d.role !== 'owner');

        return ret;
      };

      const readonly = () => {
        const permissions = details().filter(p => p.role !== 'owner');
        permissions.forEach(per => {
          const res = Drive.Permissions.update({
            role: roles.read
          },
            resourceId,
            per.id
          );
          patchPermissionDetails(res);
        });
        return ret;
      };

      const ret = {
        quiet,
        details,
        private: unshare,
        readonly,
        revoke,
        read,
        comment,
        write
      };

      return ret;
    };

    const file = () => {

      const VALID_AS_TYPES = [
        'bytes',
        'base64',
        'string',
        'json',
        'csv'
      ];

      /**
       * Throws an error if invalid 'as' type
       * @param {DfsAsOption} as - string type to validate
       */
      const validateAs = (as) => {
        const valid = VALID_AS_TYPES.includes(as);
        if (!valid)
          throw new Error(`Invalid file 'as' type ${as}. Must be one of: (${VALID_AS_TYPES.join(', ')})`);
      };

      return {
        /**
         * Copies a file to a new destination
         * @param {object} from - resource identifier 
         * @param {string} [from.id] - resource id 
         * @param {string} [from.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [from.src] - resource src obj
         * @param {object} to - resource identifier 
         * @param {string} [to.id] - resource id 
         * @param {string} [to.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.Folder} [to.src] - resource src obj
         * @param {string} [name] - optional new file name
         */
        copy(from, to, name) {
          const fromFile = helpers.resolveFileIdPathArgs(from);
          const toDestination = helpers.resolveFolderIdPathArgs(to);

          return fromFile.makeCopy(name || fromFile.getName(), toDestination);
        },

        /**
         * Checks if file exists
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        exists({ id, path, src }) {
          const existing = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          return !!existing;
        },

        /**
         * Creates a new file at the given resource location
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {object} options - file create options
         * @param {string} [options.name] - optional file name
         * @param {string} [options.string] - optional file content string
         * @param {GoogleAppsScript.Base.Blob} [options.blob] - optional content blob
         * @param {string | Array<any[]>} [options.csv] - optional content csv
         * @param {string} [options.json] - optional content json
         * @param {GoogleAppsScript.Byte[]} [options.bytes] - optional content bytes
         */
        create({ id, path, src }, { name, string, blob, csv, json, bytes }) {
          const destinationFolder = helpers.resolveFolderIdPathArgs({ id, path, src });

          if (string)
            return destinationFolder.createFile(name, string);
          if (blob)
            return destinationFolder.createFile(blob);
          if (csv) {
            const content = Array.isArray(csv)
              ? csv.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
              : String(csv);
            return destinationFolder.createFile(name, content);
          }
          if (json) {
            const content = typeof json === 'object'
              ? JSON.stringify(json)
              : String(json);
            return destinationFolder.createFile(name, content);
          }
          if (bytes) {
            const byteBlob = Utilities.newBlob('', null, name);
            byteBlob.setBytes(bytes);
            return destinationFolder.createFile(byteBlob);
          }

          return destinationFolder.createFile(name);
        },

        /**
         * Searches for files in the given resource
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {string} [resource.url] - resource url
         */
        get({ id, path, src, url }) {
          if (url)
            id = helpers.parseUrlToId(url);
          return helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
        },

        /**
         * Searches for files in the given resource
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {string} search - search object, see: https://developers.google.com/drive/api/guides/ref-search-terms
         */
        find({ id, path, src }, search) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src });

          const fileIter = folder.searchFiles(search);
          const files = [];
          while (fileIter.hasNext()) {
            files.push(fileIter.next());
          };

          return files;
        },

        /**
         * Returns a give file resources metadata
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        inspect({ id, path, src }) {
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false });
          if (!file)
            return null;

          return helpers.getFileMeta(file);
        },

        /**
         * Moves a file to a new destination
         * @param {object} from - resource identifier 
         * @param {string} [from.id] - resource id 
         * @param {string} [from.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [from.src] - resource src obj
         * @param {object} to - resource identifier 
         * @param {string} [to.id] - resource id 
         * @param {string} [to.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.Folder} [to.src] - resource src obj
         */
        move(from, to) {
          const fromFile = helpers.resolveFileIdPathArgs(from);
          const toDestination = helpers.resolveFolderIdPathArgs(to);

          return fromFile.moveTo(toDestination);
        },

        /**
         * reads a given file resources content
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path 
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {object} [options] - otpions
         * @param {DfsAsOption} [options.as] - type to read file content as 
         */
        read({ id, path, src }, { as = 'string' } = {}) {
          validateAs(as);
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false });

          if (as === 'bytes')
            return file.getBlob().getBytes();
          if (as === 'base64') {
            const bytes = file.getBlob().getBytes();
            return Utilities.base64Encode(bytes);
          }
          if (as === 'string')
            return file.getBlob().getDataAsString();
          if (as === 'json')
            return JSON.parse(file.getBlob().getDataAsString() || null);
          if (as === 'csv') {
            const content = file.getBlob().getDataAsString();
            return Utilities.parseCsv(content);
          }
        },

        /**
         * Trashes a give file resources
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {object} [options] - remove options
         * @param {boolean} [options.hard] - optional hard delete that skips the trash 
         */
        remove({ id, path, src }, { hard = false } = {}) {
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          if (file) {
            if (!hard)
              file.setTrashed(true)
            else
              Drive.Files.remove(file.getId());
          }

          return file;
        },

        /**
         * Gets list of parent folders
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        parents({ id, path, src }) {
          const file = helpers.resolveFileIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          const parents = [];
          if (file) {
            const iter = file.getParents();
            while (iter.hasNext())
              parents.push(helpers.getFileMeta(iter.next()));
          }
          return parents;
        },

        /**
         * writes to a given file resources
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         * @param {any} content - content to write
         * @param {object} [options] - otpions
         * @param {DfsAsOption} [options.as] - type to read write content as 
         */
        write({ id, path, src }, content, { as = 'string' } = {}) {
          validateAs(as);
          const file = helpers.resolveFileIdPathArgs({ id, path, src });

          if (as === 'bytes')
            file.setBytes(content);
          if (as === 'base64') {
            const bytes = Utilities.base64Decode(content);
            file.setBytes(bytes);
          }
          else if (as === 'string')
            file.setContent(content);
          else if (as === 'json')
            file.setContent(typeof content === 'string' ? content : JSON.stringify(content));
          else if (as === 'csv') {
            const csv = content.map(c => `"${String(c).replace(/"/g, '""')}"`).join('\n');
            file.setContent(csv);
          }

          return file;
        },

        /**
         * sharing options
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.File} [resource.src] - resource src obj
         */
        share({ id, path, src }) {
          const res = path
            ? helpers.resolvePathToFile(path, { create: false })
            : undefined;

          return sharing({ id, res: src || res }, 'file');
        }

      };
    };

    const folder = () => {
      return {

        /**
         * creates a new directory as needed
         * @param {string} path - resource directory path 
         */
        dir(path) {
          const folder = helpers.resolveFolderIdPathArgs({ path });
          return cwd({ dir: folder });
        },

        /**
         * Checks if folder exists
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        exists({ id, path, src }) {
          const existing = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          return !!existing;
        },

        /**
         * Gets if folder exists
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {string} [resource.url] - resource url
         */
        get({ id, path, src, url }) {
          if (url)
            id = helpers.parseUrlToId(url);
          return helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });
        },

        /**
         * Searches for folders in the given resource
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {string} search - search object, see: https://developers.google.com/drive/api/guides/ref-search-terms
         */
        find({ id, path, src }, search) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });
          if (!folder)
            return [];

          const folderIter = folder.searchFolders(search);
          const folders = [];
          while (folderIter.hasNext()) {
            folders.push(folderIter.next());
          };

          return folders;
        },

        /**
         * Returns an array of the files in a given folder
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        files({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return [];

          const fileIter = folder.getFiles();
          const files = [];
          while (fileIter.hasNext()) {
            const file = fileIter.next();
            files.push(helpers.getFileMeta(file));
          };

          return files;
        },

        /**
         * Returns a give folders resources metadata
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        inspect({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return null;

          return helpers.getFolderMeta(folder);
        },

        /**
         * Returns a given folders resources metadata
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        tree({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return { files: [], folders: [] };

          const fileIter = folder.getFiles();
          const files = [];
          while (fileIter.hasNext()) {
            const file = fileIter.next();
            files.push(helpers.getFileMeta(file));
          };

          const folderIter = folder.getFolders();
          const folders = [];
          while (folderIter.hasNext()) {
            const fld = folderIter.next();
            folders.push(helpers.getFolderMeta(fld));
          }

          return { files, folders };
        },

        /**
         * Returns all subdirectory and subfile metadata for a given folder
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        walk({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false });

          if (!folder)
            return { files: [], folders: [] };

          const getFolderInfo = (folder) => {
            const folderIter = folder.getFolders();
            let files = [];
            let folders = [];

            while (folderIter.hasNext()) {
              const sub = folderIter.next();
              folders.push(helpers.getFolderMeta(sub));

              const results = getFolderInfo(sub);
              files = [...files, ...results.files];
              folders = [...folders, ...results.folders];
            }

            const fileIter = folder.getFiles();
            while (fileIter.hasNext()) {
              const file = fileIter.next();
              files.push(helpers.getFileMeta(file));
            };

            return { folders, files };
          };

          return getFolderInfo(folder);
        },

        /**
         * Moves a folder to a new destination
         * @param {object} from - resource identifier 
         * @param {string} [from.id] - resource id 
         * @param {string} [from.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [from.src] - resource src obj
         * @param {object} to - resource identifier 
         * @param {string} [to.id] - resource id 
         * @param {string} [to.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [to.src] - resource src obj
         */
        move(from, to) {
          const fromFolder = helpers.resolveFolderIdPathArgs(from);
          const toDestination = helpers.resolveFolderIdPathArgs(to);

          return fromFolder.moveTo(toDestination);
        },
        /**
         * removes folder
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         * @param {object} [options] - remove options
         * @param {boolean} [options.hard] - optional hard delete that skips the trash 
         */
        remove({ id, path, src }, { hard = false } = {}) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });

          if (folder) {
            if (!hard)
              folder.setTrashed(true)
            else
              Drive.Files.remove(folder.getId());
          }

          return folder;
        },

        /**
         * Gets list of parent folders
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        parents({ id, path, src }) {
          const folder = helpers.resolveFolderIdPathArgs({ id, path, src }, { create: false, throwErr: false });
          const parents = [];
          if (folder) {
            const iter = folder.getParents();
            while (iter.hasNext())
              parents.push(helpers.getFolderMeta(iter.next()));
          }
          return parents;
        },

        /**
         * sharing options
         * @param {object} resource - resource identifier 
         * @param {string} [resource.id] - resource id 
         * @param {string} [resource.path] - resource directory path
         * @param {GoogleAppsScript.Drive.Folder} [resource.src] - resource src obj
         */
        share({ id, path, src }) {
          const res = path
            ? helpers.resolvePathToFolder(path, { create: false })
            : undefined;

          return sharing({ id, res: src || res }, 'folder');
        }
      };
    };

    const api = {
      cwd,
      path: currentPath,
      file: file(),
      folder: folder()
    };

    return api;
  }

}