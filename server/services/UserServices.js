class UserServices {

  /**
   * Updates a user to the datasource
   * @param {IUser} user - user to update
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveUser(user, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const [savedUser] = datasource.collections.User.update([user]);

    return savedUser;
  }

}