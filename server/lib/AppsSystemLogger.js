/**
 * @typedef {Object} AppsSystemLog
 * @property {string} id - log id
 * @property {string} timestamp - log timestamp
 * @property {string} sysid - project id
 * @property {string} system - readable system name
 * @property {string} user - readable user email
 * @property {string} level - readable user name/email
 * @property {string} message - log message
 * @property {Object} json - log json
 * @property {string} notify - comma separated notify emails
 */

class AppsSystemLogger {

  static get LEVEL() {
    return {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      VERBOSE: 3
    };
  }

  static getLevelName(n) {
    const lvl = {
      0: 'ERROR',
      1: 'WARN',
      2: 'INFO',
      3: 'VERBOSE'
    };

    return lvl[n] || 'UNKNOWN';
  }

  static get TYPE() {
    return {
      CONSOLE: 'CONSOLE',
      DATA_SYSTEM: 'DATA_SYSTEM',
      BATCH: 'BATCH',
      FILE: 'FILE',
      MESSAGE: 'MESSAGE',
    };
  }

  static timestamp() {
    return (new Date()).toJSON();
  }

  /**
   * Creates logger object
   * @param {Object} options - logger options
   */
  static create({
    sysid,
    system,
    env,
    activeLevel = 2,
    types = [],
    defaultEmail,
    apiId,
    apiKey,
    folderId,
    batchIntervalSeconds = 60 * 60 * 6
  }) {
    let activeLogs = [...types];
    const email = defaultEmail;

    let throwError = true;
    const quiet = () => throwError = false;
    const loud = () => throwError = true;

    let sys_;
    const sys = () => {
      if (!sys_)
        sys_ = AppSheetAPI.create(apiId, apiKey);

      return sys_;
    };

    const exec = (fn) => {
      if (throwError) {
        fn();
      } else {
        try {
          fn();
        } catch (err) {
          console.error(`SYSTEM LOG FAILURE: ${err.message}\n${err.stack}`)
        }
      }
    };

    /**
     * Gets a log with all system values provided
     * @param {AppsSystemLog} log - log to map
     * @param {Object} options 
     * @returns {AppsSystemLog}
     */
    const asLog = (log, { convert = true } = {}) => ({
      id: Utilities.getUuid(),
      level: AppsSystemLogger.getLevelName(log.level),
      user: Session.getActiveUser().getEmail(),
      timestamp: AppsSystemLogger.timestamp(),
      sysid,
      system,
      message: log.message,
      json: typeof log.json === 'object' && convert ? JSON.stringify(log.json, null, 2) : log.json,
      notify: log.notify || undefined
    });

    /**
     * Returns log string
     * @param {AppsSystemLog} lg 
     */
    const toString = (lg) =>
      `SYSTEM [${AppsSystemLogger.getLevelName(lg.level)}] LOG (${lg.user}) ${AppsSystemLogger.timestamp()} - ${lg.message}${!!lg.json ? `\n\t${lg.json}` : ''}`;

    /**
     * Logs to default console
     * @param {AppsSystemLog} log
     */
    const logToConsole = (log) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.CONSOLE) || log.level > activeLevel)
        return;

      exec(() => console.log(toString(asLog(log))));
    };

    /**
     * Logs to json file
     * @param {AppsSystemLog} log
     */
    const logToFile = (log, fname) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.FILE) || log.level > activeLevel)
        return;

      if (!folderId)
        throw new Error('Missing folder id, cannot log to file!');

      exec(() => {
        const folder = DriveApp.getFolderById(folderId);
        folder.createFile(
          fname || `SYSTEM-[${AppsSystemLogger.getLevelName(log.level)}]-LOG_${AppsSystemLogger.timestamp()}.json`,
          JSON.stringify(asLog(log, { convert: false }), null, 2)
        );
      });
    };

    /**
     * Logs to AppsSystemLogger data system
     * @param {AppsSystemLog} log
     */
    const logToDataSystem = (log) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.DATA_SYSTEM) || log.level > activeLevel)
        return;

      exec(() => sys().body({ action: 'Add', rows: [asLog(log)] }).postSync('/SystemLog/Action'));
    };

    /**
     * Logs to default console
     * @param {AppsSystemLog} log
     */
    const logToMessage = (log) => {
      if (!activeLogs.includes(AppsSystemLogger.TYPE.MESSAGE) || log.level > activeLevel)
        return;

      exec(() => logToDataSystem({ ...log, notify: log.notify || email }));
    };

    const batchCache = {
      KEY: `__${env || 'dev'}_system_logger_batch_`,
      _c: null,
      instance() {
        if (!batchCache._c)
          batchCache._c = CacheService.getScriptCache();
        return batchCache._c;
      },
      /**
       * Gets the list of cached logs
       * @returns {AppsSystemLog[]}
       */
      get() {
        return JSON.parse(batchCache.instance().get(batchCache.KEY) || '[]');
      },
      /**
       * Puts a log in the batch cache
       * @param {AppsSystemLog} log
       */
      put(log) {
        const all = batchCache.get();
        batchCache.instance().put(batchCache.KEY, JSON.stringify([...all, asLog(log)]), batchIntervalSeconds);
      },
      /**
       * Clears the batch cache
       */
      clear() {
        batchCache.instance().remove(batchCache.KEY);
      }
    };

    const batch = {
      /**
       * Logs to default console
       * @param {AppsSystemLog} log
       */
      data(log) {
        if (!activeLogs.includes(AppsSystemLogger.TYPE.BATCH) || log.level > activeLevel)
          return;

        exec(() => {
          const lock = LockService.getScriptLock();

          lock.waitLock(1000 * 20);
          batchCache.put(log);
          lock.releaseLock();
        });

      },

      sweep() {
        const messages = batchCache.get();
        if (messages.length > 0)
          sys().body({ action: 'Add', rows: messages }).postSync('/SystemLog/Action');

        batchCache.clear();
      }
    };

    const level = (lvl) => {
      activeLevel = lvl;
      return api;
    };

    const attach = (type) => {
      const set = new Set([...activeLogs, type]);
      activeLogs = [...set];
      return api;
    };

    const detach = (type) => {
      activeLogs = activeLogs.filter(t => t !== type);
      return api;
    };

    const error = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.ERROR }),
    };
    const warn = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.WARN }),
    };
    const info = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.INFO }),
    };
    const verbose = {
      console: (log) => logToConsole({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      data: (log) => logToDataSystem({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      batch: (log) => batch.data({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      file: (log) => logToFile({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
      message: (log) => logToMessage({ ...log, level: AppsSystemLogger.LEVEL.VERBOSE }),
    };

    const api = {
      quiet,
      loud,
      console: logToConsole,
      data: logToDataSystem,
      batch,
      file: logToFile,
      message: logToMessage,
      level,
      attach,
      detach,
      error,
      warn,
      info,
      verbose,
    };

    return api;
  }

}