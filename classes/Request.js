'use strict';

const _ = require('lodash');
const Basic = require('./basic');
const request = require('request-promise-native');

const DEFAULT_MAX_REQUEST_RETRIES = 5;
const DEFAULT_MAX_CONNECT_RETRIES = 5;
const DEFAULT_MAX_CONNECT_TIMEOUT = 1000;
const DEFAULT_CONNECT_TIMEOUT_INCREMENT = 200;

/**
 * Request service class -  a wrapper around {@link https://github.com/request/request-promise request-promise}
 * to automate reporting API Events (see {@link Reporter#reportApiEvent Reporter.reportApiEvent} method)
 * @see {@link https://github.com/request/request-promise request-promise} for full documentation
 *  * @extends Basic
 */
class Request extends Basic {
	/**
	 * Make DELETE request
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	del(params) {
		return this.method('DELETE', params);
	}

	/**
	 * Make GET request
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	get(params) {
		return this.method('GET', params);
	}

	/**
	 * Make HEAD request
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	head(params) {
		return this.method('HEAD', params);
	}

	/**
	 * Make http request
	 * @param {String} method - request method
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	async method(method, params) {
		const upperMethod = _.toUpper(method);
		const isFullResponse = Boolean(_.get(params, ['resolveWithFullResponse']));
		const requestParams = this._getExtendedRequestParams(method, params);
		const requestStartTime = Date.now();
		// const reporting = _.get(params, ['reporting']);
		const maxConnectRetries = _.get(params, ['maxConnectRetries'], DEFAULT_MAX_CONNECT_RETRIES);

		const maxRequestRetries = _.get(params, ['maxRequestRetries'], DEFAULT_MAX_REQUEST_RETRIES);
		const isRetriable = _.get(params, ['isRetriable'], this._isErrorRetriable);

		let lastError;

		let response;

		let connectAttempts = 0;
		let requestAttempts = 0;

		while (connectAttempts < maxConnectRetries && requestAttempts < maxRequestRetries) {
			try {
				response = await this._request(requestParams, connectAttempts + 1);

				// this._reportApiSuccess({
				// 	response,
				// 	method: upperMethod,
				// 	requestParams,
				// 	requestStartTime,
				// 	reporting
				// });

				return isFullResponse ? response : response.body;
			} catch (error) {
				lastError = error;

				if (error.code === 'ORCONNECTTIMEDOUT') {
					connectAttempts += 1;
					if (connectAttempts < maxConnectRetries)
						this.log.warn(`Failed connect attempt #${connectAttempts}, retrying...`, params);
					else
						this.log.warn(`Failed final connect attempt #${connectAttempts}`, params);
				} else {
					if (!isRetriable(error, requestParams))
						break;
					requestAttempts += 1;
					if (requestAttempts < maxRequestRetries)
						this.log.warn(`Failed request attempt #${requestAttempts}, retrying...`, params);
					else
						this.log.warn(`Failed final request attempt #${requestAttempts}`, params);
				}
			}
		}

		if (connectAttempts >= maxConnectRetries)
			this.log.error(`Failed to connect to a remote server in ${maxConnectRetries} attempts`, params);

		// this._reportApiError({
		// 	error: lastError,
		// 	method: upperMethod,
		// 	requestParams,
		// 	requestStartTime,
		// 	reporting
		// });

		throw lastError;
	}

	/**
	 * Make PATCH request
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	patch(params) {
		return this.method('PATCH', params);
	}

	/**
	 * Make POST request
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	post(params) {
		return this.method('POST', params);
	}

	/**
	 * Make PUT request
	 * @param {Object} params - request parameters
	 * @see {@link https://github.com/request/request#requestoptions-callback request options} for a full list of parameters
	 * @return {Promise}
	 */
	put(params) {
		return this.method('PUT', params);
	}

	/**
	 * Returns a function close to request-promise usage: `require('request-promise-native')(params)`
	 */
	asRequestPromise() {
		return params => this.method(params.method, params);
	}

