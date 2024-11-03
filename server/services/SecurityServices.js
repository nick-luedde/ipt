class SecurityServices {

  /**
   * throws error if user not in datasource
   * @param {SheetDataAccessModel} datasource - datasource object to lookup user
   * @param {Object} options - options for further checks
   */
  static checkIfValidUser(datasource, options = {}) {
    const user = SecurityServices.getCurrentUserObject(datasource);

    if (!user || user.deleted)
      throw new ApiError('Not authorized', { code: 403 });

    //get options
    const {
      roles
    } = options;

    //check if roles in the options and validate
    if (roles && !roles.includes(user.role))
      throw new ApiError('Not authorized: role', { code: 403 });

    return user;

  }

  /**
   * Gets the crrent user object from the datasource
   * @param {SheetDataAccessModel} [datasource] - datasource to lookup
   */
  static getCurrentUserObject(datasource) {
    const ds = datasource || CurrentEnvironment.datasource();
    const userEmail = Session.getActiveUser().getEmail();

    const user = ds.collections.User.data()
      .find(user => user.email === userEmail);

    return user;
  }

  /**
   * forces https: protocal to prevent javascript injection
   * @param {string} url - url to sanitize
   */
  static sanitizeUrl(url) {
    if (!url || typeof url !== 'string')
      return '';

    const httpsProtocol = /^(https:\/\/)/i;
    if (httpsProtocol.test(url))
      return url
    else
      return '';
  }
}