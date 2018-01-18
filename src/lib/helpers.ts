const countries = require("countries-list");

class Helpers {
  constructor() {
  }

  /**
   * Method for get country code via phone code.
   *
   * @param {number} phoneCode.
   * @returns {String} - country code.
   */
  getCountryCode(phoneCode: number): any {
    if (!phoneCode) {
      return new Error("Phone code is required");
    }

    return Object.keys(countries.countries).find((country) => {
      return Number(countries.countries[country].phone) == phoneCode;
    });
  }
}

module.exports = () => {
  return new Helpers();
};