	_request(params, attempt) {
		const timeout = _.get(params, ['timeout']);
		const connectTimeout = _.get(params, ['maxConnectTimeout'], DEFAULT_MAX_CONNECT_TIMEOUT);
		const maxConnectTimeout = timeout ? _.min([connectTimeout, timeout]) : connectTimeout; // `timeout` in request is used for both connection and response
		const connectTimeoutIncrement = _.get(params, ['connectTimeoutIncrement'], DEFAULT_CONNECT_TIMEOUT_INCREMENT);

		return new Promise((resolve, reject) => {
			const stream = request(params);
			// connection timeout support
			if (maxConnectTimeout) {
				stream.once('socket', socket => {
					if (socket.connecting) {
						const timeoutId = setTimeout(() => {
							const error = new Error('Socket timed out without establishing a connection');
							error.code = 'ORCONNECTTIMEDOUT';
							clearTimeout(stream.timeoutTimer); // `abort` does not clear inner timeoutTimer
							stream.abort(); // cancel request
							reject(error);
						}, this._connectRetryStrategy({
							attempt,
							maxConnectTimeout,
							connectTimeoutIncrement
						}));

						if (timeoutId.unref)
							timeoutId.unref();

						socket.once('connect', _.partial(clearTimeout, timeoutId));
					}
				});
			}
			stream.promise().then(resolve).catch(reject);
		});
	}

	_isErrorRetriable(error) {
		const statusCode = _.get(error, ['statusCode']);
		return _.includes([429, 503, 504], statusCode);
	}

	_connectRetryStrategy(options) {
		return _.min([options.attempt * options.connectTimeoutIncrement, options.maxConnectTimeout]);
	}

	_getExtendedRequestParams(method, params) {
		return _.assign({}, _.omit(params, ['reporting']), {
			method,
			resolveWithFullResponse: true,
			rejectUnauthorized: true,
			gzip: true
		});
	}

	// _reportApiEvent(params) {
	// 	const response = _.get(params, ['response'], {});
	// 	const requestParams = _.get(params, ['requestParams'], {});
	// 	const requestStartTime = _.get(params, ['requestStartTime']);
	// 	const responseJSON = _.isFunction(response.toJSON) ? _.omit(response.toJSON(), 'request') : _.omit(response, 'request');
	// 	const reportingSettingsKey = _.get(params, ['reporting', 'settingsKey']);

	// 	if (!_.get(params, ['reporting', 'disable']) || reportingSettingsKey) {
	// 		return this.thread.reporter.reportApiEvent({
	// 			method: _.get(params, ['method']),
	// 			request: requestParams,
	// 			response: responseJSON,
	// 			responseTime: Date.now() - requestStartTime,
	// 			statusCode: _.get(params, ['statusCode']),
	// 			url: requestParams.url || requestParams.uri,
	// 			tags: _.get(params, ['reporting', 'tags']),
	// 			requestStartTime,
	// 			reportingSettingsKey
	// 		});
	// 	}
	// }

	// _reportApiError(params) {
	// 	const error = params.error;
	// 	const statusCode = _.get(error, ['statusCode']) ||
	// 		(_.get(error, ['error', 'code']) === 'ESOCKETTIMEDOUT' ? 504 /* Gateway Timeout */ : 520 /* Unknown Error */ );

	// 	this.log.error('Failed to make request', {
	// 		code: error.code,
	// 		statusCode: error.statusCode,
	// 		message: error.message,
	// 		stack: error.stack
	// 	});

	// 	this._reportApiEvent(_.assign(params, {
	// 		response: error.response || {},
	// 		statusCode
	// 	}));
	// }

	// _reportApiSuccess(params) {
	// 	this._reportApiEvent(_.assign(params, {
	// 		statusCode: params.response.statusCode
	// 	}));
	// }
}

module.exports = Request;