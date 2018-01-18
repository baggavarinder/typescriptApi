const request = require("request");
const VERSION = "0.1";

class PhoneVerification {
  headers = {};
  user_agent = "PhoneVerificationRegNode/" + VERSION + " (node " + process.version + ")";
  apiKey: any;
  apiURL: any;

  constructor(apiKey: any, apiUrl: any) {
    this.apiKey = apiKey;
    this.apiURL = apiUrl || "https://api.authy.com";

    this.init();
  }

  /**
   * Custom http request method.
   *
   * @param type
   * @param path
   * @param params
   * @param callback
   * @param qs
   * @returns {any}
   */
  private request(type: any, path: any, params: any, callback: any, qs?: any): any {
    qs = qs || {};
    qs["api_key"] = this.apiKey;

    const options = {
      url: this.apiURL + path,
      form: params,
      headers: this.headers,
      qs: qs,
      json: true,
      jar: false,
      strictSSL: true
    };


    const callback_check = function(err: any, res: any, body: any) {
      if (!err) {
        if (res.statusCode === 200) {
          callback(undefined, body);
        } else {
          callback(body);
        }
      } else {
        callback(err);
      }
    };

    switch (type) {
      case "post":
        request.post(options, callback_check);
        break;

      case "get":
        request.get(options, callback_check);
        break;
    }
  }

  init(): void {
    this.headers = {
      "User-Agent": this.user_agent
    };
  }

  /**
   * Verify a phone number.
   *
   * @param phone_number
   * @param {string} country_code
   * @param {string} token
   * @param callback
   * @returns {any}
   */
  public verifyPhoneToken(phone_number: any, country_code: string, token: string, callback: any): any {
    this.request("get", "/protected/json/phones/verification/check", {
      "api_key": this.apiKey,
      "verification_code": token,
      "phone_number": phone_number,
      "country_code": country_code
    },
      callback
    );
  }

  /**
   * Request a phone verification.
   *
   * @param {number} phone_number
   * @param {number} country_code
   * @param {string} via
   * @param callback
   * @returns {any}
   */
  public requestPhoneVerification(phone_number: number, country_code: number, via: string, callback: any): any {
    this.request("post", "/protected/json/phones/verification/start", {
      "api_key": this.apiKey,
      "phone_number": phone_number,
      "via": via,
      "country_code": country_code,
      "code_length": 4
    },
      callback
    );
  }
}

module.exports = function(apiKey: any, apiUrl: any) {
  return new PhoneVerification(apiKey, apiUrl);
};
