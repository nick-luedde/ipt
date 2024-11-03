/**
 * Helper methods for building objects that rely on environment configuration
 */
class CurrentEnvironment {

  /**
   * Single source method for defining the current environment configuration
   * - Change this here to define the environment of the app
   */
  static config() {
    /**
     * LEAVE THIS COMMENT BELOW! The AppsLibrary.cs ServerBuild relies on this template to build with the correct config
     */
    // {{# configurationTemplate }}

    // return ConfigurationFactory.productionConfig();
    // return ConfigurationFactory.maintenanceConfig();
    return ConfigurationFactory.developmentConfig();
    // return ConfigurationFactory.localConfig();
  }

  /**
   * Helper method to return a SheetDataAccess object based on the current environment config
   * @returns {SheetDataAccessModel} SheetDataAccess object
   */
  static datasource() {
    const ds = new SheetDataAccess(
      { id: CurrentEnvironment.config().datasourceId },
      { schemas: DataModel.schema() }
    );
    return ds;
  }

  /**
   * Helper method to get a SystemLogger object based on config
   */
  static logger() {
    const { logger } = CurrentEnvironment.config();
    return AppsSystemLogger.create({
      sysid: logger.sysid,
      system: logger.system,
      env: logger.environment,
      activeLevel: logger.level,
      types: logger.types,
      defaultEmail: logger.email,
      apiId: logger.apiId,
      apiKey: logger.apiKey,
      folderId: logger.folderId,
    });

    //TODO: attach a different data logger?  So batch logs dont go to SystemLogger??
    //But we want other data logs to go to SystemLogger...
    // So we need batch logs that can be overridden...
  }

  /**
   * Gets the google drive folder for files
   */
  static filesFolder() {
    return DriveApp.getFolderById(CurrentEnvironment.config().filesFolderId)
  }

  /** poller */
  static poller() {
    const config = CurrentEnvironment.config();
    const isProd = config.environment === 'production';
    const cachePrefix = isProd ? '_prod' : '_dev';
    return AppsDataPoll.create({ logging: !isProd, cachePrefix, cacheSeconds: 60 * 30 });
  }

}

/**
 * Class that returns different environment configuration
 */
class ConfigurationFactory {

  /**
   * Gets the development environment configuration
   */
  static developmentConfig() {
    return {
      environment: 'development',
      appUrl: '',
      datasourceId: '',
      filesFolderId: '',
      faviconUrl: '',
      templatePrdId: '',
      logger: {
        sysid: '',
        system: '',
        level: AppsSystemLogger.LEVEL.VERBOSE,
        types: [AppsSystemLogger.TYPE.DATA_SYSTEM, AppsSystemLogger.TYPE.BATCH],
        email: '',
        folderId: '',
        apiId: '',
        apiKey: ''
      },
    }
  }

  /**
   * Gets the development environment configuration
   */
  static localConfig() {
    return {
      environment: 'development',
      appUrl: '',
      datasourceId: '',
      filesFolderId: '',
      faviconUrl: '',
      templatePrdId: '',
      logger: {
        sysid: '',
        system: '',
        level: AppsSystemLogger.LEVEL.VERBOSE,
        types: [AppsSystemLogger.TYPE.DATA_SYSTEM, AppsSystemLogger.TYPE.BATCH],
        email: '',
        folderId: '',
        apiId: '',
        apiKey: ''
      },
    }
  }

  /**
   * Maintenance config
   */
  static maintenanceConfig() {
    return {
      environment: 'maintenance'
    }
  }

  /**
   * Gets the production environment configuration
   */
  static productionConfig() {
    return {
      environment: 'production',
      appUrl: '',
      datasourceId: '',
      filesFolderId: '',
      faviconUrl: '',
      templatePrdId: '',
      logger: {
        sysid: '',
        system: '',
        level: AppsSystemLogger.LEVEL.INFO,
        types: [AppsSystemLogger.TYPE.DATA_SYSTEM, AppsSystemLogger.TYPE.BATCH],
        email: '',
        folderId: '',
        apiId: '',
        apiKey: ''
      },
    }
  }

}