/**
 * Summary. Used in the Simulator, supports emulating the get behavior of the new style of merge field reference.
 */

class MergeField {
    constructor(data, asyncDelay) {
        this._data = data;
    }
    async get(getOpts) {
        const pathParts = (getOpts && typeof getOpts ==='object' && getOpts.path) ? getOpts.path.split('.') : false;
        const getPath = (value, parts) => {
            if (parts.length === 0)  return value;
            const nextPart = parts.shift();
            return getPath(value[nextPart], parts);
        }
        let result = pathParts ? getPath(this._data, pathParts) : this._data;
        if ( (result === undefined) || (result === null) ) {
          result = (getOpts && typeof getOpts ==='object' && getOpts.defaultValue) ? getOpts.defaultValue : result;
        }
        return result;
    }
}

module.exports = MergeField;