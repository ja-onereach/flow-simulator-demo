/**
 * Summary. This class is used to esablish a flow execution simulation environment and emulate some flow SDK methods in `this`.
 */

module.exports = (() => {
    const MergeField = require('./MergeField');
    return class Simulator {
        constructor(dash, optsIn, runner) {
            this._ = dash;
            this._opts = {  // default options
            };
            this._.assign(this._opts, optsIn || {});
            this.mfData = require('../../mergeFieldData');
            this.mergeFields = new Proxy(this.mfData, {
              get(target, prop) {
                return new MergeField(target[prop]);
              }
            });
            this._runner = runner;
            this.log = {
                info: function (msg, data) { 
                  data ? console.log(msg, data) : console.log(msg);
                },
                warn: function (msg, data) {
                  data ? console.warn(msg, data) : console.warn(msg);
                },
                error: function (msg, data) {
                  data ? console.error(msg, data) : console.error(msg);
                }
            }
        }
        get(mf, defaultValue) {
            let result = this._.get(this.mfData, mf);
            return !this._.isNil(result) ? result : defaultValue;
        }
        exitStep(leg, data) {
          console.log(`\n\n//// EXIT STEP ON LEG: '${leg}' ////\n`, data);
        }
        async run() {
            return await this._runner();
        }
    }
})()