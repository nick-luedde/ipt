/**
 * Simple unit test implementation
 */
class AutomatedTestRegistry {

  constructor() {
    /**
     * tests array to add all tests to run
     */
    this.tests = [];
    this.testsRun = 0;
    this.startTime = 0;
    this.totalTime = 0;

    /**
     * failures object
     * @property {Array<string>} list - list of failure messages
     */
    this.failures = {
      list: []
    };
  }

  //TODO: add performance timing individually for functions?

  /**
   * Adds a test function to the register of tests
   * @param {string} testName - name of the test function being registered
   * @param {Function} testFunction - test function to register
   */
  registerTest(testName, testFunction) {
    this.tests.push({
      name: testName,
      testFunction: testFunction
    });
  }

  /**
   * Runs all functions contained in the self.tests list
   */
  async runAllTestsAsync() {
    this.testsRun = 0;
    this.startTime = new Date();

    for (const test of this.tests) {
      //run testFunction and pass a new Test object from the createTest method to each test function
      await test.testFunction(this.createTest(test.name));
    }

    this.totalTime = new Date() - this.startTime;
  }

  /**
   * Runs all functions contained in the self.tests list
   */
  runAllTests() {
    this.testsRun = 0;
    this.startTime = new Date();

    for (const test of this.tests) {
      //run testFunction and pass a new Test object from the createTest method to each test function
      test.testFunction(this.createTest(test.name));
    }

    this.totalTime = new Date() - this.startTime;
  }


  /**
   * creates new Test object
   * @param {string} testName - name of the test for which this assertion object is being generated
   * @returns {Object<Function>} Assert object with assertion functions
   */
  createTest(testName) {
    const self = this;
    const test = {
      is(description) {
        self.testsRun++;

        const assertion = {
          testName,
          description,
          postMessage(expected, actual) {
            self.failures.list.push(
              assertion.testName +
              ' test failed for ' +
              assertion.description +
              ' Expected: ' +
              expected +
              ' Actual: ' +
              actual
            );
          }
        };

        return {
          assert: {
            isTrue(value) {
              const result = value === true;
              if (!result) assertion.postMessage(true, value);
            },
            isFalse(value) {
              const result = value === false;
              if (!result) assertion.postMessage(false, value);
            },
            isEqual(value, toEqual) {
              const result = value === toEqual;
              if (!result) assertion.postMessage(toEqual, value);
            },
            typeIs(type, expectedType) {
              const result = typeof type === expectedType;
              if (!result)
                assertion.postMessage(
                  'type of ' + expectedType,
                  'type of ' + type
                );
            },
            exceptionThrown(testFunction, expectedException) {
              const message = expectedException || 'Exception';
              try {
                testFunction();
                assertion.postMessage(message, 'No exception');
              } catch (error) {
                const result = !expectedException || error.message === expectedException;
                if (!result)
                  assertion.postMessage(message, error.message);
              }
            },
            exceptionNotThrown(testFunction) {
              try {
                testFunction();
              } catch (error) {
                assertion.postMessage('No exception', error.message);
              }
            }
          }
        }
      }
    };

    return test;
  };


  /**
   * Returns a line-break formatted string
   * @returns {string} a string built from all failure messages
   */
  getFailureReport() {
    const newLine = '\r\n';

    let report =
      newLine +
      '---------- Tests executed on ' +
      new Date().toDateString() +
      ' ----------';
    report += this.failures.list.join(newLine);
    report +=
      this.testsRun +
      ' test(s) completed in ' +
      this.totalTime / 1000 +
      ' second(s)...';
    report += this.failures.list.length + ' test(s) failed...';

    return report;
  }

  /**
   * Ouputs results of the tests to the console
   */
  consoleFailures() {
    this.failures.list.forEach((failure) => console.log(failure));

    console.log(
      this.testsRun +
      ' test(s) completed in ' +
      this.totalTime / 1000 +
      ' second(s)...'
    );
    console.log(this.failures.list.length + ' test(s) failed...');
  };
}