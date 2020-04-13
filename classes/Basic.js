'use strict';

const _thread = Symbol('thread');

/**
 * Basic service class
 */
class Basic {
    /**
     * Basic service initialization
     * @param {Thread} thread
     */
    constructor (thread) {
        this[_thread] = thread;
    }

    /**
     * Get flow config
     */
    get config () {
        return this.thread.config;
    }

    /**
     * Flow back-reference
     * @type {Flow}
     */
    get flow () {
        return this.thread.flow;
    }

    /**
     * Update flow back-reference used in global caching scenarios
     * @deprecated
     */
    set flow (value) {
        this.log.warn('deprecated change of flow');
    }

    /**
     * Alias for <code>this.thread.log</code>
     * @type {Logger}
     */
    get log () {
        return this.thread.log;
    }

    /**
     * Process back-reference
     * @type {Process}
     */
    get process () {
        return this.thread.process;
    }

    /**
     * Thread back-reference
     * @type {Thread}
     */
    get thread () {
        return this[_thread];
    }

    /**
     * Update thread back-reference used in global caching scenarios
     */
    set thread (thread) {
        this[_thread] = thread;
    }
}

module.exports = Basic;