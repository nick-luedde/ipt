class DeploymentServices {
  /**
   * Requests to create a new deployment in the datasource
   * @param {IDeployment} deployment - object containing all properties of a Deployment
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static saveDeployment(deployment, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const savedDeployment = datasource.collections.Deployment.upsertOne(deployment);

    return savedDeployment;
  }

  /**
   * Requests to delete an existing deployment in the datasource
   * @param {IDeployment} deployment - object containing all properties of the existing Deployment
   * @param {SheetDataAccessModel} [ds] - optional datasource
   */
  static deleteDeployment(deployment, user, { force = false } = {}, ds) {
    const datasource = ds || CurrentEnvironment.datasource();

    const existing = datasource.collections.Deployment.data()
      .find(dep => dep.id === deployment.id);

    if (!existing)
      return null;

    if (existing.owner !== user.email && !force)
      throw new ApiError('Not authorized to delete this deployment!', { code: 403 });

    datasource.collections.Deployment.delete([deployment]);

    return null;
  }
}