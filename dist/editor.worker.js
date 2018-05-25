var editorWorker = (function (exports) {
    'use strict';

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var _isWindows = false;
    var _isMacintosh = false;
    var _isLinux = false;
    var _isNative = false;
    var _locale = undefined;
    var _translationsConfigFile = undefined;
    // OS detection
    if (typeof process === 'object' && typeof process.nextTick === 'function' && typeof process.platform === 'string') {
        _isWindows = (process.platform === 'win32');
        _isMacintosh = (process.platform === 'darwin');
        _isLinux = (process.platform === 'linux');
        var rawNlsConfig = process.env['VSCODE_NLS_CONFIG'];
        if (rawNlsConfig) {
            try {
                var nlsConfig = JSON.parse(rawNlsConfig);
                var resolved = nlsConfig.availableLanguages['*'];
                _locale = nlsConfig.locale;
                _translationsConfigFile = nlsConfig._translationsConfigFile;
            }
            catch (e) {
            }
        }
        _isNative = true;
    }
    else if (typeof navigator === 'object') {
        var userAgent = navigator.userAgent;
        _isWindows = userAgent.indexOf('Windows') >= 0;
        _isMacintosh = userAgent.indexOf('Macintosh') >= 0;
        _isLinux = userAgent.indexOf('Linux') >= 0;
        _locale = navigator.language;
    }
    var Platform;
    (function (Platform) {
        Platform[Platform["Web"] = 0] = "Web";
        Platform[Platform["Mac"] = 1] = "Mac";
        Platform[Platform["Linux"] = 2] = "Linux";
        Platform[Platform["Windows"] = 3] = "Windows";
    })(Platform || (Platform = {}));
    var _platform = Platform.Web;
    if (_isNative) {
        if (_isMacintosh) {
            _platform = Platform.Mac;
        }
        else if (_isWindows) {
            _platform = Platform.Windows;
        }
        else if (_isLinux) {
            _platform = Platform.Linux;
        }
    }
    var isWindows = _isWindows;
    var _globals = (typeof self === 'object' ? self : typeof global === 'object' ? global : {});
    var globals = _globals;

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    function _encode(ch) {
        return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
    }
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
    function encodeURIComponent2(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, _encode);
    }
    function encodeNoop(str) {
        return str.replace(/[#?]/, _encode);
    }
    var _schemePattern = /^\w[\w\d+.-]*$/;
    var _singleSlashStart = /^\//;
    var _doubleSlashStart = /^\/\//;
    function _validateUri(ret) {
        // scheme, https://tools.ietf.org/html/rfc3986#section-3.1
        // ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
        if (ret.scheme && !_schemePattern.test(ret.scheme)) {
            throw new Error('[UriError]: Scheme contains illegal characters.');
        }
        // path, http://tools.ietf.org/html/rfc3986#section-3.3
        // If a URI contains an authority component, then the path component
        // must either be empty or begin with a slash ("/") character.  If a URI
        // does not contain an authority component, then the path cannot begin
        // with two slash characters ("//").
        if (ret.path) {
            if (ret.authority) {
                if (!_singleSlashStart.test(ret.path)) {
                    throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
                }
            }
            else {
                if (_doubleSlashStart.test(ret.path)) {
                    throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
                }
            }
        }
    }
    var _empty = '';
    var _slash = '/';
    var _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    var _driveLetterPath = /^\/[a-zA-Z]:/;
    var _upperCaseDrive = /^(\/)?([A-Z]:)/;
    var _driveLetter = /^[a-zA-Z]:/;
    /**
     * Uniform Resource Identifier (URI) http://tools.ietf.org/html/rfc3986.
     * This class is a simple parser which creates the basic component paths
     * (http://tools.ietf.org/html/rfc3986#section-3) with minimal validation
     * and encoding.
     *
     *       foo://example.com:8042/over/there?name=ferret#nose
     *       \_/   \______________/\_________/ \_________/ \__/
     *        |           |            |            |        |
     *     scheme     authority       path        query   fragment
     *        |   _____________________|__
     *       / \ /                        \
     *       urn:example:animal:ferret:nose
     *
     *
     */
    var URI = /** @class */ (function () {
        /**
         * @internal
         */
        function URI(schemeOrData, authority, path, query, fragment) {
            if (typeof schemeOrData === 'object') {
                this.scheme = schemeOrData.scheme || _empty;
                this.authority = schemeOrData.authority || _empty;
                this.path = schemeOrData.path || _empty;
                this.query = schemeOrData.query || _empty;
                this.fragment = schemeOrData.fragment || _empty;
                // no validation because it's this URI
                // that creates uri components.
                // _validateUri(this);
            }
            else {
                this.scheme = schemeOrData || _empty;
                this.authority = authority || _empty;
                this.path = path || _empty;
                this.query = query || _empty;
                this.fragment = fragment || _empty;
                _validateUri(this);
            }
        }
        URI.isUri = function (thing) {
            if (thing instanceof URI) {
                return true;
            }
            if (!thing) {
                return false;
            }
            return typeof thing.authority === 'string'
                && typeof thing.fragment === 'string'
                && typeof thing.path === 'string'
                && typeof thing.query === 'string'
                && typeof thing.scheme === 'string';
        };
        Object.defineProperty(URI.prototype, "fsPath", {
            // ---- filesystem path -----------------------
            /**
             * Returns a string representing the corresponding file system path of this URI.
             * Will handle UNC paths and normalize windows drive letters to lower-case. Also
             * uses the platform specific path separator. Will *not* validate the path for
             * invalid characters and semantics. Will *not* look at the scheme of this URI.
             */
            get: function () {
                return _makeFsPath(this);
            },
            enumerable: true,
            configurable: true
        });
        // ---- modify to new -------------------------
        URI.prototype.with = function (change) {
            if (!change) {
                return this;
            }
            var scheme = change.scheme, authority = change.authority, path = change.path, query = change.query, fragment = change.fragment;
            if (scheme === void 0) {
                scheme = this.scheme;
            }
            else if (scheme === null) {
                scheme = _empty;
            }
            if (authority === void 0) {
                authority = this.authority;
            }
            else if (authority === null) {
                authority = _empty;
            }
            if (path === void 0) {
                path = this.path;
            }
            else if (path === null) {
                path = _empty;
            }
            if (query === void 0) {
                query = this.query;
            }
            else if (query === null) {
                query = _empty;
            }
            if (fragment === void 0) {
                fragment = this.fragment;
            }
            else if (fragment === null) {
                fragment = _empty;
            }
            if (scheme === this.scheme
                && authority === this.authority
                && path === this.path
                && query === this.query
                && fragment === this.fragment) {
                return this;
            }
            return new _URI(scheme, authority, path, query, fragment);
        };
        // ---- parse & validate ------------------------
        URI.parse = function (value) {
            var match = _regexp.exec(value);
            if (!match) {
                return new _URI(_empty, _empty, _empty, _empty, _empty);
            }
            return new _URI(match[2] || _empty, decodeURIComponent(match[4] || _empty), decodeURIComponent(match[5] || _empty), decodeURIComponent(match[7] || _empty), decodeURIComponent(match[9] || _empty));
        };
        URI.file = function (path) {
            var authority = _empty;
            // normalize to fwd-slashes on windows,
            // on other systems bwd-slashes are valid
            // filename character, eg /f\oo/ba\r.txt
            if (isWindows) {
                path = path.replace(/\\/g, _slash);
            }
            // check for authority as used in UNC shares
            // or use the path as given
            if (path[0] === _slash && path[1] === _slash) {
                var idx = path.indexOf(_slash, 2);
                if (idx === -1) {
                    authority = path.substring(2);
                    path = _slash;
                }
                else {
                    authority = path.substring(2, idx);
                    path = path.substring(idx) || _slash;
                }
            }
            // Ensure that path starts with a slash
            // or that it is at least a slash
            if (_driveLetter.test(path)) {
                path = _slash + path;
            }
            else if (path[0] !== _slash) {
                // tricky -> makes invalid paths
                // but otherwise we have to stop
                // allowing relative paths...
                path = _slash + path;
            }
            return new _URI('file', authority, path, _empty, _empty);
        };
        URI.from = function (components) {
            return new _URI(components.scheme, components.authority, components.path, components.query, components.fragment);
        };
        // ---- printing/externalize ---------------------------
        /**
         *
         * @param skipEncoding Do not encode the result, default is `false`
         */
        URI.prototype.toString = function (skipEncoding) {
            if (skipEncoding === void 0) { skipEncoding = false; }
            return _asFormatted(this, skipEncoding);
        };
        URI.prototype.toJSON = function () {
            var res = {
                $mid: 1,
                fsPath: this.fsPath,
                external: this.toString(),
            };
            if (this.path) {
                res.path = this.path;
            }
            if (this.scheme) {
                res.scheme = this.scheme;
            }
            if (this.authority) {
                res.authority = this.authority;
            }
            if (this.query) {
                res.query = this.query;
            }
            if (this.fragment) {
                res.fragment = this.fragment;
            }
            return res;
        };
        URI.revive = function (data) {
            if (!data) {
                return data;
            }
            else if (data instanceof URI) {
                return data;
            }
            else {
                var result = new _URI(data);
                result._fsPath = data.fsPath;
                result._formatted = data.external;
                return result;
            }
        };
        return URI;
    }());
    // tslint:disable-next-line:class-name
    var _URI = /** @class */ (function (_super) {
        __extends(_URI, _super);
        function _URI() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._formatted = null;
            _this._fsPath = null;
            return _this;
        }
        Object.defineProperty(_URI.prototype, "fsPath", {
            get: function () {
                if (!this._fsPath) {
                    this._fsPath = _makeFsPath(this);
                }
                return this._fsPath;
            },
            enumerable: true,
            configurable: true
        });
        _URI.prototype.toString = function (skipEncoding) {
            if (skipEncoding === void 0) { skipEncoding = false; }
            if (!skipEncoding) {
                if (!this._formatted) {
                    this._formatted = _asFormatted(this, false);
                }
                return this._formatted;
            }
            else {
                // we don't cache that
                return _asFormatted(this, true);
            }
        };
        return _URI;
    }(URI));
    /**
     * Compute `fsPath` for the given uri
     * @param uri
     */
    function _makeFsPath(uri) {
        var value;
        if (uri.authority && uri.path && uri.scheme === 'file') {
            // unc path: file://shares/c$/far/boo
            value = "//" + uri.authority + uri.path;
        }
        else if (_driveLetterPath.test(uri.path)) {
            // windows drive letter: file:///c:/far/boo
            value = uri.path[1].toLowerCase() + uri.path.substr(2);
        }
        else {
            // other path
            value = uri.path;
        }
        if (isWindows) {
            value = value.replace(/\//g, '\\');
        }
        return value;
    }
    /**
     * Create the external version of a uri
     */
    function _asFormatted(uri, skipEncoding) {
        var encoder = !skipEncoding
            ? encodeURIComponent2
            : encodeNoop;
        var parts = [];
        var scheme = uri.scheme, authority = uri.authority, path = uri.path, query = uri.query, fragment = uri.fragment;
        if (scheme) {
            parts.push(scheme, ':');
        }
        if (authority || scheme === 'file') {
            parts.push('//');
        }
        if (authority) {
            var idx = authority.indexOf('@');
            if (idx !== -1) {
                var userinfo = authority.substr(0, idx);
                authority = authority.substr(idx + 1);
                idx = userinfo.indexOf(':');
                if (idx === -1) {
                    parts.push(encoder(userinfo));
                }
                else {
                    parts.push(encoder(userinfo.substr(0, idx)), ':', encoder(userinfo.substr(idx + 1)));
                }
                parts.push('@');
            }
            authority = authority.toLowerCase();
            idx = authority.indexOf(':');
            if (idx === -1) {
                parts.push(encoder(authority));
            }
            else {
                parts.push(encoder(authority.substr(0, idx)), authority.substr(idx));
            }
        }
        if (path) {
            // lower-case windows drive letters in /C:/fff or C:/fff
            var m = _upperCaseDrive.exec(path);
            if (m) {
                if (m[1]) {
                    path = '/' + m[2].toLowerCase() + path.substr(3); // "/c:".length === 3
                }
                else {
                    path = m[2].toLowerCase() + path.substr(2); // // "c:".length === 2
                }
            }
            // encode every segement but not slashes
            // make sure that # and ? are always encoded
            // when occurring in paths - otherwise the result
            // cannot be parsed back again
            var lastIdx = 0;
            while (true) {
                var idx = path.indexOf(_slash, lastIdx);
                if (idx === -1) {
                    parts.push(encoder(path.substring(lastIdx)));
                    break;
                }
                parts.push(encoder(path.substring(lastIdx, idx)), _slash);
                lastIdx = idx + 1;
            }
        }
        if (query) {
            parts.push('?', encoder(query));
        }
        if (fragment) {
            parts.push('#', encoder(fragment));
        }
        return parts.join(_empty);
    }

    /**
     * Extracted from https://github.com/winjs/winjs
     * Version: 4.4.0(ec3258a9f3a36805a187848984e3bb938044178d)
     * Copyright (c) Microsoft Corporation.
     * All Rights Reserved.
     * Licensed under the MIT License.
     */
    var __winjs_exports;

    (function() {

    var _modules = Object.create(null);//{};
    _modules["WinJS/Core/_WinJS"] = {};

    var _winjs = function(moduleId, deps, factory) {
        var exports = {};
        var exportsPassedIn = false;

        var depsValues = deps.map(function(dep) {
            if (dep === 'exports') {
                exportsPassedIn = true;
                return exports;
            }
            return _modules[dep];
        });

        var result = factory.apply({}, depsValues);

        _modules[moduleId] = exportsPassedIn ? exports : result;
    };


    _winjs("WinJS/Core/_Global", [], function () {

        // Appease jshint
        /* global window, self, global */

        var globalObject =
            typeof window !== 'undefined' ? window :
            typeof self !== 'undefined' ? self :
            typeof global !== 'undefined' ? global :
            {};
        return globalObject;
    });

    _winjs("WinJS/Core/_BaseCoreUtils", ["WinJS/Core/_Global"], function baseCoreUtilsInit(_Global) {

        var hasWinRT = !!_Global.Windows;

        function markSupportedForProcessing(func) {
            /// <signature helpKeyword="WinJS.Utilities.markSupportedForProcessing">
            /// <summary locid="WinJS.Utilities.markSupportedForProcessing">
            /// Marks a function as being compatible with declarative processing, such as WinJS.UI.processAll
            /// or WinJS.Binding.processAll.
            /// </summary>
            /// <param name="func" type="Function" locid="WinJS.Utilities.markSupportedForProcessing_p:func">
            /// The function to be marked as compatible with declarative processing.
            /// </param>
            /// <returns type="Function" locid="WinJS.Utilities.markSupportedForProcessing_returnValue">
            /// The input function.
            /// </returns>
            /// </signature>
            func.supportedForProcessing = true;
            return func;
        }

        var actualSetImmediate = null;

        return {
            hasWinRT: hasWinRT,
            markSupportedForProcessing: markSupportedForProcessing,
            _setImmediate: function (callback) {
                // BEGIN monaco change
                if (actualSetImmediate === null) {
                    if (_Global.setImmediate) {
                        actualSetImmediate = _Global.setImmediate.bind(_Global);
                    } else if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
                        actualSetImmediate = process.nextTick.bind(process);
                    } else {
                        actualSetImmediate = _Global.setTimeout.bind(_Global);
                    }
                }
                actualSetImmediate(callback);
                // END monaco change
            }
        };
    });
    _winjs("WinJS/Core/_WriteProfilerMark", ["WinJS/Core/_Global"], function profilerInit(_Global) {

        return _Global.msWriteProfilerMark || function () { };
    });
    _winjs("WinJS/Core/_Base", ["WinJS/Core/_WinJS","WinJS/Core/_Global","WinJS/Core/_BaseCoreUtils","WinJS/Core/_WriteProfilerMark"], function baseInit(_WinJS, _Global, _BaseCoreUtils, _WriteProfilerMark) {

        function initializeProperties(target, members, prefix) {
            var keys = Object.keys(members);
            var isArray = Array.isArray(target);
            var properties;
            var i, len;
            for (i = 0, len = keys.length; i < len; i++) {
                var key = keys[i];
                var enumerable = key.charCodeAt(0) !== /*_*/95;
                var member = members[key];
                if (member && typeof member === 'object') {
                    if (member.value !== undefined || typeof member.get === 'function' || typeof member.set === 'function') {
                        if (member.enumerable === undefined) {
                            member.enumerable = enumerable;
                        }
                        if (prefix && member.setName && typeof member.setName === 'function') {
                            member.setName(prefix + "." + key);
                        }
                        properties = properties || {};
                        properties[key] = member;
                        continue;
                    }
                }
                if (!enumerable) {
                    properties = properties || {};
                    properties[key] = { value: member, enumerable: enumerable, configurable: true, writable: true };
                    continue;
                }
                if (isArray) {
                    target.forEach(function (target) {
                        target[key] = member;
                    });
                } else {
                    target[key] = member;
                }
            }
            if (properties) {
                if (isArray) {
                    target.forEach(function (target) {
                        Object.defineProperties(target, properties);
                    });
                } else {
                    Object.defineProperties(target, properties);
                }
            }
        }

        (function () {

            var _rootNamespace = _WinJS;
            if (!_rootNamespace.Namespace) {
                _rootNamespace.Namespace = Object.create(Object.prototype);
            }

            function createNamespace(parentNamespace, name) {
                var currentNamespace = parentNamespace || {};
                if (name) {
                    var namespaceFragments = name.split(".");
                    if (currentNamespace === _Global && namespaceFragments[0] === "WinJS") {
                        currentNamespace = _WinJS;
                        namespaceFragments.splice(0, 1);
                    }
                    for (var i = 0, len = namespaceFragments.length; i < len; i++) {
                        var namespaceName = namespaceFragments[i];
                        if (!currentNamespace[namespaceName]) {
                            Object.defineProperty(currentNamespace, namespaceName,
                                { value: {}, writable: false, enumerable: true, configurable: true }
                            );
                        }
                        currentNamespace = currentNamespace[namespaceName];
                    }
                }
                return currentNamespace;
            }

            function defineWithParent(parentNamespace, name, members) {
                /// <signature helpKeyword="WinJS.Namespace.defineWithParent">
                /// <summary locid="WinJS.Namespace.defineWithParent">
                /// Defines a new namespace with the specified name under the specified parent namespace.
                /// </summary>
                /// <param name="parentNamespace" type="Object" locid="WinJS.Namespace.defineWithParent_p:parentNamespace">
                /// The parent namespace.
                /// </param>
                /// <param name="name" type="String" locid="WinJS.Namespace.defineWithParent_p:name">
                /// The name of the new namespace.
                /// </param>
                /// <param name="members" type="Object" locid="WinJS.Namespace.defineWithParent_p:members">
                /// The members of the new namespace.
                /// </param>
                /// <returns type="Object" locid="WinJS.Namespace.defineWithParent_returnValue">
                /// The newly-defined namespace.
                /// </returns>
                /// </signature>
                var currentNamespace = createNamespace(parentNamespace, name);

                if (members) {
                    initializeProperties(currentNamespace, members, name || "<ANONYMOUS>");
                }

                return currentNamespace;
            }

            function define(name, members) {
                /// <signature helpKeyword="WinJS.Namespace.define">
                /// <summary locid="WinJS.Namespace.define">
                /// Defines a new namespace with the specified name.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Namespace.define_p:name">
                /// The name of the namespace. This could be a dot-separated name for nested namespaces.
                /// </param>
                /// <param name="members" type="Object" locid="WinJS.Namespace.define_p:members">
                /// The members of the new namespace.
                /// </param>
                /// <returns type="Object" locid="WinJS.Namespace.define_returnValue">
                /// The newly-defined namespace.
                /// </returns>
                /// </signature>
                return defineWithParent(_Global, name, members);
            }

            var LazyStates = {
                uninitialized: 1,
                working: 2,
                initialized: 3,
            };

            function lazy(f) {
                var name;
                var state = LazyStates.uninitialized;
                var result;
                return {
                    setName: function (value) {
                        name = value;
                    },
                    get: function () {
                        switch (state) {
                            case LazyStates.initialized:
                                return result;

                            case LazyStates.uninitialized:
                                state = LazyStates.working;
                                try {
                                    _WriteProfilerMark("WinJS.Namespace._lazy:" + name + ",StartTM");
                                    result = f();
                                } finally {
                                    _WriteProfilerMark("WinJS.Namespace._lazy:" + name + ",StopTM");
                                    state = LazyStates.uninitialized;
                                }
                                f = null;
                                state = LazyStates.initialized;
                                return result;

                            case LazyStates.working:
                                throw "Illegal: reentrancy on initialization";

                            default:
                                throw "Illegal";
                        }
                    },
                    set: function (value) {
                        switch (state) {
                            case LazyStates.working:
                                throw "Illegal: reentrancy on initialization";

                            default:
                                state = LazyStates.initialized;
                                result = value;
                                break;
                        }
                    },
                    enumerable: true,
                    configurable: true,
                };
            }

            // helper for defining AMD module members
            function moduleDefine(exports, name, members) {
                var target = [exports];
                var publicNS = null;
                if (name) {
                    publicNS = createNamespace(_Global, name);
                    target.push(publicNS);
                }
                initializeProperties(target, members, name || "<ANONYMOUS>");
                return publicNS;
            }

            // Establish members of the "WinJS.Namespace" namespace
            Object.defineProperties(_rootNamespace.Namespace, {

                defineWithParent: { value: defineWithParent, writable: true, enumerable: true, configurable: true },

                define: { value: define, writable: true, enumerable: true, configurable: true },

                _lazy: { value: lazy, writable: true, enumerable: true, configurable: true },

                _moduleDefine: { value: moduleDefine, writable: true, enumerable: true, configurable: true }

            });

        })();

        (function () {

            function define(constructor, instanceMembers, staticMembers) {
                /// <signature helpKeyword="WinJS.Class.define">
                /// <summary locid="WinJS.Class.define">
                /// Defines a class using the given constructor and the specified instance members.
                /// </summary>
                /// <param name="constructor" type="Function" locid="WinJS.Class.define_p:constructor">
                /// A constructor function that is used to instantiate this class.
                /// </param>
                /// <param name="instanceMembers" type="Object" locid="WinJS.Class.define_p:instanceMembers">
                /// The set of instance fields, properties, and methods made available on the class.
                /// </param>
                /// <param name="staticMembers" type="Object" locid="WinJS.Class.define_p:staticMembers">
                /// The set of static fields, properties, and methods made available on the class.
                /// </param>
                /// <returns type="Function" locid="WinJS.Class.define_returnValue">
                /// The newly-defined class.
                /// </returns>
                /// </signature>
                constructor = constructor || function () { };
                _BaseCoreUtils.markSupportedForProcessing(constructor);
                if (instanceMembers) {
                    initializeProperties(constructor.prototype, instanceMembers);
                }
                if (staticMembers) {
                    initializeProperties(constructor, staticMembers);
                }
                return constructor;
            }

            function derive(baseClass, constructor, instanceMembers, staticMembers) {
                /// <signature helpKeyword="WinJS.Class.derive">
                /// <summary locid="WinJS.Class.derive">
                /// Creates a sub-class based on the supplied baseClass parameter, using prototypal inheritance.
                /// </summary>
                /// <param name="baseClass" type="Function" locid="WinJS.Class.derive_p:baseClass">
                /// The class to inherit from.
                /// </param>
                /// <param name="constructor" type="Function" locid="WinJS.Class.derive_p:constructor">
                /// A constructor function that is used to instantiate this class.
                /// </param>
                /// <param name="instanceMembers" type="Object" locid="WinJS.Class.derive_p:instanceMembers">
                /// The set of instance fields, properties, and methods to be made available on the class.
                /// </param>
                /// <param name="staticMembers" type="Object" locid="WinJS.Class.derive_p:staticMembers">
                /// The set of static fields, properties, and methods to be made available on the class.
                /// </param>
                /// <returns type="Function" locid="WinJS.Class.derive_returnValue">
                /// The newly-defined class.
                /// </returns>
                /// </signature>
                if (baseClass) {
                    constructor = constructor || function () { };
                    var basePrototype = baseClass.prototype;
                    constructor.prototype = Object.create(basePrototype);
                    _BaseCoreUtils.markSupportedForProcessing(constructor);
                    Object.defineProperty(constructor.prototype, "constructor", { value: constructor, writable: true, configurable: true, enumerable: true });
                    if (instanceMembers) {
                        initializeProperties(constructor.prototype, instanceMembers);
                    }
                    if (staticMembers) {
                        initializeProperties(constructor, staticMembers);
                    }
                    return constructor;
                } else {
                    return define(constructor, instanceMembers, staticMembers);
                }
            }

            function mix(constructor) {
                /// <signature helpKeyword="WinJS.Class.mix">
                /// <summary locid="WinJS.Class.mix">
                /// Defines a class using the given constructor and the union of the set of instance members
                /// specified by all the mixin objects. The mixin parameter list is of variable length.
                /// </summary>
                /// <param name="constructor" locid="WinJS.Class.mix_p:constructor">
                /// A constructor function that is used to instantiate this class.
                /// </param>
                /// <returns type="Function" locid="WinJS.Class.mix_returnValue">
                /// The newly-defined class.
                /// </returns>
                /// </signature>
                constructor = constructor || function () { };
                var i, len;
                for (i = 1, len = arguments.length; i < len; i++) {
                    initializeProperties(constructor.prototype, arguments[i]);
                }
                return constructor;
            }

            // Establish members of "WinJS.Class" namespace
            _WinJS.Namespace.define("WinJS.Class", {
                define: define,
                derive: derive,
                mix: mix
            });

        })();

        return {
            Namespace: _WinJS.Namespace,
            Class: _WinJS.Class
        };

    });
    _winjs("WinJS/Core/_ErrorFromName", ["WinJS/Core/_Base"], function errorsInit(_Base) {

        var ErrorFromName = _Base.Class.derive(Error, function (name, message) {
            /// <signature helpKeyword="WinJS.ErrorFromName">
            /// <summary locid="WinJS.ErrorFromName">
            /// Creates an Error object with the specified name and message properties.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.ErrorFromName_p:name">The name of this error. The name is meant to be consumed programmatically and should not be localized.</param>
            /// <param name="message" type="String" optional="true" locid="WinJS.ErrorFromName_p:message">The message for this error. The message is meant to be consumed by humans and should be localized.</param>
            /// <returns type="Error" locid="WinJS.ErrorFromName_returnValue">Error instance with .name and .message properties populated</returns>
            /// </signature>
            this.name = name;
            this.message = message || name;
        }, {
            /* empty */
        }, {
            supportedForProcessing: false,
        });

        _Base.Namespace.define("WinJS", {
            // ErrorFromName establishes a simple pattern for returning error codes.
            //
            ErrorFromName: ErrorFromName
        });

        return ErrorFromName;

    });


    _winjs("WinJS/Core/_Events", ["exports","WinJS/Core/_Base"], function eventsInit(exports, _Base) {


        function createEventProperty(name) {
            var eventPropStateName = "_on" + name + "state";

            return {
                get: function () {
                    var state = this[eventPropStateName];
                    return state && state.userHandler;
                },
                set: function (handler) {
                    var state = this[eventPropStateName];
                    if (handler) {
                        if (!state) {
                            state = { wrapper: function (evt) { return state.userHandler(evt); }, userHandler: handler };
                            Object.defineProperty(this, eventPropStateName, { value: state, enumerable: false, writable:true, configurable: true });
                            this.addEventListener(name, state.wrapper, false);
                        }
                        state.userHandler = handler;
                    } else if (state) {
                        this.removeEventListener(name, state.wrapper, false);
                        this[eventPropStateName] = null;
                    }
                },
                enumerable: true
            };
        }

        function createEventProperties() {
            /// <signature helpKeyword="WinJS.Utilities.createEventProperties">
            /// <summary locid="WinJS.Utilities.createEventProperties">
            /// Creates an object that has one property for each name passed to the function.
            /// </summary>
            /// <param name="events" locid="WinJS.Utilities.createEventProperties_p:events">
            /// A variable list of property names.
            /// </param>
            /// <returns type="Object" locid="WinJS.Utilities.createEventProperties_returnValue">
            /// The object with the specified properties. The names of the properties are prefixed with 'on'.
            /// </returns>
            /// </signature>
            var props = {};
            for (var i = 0, len = arguments.length; i < len; i++) {
                var name = arguments[i];
                props["on" + name] = createEventProperty(name);
            }
            return props;
        }

        var EventMixinEvent = _Base.Class.define(
            function EventMixinEvent_ctor(type, detail, target) {
                this.detail = detail;
                this.target = target;
                this.timeStamp = Date.now();
                this.type = type;
            },
            {
                bubbles: { value: false, writable: false },
                cancelable: { value: false, writable: false },
                currentTarget: {
                    get: function () { return this.target; }
                },
                defaultPrevented: {
                    get: function () { return this._preventDefaultCalled; }
                },
                trusted: { value: false, writable: false },
                eventPhase: { value: 0, writable: false },
                target: null,
                timeStamp: null,
                type: null,

                preventDefault: function () {
                    this._preventDefaultCalled = true;
                },
                stopImmediatePropagation: function () {
                    this._stopImmediatePropagationCalled = true;
                },
                stopPropagation: function () {
                }
            }, {
                supportedForProcessing: false,
            }
        );

        var eventMixin = {
            _listeners: null,

            addEventListener: function (type, listener, useCapture) {
                /// <signature helpKeyword="WinJS.Utilities.eventMixin.addEventListener">
                /// <summary locid="WinJS.Utilities.eventMixin.addEventListener">
                /// Adds an event listener to the control.
                /// </summary>
                /// <param name="type" locid="WinJS.Utilities.eventMixin.addEventListener_p:type">
                /// The type (name) of the event.
                /// </param>
                /// <param name="listener" locid="WinJS.Utilities.eventMixin.addEventListener_p:listener">
                /// The listener to invoke when the event is raised.
                /// </param>
                /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.addEventListener_p:useCapture">
                /// if true initiates capture, otherwise false.
                /// </param>
                /// </signature>
                useCapture = useCapture || false;
                this._listeners = this._listeners || {};
                var eventListeners = (this._listeners[type] = this._listeners[type] || []);
                for (var i = 0, len = eventListeners.length; i < len; i++) {
                    var l = eventListeners[i];
                    if (l.useCapture === useCapture && l.listener === listener) {
                        return;
                    }
                }
                eventListeners.push({ listener: listener, useCapture: useCapture });
            },
            dispatchEvent: function (type, details) {
                /// <signature helpKeyword="WinJS.Utilities.eventMixin.dispatchEvent">
                /// <summary locid="WinJS.Utilities.eventMixin.dispatchEvent">
                /// Raises an event of the specified type and with the specified additional properties.
                /// </summary>
                /// <param name="type" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:type">
                /// The type (name) of the event.
                /// </param>
                /// <param name="details" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:details">
                /// The set of additional properties to be attached to the event object when the event is raised.
                /// </param>
                /// <returns type="Boolean" locid="WinJS.Utilities.eventMixin.dispatchEvent_returnValue">
                /// true if preventDefault was called on the event.
                /// </returns>
                /// </signature>
                var listeners = this._listeners && this._listeners[type];
                if (listeners) {
                    var eventValue = new EventMixinEvent(type, details, this);
                    // Need to copy the array to protect against people unregistering while we are dispatching
                    listeners = listeners.slice(0, listeners.length);
                    for (var i = 0, len = listeners.length; i < len && !eventValue._stopImmediatePropagationCalled; i++) {
                        listeners[i].listener(eventValue);
                    }
                    return eventValue.defaultPrevented || false;
                }
                return false;
            },
            removeEventListener: function (type, listener, useCapture) {
                /// <signature helpKeyword="WinJS.Utilities.eventMixin.removeEventListener">
                /// <summary locid="WinJS.Utilities.eventMixin.removeEventListener">
                /// Removes an event listener from the control.
                /// </summary>
                /// <param name="type" locid="WinJS.Utilities.eventMixin.removeEventListener_p:type">
                /// The type (name) of the event.
                /// </param>
                /// <param name="listener" locid="WinJS.Utilities.eventMixin.removeEventListener_p:listener">
                /// The listener to remove.
                /// </param>
                /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.removeEventListener_p:useCapture">
                /// Specifies whether to initiate capture.
                /// </param>
                /// </signature>
                useCapture = useCapture || false;
                var listeners = this._listeners && this._listeners[type];
                if (listeners) {
                    for (var i = 0, len = listeners.length; i < len; i++) {
                        var l = listeners[i];
                        if (l.listener === listener && l.useCapture === useCapture) {
                            listeners.splice(i, 1);
                            if (listeners.length === 0) {
                                delete this._listeners[type];
                            }
                            // Only want to remove one element for each call to removeEventListener
                            break;
                        }
                    }
                }
            }
        };

        _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
            _createEventProperty: createEventProperty,
            createEventProperties: createEventProperties,
            eventMixin: eventMixin
        });

    });


    _winjs("WinJS/Core/_Trace", ["WinJS/Core/_Global"], function traceInit(_Global) {

        function nop(v) {
            return v;
        }

        return {
            _traceAsyncOperationStarting: (_Global.Debug && _Global.Debug.msTraceAsyncOperationStarting && _Global.Debug.msTraceAsyncOperationStarting.bind(_Global.Debug)) || nop,
            _traceAsyncOperationCompleted: (_Global.Debug && _Global.Debug.msTraceAsyncOperationCompleted && _Global.Debug.msTraceAsyncOperationCompleted.bind(_Global.Debug)) || nop,
            _traceAsyncCallbackStarting: (_Global.Debug && _Global.Debug.msTraceAsyncCallbackStarting && _Global.Debug.msTraceAsyncCallbackStarting.bind(_Global.Debug)) || nop,
            _traceAsyncCallbackCompleted: (_Global.Debug && _Global.Debug.msTraceAsyncCallbackCompleted && _Global.Debug.msTraceAsyncCallbackCompleted.bind(_Global.Debug)) || nop
        };
    });
    _winjs("WinJS/Promise/_StateMachine", ["WinJS/Core/_Global","WinJS/Core/_BaseCoreUtils","WinJS/Core/_Base","WinJS/Core/_ErrorFromName","WinJS/Core/_Events","WinJS/Core/_Trace"], function promiseStateMachineInit(_Global, _BaseCoreUtils, _Base, _ErrorFromName, _Events, _Trace) {

        _Global.Debug && (_Global.Debug.setNonUserCodeExceptions = true);

        var ListenerType = _Base.Class.mix(_Base.Class.define(null, { /*empty*/ }, { supportedForProcessing: false }), _Events.eventMixin);
        var promiseEventListeners = new ListenerType();
        // make sure there is a listeners collection so that we can do a more trivial check below
        promiseEventListeners._listeners = {};
        var errorET = "error";
        var canceledName = "Canceled";
        var tagWithStack = false;
        var tag = {
            promise: 0x01,
            thenPromise: 0x02,
            errorPromise: 0x04,
            exceptionPromise: 0x08,
            completePromise: 0x10,
        };
        tag.all = tag.promise | tag.thenPromise | tag.errorPromise | tag.exceptionPromise | tag.completePromise;

        //
        // Global error counter, for each error which enters the system we increment this once and then
        // the error number travels with the error as it traverses the tree of potential handlers.
        //
        // When someone has registered to be told about errors (WinJS.Promise.callonerror) promises
        // which are in error will get tagged with a ._errorId field. This tagged field is the
        // contract by which nested promises with errors will be identified as chaining for the
        // purposes of the callonerror semantics. If a nested promise in error is encountered without
        // a ._errorId it will be assumed to be foreign and treated as an interop boundary and
        // a new error id will be minted.
        //
        var error_number = 1;

        //
        // The state machine has a interesting hiccup in it with regards to notification, in order
        // to flatten out notification and avoid recursion for synchronous completion we have an
        // explicit set of *_notify states which are responsible for notifying their entire tree
        // of children. They can do this because they know that immediate children are always
        // ThenPromise instances and we can therefore reach into their state to access the
        // _listeners collection.
        //
        // So, what happens is that a Promise will be fulfilled through the _completed or _error
        // messages at which point it will enter a *_notify state and be responsible for to move
        // its children into an (as appropriate) success or error state and also notify that child's
        // listeners of the state transition, until leaf notes are reached.
        //

        var state_created,              // -> working
            state_working,              // -> error | error_notify | success | success_notify | canceled | waiting
            state_waiting,              // -> error | error_notify | success | success_notify | waiting_canceled
            state_waiting_canceled,     // -> error | error_notify | success | success_notify | canceling
            state_canceled,             // -> error | error_notify | success | success_notify | canceling
            state_canceling,            // -> error_notify
            state_success_notify,       // -> success
            state_success,              // -> .
            state_error_notify,         // -> error
            state_error;                // -> .

        // Noop function, used in the various states to indicate that they don't support a given
        // message. Named with the somewhat cute name '_' because it reads really well in the states.

        function _() { }

        // Initial state
        //
        state_created = {
            name: "created",
            enter: function (promise) {
                promise._setState(state_working);
            },
            cancel: _,
            done: _,
            then: _,
            _completed: _,
            _error: _,
            _notify: _,
            _progress: _,
            _setCompleteValue: _,
            _setErrorValue: _
        };

        // Ready state, waiting for a message (completed/error/progress), able to be canceled
        //
        state_working = {
            name: "working",
            enter: _,
            cancel: function (promise) {
                promise._setState(state_canceled);
            },
            done: done,
            then: then,
            _completed: completed,
            _error: error,
            _notify: _,
            _progress: progress,
            _setCompleteValue: setCompleteValue,
            _setErrorValue: setErrorValue
        };

        // Waiting state, if a promise is completed with a value which is itself a promise
        // (has a then() method) it signs up to be informed when that child promise is
        // fulfilled at which point it will be fulfilled with that value.
        //
        state_waiting = {
            name: "waiting",
            enter: function (promise) {
                var waitedUpon = promise._value;
                // We can special case our own intermediate promises which are not in a
                //  terminal state by just pushing this promise as a listener without
                //  having to create new indirection functions
                if (waitedUpon instanceof ThenPromise &&
                    waitedUpon._state !== state_error &&
                    waitedUpon._state !== state_success) {
                    pushListener(waitedUpon, { promise: promise });
                } else {
                    var error = function (value) {
                        if (waitedUpon._errorId) {
                            promise._chainedError(value, waitedUpon);
                        } else {
                            // Because this is an interop boundary we want to indicate that this
                            //  error has been handled by the promise infrastructure before we
                            //  begin a new handling chain.
                            //
                            callonerror(promise, value, detailsForHandledError, waitedUpon, error);
                            promise._error(value);
                        }
                    };
                    error.handlesOnError = true;
                    waitedUpon.then(
                        promise._completed.bind(promise),
                        error,
                        promise._progress.bind(promise)
                    );
                }
            },
            cancel: function (promise) {
                promise._setState(state_waiting_canceled);
            },
            done: done,
            then: then,
            _completed: completed,
            _error: error,
            _notify: _,
            _progress: progress,
            _setCompleteValue: setCompleteValue,
            _setErrorValue: setErrorValue
        };

        // Waiting canceled state, when a promise has been in a waiting state and receives a
        // request to cancel its pending work it will forward that request to the child promise
        // and then waits to be informed of the result. This promise moves itself into the
        // canceling state but understands that the child promise may instead push it to a
        // different state.
        //
        state_waiting_canceled = {
            name: "waiting_canceled",
            enter: function (promise) {
                // Initiate a transition to canceling. Triggering a cancel on the promise
                // that we are waiting upon may result in a different state transition
                // before the state machine pump runs again.
                promise._setState(state_canceling);
                var waitedUpon = promise._value;
                if (waitedUpon.cancel) {
                    waitedUpon.cancel();
                }
            },
            cancel: _,
            done: done,
            then: then,
            _completed: completed,
            _error: error,
            _notify: _,
            _progress: progress,
            _setCompleteValue: setCompleteValue,
            _setErrorValue: setErrorValue
        };

        // Canceled state, moves to the canceling state and then tells the promise to do
        // whatever it might need to do on cancelation.
        //
        state_canceled = {
            name: "canceled",
            enter: function (promise) {
                // Initiate a transition to canceling. The _cancelAction may change the state
                // before the state machine pump runs again.
                promise._setState(state_canceling);
                promise._cancelAction();
            },
            cancel: _,
            done: done,
            then: then,
            _completed: completed,
            _error: error,
            _notify: _,
            _progress: progress,
            _setCompleteValue: setCompleteValue,
            _setErrorValue: setErrorValue
        };

        // Canceling state, commits to the promise moving to an error state with an error
        // object whose 'name' and 'message' properties contain the string "Canceled"
        //
        state_canceling = {
            name: "canceling",
            enter: function (promise) {
                var error = new Error(canceledName);
                error.name = error.message;
                promise._value = error;
                promise._setState(state_error_notify);
            },
            cancel: _,
            done: _,
            then: _,
            _completed: _,
            _error: _,
            _notify: _,
            _progress: _,
            _setCompleteValue: _,
            _setErrorValue: _
        };

        // Success notify state, moves a promise to the success state and notifies all children
        //
        state_success_notify = {
            name: "complete_notify",
            enter: function (promise) {
                promise.done = CompletePromise.prototype.done;
                promise.then = CompletePromise.prototype.then;
                if (promise._listeners) {
                    var queue = [promise];
                    var p;
                    while (queue.length) {
                        p = queue.shift();
                        p._state._notify(p, queue);
                    }
                }
                promise._setState(state_success);
            },
            cancel: _,
            done: null, /*error to get here */
            then: null, /*error to get here */
            _completed: _,
            _error: _,
            _notify: notifySuccess,
            _progress: _,
            _setCompleteValue: _,
            _setErrorValue: _
        };

        // Success state, moves a promise to the success state and does NOT notify any children.
        // Some upstream promise is owning the notification pass.
        //
        state_success = {
            name: "success",
            enter: function (promise) {
                promise.done = CompletePromise.prototype.done;
                promise.then = CompletePromise.prototype.then;
                promise._cleanupAction();
            },
            cancel: _,
            done: null, /*error to get here */
            then: null, /*error to get here */
            _completed: _,
            _error: _,
            _notify: notifySuccess,
            _progress: _,
            _setCompleteValue: _,
            _setErrorValue: _
        };

        // Error notify state, moves a promise to the error state and notifies all children
        //
        state_error_notify = {
            name: "error_notify",
            enter: function (promise) {
                promise.done = ErrorPromise.prototype.done;
                promise.then = ErrorPromise.prototype.then;
                if (promise._listeners) {
                    var queue = [promise];
                    var p;
                    while (queue.length) {
                        p = queue.shift();
                        p._state._notify(p, queue);
                    }
                }
                promise._setState(state_error);
            },
            cancel: _,
            done: null, /*error to get here*/
            then: null, /*error to get here*/
            _completed: _,
            _error: _,
            _notify: notifyError,
            _progress: _,
            _setCompleteValue: _,
            _setErrorValue: _
        };

        // Error state, moves a promise to the error state and does NOT notify any children.
        // Some upstream promise is owning the notification pass.
        //
        state_error = {
            name: "error",
            enter: function (promise) {
                promise.done = ErrorPromise.prototype.done;
                promise.then = ErrorPromise.prototype.then;
                promise._cleanupAction();
            },
            cancel: _,
            done: null, /*error to get here*/
            then: null, /*error to get here*/
            _completed: _,
            _error: _,
            _notify: notifyError,
            _progress: _,
            _setCompleteValue: _,
            _setErrorValue: _
        };

        //
        // The statemachine implementation follows a very particular pattern, the states are specified
        // as static stateless bags of functions which are then indirected through the state machine
        // instance (a Promise). As such all of the functions on each state have the promise instance
        // passed to them explicitly as a parameter and the Promise instance members do a little
        // dance where they indirect through the state and insert themselves in the argument list.
        //
        // We could instead call directly through the promise states however then every caller
        // would have to remember to do things like pumping the state machine to catch state transitions.
        //

        var PromiseStateMachine = _Base.Class.define(null, {
            _listeners: null,
            _nextState: null,
            _state: null,
            _value: null,

            cancel: function () {
                /// <signature helpKeyword="WinJS.PromiseStateMachine.cancel">
                /// <summary locid="WinJS.PromiseStateMachine.cancel">
                /// Attempts to cancel the fulfillment of a promised value. If the promise hasn't
                /// already been fulfilled and cancellation is supported, the promise enters
                /// the error state with a value of Error("Canceled").
                /// </summary>
                /// </signature>
                this._state.cancel(this);
                this._run();
            },
            done: function Promise_done(onComplete, onError, onProgress) {
                /// <signature helpKeyword="WinJS.PromiseStateMachine.done">
                /// <summary locid="WinJS.PromiseStateMachine.done">
                /// Allows you to specify the work to be done on the fulfillment of the promised value,
                /// the error handling to be performed if the promise fails to fulfill
                /// a value, and the handling of progress notifications along the way.
                ///
                /// After the handlers have finished executing, this function throws any error that would have been returned
                /// from then() as a promise in the error state.
                /// </summary>
                /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.done_p:onComplete">
                /// The function to be called if the promise is fulfilled successfully with a value.
                /// The fulfilled value is passed as the single argument. If the value is null,
                /// the fulfilled value is returned. The value returned
                /// from the function becomes the fulfilled value of the promise returned by
                /// then(). If an exception is thrown while executing the function, the promise returned
                /// by then() moves into the error state.
                /// </param>
                /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onError">
                /// The function to be called if the promise is fulfilled with an error. The error
                /// is passed as the single argument. If it is null, the error is forwarded.
                /// The value returned from the function is the fulfilled value of the promise returned by then().
                /// </param>
                /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onProgress">
                /// the function to be called if the promise reports progress. Data about the progress
                /// is passed as the single argument. Promises are not required to support
                /// progress.
                /// </param>
                /// </signature>
                this._state.done(this, onComplete, onError, onProgress);
            },
            then: function Promise_then(onComplete, onError, onProgress) {
                /// <signature helpKeyword="WinJS.PromiseStateMachine.then">
                /// <summary locid="WinJS.PromiseStateMachine.then">
                /// Allows you to specify the work to be done on the fulfillment of the promised value,
                /// the error handling to be performed if the promise fails to fulfill
                /// a value, and the handling of progress notifications along the way.
                /// </summary>
                /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.then_p:onComplete">
                /// The function to be called if the promise is fulfilled successfully with a value.
                /// The value is passed as the single argument. If the value is null, the value is returned.
                /// The value returned from the function becomes the fulfilled value of the promise returned by
                /// then(). If an exception is thrown while this function is being executed, the promise returned
                /// by then() moves into the error state.
                /// </param>
                /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onError">
                /// The function to be called if the promise is fulfilled with an error. The error
                /// is passed as the single argument. If it is null, the error is forwarded.
                /// The value returned from the function becomes the fulfilled value of the promise returned by then().
                /// </param>
                /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onProgress">
                /// The function to be called if the promise reports progress. Data about the progress
                /// is passed as the single argument. Promises are not required to support
                /// progress.
                /// </param>
                /// <returns type="WinJS.Promise" locid="WinJS.PromiseStateMachine.then_returnValue">
                /// The promise whose value is the result of executing the complete or
                /// error function.
                /// </returns>
                /// </signature>
                return this._state.then(this, onComplete, onError, onProgress);
            },

            _chainedError: function (value, context) {
                var result = this._state._error(this, value, detailsForChainedError, context);
                this._run();
                return result;
            },
            _completed: function (value) {
                var result = this._state._completed(this, value);
                this._run();
                return result;
            },
            _error: function (value) {
                var result = this._state._error(this, value, detailsForError);
                this._run();
                return result;
            },
            _progress: function (value) {
                this._state._progress(this, value);
            },
            _setState: function (state) {
                this._nextState = state;
            },
            _setCompleteValue: function (value) {
                this._state._setCompleteValue(this, value);
                this._run();
            },
            _setChainedErrorValue: function (value, context) {
                var result = this._state._setErrorValue(this, value, detailsForChainedError, context);
                this._run();
                return result;
            },
            _setExceptionValue: function (value) {
                var result = this._state._setErrorValue(this, value, detailsForException);
                this._run();
                return result;
            },
            _run: function () {
                while (this._nextState) {
                    this._state = this._nextState;
                    this._nextState = null;
                    this._state.enter(this);
                }
            }
        }, {
            supportedForProcessing: false
        });

        //
        // Implementations of shared state machine code.
        //

        function completed(promise, value) {
            var targetState;
            if (value && typeof value === "object" && typeof value.then === "function") {
                targetState = state_waiting;
            } else {
                targetState = state_success_notify;
            }
            promise._value = value;
            promise._setState(targetState);
        }
        function createErrorDetails(exception, error, promise, id, parent, handler) {
            return {
                exception: exception,
                error: error,
                promise: promise,
                handler: handler,
                id: id,
                parent: parent
            };
        }
        function detailsForHandledError(promise, errorValue, context, handler) {
            var exception = context._isException;
            var errorId = context._errorId;
            return createErrorDetails(
                exception ? errorValue : null,
                exception ? null : errorValue,
                promise,
                errorId,
                context,
                handler
            );
        }
        function detailsForChainedError(promise, errorValue, context) {
            var exception = context._isException;
            var errorId = context._errorId;
            setErrorInfo(promise, errorId, exception);
            return createErrorDetails(
                exception ? errorValue : null,
                exception ? null : errorValue,
                promise,
                errorId,
                context
            );
        }
        function detailsForError(promise, errorValue) {
            var errorId = ++error_number;
            setErrorInfo(promise, errorId);
            return createErrorDetails(
                null,
                errorValue,
                promise,
                errorId
            );
        }
        function detailsForException(promise, exceptionValue) {
            var errorId = ++error_number;
            setErrorInfo(promise, errorId, true);
            return createErrorDetails(
                exceptionValue,
                null,
                promise,
                errorId
            );
        }
        function done(promise, onComplete, onError, onProgress) {
            var asyncOpID = _Trace._traceAsyncOperationStarting("WinJS.Promise.done");
            pushListener(promise, { c: onComplete, e: onError, p: onProgress, asyncOpID: asyncOpID });
        }
        function error(promise, value, onerrorDetails, context) {
            promise._value = value;
            callonerror(promise, value, onerrorDetails, context);
            promise._setState(state_error_notify);
        }
        function notifySuccess(promise, queue) {
            var value = promise._value;
            var listeners = promise._listeners;
            if (!listeners) {
                return;
            }
            promise._listeners = null;
            var i, len;
            for (i = 0, len = Array.isArray(listeners) ? listeners.length : 1; i < len; i++) {
                var listener = len === 1 ? listeners : listeners[i];
                var onComplete = listener.c;
                var target = listener.promise;

                _Trace._traceAsyncOperationCompleted(listener.asyncOpID, _Global.Debug && _Global.Debug.MS_ASYNC_OP_STATUS_SUCCESS);

                if (target) {
                    _Trace._traceAsyncCallbackStarting(listener.asyncOpID);
                    try {
                        target._setCompleteValue(onComplete ? onComplete(value) : value);
                    } catch (ex) {
                        target._setExceptionValue(ex);
                    } finally {
                        _Trace._traceAsyncCallbackCompleted();
                    }
                    if (target._state !== state_waiting && target._listeners) {
                        queue.push(target);
                    }
                } else {
                    CompletePromise.prototype.done.call(promise, onComplete);
                }
            }
        }
        function notifyError(promise, queue) {
            var value = promise._value;
            var listeners = promise._listeners;
            if (!listeners) {
                return;
            }
            promise._listeners = null;
            var i, len;
            for (i = 0, len = Array.isArray(listeners) ? listeners.length : 1; i < len; i++) {
                var listener = len === 1 ? listeners : listeners[i];
                var onError = listener.e;
                var target = listener.promise;

                var errorID = _Global.Debug && (value && value.name === canceledName ? _Global.Debug.MS_ASYNC_OP_STATUS_CANCELED : _Global.Debug.MS_ASYNC_OP_STATUS_ERROR);
                _Trace._traceAsyncOperationCompleted(listener.asyncOpID, errorID);

                if (target) {
                    var asyncCallbackStarted = false;
                    try {
                        if (onError) {
                            _Trace._traceAsyncCallbackStarting(listener.asyncOpID);
                            asyncCallbackStarted = true;
                            if (!onError.handlesOnError) {
                                callonerror(target, value, detailsForHandledError, promise, onError);
                            }
                            target._setCompleteValue(onError(value));
                        } else {
                            target._setChainedErrorValue(value, promise);
                        }
                    } catch (ex) {
                        target._setExceptionValue(ex);
                    } finally {
                        if (asyncCallbackStarted) {
                            _Trace._traceAsyncCallbackCompleted();
                        }
                    }
                    if (target._state !== state_waiting && target._listeners) {
                        queue.push(target);
                    }
                } else {
                    ErrorPromise.prototype.done.call(promise, null, onError);
                }
            }
        }
        function callonerror(promise, value, onerrorDetailsGenerator, context, handler) {
            if (promiseEventListeners._listeners[errorET]) {
                if (value instanceof Error && value.message === canceledName) {
                    return;
                }
                promiseEventListeners.dispatchEvent(errorET, onerrorDetailsGenerator(promise, value, context, handler));
            }
        }
        function progress(promise, value) {
            var listeners = promise._listeners;
            if (listeners) {
                var i, len;
                for (i = 0, len = Array.isArray(listeners) ? listeners.length : 1; i < len; i++) {
                    var listener = len === 1 ? listeners : listeners[i];
                    var onProgress = listener.p;
                    if (onProgress) {
                        try { onProgress(value); } catch (ex) { }
                    }
                    if (!(listener.c || listener.e) && listener.promise) {
                        listener.promise._progress(value);
                    }
                }
            }
        }
        function pushListener(promise, listener) {
            var listeners = promise._listeners;
            if (listeners) {
                // We may have either a single listener (which will never be wrapped in an array)
                // or 2+ listeners (which will be wrapped). Since we are now adding one more listener
                // we may have to wrap the single listener before adding the second.
                listeners = Array.isArray(listeners) ? listeners : [listeners];
                listeners.push(listener);
            } else {
                listeners = listener;
            }
            promise._listeners = listeners;
        }
        // The difference beween setCompleteValue()/setErrorValue() and complete()/error() is that setXXXValue() moves
        // a promise directly to the success/error state without starting another notification pass (because one
        // is already ongoing).
        function setErrorInfo(promise, errorId, isException) {
            promise._isException = isException || false;
            promise._errorId = errorId;
        }
        function setErrorValue(promise, value, onerrorDetails, context) {
            promise._value = value;
            callonerror(promise, value, onerrorDetails, context);
            promise._setState(state_error);
        }
        function setCompleteValue(promise, value) {
            var targetState;
            if (value && typeof value === "object" && typeof value.then === "function") {
                targetState = state_waiting;
            } else {
                targetState = state_success;
            }
            promise._value = value;
            promise._setState(targetState);
        }
        function then(promise, onComplete, onError, onProgress) {
            var result = new ThenPromise(promise);
            var asyncOpID = _Trace._traceAsyncOperationStarting("WinJS.Promise.then");
            pushListener(promise, { promise: result, c: onComplete, e: onError, p: onProgress, asyncOpID: asyncOpID });
            return result;
        }

        //
        // Internal implementation detail promise, ThenPromise is created when a promise needs
        // to be returned from a then() method.
        //
        var ThenPromise = _Base.Class.derive(PromiseStateMachine,
            function (creator) {

                if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.thenPromise))) {
                    this._stack = Promise._getStack();
                }

                this._creator = creator;
                this._setState(state_created);
                this._run();
            }, {
                _creator: null,

                _cancelAction: function () { if (this._creator) { this._creator.cancel(); } },
                _cleanupAction: function () { this._creator = null; }
            }, {
                supportedForProcessing: false
            }
        );

        //
        // Slim promise implementations for already completed promises, these are created
        // under the hood on synchronous completion paths as well as by WinJS.Promise.wrap
        // and WinJS.Promise.wrapError.
        //

        var ErrorPromise = _Base.Class.define(
            function ErrorPromise_ctor(value) {

                if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.errorPromise))) {
                    this._stack = Promise._getStack();
                }

                this._value = value;
                callonerror(this, value, detailsForError);
            }, {
                cancel: function () {
                    /// <signature helpKeyword="WinJS.PromiseStateMachine.cancel">
                    /// <summary locid="WinJS.PromiseStateMachine.cancel">
                    /// Attempts to cancel the fulfillment of a promised value. If the promise hasn't
                    /// already been fulfilled and cancellation is supported, the promise enters
                    /// the error state with a value of Error("Canceled").
                    /// </summary>
                    /// </signature>
                },
                done: function ErrorPromise_done(unused, onError) {
                    /// <signature helpKeyword="WinJS.PromiseStateMachine.done">
                    /// <summary locid="WinJS.PromiseStateMachine.done">
                    /// Allows you to specify the work to be done on the fulfillment of the promised value,
                    /// the error handling to be performed if the promise fails to fulfill
                    /// a value, and the handling of progress notifications along the way.
                    ///
                    /// After the handlers have finished executing, this function throws any error that would have been returned
                    /// from then() as a promise in the error state.
                    /// </summary>
                    /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.done_p:onComplete">
                    /// The function to be called if the promise is fulfilled successfully with a value.
                    /// The fulfilled value is passed as the single argument. If the value is null,
                    /// the fulfilled value is returned. The value returned
                    /// from the function becomes the fulfilled value of the promise returned by
                    /// then(). If an exception is thrown while executing the function, the promise returned
                    /// by then() moves into the error state.
                    /// </param>
                    /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onError">
                    /// The function to be called if the promise is fulfilled with an error. The error
                    /// is passed as the single argument. If it is null, the error is forwarded.
                    /// The value returned from the function is the fulfilled value of the promise returned by then().
                    /// </param>
                    /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onProgress">
                    /// the function to be called if the promise reports progress. Data about the progress
                    /// is passed as the single argument. Promises are not required to support
                    /// progress.
                    /// </param>
                    /// </signature>
                    var value = this._value;
                    if (onError) {
                        try {
                            if (!onError.handlesOnError) {
                                callonerror(null, value, detailsForHandledError, this, onError);
                            }
                            var result = onError(value);
                            if (result && typeof result === "object" && typeof result.done === "function") {
                                // If a promise is returned we need to wait on it.
                                result.done();
                            }
                            return;
                        } catch (ex) {
                            value = ex;
                        }
                    }
                    if (value instanceof Error && value.message === canceledName) {
                        // suppress cancel
                        return;
                    }
                    // force the exception to be thrown asyncronously to avoid any try/catch blocks
                    //
                    Promise._doneHandler(value);
                },
                then: function ErrorPromise_then(unused, onError) {
                    /// <signature helpKeyword="WinJS.PromiseStateMachine.then">
                    /// <summary locid="WinJS.PromiseStateMachine.then">
                    /// Allows you to specify the work to be done on the fulfillment of the promised value,
                    /// the error handling to be performed if the promise fails to fulfill
                    /// a value, and the handling of progress notifications along the way.
                    /// </summary>
                    /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.then_p:onComplete">
                    /// The function to be called if the promise is fulfilled successfully with a value.
                    /// The value is passed as the single argument. If the value is null, the value is returned.
                    /// The value returned from the function becomes the fulfilled value of the promise returned by
                    /// then(). If an exception is thrown while this function is being executed, the promise returned
                    /// by then() moves into the error state.
                    /// </param>
                    /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onError">
                    /// The function to be called if the promise is fulfilled with an error. The error
                    /// is passed as the single argument. If it is null, the error is forwarded.
                    /// The value returned from the function becomes the fulfilled value of the promise returned by then().
                    /// </param>
                    /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onProgress">
                    /// The function to be called if the promise reports progress. Data about the progress
                    /// is passed as the single argument. Promises are not required to support
                    /// progress.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.PromiseStateMachine.then_returnValue">
                    /// The promise whose value is the result of executing the complete or
                    /// error function.
                    /// </returns>
                    /// </signature>

                    // If the promise is already in a error state and no error handler is provided
                    // we optimize by simply returning the promise instead of creating a new one.
                    //
                    if (!onError) { return this; }
                    var result;
                    var value = this._value;
                    try {
                        if (!onError.handlesOnError) {
                            callonerror(null, value, detailsForHandledError, this, onError);
                        }
                        result = new CompletePromise(onError(value));
                    } catch (ex) {
                        // If the value throw from the error handler is the same as the value
                        // provided to the error handler then there is no need for a new promise.
                        //
                        if (ex === value) {
                            result = this;
                        } else {
                            result = new ExceptionPromise(ex);
                        }
                    }
                    return result;
                }
            }, {
                supportedForProcessing: false
            }
        );

        var ExceptionPromise = _Base.Class.derive(ErrorPromise,
            function ExceptionPromise_ctor(value) {

                if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.exceptionPromise))) {
                    this._stack = Promise._getStack();
                }

                this._value = value;
                callonerror(this, value, detailsForException);
            }, {
                /* empty */
            }, {
                supportedForProcessing: false
            }
        );

        var CompletePromise = _Base.Class.define(
            function CompletePromise_ctor(value) {

                if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.completePromise))) {
                    this._stack = Promise._getStack();
                }

                if (value && typeof value === "object" && typeof value.then === "function") {
                    var result = new ThenPromise(null);
                    result._setCompleteValue(value);
                    return result;
                }
                this._value = value;
            }, {
                cancel: function () {
                    /// <signature helpKeyword="WinJS.PromiseStateMachine.cancel">
                    /// <summary locid="WinJS.PromiseStateMachine.cancel">
                    /// Attempts to cancel the fulfillment of a promised value. If the promise hasn't
                    /// already been fulfilled and cancellation is supported, the promise enters
                    /// the error state with a value of Error("Canceled").
                    /// </summary>
                    /// </signature>
                },
                done: function CompletePromise_done(onComplete) {
                    /// <signature helpKeyword="WinJS.PromiseStateMachine.done">
                    /// <summary locid="WinJS.PromiseStateMachine.done">
                    /// Allows you to specify the work to be done on the fulfillment of the promised value,
                    /// the error handling to be performed if the promise fails to fulfill
                    /// a value, and the handling of progress notifications along the way.
                    ///
                    /// After the handlers have finished executing, this function throws any error that would have been returned
                    /// from then() as a promise in the error state.
                    /// </summary>
                    /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.done_p:onComplete">
                    /// The function to be called if the promise is fulfilled successfully with a value.
                    /// The fulfilled value is passed as the single argument. If the value is null,
                    /// the fulfilled value is returned. The value returned
                    /// from the function becomes the fulfilled value of the promise returned by
                    /// then(). If an exception is thrown while executing the function, the promise returned
                    /// by then() moves into the error state.
                    /// </param>
                    /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onError">
                    /// The function to be called if the promise is fulfilled with an error. The error
                    /// is passed as the single argument. If it is null, the error is forwarded.
                    /// The value returned from the function is the fulfilled value of the promise returned by then().
                    /// </param>
                    /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.done_p:onProgress">
                    /// the function to be called if the promise reports progress. Data about the progress
                    /// is passed as the single argument. Promises are not required to support
                    /// progress.
                    /// </param>
                    /// </signature>
                    if (!onComplete) { return; }
                    try {
                        var result = onComplete(this._value);
                        if (result && typeof result === "object" && typeof result.done === "function") {
                            result.done();
                        }
                    } catch (ex) {
                        // force the exception to be thrown asynchronously to avoid any try/catch blocks
                        Promise._doneHandler(ex);
                    }
                },
                then: function CompletePromise_then(onComplete) {
                    /// <signature helpKeyword="WinJS.PromiseStateMachine.then">
                    /// <summary locid="WinJS.PromiseStateMachine.then">
                    /// Allows you to specify the work to be done on the fulfillment of the promised value,
                    /// the error handling to be performed if the promise fails to fulfill
                    /// a value, and the handling of progress notifications along the way.
                    /// </summary>
                    /// <param name='onComplete' type='Function' locid="WinJS.PromiseStateMachine.then_p:onComplete">
                    /// The function to be called if the promise is fulfilled successfully with a value.
                    /// The value is passed as the single argument. If the value is null, the value is returned.
                    /// The value returned from the function becomes the fulfilled value of the promise returned by
                    /// then(). If an exception is thrown while this function is being executed, the promise returned
                    /// by then() moves into the error state.
                    /// </param>
                    /// <param name='onError' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onError">
                    /// The function to be called if the promise is fulfilled with an error. The error
                    /// is passed as the single argument. If it is null, the error is forwarded.
                    /// The value returned from the function becomes the fulfilled value of the promise returned by then().
                    /// </param>
                    /// <param name='onProgress' type='Function' optional='true' locid="WinJS.PromiseStateMachine.then_p:onProgress">
                    /// The function to be called if the promise reports progress. Data about the progress
                    /// is passed as the single argument. Promises are not required to support
                    /// progress.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.PromiseStateMachine.then_returnValue">
                    /// The promise whose value is the result of executing the complete or
                    /// error function.
                    /// </returns>
                    /// </signature>
                    try {
                        // If the value returned from the completion handler is the same as the value
                        // provided to the completion handler then there is no need for a new promise.
                        //
                        var newValue = onComplete ? onComplete(this._value) : this._value;
                        return newValue === this._value ? this : new CompletePromise(newValue);
                    } catch (ex) {
                        return new ExceptionPromise(ex);
                    }
                }
            }, {
                supportedForProcessing: false
            }
        );

        //
        // Promise is the user-creatable WinJS.Promise object.
        //

        function timeout(timeoutMS) {
            var id;
            return new Promise(
                function (c) {
                    if (timeoutMS) {
                        id = _Global.setTimeout(c, timeoutMS);
                    } else {
                        _BaseCoreUtils._setImmediate(c);
                    }
                },
                function () {
                    if (id) {
                        _Global.clearTimeout(id);
                    }
                }
            );
        }

        function timeoutWithPromise(timeout, promise) {
            var cancelPromise = function () { promise.cancel(); };
            var cancelTimeout = function () { timeout.cancel(); };
            timeout.then(cancelPromise);
            promise.then(cancelTimeout, cancelTimeout);
            return promise;
        }

        var staticCanceledPromise;

        var Promise = _Base.Class.derive(PromiseStateMachine,
            function Promise_ctor(init, oncancel) {
                /// <signature helpKeyword="WinJS.Promise">
                /// <summary locid="WinJS.Promise">
                /// A promise provides a mechanism to schedule work to be done on a value that
                /// has not yet been computed. It is a convenient abstraction for managing
                /// interactions with asynchronous APIs.
                /// </summary>
                /// <param name="init" type="Function" locid="WinJS.Promise_p:init">
                /// The function that is called during construction of the  promise. The function
                /// is given three arguments (complete, error, progress). Inside this function
                /// you should add event listeners for the notifications supported by this value.
                /// </param>
                /// <param name="oncancel" optional="true" locid="WinJS.Promise_p:oncancel">
                /// The function to call if a consumer of this promise wants
                /// to cancel its undone work. Promises are not required to
                /// support cancellation.
                /// </param>
                /// </signature>

                if (tagWithStack && (tagWithStack === true || (tagWithStack & tag.promise))) {
                    this._stack = Promise._getStack();
                }

                this._oncancel = oncancel;
                this._setState(state_created);
                this._run();

                try {
                    var complete = this._completed.bind(this);
                    var error = this._error.bind(this);
                    var progress = this._progress.bind(this);
                    init(complete, error, progress);
                } catch (ex) {
                    this._setExceptionValue(ex);
                }
            }, {
                _oncancel: null,

                _cancelAction: function () {
                    // BEGIN monaco change
                    try {
                        if (this._oncancel) {
                            this._oncancel();
                        } else {
                            throw new Error('Promise did not implement oncancel');
                        }
                    } catch (ex) {
                        // Access fields to get them created
                        var msg = ex.message;
                        var stack = ex.stack;
                        promiseEventListeners.dispatchEvent('error', ex);
                    }
                    // END monaco change
                },
                _cleanupAction: function () { this._oncancel = null; }
            }, {

                addEventListener: function Promise_addEventListener(eventType, listener, capture) {
                    /// <signature helpKeyword="WinJS.Promise.addEventListener">
                    /// <summary locid="WinJS.Promise.addEventListener">
                    /// Adds an event listener to the control.
                    /// </summary>
                    /// <param name="eventType" locid="WinJS.Promise.addEventListener_p:eventType">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="listener" locid="WinJS.Promise.addEventListener_p:listener">
                    /// The listener to invoke when the event is raised.
                    /// </param>
                    /// <param name="capture" locid="WinJS.Promise.addEventListener_p:capture">
                    /// Specifies whether or not to initiate capture.
                    /// </param>
                    /// </signature>
                    promiseEventListeners.addEventListener(eventType, listener, capture);
                },
                any: function Promise_any(values) {
                    /// <signature helpKeyword="WinJS.Promise.any">
                    /// <summary locid="WinJS.Promise.any">
                    /// Returns a promise that is fulfilled when one of the input promises
                    /// has been fulfilled.
                    /// </summary>
                    /// <param name="values" type="Array" locid="WinJS.Promise.any_p:values">
                    /// An array that contains promise objects or objects whose property
                    /// values include promise objects.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.any_returnValue">
                    /// A promise that on fulfillment yields the value of the input (complete or error).
                    /// </returns>
                    /// </signature>
                    return new Promise(
                        function (complete, error) {
                            var keys = Object.keys(values);
                            if (keys.length === 0) {
                                complete();
                            }
                            var canceled = 0;
                            keys.forEach(function (key) {
                                Promise.as(values[key]).then(
                                    function () { complete({ key: key, value: values[key] }); },
                                    function (e) {
                                        if (e instanceof Error && e.name === canceledName) {
                                            if ((++canceled) === keys.length) {
                                                complete(Promise.cancel);
                                            }
                                            return;
                                        }
                                        error({ key: key, value: values[key] });
                                    }
                                );
                            });
                        },
                        function () {
                            var keys = Object.keys(values);
                            keys.forEach(function (key) {
                                var promise = Promise.as(values[key]);
                                if (typeof promise.cancel === "function") {
                                    promise.cancel();
                                }
                            });
                        }
                    );
                },
                as: function Promise_as(value) {
                    /// <signature helpKeyword="WinJS.Promise.as">
                    /// <summary locid="WinJS.Promise.as">
                    /// Returns a promise. If the object is already a promise it is returned;
                    /// otherwise the object is wrapped in a promise.
                    /// </summary>
                    /// <param name="value" locid="WinJS.Promise.as_p:value">
                    /// The value to be treated as a promise.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.as_returnValue">
                    /// A promise.
                    /// </returns>
                    /// </signature>
                    if (value && typeof value === "object" && typeof value.then === "function") {
                        return value;
                    }
                    return new CompletePromise(value);
                },
                /// <field type="WinJS.Promise" helpKeyword="WinJS.Promise.cancel" locid="WinJS.Promise.cancel">
                /// Canceled promise value, can be returned from a promise completion handler
                /// to indicate cancelation of the promise chain.
                /// </field>
                cancel: {
                    get: function () {
                        return (staticCanceledPromise = staticCanceledPromise || new ErrorPromise(new _ErrorFromName(canceledName)));
                    }
                },
                dispatchEvent: function Promise_dispatchEvent(eventType, details) {
                    /// <signature helpKeyword="WinJS.Promise.dispatchEvent">
                    /// <summary locid="WinJS.Promise.dispatchEvent">
                    /// Raises an event of the specified type and properties.
                    /// </summary>
                    /// <param name="eventType" locid="WinJS.Promise.dispatchEvent_p:eventType">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="details" locid="WinJS.Promise.dispatchEvent_p:details">
                    /// The set of additional properties to be attached to the event object.
                    /// </param>
                    /// <returns type="Boolean" locid="WinJS.Promise.dispatchEvent_returnValue">
                    /// Specifies whether preventDefault was called on the event.
                    /// </returns>
                    /// </signature>
                    return promiseEventListeners.dispatchEvent(eventType, details);
                },
                is: function Promise_is(value) {
                    /// <signature helpKeyword="WinJS.Promise.is">
                    /// <summary locid="WinJS.Promise.is">
                    /// Determines whether a value fulfills the promise contract.
                    /// </summary>
                    /// <param name="value" locid="WinJS.Promise.is_p:value">
                    /// A value that may be a promise.
                    /// </param>
                    /// <returns type="Boolean" locid="WinJS.Promise.is_returnValue">
                    /// true if the specified value is a promise, otherwise false.
                    /// </returns>
                    /// </signature>
                    return value && typeof value === "object" && typeof value.then === "function";
                },
                join: function Promise_join(values) {
                    /// <signature helpKeyword="WinJS.Promise.join">
                    /// <summary locid="WinJS.Promise.join">
                    /// Creates a promise that is fulfilled when all the values are fulfilled.
                    /// </summary>
                    /// <param name="values" type="Object" locid="WinJS.Promise.join_p:values">
                    /// An object whose fields contain values, some of which may be promises.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.join_returnValue">
                    /// A promise whose value is an object with the same field names as those of the object in the values parameter, where
                    /// each field value is the fulfilled value of a promise.
                    /// </returns>
                    /// </signature>
                    return new Promise(
                        function (complete, error, progress) {
                            var keys = Object.keys(values);
                            var errors = Array.isArray(values) ? [] : {};
                            var results = Array.isArray(values) ? [] : {};
                            var undefineds = 0;
                            var pending = keys.length;
                            var argDone = function (key) {
                                if ((--pending) === 0) {
                                    var errorCount = Object.keys(errors).length;
                                    if (errorCount === 0) {
                                        complete(results);
                                    } else {
                                        var canceledCount = 0;
                                        keys.forEach(function (key) {
                                            var e = errors[key];
                                            if (e instanceof Error && e.name === canceledName) {
                                                canceledCount++;
                                            }
                                        });
                                        if (canceledCount === errorCount) {
                                            complete(Promise.cancel);
                                        } else {
                                            error(errors);
                                        }
                                    }
                                } else {
                                    progress({ Key: key, Done: true });
                                }
                            };
                            keys.forEach(function (key) {
                                var value = values[key];
                                if (value === undefined) {
                                    undefineds++;
                                } else {
                                    Promise.then(value,
                                        function (value) { results[key] = value; argDone(key); },
                                        function (value) { errors[key] = value; argDone(key); }
                                    );
                                }
                            });
                            pending -= undefineds;
                            if (pending === 0) {
                                complete(results);
                                return;
                            }
                        },
                        function () {
                            Object.keys(values).forEach(function (key) {
                                var promise = Promise.as(values[key]);
                                if (typeof promise.cancel === "function") {
                                    promise.cancel();
                                }
                            });
                        }
                    );
                },
                removeEventListener: function Promise_removeEventListener(eventType, listener, capture) {
                    /// <signature helpKeyword="WinJS.Promise.removeEventListener">
                    /// <summary locid="WinJS.Promise.removeEventListener">
                    /// Removes an event listener from the control.
                    /// </summary>
                    /// <param name='eventType' locid="WinJS.Promise.removeEventListener_eventType">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name='listener' locid="WinJS.Promise.removeEventListener_listener">
                    /// The listener to remove.
                    /// </param>
                    /// <param name='capture' locid="WinJS.Promise.removeEventListener_capture">
                    /// Specifies whether or not to initiate capture.
                    /// </param>
                    /// </signature>
                    promiseEventListeners.removeEventListener(eventType, listener, capture);
                },
                supportedForProcessing: false,
                then: function Promise_then(value, onComplete, onError, onProgress) {
                    /// <signature helpKeyword="WinJS.Promise.then">
                    /// <summary locid="WinJS.Promise.then">
                    /// A static version of the promise instance method then().
                    /// </summary>
                    /// <param name="value" locid="WinJS.Promise.then_p:value">
                    /// the value to be treated as a promise.
                    /// </param>
                    /// <param name="onComplete" type="Function" locid="WinJS.Promise.then_p:complete">
                    /// The function to be called if the promise is fulfilled with a value.
                    /// If it is null, the promise simply
                    /// returns the value. The value is passed as the single argument.
                    /// </param>
                    /// <param name="onError" type="Function" optional="true" locid="WinJS.Promise.then_p:error">
                    /// The function to be called if the promise is fulfilled with an error. The error
                    /// is passed as the single argument.
                    /// </param>
                    /// <param name="onProgress" type="Function" optional="true" locid="WinJS.Promise.then_p:progress">
                    /// The function to be called if the promise reports progress. Data about the progress
                    /// is passed as the single argument. Promises are not required to support
                    /// progress.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.then_returnValue">
                    /// A promise whose value is the result of executing the provided complete function.
                    /// </returns>
                    /// </signature>
                    return Promise.as(value).then(onComplete, onError, onProgress);
                },
                thenEach: function Promise_thenEach(values, onComplete, onError, onProgress) {
                    /// <signature helpKeyword="WinJS.Promise.thenEach">
                    /// <summary locid="WinJS.Promise.thenEach">
                    /// Performs an operation on all the input promises and returns a promise
                    /// that has the shape of the input and contains the result of the operation
                    /// that has been performed on each input.
                    /// </summary>
                    /// <param name="values" locid="WinJS.Promise.thenEach_p:values">
                    /// A set of values (which could be either an array or an object) of which some or all are promises.
                    /// </param>
                    /// <param name="onComplete" type="Function" locid="WinJS.Promise.thenEach_p:complete">
                    /// The function to be called if the promise is fulfilled with a value.
                    /// If the value is null, the promise returns the value.
                    /// The value is passed as the single argument.
                    /// </param>
                    /// <param name="onError" type="Function" optional="true" locid="WinJS.Promise.thenEach_p:error">
                    /// The function to be called if the promise is fulfilled with an error. The error
                    /// is passed as the single argument.
                    /// </param>
                    /// <param name="onProgress" type="Function" optional="true" locid="WinJS.Promise.thenEach_p:progress">
                    /// The function to be called if the promise reports progress. Data about the progress
                    /// is passed as the single argument. Promises are not required to support
                    /// progress.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.thenEach_returnValue">
                    /// A promise that is the result of calling Promise.join on the values parameter.
                    /// </returns>
                    /// </signature>
                    var result = Array.isArray(values) ? [] : {};
                    Object.keys(values).forEach(function (key) {
                        result[key] = Promise.as(values[key]).then(onComplete, onError, onProgress);
                    });
                    return Promise.join(result);
                },
                timeout: function Promise_timeout(time, promise) {
                    /// <signature helpKeyword="WinJS.Promise.timeout">
                    /// <summary locid="WinJS.Promise.timeout">
                    /// Creates a promise that is fulfilled after a timeout.
                    /// </summary>
                    /// <param name="timeout" type="Number" optional="true" locid="WinJS.Promise.timeout_p:timeout">
                    /// The timeout period in milliseconds. If this value is zero or not specified
                    /// setImmediate is called, otherwise setTimeout is called.
                    /// </param>
                    /// <param name="promise" type="Promise" optional="true" locid="WinJS.Promise.timeout_p:promise">
                    /// A promise that will be canceled if it doesn't complete before the
                    /// timeout has expired.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.timeout_returnValue">
                    /// A promise that is completed asynchronously after the specified timeout.
                    /// </returns>
                    /// </signature>
                    var to = timeout(time);
                    return promise ? timeoutWithPromise(to, promise) : to;
                },
                wrap: function Promise_wrap(value) {
                    /// <signature helpKeyword="WinJS.Promise.wrap">
                    /// <summary locid="WinJS.Promise.wrap">
                    /// Wraps a non-promise value in a promise. You can use this function if you need
                    /// to pass a value to a function that requires a promise.
                    /// </summary>
                    /// <param name="value" locid="WinJS.Promise.wrap_p:value">
                    /// Some non-promise value to be wrapped in a promise.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.wrap_returnValue">
                    /// A promise that is successfully fulfilled with the specified value
                    /// </returns>
                    /// </signature>
                    return new CompletePromise(value);
                },
                wrapError: function Promise_wrapError(error) {
                    /// <signature helpKeyword="WinJS.Promise.wrapError">
                    /// <summary locid="WinJS.Promise.wrapError">
                    /// Wraps a non-promise error value in a promise. You can use this function if you need
                    /// to pass an error to a function that requires a promise.
                    /// </summary>
                    /// <param name="error" locid="WinJS.Promise.wrapError_p:error">
                    /// A non-promise error value to be wrapped in a promise.
                    /// </param>
                    /// <returns type="WinJS.Promise" locid="WinJS.Promise.wrapError_returnValue">
                    /// A promise that is in an error state with the specified value.
                    /// </returns>
                    /// </signature>
                    return new ErrorPromise(error);
                },

                _veryExpensiveTagWithStack: {
                    get: function () { return tagWithStack; },
                    set: function (value) { tagWithStack = value; }
                },
                _veryExpensiveTagWithStack_tag: tag,
                _getStack: function () {
                    if (_Global.Debug && _Global.Debug.debuggerEnabled) {
                        try { throw new Error(); } catch (e) { return e.stack; }
                    }
                },

                _cancelBlocker: function Promise__cancelBlocker(input, oncancel) {
                    //
                    // Returns a promise which on cancelation will still result in downstream cancelation while
                    //  protecting the promise 'input' from being  canceled which has the effect of allowing
                    //  'input' to be shared amoung various consumers.
                    //
                    if (!Promise.is(input)) {
                        return Promise.wrap(input);
                    }
                    var complete;
                    var error;
                    var output = new Promise(
                        function (c, e) {
                            complete = c;
                            error = e;
                        },
                        function () {
                            complete = null;
                            error = null;
                            oncancel && oncancel();
                        }
                    );
                    input.then(
                        function (v) { complete && complete(v); },
                        function (e) { error && error(e); }
                    );
                    return output;
                },

            }
        );
        Object.defineProperties(Promise, _Events.createEventProperties(errorET));

        Promise._doneHandler = function (value) {
            _BaseCoreUtils._setImmediate(function Promise_done_rethrow() {
                throw value;
            });
        };

        return {
            PromiseStateMachine: PromiseStateMachine,
            Promise: Promise,
            state_created: state_created
        };
    });

    _winjs("WinJS/Promise", ["WinJS/Core/_Base","WinJS/Promise/_StateMachine"], function promiseInit( _Base, _StateMachine) {

        _Base.Namespace.define("WinJS", {
            Promise: _StateMachine.Promise
        });

        return _StateMachine.Promise;
    });

    __winjs_exports = _modules["WinJS/Core/_WinJS"];
    __winjs_exports.TPromise = __winjs_exports.Promise;
    __winjs_exports.PPromise = __winjs_exports.Promise;

    // ESM-comment-begin
    // if (typeof exports === 'undefined' && typeof define === 'function' && define.amd) {
    //     define([], __winjs_exports);
    // } else {
    //     module.exports = __winjs_exports;
    // }
    // ESM-comment-end

    })();

    // ESM-uncomment-begin
    var Promise = __winjs_exports.Promise;
    var TPromise = __winjs_exports.TPromise;
    var PPromise = __winjs_exports.PPromise;
    // ESM-uncomment-end

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    /**
     * A position in the editor.
     */
    var Position = /** @class */ (function () {
        function Position(lineNumber, column) {
            this.lineNumber = lineNumber;
            this.column = column;
        }
        /**
         * Test if this position equals other position
         */
        Position.prototype.equals = function (other) {
            return Position.equals(this, other);
        };
        /**
         * Test if position `a` equals position `b`
         */
        Position.equals = function (a, b) {
            if (!a && !b) {
                return true;
            }
            return (!!a &&
                !!b &&
                a.lineNumber === b.lineNumber &&
                a.column === b.column);
        };
        /**
         * Test if this position is before other position.
         * If the two positions are equal, the result will be false.
         */
        Position.prototype.isBefore = function (other) {
            return Position.isBefore(this, other);
        };
        /**
         * Test if position `a` is before position `b`.
         * If the two positions are equal, the result will be false.
         */
        Position.isBefore = function (a, b) {
            if (a.lineNumber < b.lineNumber) {
                return true;
            }
            if (b.lineNumber < a.lineNumber) {
                return false;
            }
            return a.column < b.column;
        };
        /**
         * Test if this position is before other position.
         * If the two positions are equal, the result will be true.
         */
        Position.prototype.isBeforeOrEqual = function (other) {
            return Position.isBeforeOrEqual(this, other);
        };
        /**
         * Test if position `a` is before position `b`.
         * If the two positions are equal, the result will be true.
         */
        Position.isBeforeOrEqual = function (a, b) {
            if (a.lineNumber < b.lineNumber) {
                return true;
            }
            if (b.lineNumber < a.lineNumber) {
                return false;
            }
            return a.column <= b.column;
        };
        /**
         * A function that compares positions, useful for sorting
         */
        Position.compare = function (a, b) {
            var aLineNumber = a.lineNumber | 0;
            var bLineNumber = b.lineNumber | 0;
            if (aLineNumber === bLineNumber) {
                var aColumn = a.column | 0;
                var bColumn = b.column | 0;
                return aColumn - bColumn;
            }
            return aLineNumber - bLineNumber;
        };
        /**
         * Clone this position.
         */
        Position.prototype.clone = function () {
            return new Position(this.lineNumber, this.column);
        };
        /**
         * Convert to a human-readable representation.
         */
        Position.prototype.toString = function () {
            return '(' + this.lineNumber + ',' + this.column + ')';
        };
        // ---
        /**
         * Create a `Position` from an `IPosition`.
         */
        Position.lift = function (pos) {
            return new Position(pos.lineNumber, pos.column);
        };
        /**
         * Test if `obj` is an `IPosition`.
         */
        Position.isIPosition = function (obj) {
            return (obj
                && (typeof obj.lineNumber === 'number')
                && (typeof obj.column === 'number'));
        };
        return Position;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    /**
     * A range in the editor. (startLineNumber,startColumn) is <= (endLineNumber,endColumn)
     */
    var Range = /** @class */ (function () {
        function Range(startLineNumber, startColumn, endLineNumber, endColumn) {
            if ((startLineNumber > endLineNumber) || (startLineNumber === endLineNumber && startColumn > endColumn)) {
                this.startLineNumber = endLineNumber;
                this.startColumn = endColumn;
                this.endLineNumber = startLineNumber;
                this.endColumn = startColumn;
            }
            else {
                this.startLineNumber = startLineNumber;
                this.startColumn = startColumn;
                this.endLineNumber = endLineNumber;
                this.endColumn = endColumn;
            }
        }
        /**
         * Test if this range is empty.
         */
        Range.prototype.isEmpty = function () {
            return Range.isEmpty(this);
        };
        /**
         * Test if `range` is empty.
         */
        Range.isEmpty = function (range) {
            return (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn);
        };
        /**
         * Test if position is in this range. If the position is at the edges, will return true.
         */
        Range.prototype.containsPosition = function (position) {
            return Range.containsPosition(this, position);
        };
        /**
         * Test if `position` is in `range`. If the position is at the edges, will return true.
         */
        Range.containsPosition = function (range, position) {
            if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
                return false;
            }
            if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
                return false;
            }
            if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
                return false;
            }
            return true;
        };
        /**
         * Test if range is in this range. If the range is equal to this range, will return true.
         */
        Range.prototype.containsRange = function (range) {
            return Range.containsRange(this, range);
        };
        /**
         * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
         */
        Range.containsRange = function (range, otherRange) {
            if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
                return false;
            }
            if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
                return false;
            }
            if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn < range.startColumn) {
                return false;
            }
            if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn > range.endColumn) {
                return false;
            }
            return true;
        };
        /**
         * A reunion of the two ranges.
         * The smallest position will be used as the start point, and the largest one as the end point.
         */
        Range.prototype.plusRange = function (range) {
            return Range.plusRange(this, range);
        };
        /**
         * A reunion of the two ranges.
         * The smallest position will be used as the start point, and the largest one as the end point.
         */
        Range.plusRange = function (a, b) {
            var startLineNumber;
            var startColumn;
            var endLineNumber;
            var endColumn;
            if (b.startLineNumber < a.startLineNumber) {
                startLineNumber = b.startLineNumber;
                startColumn = b.startColumn;
            }
            else if (b.startLineNumber === a.startLineNumber) {
                startLineNumber = b.startLineNumber;
                startColumn = Math.min(b.startColumn, a.startColumn);
            }
            else {
                startLineNumber = a.startLineNumber;
                startColumn = a.startColumn;
            }
            if (b.endLineNumber > a.endLineNumber) {
                endLineNumber = b.endLineNumber;
                endColumn = b.endColumn;
            }
            else if (b.endLineNumber === a.endLineNumber) {
                endLineNumber = b.endLineNumber;
                endColumn = Math.max(b.endColumn, a.endColumn);
            }
            else {
                endLineNumber = a.endLineNumber;
                endColumn = a.endColumn;
            }
            return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
        };
        /**
         * A intersection of the two ranges.
         */
        Range.prototype.intersectRanges = function (range) {
            return Range.intersectRanges(this, range);
        };
        /**
         * A intersection of the two ranges.
         */
        Range.intersectRanges = function (a, b) {
            var resultStartLineNumber = a.startLineNumber;
            var resultStartColumn = a.startColumn;
            var resultEndLineNumber = a.endLineNumber;
            var resultEndColumn = a.endColumn;
            var otherStartLineNumber = b.startLineNumber;
            var otherStartColumn = b.startColumn;
            var otherEndLineNumber = b.endLineNumber;
            var otherEndColumn = b.endColumn;
            if (resultStartLineNumber < otherStartLineNumber) {
                resultStartLineNumber = otherStartLineNumber;
                resultStartColumn = otherStartColumn;
            }
            else if (resultStartLineNumber === otherStartLineNumber) {
                resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
            }
            if (resultEndLineNumber > otherEndLineNumber) {
                resultEndLineNumber = otherEndLineNumber;
                resultEndColumn = otherEndColumn;
            }
            else if (resultEndLineNumber === otherEndLineNumber) {
                resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
            }
            // Check if selection is now empty
            if (resultStartLineNumber > resultEndLineNumber) {
                return null;
            }
            if (resultStartLineNumber === resultEndLineNumber && resultStartColumn > resultEndColumn) {
                return null;
            }
            return new Range(resultStartLineNumber, resultStartColumn, resultEndLineNumber, resultEndColumn);
        };
        /**
         * Test if this range equals other.
         */
        Range.prototype.equalsRange = function (other) {
            return Range.equalsRange(this, other);
        };
        /**
         * Test if range `a` equals `b`.
         */
        Range.equalsRange = function (a, b) {
            return (!!a &&
                !!b &&
                a.startLineNumber === b.startLineNumber &&
                a.startColumn === b.startColumn &&
                a.endLineNumber === b.endLineNumber &&
                a.endColumn === b.endColumn);
        };
        /**
         * Return the end position (which will be after or equal to the start position)
         */
        Range.prototype.getEndPosition = function () {
            return new Position(this.endLineNumber, this.endColumn);
        };
        /**
         * Return the start position (which will be before or equal to the end position)
         */
        Range.prototype.getStartPosition = function () {
            return new Position(this.startLineNumber, this.startColumn);
        };
        /**
         * Transform to a user presentable string representation.
         */
        Range.prototype.toString = function () {
            return '[' + this.startLineNumber + ',' + this.startColumn + ' -> ' + this.endLineNumber + ',' + this.endColumn + ']';
        };
        /**
         * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
         */
        Range.prototype.setEndPosition = function (endLineNumber, endColumn) {
            return new Range(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
        };
        /**
         * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
         */
        Range.prototype.setStartPosition = function (startLineNumber, startColumn) {
            return new Range(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
        };
        /**
         * Create a new empty range using this range's start position.
         */
        Range.prototype.collapseToStart = function () {
            return Range.collapseToStart(this);
        };
        /**
         * Create a new empty range using this range's start position.
         */
        Range.collapseToStart = function (range) {
            return new Range(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn);
        };
        // ---
        Range.fromPositions = function (start, end) {
            if (end === void 0) { end = start; }
            return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
        };
        /**
         * Create a `Range` from an `IRange`.
         */
        Range.lift = function (range) {
            if (!range) {
                return null;
            }
            return new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        };
        /**
         * Test if `obj` is an `IRange`.
         */
        Range.isIRange = function (obj) {
            return (obj
                && (typeof obj.startLineNumber === 'number')
                && (typeof obj.startColumn === 'number')
                && (typeof obj.endLineNumber === 'number')
                && (typeof obj.endColumn === 'number'));
        };
        /**
         * Test if the two ranges are touching in any way.
         */
        Range.areIntersectingOrTouching = function (a, b) {
            // Check if `a` is before `b`
            if (a.endLineNumber < b.startLineNumber || (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn)) {
                return false;
            }
            // Check if `b` is before `a`
            if (b.endLineNumber < a.startLineNumber || (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn)) {
                return false;
            }
            // These ranges must intersect
            return true;
        };
        /**
         * A function that compares ranges, useful for sorting ranges
         * It will first compare ranges on the startPosition and then on the endPosition
         */
        Range.compareRangesUsingStarts = function (a, b) {
            var aStartLineNumber = a.startLineNumber | 0;
            var bStartLineNumber = b.startLineNumber | 0;
            if (aStartLineNumber === bStartLineNumber) {
                var aStartColumn = a.startColumn | 0;
                var bStartColumn = b.startColumn | 0;
                if (aStartColumn === bStartColumn) {
                    var aEndLineNumber = a.endLineNumber | 0;
                    var bEndLineNumber = b.endLineNumber | 0;
                    if (aEndLineNumber === bEndLineNumber) {
                        var aEndColumn = a.endColumn | 0;
                        var bEndColumn = b.endColumn | 0;
                        return aEndColumn - bEndColumn;
                    }
                    return aEndLineNumber - bEndLineNumber;
                }
                return aStartColumn - bStartColumn;
            }
            return aStartLineNumber - bStartLineNumber;
        };
        /**
         * A function that compares ranges, useful for sorting ranges
         * It will first compare ranges on the endPosition and then on the startPosition
         */
        Range.compareRangesUsingEnds = function (a, b) {
            if (a.endLineNumber === b.endLineNumber) {
                if (a.endColumn === b.endColumn) {
                    if (a.startLineNumber === b.startLineNumber) {
                        return a.startColumn - b.startColumn;
                    }
                    return a.startLineNumber - b.startLineNumber;
                }
                return a.endColumn - b.endColumn;
            }
            return a.endLineNumber - b.endLineNumber;
        };
        /**
         * Test if the range spans multiple lines.
         */
        Range.spansMultipleLines = function (range) {
            return range.endLineNumber > range.startLineNumber;
        };
        return Range;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    /**
     * Represents information about a specific difference between two sequences.
     */
    var DiffChange = /** @class */ (function () {
        /**
         * Constructs a new DiffChange with the given sequence information
         * and content.
         */
        function DiffChange(originalStart, originalLength, modifiedStart, modifiedLength) {
            //Debug.Assert(originalLength > 0 || modifiedLength > 0, "originalLength and modifiedLength cannot both be <= 0");
            this.originalStart = originalStart;
            this.originalLength = originalLength;
            this.modifiedStart = modifiedStart;
            this.modifiedLength = modifiedLength;
        }
        /**
         * The end point (exclusive) of the change in the original sequence.
         */
        DiffChange.prototype.getOriginalEnd = function () {
            return this.originalStart + this.originalLength;
        };
        /**
         * The end point (exclusive) of the change in the modified sequence.
         */
        DiffChange.prototype.getModifiedEnd = function () {
            return this.modifiedStart + this.modifiedLength;
        };
        return DiffChange;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    function createStringSequence(a) {
        return {
            getLength: function () { return a.length; },
            getElementHash: function (pos) { return a[pos]; }
        };
    }
    function stringDiff(original, modified, pretty) {
        return new LcsDiff(createStringSequence(original), createStringSequence(modified)).ComputeDiff(pretty);
    }
    //
    // The code below has been ported from a C# implementation in VS
    //
    var Debug = /** @class */ (function () {
        function Debug() {
        }
        Debug.Assert = function (condition, message) {
            if (!condition) {
                throw new Error(message);
            }
        };
        return Debug;
    }());
    var MyArray = /** @class */ (function () {
        function MyArray() {
        }
        /**
         * Copies a range of elements from an Array starting at the specified source index and pastes
         * them to another Array starting at the specified destination index. The length and the indexes
         * are specified as 64-bit integers.
         * sourceArray:
         *		The Array that contains the data to copy.
         * sourceIndex:
         *		A 64-bit integer that represents the index in the sourceArray at which copying begins.
         * destinationArray:
         *		The Array that receives the data.
         * destinationIndex:
         *		A 64-bit integer that represents the index in the destinationArray at which storing begins.
         * length:
         *		A 64-bit integer that represents the number of elements to copy.
         */
        MyArray.Copy = function (sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
            for (var i = 0; i < length; i++) {
                destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
            }
        };
        return MyArray;
    }());
    //*****************************************************************************
    // LcsDiff.cs
    //
    // An implementation of the difference algorithm described in
    // "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
    //
    // Copyright (C) 2008 Microsoft Corporation @minifier_do_not_preserve
    //*****************************************************************************
    // Our total memory usage for storing history is (worst-case):
    // 2 * [(MaxDifferencesHistory + 1) * (MaxDifferencesHistory + 1) - 1] * sizeof(int)
    // 2 * [1448*1448 - 1] * 4 = 16773624 = 16MB
    var MaxDifferencesHistory = 1447;
    //let MaxDifferencesHistory = 100;
    /**
     * A utility class which helps to create the set of DiffChanges from
     * a difference operation. This class accepts original DiffElements and
     * modified DiffElements that are involved in a particular change. The
     * MarktNextChange() method can be called to mark the separation between
     * distinct changes. At the end, the Changes property can be called to retrieve
     * the constructed changes.
     */
    var DiffChangeHelper = /** @class */ (function () {
        /**
         * Constructs a new DiffChangeHelper for the given DiffSequences.
         */
        function DiffChangeHelper() {
            this.m_changes = [];
            this.m_originalStart = Number.MAX_VALUE;
            this.m_modifiedStart = Number.MAX_VALUE;
            this.m_originalCount = 0;
            this.m_modifiedCount = 0;
        }
        /**
         * Marks the beginning of the next change in the set of differences.
         */
        DiffChangeHelper.prototype.MarkNextChange = function () {
            // Only add to the list if there is something to add
            if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
                // Add the new change to our list
                this.m_changes.push(new DiffChange(this.m_originalStart, this.m_originalCount, this.m_modifiedStart, this.m_modifiedCount));
            }
            // Reset for the next change
            this.m_originalCount = 0;
            this.m_modifiedCount = 0;
            this.m_originalStart = Number.MAX_VALUE;
            this.m_modifiedStart = Number.MAX_VALUE;
        };
        /**
         * Adds the original element at the given position to the elements
         * affected by the current change. The modified index gives context
         * to the change position with respect to the original sequence.
         * @param originalIndex The index of the original element to add.
         * @param modifiedIndex The index of the modified element that provides corresponding position in the modified sequence.
         */
        DiffChangeHelper.prototype.AddOriginalElement = function (originalIndex, modifiedIndex) {
            // The 'true' start index is the smallest of the ones we've seen
            this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
            this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
            this.m_originalCount++;
        };
        /**
         * Adds the modified element at the given position to the elements
         * affected by the current change. The original index gives context
         * to the change position with respect to the modified sequence.
         * @param originalIndex The index of the original element that provides corresponding position in the original sequence.
         * @param modifiedIndex The index of the modified element to add.
         */
        DiffChangeHelper.prototype.AddModifiedElement = function (originalIndex, modifiedIndex) {
            // The 'true' start index is the smallest of the ones we've seen
            this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
            this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
            this.m_modifiedCount++;
        };
        /**
         * Retrieves all of the changes marked by the class.
         */
        DiffChangeHelper.prototype.getChanges = function () {
            if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
                // Finish up on whatever is left
                this.MarkNextChange();
            }
            return this.m_changes;
        };
        /**
         * Retrieves all of the changes marked by the class in the reverse order
         */
        DiffChangeHelper.prototype.getReverseChanges = function () {
            if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
                // Finish up on whatever is left
                this.MarkNextChange();
            }
            this.m_changes.reverse();
            return this.m_changes;
        };
        return DiffChangeHelper;
    }());
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    /**
     * An implementation of the difference algorithm described in
     * "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
     */
    var LcsDiff = /** @class */ (function () {
        /**
         * Constructs the DiffFinder
         */
        function LcsDiff(originalSequence, newSequence, continueProcessingPredicate) {
            if (continueProcessingPredicate === void 0) { continueProcessingPredicate = null; }
            this.OriginalSequence = originalSequence;
            this.ModifiedSequence = newSequence;
            this.ContinueProcessingPredicate = continueProcessingPredicate;
            this.m_originalIds = [];
            this.m_modifiedIds = [];
            this.m_forwardHistory = [];
            this.m_reverseHistory = [];
            this.ComputeUniqueIdentifiers();
        }
        LcsDiff.prototype.ComputeUniqueIdentifiers = function () {
            var originalSequenceLength = this.OriginalSequence.getLength();
            var modifiedSequenceLength = this.ModifiedSequence.getLength();
            this.m_originalIds = new Array(originalSequenceLength);
            this.m_modifiedIds = new Array(modifiedSequenceLength);
            // Create a new hash table for unique elements from the original
            // sequence.
            var hashTable = {};
            var currentUniqueId = 1;
            var i;
            // Fill up the hash table for unique elements
            for (i = 0; i < originalSequenceLength; i++) {
                var originalElementHash = this.OriginalSequence.getElementHash(i);
                if (!hasOwnProperty.call(hashTable, originalElementHash)) {
                    // No entry in the hashtable so this is a new unique element.
                    // Assign the element a new unique identifier and add it to the
                    // hash table
                    this.m_originalIds[i] = currentUniqueId++;
                    hashTable[originalElementHash] = this.m_originalIds[i];
                }
                else {
                    this.m_originalIds[i] = hashTable[originalElementHash];
                }
            }
            // Now match up modified elements
            for (i = 0; i < modifiedSequenceLength; i++) {
                var modifiedElementHash = this.ModifiedSequence.getElementHash(i);
                if (!hasOwnProperty.call(hashTable, modifiedElementHash)) {
                    this.m_modifiedIds[i] = currentUniqueId++;
                    hashTable[modifiedElementHash] = this.m_modifiedIds[i];
                }
                else {
                    this.m_modifiedIds[i] = hashTable[modifiedElementHash];
                }
            }
        };
        LcsDiff.prototype.ElementsAreEqual = function (originalIndex, newIndex) {
            return this.m_originalIds[originalIndex] === this.m_modifiedIds[newIndex];
        };
        LcsDiff.prototype.OriginalElementsAreEqual = function (index1, index2) {
            return this.m_originalIds[index1] === this.m_originalIds[index2];
        };
        LcsDiff.prototype.ModifiedElementsAreEqual = function (index1, index2) {
            return this.m_modifiedIds[index1] === this.m_modifiedIds[index2];
        };
        LcsDiff.prototype.ComputeDiff = function (pretty) {
            return this._ComputeDiff(0, this.OriginalSequence.getLength() - 1, 0, this.ModifiedSequence.getLength() - 1, pretty);
        };
        /**
         * Computes the differences between the original and modified input
         * sequences on the bounded range.
         * @returns An array of the differences between the two input sequences.
         */
        LcsDiff.prototype._ComputeDiff = function (originalStart, originalEnd, modifiedStart, modifiedEnd, pretty) {
            var quitEarlyArr = [false];
            var changes = this.ComputeDiffRecursive(originalStart, originalEnd, modifiedStart, modifiedEnd, quitEarlyArr);
            if (pretty) {
                // We have to clean up the computed diff to be more intuitive
                // but it turns out this cannot be done correctly until the entire set
                // of diffs have been computed
                return this.ShiftChanges(changes);
            }
            return changes;
        };
        /**
         * Private helper method which computes the differences on the bounded range
         * recursively.
         * @returns An array of the differences between the two input sequences.
         */
        LcsDiff.prototype.ComputeDiffRecursive = function (originalStart, originalEnd, modifiedStart, modifiedEnd, quitEarlyArr) {
            quitEarlyArr[0] = false;
            // Find the start of the differences
            while (originalStart <= originalEnd && modifiedStart <= modifiedEnd && this.ElementsAreEqual(originalStart, modifiedStart)) {
                originalStart++;
                modifiedStart++;
            }
            // Find the end of the differences
            while (originalEnd >= originalStart && modifiedEnd >= modifiedStart && this.ElementsAreEqual(originalEnd, modifiedEnd)) {
                originalEnd--;
                modifiedEnd--;
            }
            // In the special case where we either have all insertions or all deletions or the sequences are identical
            if (originalStart > originalEnd || modifiedStart > modifiedEnd) {
                var changes = void 0;
                if (modifiedStart <= modifiedEnd) {
                    Debug.Assert(originalStart === originalEnd + 1, 'originalStart should only be one more than originalEnd');
                    // All insertions
                    changes = [
                        new DiffChange(originalStart, 0, modifiedStart, modifiedEnd - modifiedStart + 1)
                    ];
                }
                else if (originalStart <= originalEnd) {
                    Debug.Assert(modifiedStart === modifiedEnd + 1, 'modifiedStart should only be one more than modifiedEnd');
                    // All deletions
                    changes = [
                        new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, 0)
                    ];
                }
                else {
                    Debug.Assert(originalStart === originalEnd + 1, 'originalStart should only be one more than originalEnd');
                    Debug.Assert(modifiedStart === modifiedEnd + 1, 'modifiedStart should only be one more than modifiedEnd');
                    // Identical sequences - No differences
                    changes = [];
                }
                return changes;
            }
            // This problem can be solved using the Divide-And-Conquer technique.
            var midOriginalArr = [0], midModifiedArr = [0];
            var result = this.ComputeRecursionPoint(originalStart, originalEnd, modifiedStart, modifiedEnd, midOriginalArr, midModifiedArr, quitEarlyArr);
            var midOriginal = midOriginalArr[0];
            var midModified = midModifiedArr[0];
            if (result !== null) {
                // Result is not-null when there was enough memory to compute the changes while
                // searching for the recursion point
                return result;
            }
            else if (!quitEarlyArr[0]) {
                // We can break the problem down recursively by finding the changes in the
                // First Half:   (originalStart, modifiedStart) to (midOriginal, midModified)
                // Second Half:  (midOriginal + 1, minModified + 1) to (originalEnd, modifiedEnd)
                // NOTE: ComputeDiff() is inclusive, therefore the second range starts on the next point
                var leftChanges = this.ComputeDiffRecursive(originalStart, midOriginal, modifiedStart, midModified, quitEarlyArr);
                var rightChanges = [];
                if (!quitEarlyArr[0]) {
                    rightChanges = this.ComputeDiffRecursive(midOriginal + 1, originalEnd, midModified + 1, modifiedEnd, quitEarlyArr);
                }
                else {
                    // We did't have time to finish the first half, so we don't have time to compute this half.
                    // Consider the entire rest of the sequence different.
                    rightChanges = [
                        new DiffChange(midOriginal + 1, originalEnd - (midOriginal + 1) + 1, midModified + 1, modifiedEnd - (midModified + 1) + 1)
                    ];
                }
                return this.ConcatenateChanges(leftChanges, rightChanges);
            }
            // If we hit here, we quit early, and so can't return anything meaningful
            return [
                new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, modifiedEnd - modifiedStart + 1)
            ];
        };
        LcsDiff.prototype.WALKTRACE = function (diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr) {
            var forwardChanges = null, reverseChanges = null;
            // First, walk backward through the forward diagonals history
            var changeHelper = new DiffChangeHelper();
            var diagonalMin = diagonalForwardStart;
            var diagonalMax = diagonalForwardEnd;
            var diagonalRelative = (midOriginalArr[0] - midModifiedArr[0]) - diagonalForwardOffset;
            var lastOriginalIndex = Number.MIN_VALUE;
            var historyIndex = this.m_forwardHistory.length - 1;
            var diagonal;
            do {
                // Get the diagonal index from the relative diagonal number
                diagonal = diagonalRelative + diagonalForwardBase;
                // Figure out where we came from
                if (diagonal === diagonalMin || (diagonal < diagonalMax && forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])) {
                    // Vertical line (the element is an insert)
                    originalIndex = forwardPoints[diagonal + 1];
                    modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
                    if (originalIndex < lastOriginalIndex) {
                        changeHelper.MarkNextChange();
                    }
                    lastOriginalIndex = originalIndex;
                    changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex);
                    diagonalRelative = (diagonal + 1) - diagonalForwardBase; //Setup for the next iteration
                }
                else {
                    // Horizontal line (the element is a deletion)
                    originalIndex = forwardPoints[diagonal - 1] + 1;
                    modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
                    if (originalIndex < lastOriginalIndex) {
                        changeHelper.MarkNextChange();
                    }
                    lastOriginalIndex = originalIndex - 1;
                    changeHelper.AddOriginalElement(originalIndex, modifiedIndex + 1);
                    diagonalRelative = (diagonal - 1) - diagonalForwardBase; //Setup for the next iteration
                }
                if (historyIndex >= 0) {
                    forwardPoints = this.m_forwardHistory[historyIndex];
                    diagonalForwardBase = forwardPoints[0]; //We stored this in the first spot
                    diagonalMin = 1;
                    diagonalMax = forwardPoints.length - 1;
                }
            } while (--historyIndex >= -1);
            // Ironically, we get the forward changes as the reverse of the
            // order we added them since we technically added them backwards
            forwardChanges = changeHelper.getReverseChanges();
            if (quitEarlyArr[0]) {
                // TODO: Calculate a partial from the reverse diagonals.
                //       For now, just assume everything after the midOriginal/midModified point is a diff
                var originalStartPoint = midOriginalArr[0] + 1;
                var modifiedStartPoint = midModifiedArr[0] + 1;
                if (forwardChanges !== null && forwardChanges.length > 0) {
                    var lastForwardChange = forwardChanges[forwardChanges.length - 1];
                    originalStartPoint = Math.max(originalStartPoint, lastForwardChange.getOriginalEnd());
                    modifiedStartPoint = Math.max(modifiedStartPoint, lastForwardChange.getModifiedEnd());
                }
                reverseChanges = [
                    new DiffChange(originalStartPoint, originalEnd - originalStartPoint + 1, modifiedStartPoint, modifiedEnd - modifiedStartPoint + 1)
                ];
            }
            else {
                // Now walk backward through the reverse diagonals history
                changeHelper = new DiffChangeHelper();
                diagonalMin = diagonalReverseStart;
                diagonalMax = diagonalReverseEnd;
                diagonalRelative = (midOriginalArr[0] - midModifiedArr[0]) - diagonalReverseOffset;
                lastOriginalIndex = Number.MAX_VALUE;
                historyIndex = (deltaIsEven) ? this.m_reverseHistory.length - 1 : this.m_reverseHistory.length - 2;
                do {
                    // Get the diagonal index from the relative diagonal number
                    diagonal = diagonalRelative + diagonalReverseBase;
                    // Figure out where we came from
                    if (diagonal === diagonalMin || (diagonal < diagonalMax && reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])) {
                        // Horizontal line (the element is a deletion))
                        originalIndex = reversePoints[diagonal + 1] - 1;
                        modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
                        if (originalIndex > lastOriginalIndex) {
                            changeHelper.MarkNextChange();
                        }
                        lastOriginalIndex = originalIndex + 1;
                        changeHelper.AddOriginalElement(originalIndex + 1, modifiedIndex + 1);
                        diagonalRelative = (diagonal + 1) - diagonalReverseBase; //Setup for the next iteration
                    }
                    else {
                        // Vertical line (the element is an insertion)
                        originalIndex = reversePoints[diagonal - 1];
                        modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
                        if (originalIndex > lastOriginalIndex) {
                            changeHelper.MarkNextChange();
                        }
                        lastOriginalIndex = originalIndex;
                        changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex + 1);
                        diagonalRelative = (diagonal - 1) - diagonalReverseBase; //Setup for the next iteration
                    }
                    if (historyIndex >= 0) {
                        reversePoints = this.m_reverseHistory[historyIndex];
                        diagonalReverseBase = reversePoints[0]; //We stored this in the first spot
                        diagonalMin = 1;
                        diagonalMax = reversePoints.length - 1;
                    }
                } while (--historyIndex >= -1);
                // There are cases where the reverse history will find diffs that
                // are correct, but not intuitive, so we need shift them.
                reverseChanges = changeHelper.getChanges();
            }
            return this.ConcatenateChanges(forwardChanges, reverseChanges);
        };
        /**
         * Given the range to compute the diff on, this method finds the point:
         * (midOriginal, midModified)
         * that exists in the middle of the LCS of the two sequences and
         * is the point at which the LCS problem may be broken down recursively.
         * This method will try to keep the LCS trace in memory. If the LCS recursion
         * point is calculated and the full trace is available in memory, then this method
         * will return the change list.
         * @param originalStart The start bound of the original sequence range
         * @param originalEnd The end bound of the original sequence range
         * @param modifiedStart The start bound of the modified sequence range
         * @param modifiedEnd The end bound of the modified sequence range
         * @param midOriginal The middle point of the original sequence range
         * @param midModified The middle point of the modified sequence range
         * @returns The diff changes, if available, otherwise null
         */
        LcsDiff.prototype.ComputeRecursionPoint = function (originalStart, originalEnd, modifiedStart, modifiedEnd, midOriginalArr, midModifiedArr, quitEarlyArr) {
            var originalIndex, modifiedIndex;
            var diagonalForwardStart = 0, diagonalForwardEnd = 0;
            var diagonalReverseStart = 0, diagonalReverseEnd = 0;
            var numDifferences;
            // To traverse the edit graph and produce the proper LCS, our actual
            // start position is just outside the given boundary
            originalStart--;
            modifiedStart--;
            // We set these up to make the compiler happy, but they will
            // be replaced before we return with the actual recursion point
            midOriginalArr[0] = 0;
            midModifiedArr[0] = 0;
            // Clear out the history
            this.m_forwardHistory = [];
            this.m_reverseHistory = [];
            // Each cell in the two arrays corresponds to a diagonal in the edit graph.
            // The integer value in the cell represents the originalIndex of the furthest
            // reaching point found so far that ends in that diagonal.
            // The modifiedIndex can be computed mathematically from the originalIndex and the diagonal number.
            var maxDifferences = (originalEnd - originalStart) + (modifiedEnd - modifiedStart);
            var numDiagonals = maxDifferences + 1;
            var forwardPoints = new Array(numDiagonals);
            var reversePoints = new Array(numDiagonals);
            // diagonalForwardBase: Index into forwardPoints of the diagonal which passes through (originalStart, modifiedStart)
            // diagonalReverseBase: Index into reversePoints of the diagonal which passes through (originalEnd, modifiedEnd)
            var diagonalForwardBase = (modifiedEnd - modifiedStart);
            var diagonalReverseBase = (originalEnd - originalStart);
            // diagonalForwardOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
            //    diagonal number (relative to diagonalForwardBase)
            // diagonalReverseOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
            //    diagonal number (relative to diagonalReverseBase)
            var diagonalForwardOffset = (originalStart - modifiedStart);
            var diagonalReverseOffset = (originalEnd - modifiedEnd);
            // delta: The difference between the end diagonal and the start diagonal. This is used to relate diagonal numbers
            //   relative to the start diagonal with diagonal numbers relative to the end diagonal.
            // The Even/Oddn-ness of this delta is important for determining when we should check for overlap
            var delta = diagonalReverseBase - diagonalForwardBase;
            var deltaIsEven = (delta % 2 === 0);
            // Here we set up the start and end points as the furthest points found so far
            // in both the forward and reverse directions, respectively
            forwardPoints[diagonalForwardBase] = originalStart;
            reversePoints[diagonalReverseBase] = originalEnd;
            // Remember if we quit early, and thus need to do a best-effort result instead of a real result.
            quitEarlyArr[0] = false;
            // A couple of points:
            // --With this method, we iterate on the number of differences between the two sequences.
            //   The more differences there actually are, the longer this will take.
            // --Also, as the number of differences increases, we have to search on diagonals further
            //   away from the reference diagonal (which is diagonalForwardBase for forward, diagonalReverseBase for reverse).
            // --We extend on even diagonals (relative to the reference diagonal) only when numDifferences
            //   is even and odd diagonals only when numDifferences is odd.
            var diagonal, tempOriginalIndex;
            for (numDifferences = 1; numDifferences <= (maxDifferences / 2) + 1; numDifferences++) {
                var furthestOriginalIndex = 0;
                var furthestModifiedIndex = 0;
                // Run the algorithm in the forward direction
                diagonalForwardStart = this.ClipDiagonalBound(diagonalForwardBase - numDifferences, numDifferences, diagonalForwardBase, numDiagonals);
                diagonalForwardEnd = this.ClipDiagonalBound(diagonalForwardBase + numDifferences, numDifferences, diagonalForwardBase, numDiagonals);
                for (diagonal = diagonalForwardStart; diagonal <= diagonalForwardEnd; diagonal += 2) {
                    // STEP 1: We extend the furthest reaching point in the present diagonal
                    // by looking at the diagonals above and below and picking the one whose point
                    // is further away from the start point (originalStart, modifiedStart)
                    if (diagonal === diagonalForwardStart || (diagonal < diagonalForwardEnd && forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])) {
                        originalIndex = forwardPoints[diagonal + 1];
                    }
                    else {
                        originalIndex = forwardPoints[diagonal - 1] + 1;
                    }
                    modifiedIndex = originalIndex - (diagonal - diagonalForwardBase) - diagonalForwardOffset;
                    // Save the current originalIndex so we can test for false overlap in step 3
                    tempOriginalIndex = originalIndex;
                    // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
                    // so long as the elements are equal.
                    while (originalIndex < originalEnd && modifiedIndex < modifiedEnd && this.ElementsAreEqual(originalIndex + 1, modifiedIndex + 1)) {
                        originalIndex++;
                        modifiedIndex++;
                    }
                    forwardPoints[diagonal] = originalIndex;
                    if (originalIndex + modifiedIndex > furthestOriginalIndex + furthestModifiedIndex) {
                        furthestOriginalIndex = originalIndex;
                        furthestModifiedIndex = modifiedIndex;
                    }
                    // STEP 3: If delta is odd (overlap first happens on forward when delta is odd)
                    // and diagonal is in the range of reverse diagonals computed for numDifferences-1
                    // (the previous iteration; we haven't computed reverse diagonals for numDifferences yet)
                    // then check for overlap.
                    if (!deltaIsEven && Math.abs(diagonal - diagonalReverseBase) <= (numDifferences - 1)) {
                        if (originalIndex >= reversePoints[diagonal]) {
                            midOriginalArr[0] = originalIndex;
                            midModifiedArr[0] = modifiedIndex;
                            if (tempOriginalIndex <= reversePoints[diagonal] && MaxDifferencesHistory > 0 && numDifferences <= (MaxDifferencesHistory + 1)) {
                                // BINGO! We overlapped, and we have the full trace in memory!
                                return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                            }
                            else {
                                // Either false overlap, or we didn't have enough memory for the full trace
                                // Just return the recursion point
                                return null;
                            }
                        }
                    }
                }
                // Check to see if we should be quitting early, before moving on to the next iteration.
                var matchLengthOfLongest = ((furthestOriginalIndex - originalStart) + (furthestModifiedIndex - modifiedStart) - numDifferences) / 2;
                if (this.ContinueProcessingPredicate !== null && !this.ContinueProcessingPredicate(furthestOriginalIndex, this.OriginalSequence, matchLengthOfLongest)) {
                    // We can't finish, so skip ahead to generating a result from what we have.
                    quitEarlyArr[0] = true;
                    // Use the furthest distance we got in the forward direction.
                    midOriginalArr[0] = furthestOriginalIndex;
                    midModifiedArr[0] = furthestModifiedIndex;
                    if (matchLengthOfLongest > 0 && MaxDifferencesHistory > 0 && numDifferences <= (MaxDifferencesHistory + 1)) {
                        // Enough of the history is in memory to walk it backwards
                        return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                    }
                    else {
                        // We didn't actually remember enough of the history.
                        //Since we are quiting the diff early, we need to shift back the originalStart and modified start
                        //back into the boundary limits since we decremented their value above beyond the boundary limit.
                        originalStart++;
                        modifiedStart++;
                        return [
                            new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, modifiedEnd - modifiedStart + 1)
                        ];
                    }
                }
                // Run the algorithm in the reverse direction
                diagonalReverseStart = this.ClipDiagonalBound(diagonalReverseBase - numDifferences, numDifferences, diagonalReverseBase, numDiagonals);
                diagonalReverseEnd = this.ClipDiagonalBound(diagonalReverseBase + numDifferences, numDifferences, diagonalReverseBase, numDiagonals);
                for (diagonal = diagonalReverseStart; diagonal <= diagonalReverseEnd; diagonal += 2) {
                    // STEP 1: We extend the furthest reaching point in the present diagonal
                    // by looking at the diagonals above and below and picking the one whose point
                    // is further away from the start point (originalEnd, modifiedEnd)
                    if (diagonal === diagonalReverseStart || (diagonal < diagonalReverseEnd && reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])) {
                        originalIndex = reversePoints[diagonal + 1] - 1;
                    }
                    else {
                        originalIndex = reversePoints[diagonal - 1];
                    }
                    modifiedIndex = originalIndex - (diagonal - diagonalReverseBase) - diagonalReverseOffset;
                    // Save the current originalIndex so we can test for false overlap
                    tempOriginalIndex = originalIndex;
                    // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
                    // as long as the elements are equal.
                    while (originalIndex > originalStart && modifiedIndex > modifiedStart && this.ElementsAreEqual(originalIndex, modifiedIndex)) {
                        originalIndex--;
                        modifiedIndex--;
                    }
                    reversePoints[diagonal] = originalIndex;
                    // STEP 4: If delta is even (overlap first happens on reverse when delta is even)
                    // and diagonal is in the range of forward diagonals computed for numDifferences
                    // then check for overlap.
                    if (deltaIsEven && Math.abs(diagonal - diagonalForwardBase) <= numDifferences) {
                        if (originalIndex <= forwardPoints[diagonal]) {
                            midOriginalArr[0] = originalIndex;
                            midModifiedArr[0] = modifiedIndex;
                            if (tempOriginalIndex >= forwardPoints[diagonal] && MaxDifferencesHistory > 0 && numDifferences <= (MaxDifferencesHistory + 1)) {
                                // BINGO! We overlapped, and we have the full trace in memory!
                                return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                            }
                            else {
                                // Either false overlap, or we didn't have enough memory for the full trace
                                // Just return the recursion point
                                return null;
                            }
                        }
                    }
                }
                // Save current vectors to history before the next iteration
                if (numDifferences <= MaxDifferencesHistory) {
                    // We are allocating space for one extra int, which we fill with
                    // the index of the diagonal base index
                    var temp = new Array(diagonalForwardEnd - diagonalForwardStart + 2);
                    temp[0] = diagonalForwardBase - diagonalForwardStart + 1;
                    MyArray.Copy(forwardPoints, diagonalForwardStart, temp, 1, diagonalForwardEnd - diagonalForwardStart + 1);
                    this.m_forwardHistory.push(temp);
                    temp = new Array(diagonalReverseEnd - diagonalReverseStart + 2);
                    temp[0] = diagonalReverseBase - diagonalReverseStart + 1;
                    MyArray.Copy(reversePoints, diagonalReverseStart, temp, 1, diagonalReverseEnd - diagonalReverseStart + 1);
                    this.m_reverseHistory.push(temp);
                }
            }
            // If we got here, then we have the full trace in history. We just have to convert it to a change list
            // NOTE: This part is a bit messy
            return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
        };
        /**
         * Shifts the given changes to provide a more intuitive diff.
         * While the first element in a diff matches the first element after the diff,
         * we shift the diff down.
         *
         * @param changes The list of changes to shift
         * @returns The shifted changes
         */
        LcsDiff.prototype.ShiftChanges = function (changes) {
            var mergedDiffs;
            do {
                mergedDiffs = false;
                // Shift all the changes down first
                for (var i = 0; i < changes.length; i++) {
                    var change = changes[i];
                    var originalStop = (i < changes.length - 1) ? changes[i + 1].originalStart : this.OriginalSequence.getLength();
                    var modifiedStop = (i < changes.length - 1) ? changes[i + 1].modifiedStart : this.ModifiedSequence.getLength();
                    var checkOriginal = change.originalLength > 0;
                    var checkModified = change.modifiedLength > 0;
                    while (change.originalStart + change.originalLength < originalStop &&
                        change.modifiedStart + change.modifiedLength < modifiedStop &&
                        (!checkOriginal || this.OriginalElementsAreEqual(change.originalStart, change.originalStart + change.originalLength)) &&
                        (!checkModified || this.ModifiedElementsAreEqual(change.modifiedStart, change.modifiedStart + change.modifiedLength))) {
                        change.originalStart++;
                        change.modifiedStart++;
                    }
                }
                // Build up the new list (we have to build a new list because we
                // might have changes we can merge together now)
                var result = new Array();
                var mergedChangeArr = [null];
                for (var i = 0; i < changes.length; i++) {
                    if (i < changes.length - 1 && this.ChangesOverlap(changes[i], changes[i + 1], mergedChangeArr)) {
                        mergedDiffs = true;
                        result.push(mergedChangeArr[0]);
                        i++;
                    }
                    else {
                        result.push(changes[i]);
                    }
                }
                changes = result;
            } while (mergedDiffs);
            // Shift changes back up until we hit empty or whitespace-only lines
            for (var i = changes.length - 1; i >= 0; i--) {
                var change = changes[i];
                var originalStop = 0;
                var modifiedStop = 0;
                if (i > 0) {
                    var prevChange = changes[i - 1];
                    if (prevChange.originalLength > 0) {
                        originalStop = prevChange.originalStart + prevChange.originalLength;
                    }
                    if (prevChange.modifiedLength > 0) {
                        modifiedStop = prevChange.modifiedStart + prevChange.modifiedLength;
                    }
                }
                var checkOriginal = change.originalLength > 0;
                var checkModified = change.modifiedLength > 0;
                var bestDelta = 0;
                var bestScore = this._boundaryScore(change.originalStart, change.originalLength, change.modifiedStart, change.modifiedLength);
                for (var delta = 1;; delta++) {
                    var originalStart = change.originalStart - delta;
                    var modifiedStart = change.modifiedStart - delta;
                    if (originalStart < originalStop || modifiedStart < modifiedStop) {
                        break;
                    }
                    if (checkOriginal && !this.OriginalElementsAreEqual(originalStart, originalStart + change.originalLength)) {
                        break;
                    }
                    if (checkModified && !this.ModifiedElementsAreEqual(modifiedStart, modifiedStart + change.modifiedLength)) {
                        break;
                    }
                    var score = this._boundaryScore(originalStart, change.originalLength, modifiedStart, change.modifiedLength);
                    if (score > bestScore) {
                        bestScore = score;
                        bestDelta = delta;
                    }
                }
                change.originalStart -= bestDelta;
                change.modifiedStart -= bestDelta;
            }
            return changes;
        };
        LcsDiff.prototype._OriginalIsBoundary = function (index) {
            if (index <= 0 || index >= this.OriginalSequence.getLength() - 1) {
                return true;
            }
            return /^\s*$/.test(this.OriginalSequence.getElementHash(index));
        };
        LcsDiff.prototype._OriginalRegionIsBoundary = function (originalStart, originalLength) {
            if (this._OriginalIsBoundary(originalStart) || this._OriginalIsBoundary(originalStart - 1)) {
                return true;
            }
            if (originalLength > 0) {
                var originalEnd = originalStart + originalLength;
                if (this._OriginalIsBoundary(originalEnd - 1) || this._OriginalIsBoundary(originalEnd)) {
                    return true;
                }
            }
            return false;
        };
        LcsDiff.prototype._ModifiedIsBoundary = function (index) {
            if (index <= 0 || index >= this.ModifiedSequence.getLength() - 1) {
                return true;
            }
            return /^\s*$/.test(this.ModifiedSequence.getElementHash(index));
        };
        LcsDiff.prototype._ModifiedRegionIsBoundary = function (modifiedStart, modifiedLength) {
            if (this._ModifiedIsBoundary(modifiedStart) || this._ModifiedIsBoundary(modifiedStart - 1)) {
                return true;
            }
            if (modifiedLength > 0) {
                var modifiedEnd = modifiedStart + modifiedLength;
                if (this._ModifiedIsBoundary(modifiedEnd - 1) || this._ModifiedIsBoundary(modifiedEnd)) {
                    return true;
                }
            }
            return false;
        };
        LcsDiff.prototype._boundaryScore = function (originalStart, originalLength, modifiedStart, modifiedLength) {
            var originalScore = (this._OriginalRegionIsBoundary(originalStart, originalLength) ? 1 : 0);
            var modifiedScore = (this._ModifiedRegionIsBoundary(modifiedStart, modifiedLength) ? 1 : 0);
            return (originalScore + modifiedScore);
        };
        /**
         * Concatenates the two input DiffChange lists and returns the resulting
         * list.
         * @param The left changes
         * @param The right changes
         * @returns The concatenated list
         */
        LcsDiff.prototype.ConcatenateChanges = function (left, right) {
            var mergedChangeArr = [];
            var result = null;
            if (left.length === 0 || right.length === 0) {
                return (right.length > 0) ? right : left;
            }
            else if (this.ChangesOverlap(left[left.length - 1], right[0], mergedChangeArr)) {
                // Since we break the problem down recursively, it is possible that we
                // might recurse in the middle of a change thereby splitting it into
                // two changes. Here in the combining stage, we detect and fuse those
                // changes back together
                result = new Array(left.length + right.length - 1);
                MyArray.Copy(left, 0, result, 0, left.length - 1);
                result[left.length - 1] = mergedChangeArr[0];
                MyArray.Copy(right, 1, result, left.length, right.length - 1);
                return result;
            }
            else {
                result = new Array(left.length + right.length);
                MyArray.Copy(left, 0, result, 0, left.length);
                MyArray.Copy(right, 0, result, left.length, right.length);
                return result;
            }
        };
        /**
         * Returns true if the two changes overlap and can be merged into a single
         * change
         * @param left The left change
         * @param right The right change
         * @param mergedChange The merged change if the two overlap, null otherwise
         * @returns True if the two changes overlap
         */
        LcsDiff.prototype.ChangesOverlap = function (left, right, mergedChangeArr) {
            Debug.Assert(left.originalStart <= right.originalStart, 'Left change is not less than or equal to right change');
            Debug.Assert(left.modifiedStart <= right.modifiedStart, 'Left change is not less than or equal to right change');
            if (left.originalStart + left.originalLength >= right.originalStart || left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
                var originalStart = left.originalStart;
                var originalLength = left.originalLength;
                var modifiedStart = left.modifiedStart;
                var modifiedLength = left.modifiedLength;
                if (left.originalStart + left.originalLength >= right.originalStart) {
                    originalLength = right.originalStart + right.originalLength - left.originalStart;
                }
                if (left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
                    modifiedLength = right.modifiedStart + right.modifiedLength - left.modifiedStart;
                }
                mergedChangeArr[0] = new DiffChange(originalStart, originalLength, modifiedStart, modifiedLength);
                return true;
            }
            else {
                mergedChangeArr[0] = null;
                return false;
            }
        };
        /**
         * Helper method used to clip a diagonal index to the range of valid
         * diagonals. This also decides whether or not the diagonal index,
         * if it exceeds the boundary, should be clipped to the boundary or clipped
         * one inside the boundary depending on the Even/Odd status of the boundary
         * and numDifferences.
         * @param diagonal The index of the diagonal to clip.
         * @param numDifferences The current number of differences being iterated upon.
         * @param diagonalBaseIndex The base reference diagonal.
         * @param numDiagonals The total number of diagonals.
         * @returns The clipped diagonal index.
         */
        LcsDiff.prototype.ClipDiagonalBound = function (diagonal, numDifferences, diagonalBaseIndex, numDiagonals) {
            if (diagonal >= 0 && diagonal < numDiagonals) {
                // Nothing to clip, its in range
                return diagonal;
            }
            // diagonalsBelow: The number of diagonals below the reference diagonal
            // diagonalsAbove: The number of diagonals above the reference diagonal
            var diagonalsBelow = diagonalBaseIndex;
            var diagonalsAbove = numDiagonals - diagonalBaseIndex - 1;
            var diffEven = (numDifferences % 2 === 0);
            if (diagonal < 0) {
                var lowerBoundEven = (diagonalsBelow % 2 === 0);
                return (diffEven === lowerBoundEven) ? 0 : 1;
            }
            else {
                var upperBoundEven = (diagonalsAbove % 2 === 0);
                return (diffEven === upperBoundEven) ? numDiagonals - 1 : numDiagonals - 2;
            }
        };
        return LcsDiff;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends$1 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    function values(forEachable) {
        var result = [];
        forEachable.forEach(function (value) { return result.push(value); });
        return result;
    }
    function keys(map) {
        var result = [];
        map.forEach(function (value, key) { return result.push(key); });
        return result;
    }
    var ResourceMap = /** @class */ (function () {
        function ResourceMap() {
            this.map = new Map();
            this.ignoreCase = false; // in the future this should be an uri-comparator
        }
        ResourceMap.prototype.set = function (resource, value) {
            this.map.set(this.toKey(resource), value);
        };
        ResourceMap.prototype.get = function (resource) {
            return this.map.get(this.toKey(resource));
        };
        ResourceMap.prototype.has = function (resource) {
            return this.map.has(this.toKey(resource));
        };
        Object.defineProperty(ResourceMap.prototype, "size", {
            get: function () {
                return this.map.size;
            },
            enumerable: true,
            configurable: true
        });
        ResourceMap.prototype.clear = function () {
            this.map.clear();
        };
        ResourceMap.prototype.delete = function (resource) {
            return this.map.delete(this.toKey(resource));
        };
        ResourceMap.prototype.forEach = function (clb) {
            this.map.forEach(clb);
        };
        ResourceMap.prototype.values = function () {
            return values(this.map);
        };
        ResourceMap.prototype.toKey = function (resource) {
            var key = resource.toString();
            if (this.ignoreCase) {
                key = key.toLowerCase();
            }
            return key;
        };
        ResourceMap.prototype.keys = function () {
            return keys(this.map).map(URI.parse);
        };
        return ResourceMap;
    }());
    var Touch;
    (function (Touch) {
        Touch[Touch["None"] = 0] = "None";
        Touch[Touch["AsOld"] = 1] = "AsOld";
        Touch[Touch["AsNew"] = 2] = "AsNew";
    })(Touch || (Touch = {}));
    var LinkedMap = /** @class */ (function () {
        function LinkedMap() {
            this._map = new Map();
            this._head = undefined;
            this._tail = undefined;
            this._size = 0;
        }
        LinkedMap.prototype.clear = function () {
            this._map.clear();
            this._head = undefined;
            this._tail = undefined;
            this._size = 0;
        };
        LinkedMap.prototype.isEmpty = function () {
            return !this._head && !this._tail;
        };
        Object.defineProperty(LinkedMap.prototype, "size", {
            get: function () {
                return this._size;
            },
            enumerable: true,
            configurable: true
        });
        LinkedMap.prototype.has = function (key) {
            return this._map.has(key);
        };
        LinkedMap.prototype.get = function (key, touch) {
            if (touch === void 0) { touch = Touch.None; }
            var item = this._map.get(key);
            if (!item) {
                return undefined;
            }
            if (touch !== Touch.None) {
                this.touch(item, touch);
            }
            return item.value;
        };
        LinkedMap.prototype.set = function (key, value, touch) {
            if (touch === void 0) { touch = Touch.None; }
            var item = this._map.get(key);
            if (item) {
                item.value = value;
                if (touch !== Touch.None) {
                    this.touch(item, touch);
                }
            }
            else {
                item = { key: key, value: value, next: undefined, previous: undefined };
                switch (touch) {
                    case Touch.None:
                        this.addItemLast(item);
                        break;
                    case Touch.AsOld:
                        this.addItemFirst(item);
                        break;
                    case Touch.AsNew:
                        this.addItemLast(item);
                        break;
                    default:
                        this.addItemLast(item);
                        break;
                }
                this._map.set(key, item);
                this._size++;
            }
        };
        LinkedMap.prototype.delete = function (key) {
            return !!this.remove(key);
        };
        LinkedMap.prototype.remove = function (key) {
            var item = this._map.get(key);
            if (!item) {
                return undefined;
            }
            this._map.delete(key);
            this.removeItem(item);
            this._size--;
            return item.value;
        };
        LinkedMap.prototype.shift = function () {
            if (!this._head && !this._tail) {
                return undefined;
            }
            if (!this._head || !this._tail) {
                throw new Error('Invalid list');
            }
            var item = this._head;
            this._map.delete(item.key);
            this.removeItem(item);
            this._size--;
            return item.value;
        };
        LinkedMap.prototype.forEach = function (callbackfn, thisArg) {
            var current = this._head;
            while (current) {
                if (thisArg) {
                    callbackfn.bind(thisArg)(current.value, current.key, this);
                }
                else {
                    callbackfn(current.value, current.key, this);
                }
                current = current.next;
            }
        };
        LinkedMap.prototype.values = function () {
            var result = [];
            var current = this._head;
            while (current) {
                result.push(current.value);
                current = current.next;
            }
            return result;
        };
        LinkedMap.prototype.keys = function () {
            var result = [];
            var current = this._head;
            while (current) {
                result.push(current.key);
                current = current.next;
            }
            return result;
        };
        /* VS Code / Monaco editor runs on es5 which has no Symbol.iterator
        public keys(): IterableIterator<K> {
            let current = this._head;
            let iterator: IterableIterator<K> = {
                [Symbol.iterator]() {
                    return iterator;
                },
                next():IteratorResult<K> {
                    if (current) {
                        let result = { value: current.key, done: false };
                        current = current.next;
                        return result;
                    } else {
                        return { value: undefined, done: true };
                    }
                }
            };
            return iterator;
        }

        public values(): IterableIterator<V> {
            let current = this._head;
            let iterator: IterableIterator<V> = {
                [Symbol.iterator]() {
                    return iterator;
                },
                next():IteratorResult<V> {
                    if (current) {
                        let result = { value: current.value, done: false };
                        current = current.next;
                        return result;
                    } else {
                        return { value: undefined, done: true };
                    }
                }
            };
            return iterator;
        }
        */
        LinkedMap.prototype.trimOld = function (newSize) {
            if (newSize >= this.size) {
                return;
            }
            if (newSize === 0) {
                this.clear();
                return;
            }
            var current = this._head;
            var currentSize = this.size;
            while (current && currentSize > newSize) {
                this._map.delete(current.key);
                current = current.next;
                currentSize--;
            }
            this._head = current;
            this._size = currentSize;
            current.previous = void 0;
        };
        LinkedMap.prototype.addItemFirst = function (item) {
            // First time Insert
            if (!this._head && !this._tail) {
                this._tail = item;
            }
            else if (!this._head) {
                throw new Error('Invalid list');
            }
            else {
                item.next = this._head;
                this._head.previous = item;
            }
            this._head = item;
        };
        LinkedMap.prototype.addItemLast = function (item) {
            // First time Insert
            if (!this._head && !this._tail) {
                this._head = item;
            }
            else if (!this._tail) {
                throw new Error('Invalid list');
            }
            else {
                item.previous = this._tail;
                this._tail.next = item;
            }
            this._tail = item;
        };
        LinkedMap.prototype.removeItem = function (item) {
            if (item === this._head && item === this._tail) {
                this._head = void 0;
                this._tail = void 0;
            }
            else if (item === this._head) {
                this._head = item.next;
            }
            else if (item === this._tail) {
                this._tail = item.previous;
            }
            else {
                var next = item.next;
                var previous = item.previous;
                if (!next || !previous) {
                    throw new Error('Invalid list');
                }
                next.previous = previous;
                previous.next = next;
            }
        };
        LinkedMap.prototype.touch = function (item, touch) {
            if (!this._head || !this._tail) {
                throw new Error('Invalid list');
            }
            if ((touch !== Touch.AsOld && touch !== Touch.AsNew)) {
                return;
            }
            if (touch === Touch.AsOld) {
                if (item === this._head) {
                    return;
                }
                var next = item.next;
                var previous = item.previous;
                // Unlink the item
                if (item === this._tail) {
                    // previous must be defined since item was not head but is tail
                    // So there are more than on item in the map
                    previous.next = void 0;
                    this._tail = previous;
                }
                else {
                    // Both next and previous are not undefined since item was neither head nor tail.
                    next.previous = previous;
                    previous.next = next;
                }
                // Insert the node at head
                item.previous = void 0;
                item.next = this._head;
                this._head.previous = item;
                this._head = item;
            }
            else if (touch === Touch.AsNew) {
                if (item === this._tail) {
                    return;
                }
                var next = item.next;
                var previous = item.previous;
                // Unlink the item.
                if (item === this._head) {
                    // next must be defined since item was not tail but is head
                    // So there are more than on item in the map
                    next.previous = void 0;
                    this._head = next;
                }
                else {
                    // Both next and previous are not undefined since item was neither head nor tail.
                    next.previous = previous;
                    previous.next = next;
                }
                item.next = void 0;
                item.previous = this._tail;
                this._tail.next = item;
                this._tail = item;
            }
        };
        LinkedMap.prototype.toJSON = function () {
            var data = [];
            this.forEach(function (value, key) {
                data.push([key, value]);
            });
            return data;
        };
        LinkedMap.prototype.fromJSON = function (data) {
            this.clear();
            for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                var _a = data_1[_i], key = _a[0], value = _a[1];
                this.set(key, value);
            }
        };
        return LinkedMap;
    }());
    var LRUCache = /** @class */ (function (_super) {
        __extends$1(LRUCache, _super);
        function LRUCache(limit, ratio) {
            if (ratio === void 0) { ratio = 1; }
            var _this = _super.call(this) || this;
            _this._limit = limit;
            _this._ratio = Math.min(Math.max(0, ratio), 1);
            return _this;
        }
        Object.defineProperty(LRUCache.prototype, "limit", {
            get: function () {
                return this._limit;
            },
            set: function (limit) {
                this._limit = limit;
                this.checkTrim();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LRUCache.prototype, "ratio", {
            get: function () {
                return this._ratio;
            },
            set: function (ratio) {
                this._ratio = Math.min(Math.max(0, ratio), 1);
                this.checkTrim();
            },
            enumerable: true,
            configurable: true
        });
        LRUCache.prototype.get = function (key) {
            return _super.prototype.get.call(this, key, Touch.AsNew);
        };
        LRUCache.prototype.peek = function (key) {
            return _super.prototype.get.call(this, key, Touch.None);
        };
        LRUCache.prototype.set = function (key, value) {
            _super.prototype.set.call(this, key, value, Touch.AsNew);
            this.checkTrim();
        };
        LRUCache.prototype.checkTrim = function () {
            if (this.size > this._limit) {
                this.trimOld(Math.round(this._limit * this._ratio));
            }
        };
        return LRUCache;
    }(LinkedMap));

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var nfcCache = new LRUCache(10000); // bounded to 10000 elements
    var nfdCache = new LRUCache(10000); // bounded to 10000 elements
    /**
     * Returns first index of the string that is not whitespace.
     * If string is empty or contains only whitespaces, returns -1
     */
    function firstNonWhitespaceIndex(str) {
        for (var i = 0, len = str.length; i < len; i++) {
            var chCode = str.charCodeAt(i);
            if (chCode !== 32 /* Space */ && chCode !== 9 /* Tab */) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Returns last index of the string that is not whitespace.
     * If string is empty or contains only whitespaces, returns -1
     */
    function lastNonWhitespaceIndex(str, startIndex) {
        if (startIndex === void 0) { startIndex = str.length - 1; }
        for (var i = startIndex; i >= 0; i--) {
            var chCode = str.charCodeAt(i);
            if (chCode !== 32 /* Space */ && chCode !== 9 /* Tab */) {
                return i;
            }
        }
        return -1;
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends$2 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var MAXIMUM_RUN_TIME = 5000; // 5 seconds
    var MINIMUM_MATCHING_CHARACTER_LENGTH = 3;
    function computeDiff(originalSequence, modifiedSequence, continueProcessingPredicate, pretty) {
        var diffAlgo = new LcsDiff(originalSequence, modifiedSequence, continueProcessingPredicate);
        return diffAlgo.ComputeDiff(pretty);
    }
    var MarkerSequence = /** @class */ (function () {
        function MarkerSequence(buffer, startMarkers, endMarkers) {
            this.buffer = buffer;
            this.startMarkers = startMarkers;
            this.endMarkers = endMarkers;
        }
        MarkerSequence.prototype.getLength = function () {
            return this.startMarkers.length;
        };
        MarkerSequence.prototype.getElementHash = function (i) {
            return this.buffer.substring(this.startMarkers[i].offset, this.endMarkers[i].offset);
        };
        MarkerSequence.prototype.getStartLineNumber = function (i) {
            if (i === this.startMarkers.length) {
                // This is the special case where a change happened after the last marker
                return this.startMarkers[i - 1].lineNumber + 1;
            }
            return this.startMarkers[i].lineNumber;
        };
        MarkerSequence.prototype.getStartColumn = function (i) {
            return this.startMarkers[i].column;
        };
        MarkerSequence.prototype.getEndLineNumber = function (i) {
            return this.endMarkers[i].lineNumber;
        };
        MarkerSequence.prototype.getEndColumn = function (i) {
            return this.endMarkers[i].column;
        };
        return MarkerSequence;
    }());
    var LineMarkerSequence = /** @class */ (function (_super) {
        __extends$2(LineMarkerSequence, _super);
        function LineMarkerSequence(lines) {
            var _this = this;
            var buffer = '';
            var startMarkers = [];
            var endMarkers = [];
            for (var pos = 0, i = 0, length_1 = lines.length; i < length_1; i++) {
                buffer += lines[i];
                var startColumn = LineMarkerSequence._getFirstNonBlankColumn(lines[i], 1);
                var endColumn = LineMarkerSequence._getLastNonBlankColumn(lines[i], 1);
                startMarkers.push({
                    offset: pos + startColumn - 1,
                    lineNumber: i + 1,
                    column: startColumn
                });
                endMarkers.push({
                    offset: pos + endColumn - 1,
                    lineNumber: i + 1,
                    column: endColumn
                });
                pos += lines[i].length;
            }
            _this = _super.call(this, buffer, startMarkers, endMarkers) || this;
            return _this;
        }
        LineMarkerSequence._getFirstNonBlankColumn = function (txt, defaultValue) {
            var r = firstNonWhitespaceIndex(txt);
            if (r === -1) {
                return defaultValue;
            }
            return r + 1;
        };
        LineMarkerSequence._getLastNonBlankColumn = function (txt, defaultValue) {
            var r = lastNonWhitespaceIndex(txt);
            if (r === -1) {
                return defaultValue;
            }
            return r + 2;
        };
        LineMarkerSequence.prototype.getCharSequence = function (startIndex, endIndex) {
            var startMarkers = [];
            var endMarkers = [];
            for (var index = startIndex; index <= endIndex; index++) {
                var startMarker = this.startMarkers[index];
                var endMarker = this.endMarkers[index];
                for (var i = startMarker.offset; i < endMarker.offset; i++) {
                    startMarkers.push({
                        offset: i,
                        lineNumber: startMarker.lineNumber,
                        column: startMarker.column + (i - startMarker.offset)
                    });
                    endMarkers.push({
                        offset: i + 1,
                        lineNumber: startMarker.lineNumber,
                        column: startMarker.column + (i - startMarker.offset) + 1
                    });
                }
            }
            return new MarkerSequence(this.buffer, startMarkers, endMarkers);
        };
        return LineMarkerSequence;
    }(MarkerSequence));
    var CharChange = /** @class */ (function () {
        function CharChange(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn) {
            this.originalStartLineNumber = originalStartLineNumber;
            this.originalStartColumn = originalStartColumn;
            this.originalEndLineNumber = originalEndLineNumber;
            this.originalEndColumn = originalEndColumn;
            this.modifiedStartLineNumber = modifiedStartLineNumber;
            this.modifiedStartColumn = modifiedStartColumn;
            this.modifiedEndLineNumber = modifiedEndLineNumber;
            this.modifiedEndColumn = modifiedEndColumn;
        }
        CharChange.createFromDiffChange = function (diffChange, originalCharSequence, modifiedCharSequence) {
            var originalStartLineNumber;
            var originalStartColumn;
            var originalEndLineNumber;
            var originalEndColumn;
            var modifiedStartLineNumber;
            var modifiedStartColumn;
            var modifiedEndLineNumber;
            var modifiedEndColumn;
            if (diffChange.originalLength === 0) {
                originalStartLineNumber = 0;
                originalStartColumn = 0;
                originalEndLineNumber = 0;
                originalEndColumn = 0;
            }
            else {
                originalStartLineNumber = originalCharSequence.getStartLineNumber(diffChange.originalStart);
                originalStartColumn = originalCharSequence.getStartColumn(diffChange.originalStart);
                originalEndLineNumber = originalCharSequence.getEndLineNumber(diffChange.originalStart + diffChange.originalLength - 1);
                originalEndColumn = originalCharSequence.getEndColumn(diffChange.originalStart + diffChange.originalLength - 1);
            }
            if (diffChange.modifiedLength === 0) {
                modifiedStartLineNumber = 0;
                modifiedStartColumn = 0;
                modifiedEndLineNumber = 0;
                modifiedEndColumn = 0;
            }
            else {
                modifiedStartLineNumber = modifiedCharSequence.getStartLineNumber(diffChange.modifiedStart);
                modifiedStartColumn = modifiedCharSequence.getStartColumn(diffChange.modifiedStart);
                modifiedEndLineNumber = modifiedCharSequence.getEndLineNumber(diffChange.modifiedStart + diffChange.modifiedLength - 1);
                modifiedEndColumn = modifiedCharSequence.getEndColumn(diffChange.modifiedStart + diffChange.modifiedLength - 1);
            }
            return new CharChange(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn);
        };
        return CharChange;
    }());
    function postProcessCharChanges(rawChanges) {
        if (rawChanges.length <= 1) {
            return rawChanges;
        }
        var result = [rawChanges[0]];
        var prevChange = result[0];
        for (var i = 1, len = rawChanges.length; i < len; i++) {
            var currChange = rawChanges[i];
            var originalMatchingLength = currChange.originalStart - (prevChange.originalStart + prevChange.originalLength);
            var modifiedMatchingLength = currChange.modifiedStart - (prevChange.modifiedStart + prevChange.modifiedLength);
            // Both of the above should be equal, but the continueProcessingPredicate may prevent this from being true
            var matchingLength = Math.min(originalMatchingLength, modifiedMatchingLength);
            if (matchingLength < MINIMUM_MATCHING_CHARACTER_LENGTH) {
                // Merge the current change into the previous one
                prevChange.originalLength = (currChange.originalStart + currChange.originalLength) - prevChange.originalStart;
                prevChange.modifiedLength = (currChange.modifiedStart + currChange.modifiedLength) - prevChange.modifiedStart;
            }
            else {
                // Add the current change
                result.push(currChange);
                prevChange = currChange;
            }
        }
        return result;
    }
    var LineChange = /** @class */ (function () {
        function LineChange(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges) {
            this.originalStartLineNumber = originalStartLineNumber;
            this.originalEndLineNumber = originalEndLineNumber;
            this.modifiedStartLineNumber = modifiedStartLineNumber;
            this.modifiedEndLineNumber = modifiedEndLineNumber;
            this.charChanges = charChanges;
        }
        LineChange.createFromDiffResult = function (diffChange, originalLineSequence, modifiedLineSequence, continueProcessingPredicate, shouldPostProcessCharChanges) {
            var originalStartLineNumber;
            var originalEndLineNumber;
            var modifiedStartLineNumber;
            var modifiedEndLineNumber;
            var charChanges;
            if (diffChange.originalLength === 0) {
                originalStartLineNumber = originalLineSequence.getStartLineNumber(diffChange.originalStart) - 1;
                originalEndLineNumber = 0;
            }
            else {
                originalStartLineNumber = originalLineSequence.getStartLineNumber(diffChange.originalStart);
                originalEndLineNumber = originalLineSequence.getEndLineNumber(diffChange.originalStart + diffChange.originalLength - 1);
            }
            if (diffChange.modifiedLength === 0) {
                modifiedStartLineNumber = modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart) - 1;
                modifiedEndLineNumber = 0;
            }
            else {
                modifiedStartLineNumber = modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart);
                modifiedEndLineNumber = modifiedLineSequence.getEndLineNumber(diffChange.modifiedStart + diffChange.modifiedLength - 1);
            }
            if (diffChange.originalLength !== 0 && diffChange.modifiedLength !== 0 && continueProcessingPredicate()) {
                var originalCharSequence = originalLineSequence.getCharSequence(diffChange.originalStart, diffChange.originalStart + diffChange.originalLength - 1);
                var modifiedCharSequence = modifiedLineSequence.getCharSequence(diffChange.modifiedStart, diffChange.modifiedStart + diffChange.modifiedLength - 1);
                var rawChanges = computeDiff(originalCharSequence, modifiedCharSequence, continueProcessingPredicate, true);
                if (shouldPostProcessCharChanges) {
                    rawChanges = postProcessCharChanges(rawChanges);
                }
                charChanges = [];
                for (var i = 0, length_2 = rawChanges.length; i < length_2; i++) {
                    charChanges.push(CharChange.createFromDiffChange(rawChanges[i], originalCharSequence, modifiedCharSequence));
                }
            }
            return new LineChange(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges);
        };
        return LineChange;
    }());
    var DiffComputer = /** @class */ (function () {
        function DiffComputer(originalLines, modifiedLines, opts) {
            this.shouldPostProcessCharChanges = opts.shouldPostProcessCharChanges;
            this.shouldIgnoreTrimWhitespace = opts.shouldIgnoreTrimWhitespace;
            this.shouldMakePrettyDiff = opts.shouldMakePrettyDiff;
            this.maximumRunTimeMs = MAXIMUM_RUN_TIME;
            this.originalLines = originalLines;
            this.modifiedLines = modifiedLines;
            this.original = new LineMarkerSequence(originalLines);
            this.modified = new LineMarkerSequence(modifiedLines);
        }
        DiffComputer.prototype.computeDiff = function () {
            if (this.original.getLength() === 1 && this.original.getElementHash(0).length === 0) {
                // empty original => fast path
                return [{
                        originalStartLineNumber: 1,
                        originalEndLineNumber: 1,
                        modifiedStartLineNumber: 1,
                        modifiedEndLineNumber: this.modified.getLength(),
                        charChanges: [{
                                modifiedEndColumn: 0,
                                modifiedEndLineNumber: 0,
                                modifiedStartColumn: 0,
                                modifiedStartLineNumber: 0,
                                originalEndColumn: 0,
                                originalEndLineNumber: 0,
                                originalStartColumn: 0,
                                originalStartLineNumber: 0
                            }]
                    }];
            }
            if (this.modified.getLength() === 1 && this.modified.getElementHash(0).length === 0) {
                // empty modified => fast path
                return [{
                        originalStartLineNumber: 1,
                        originalEndLineNumber: this.original.getLength(),
                        modifiedStartLineNumber: 1,
                        modifiedEndLineNumber: 1,
                        charChanges: [{
                                modifiedEndColumn: 0,
                                modifiedEndLineNumber: 0,
                                modifiedStartColumn: 0,
                                modifiedStartLineNumber: 0,
                                originalEndColumn: 0,
                                originalEndLineNumber: 0,
                                originalStartColumn: 0,
                                originalStartLineNumber: 0
                            }]
                    }];
            }
            this.computationStartTime = (new Date()).getTime();
            var rawChanges = computeDiff(this.original, this.modified, this._continueProcessingPredicate.bind(this), this.shouldMakePrettyDiff);
            // The diff is always computed with ignoring trim whitespace
            // This ensures we get the prettiest diff
            if (this.shouldIgnoreTrimWhitespace) {
                var lineChanges = [];
                for (var i = 0, length_3 = rawChanges.length; i < length_3; i++) {
                    lineChanges.push(LineChange.createFromDiffResult(rawChanges[i], this.original, this.modified, this._continueProcessingPredicate.bind(this), this.shouldPostProcessCharChanges));
                }
                return lineChanges;
            }
            // Need to post-process and introduce changes where the trim whitespace is different
            // Note that we are looping starting at -1 to also cover the lines before the first change
            var result = [];
            var originalLineIndex = 0;
            var modifiedLineIndex = 0;
            for (var i = -1 /* !!!! */, len = rawChanges.length; i < len; i++) {
                var nextChange = (i + 1 < len ? rawChanges[i + 1] : null);
                var originalStop = (nextChange ? nextChange.originalStart : this.originalLines.length);
                var modifiedStop = (nextChange ? nextChange.modifiedStart : this.modifiedLines.length);
                while (originalLineIndex < originalStop && modifiedLineIndex < modifiedStop) {
                    var originalLine = this.originalLines[originalLineIndex];
                    var modifiedLine = this.modifiedLines[modifiedLineIndex];
                    if (originalLine !== modifiedLine) {
                        // These lines differ only in trim whitespace
                        // Check the leading whitespace
                        {
                            var originalStartColumn = LineMarkerSequence._getFirstNonBlankColumn(originalLine, 1);
                            var modifiedStartColumn = LineMarkerSequence._getFirstNonBlankColumn(modifiedLine, 1);
                            while (originalStartColumn > 1 && modifiedStartColumn > 1) {
                                var originalChar = originalLine.charCodeAt(originalStartColumn - 2);
                                var modifiedChar = modifiedLine.charCodeAt(modifiedStartColumn - 2);
                                if (originalChar !== modifiedChar) {
                                    break;
                                }
                                originalStartColumn--;
                                modifiedStartColumn--;
                            }
                            if (originalStartColumn > 1 || modifiedStartColumn > 1) {
                                this._pushTrimWhitespaceCharChange(result, originalLineIndex + 1, 1, originalStartColumn, modifiedLineIndex + 1, 1, modifiedStartColumn);
                            }
                        }
                        // Check the trailing whitespace
                        {
                            var originalEndColumn = LineMarkerSequence._getLastNonBlankColumn(originalLine, 1);
                            var modifiedEndColumn = LineMarkerSequence._getLastNonBlankColumn(modifiedLine, 1);
                            var originalMaxColumn = originalLine.length + 1;
                            var modifiedMaxColumn = modifiedLine.length + 1;
                            while (originalEndColumn < originalMaxColumn && modifiedEndColumn < modifiedMaxColumn) {
                                var originalChar = originalLine.charCodeAt(originalEndColumn - 1);
                                var modifiedChar = originalLine.charCodeAt(modifiedEndColumn - 1);
                                if (originalChar !== modifiedChar) {
                                    break;
                                }
                                originalEndColumn++;
                                modifiedEndColumn++;
                            }
                            if (originalEndColumn < originalMaxColumn || modifiedEndColumn < modifiedMaxColumn) {
                                this._pushTrimWhitespaceCharChange(result, originalLineIndex + 1, originalEndColumn, originalMaxColumn, modifiedLineIndex + 1, modifiedEndColumn, modifiedMaxColumn);
                            }
                        }
                    }
                    originalLineIndex++;
                    modifiedLineIndex++;
                }
                if (nextChange) {
                    // Emit the actual change
                    result.push(LineChange.createFromDiffResult(nextChange, this.original, this.modified, this._continueProcessingPredicate.bind(this), this.shouldPostProcessCharChanges));
                    originalLineIndex += nextChange.originalLength;
                    modifiedLineIndex += nextChange.modifiedLength;
                }
            }
            return result;
        };
        DiffComputer.prototype._pushTrimWhitespaceCharChange = function (result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn) {
            if (this._mergeTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn)) {
                // Merged into previous
                return;
            }
            result.push(new LineChange(originalLineNumber, originalLineNumber, modifiedLineNumber, modifiedLineNumber, [
                new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn)
            ]));
        };
        DiffComputer.prototype._mergeTrimWhitespaceCharChange = function (result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn) {
            var len = result.length;
            if (len === 0) {
                return false;
            }
            var prevChange = result[len - 1];
            if (prevChange.originalEndLineNumber === 0 || prevChange.modifiedEndLineNumber === 0) {
                // Don't merge with inserts/deletes
                return false;
            }
            if (prevChange.originalEndLineNumber + 1 === originalLineNumber && prevChange.modifiedEndLineNumber + 1 === modifiedLineNumber) {
                prevChange.originalEndLineNumber = originalLineNumber;
                prevChange.modifiedEndLineNumber = modifiedLineNumber;
                prevChange.charChanges.push(new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn));
                return true;
            }
            return false;
        };
        DiffComputer.prototype._continueProcessingPredicate = function () {
            if (this.maximumRunTimeMs === 0) {
                return true;
            }
            var now = (new Date()).getTime();
            return now - this.computationStartTime < this.maximumRunTimeMs;
        };
        return DiffComputer;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var Uint8Matrix = /** @class */ (function () {
        function Uint8Matrix(rows, cols, defaultValue) {
            var data = new Uint8Array(rows * cols);
            for (var i = 0, len = rows * cols; i < len; i++) {
                data[i] = defaultValue;
            }
            this._data = data;
            this.rows = rows;
            this.cols = cols;
        }
        Uint8Matrix.prototype.get = function (row, col) {
            return this._data[row * this.cols + col];
        };
        Uint8Matrix.prototype.set = function (row, col, value) {
            this._data[row * this.cols + col] = value;
        };
        return Uint8Matrix;
    }());
    function toUint8(v) {
        if (v < 0) {
            return 0;
        }
        if (v > 255 /* MAX_UINT_8 */) {
            return 255 /* MAX_UINT_8 */;
        }
        return v | 0;
    }
    function toUint32(v) {
        if (v < 0) {
            return 0;
        }
        if (v > 4294967295 /* MAX_UINT_32 */) {
            return 4294967295 /* MAX_UINT_32 */;
        }
        return v | 0;
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var PrefixSumIndexOfResult = /** @class */ (function () {
        function PrefixSumIndexOfResult(index, remainder) {
            this.index = index;
            this.remainder = remainder;
        }
        return PrefixSumIndexOfResult;
    }());
    var PrefixSumComputer = /** @class */ (function () {
        function PrefixSumComputer(values) {
            this.values = values;
            this.prefixSum = new Uint32Array(values.length);
            this.prefixSumValidIndex = new Int32Array(1);
            this.prefixSumValidIndex[0] = -1;
        }
        PrefixSumComputer.prototype.getCount = function () {
            return this.values.length;
        };
        PrefixSumComputer.prototype.insertValues = function (insertIndex, insertValues) {
            insertIndex = toUint32(insertIndex);
            var oldValues = this.values;
            var oldPrefixSum = this.prefixSum;
            var insertValuesLen = insertValues.length;
            if (insertValuesLen === 0) {
                return false;
            }
            this.values = new Uint32Array(oldValues.length + insertValuesLen);
            this.values.set(oldValues.subarray(0, insertIndex), 0);
            this.values.set(oldValues.subarray(insertIndex), insertIndex + insertValuesLen);
            this.values.set(insertValues, insertIndex);
            if (insertIndex - 1 < this.prefixSumValidIndex[0]) {
                this.prefixSumValidIndex[0] = insertIndex - 1;
            }
            this.prefixSum = new Uint32Array(this.values.length);
            if (this.prefixSumValidIndex[0] >= 0) {
                this.prefixSum.set(oldPrefixSum.subarray(0, this.prefixSumValidIndex[0] + 1));
            }
            return true;
        };
        PrefixSumComputer.prototype.changeValue = function (index, value) {
            index = toUint32(index);
            value = toUint32(value);
            if (this.values[index] === value) {
                return false;
            }
            this.values[index] = value;
            if (index - 1 < this.prefixSumValidIndex[0]) {
                this.prefixSumValidIndex[0] = index - 1;
            }
            return true;
        };
        PrefixSumComputer.prototype.removeValues = function (startIndex, cnt) {
            startIndex = toUint32(startIndex);
            cnt = toUint32(cnt);
            var oldValues = this.values;
            var oldPrefixSum = this.prefixSum;
            if (startIndex >= oldValues.length) {
                return false;
            }
            var maxCnt = oldValues.length - startIndex;
            if (cnt >= maxCnt) {
                cnt = maxCnt;
            }
            if (cnt === 0) {
                return false;
            }
            this.values = new Uint32Array(oldValues.length - cnt);
            this.values.set(oldValues.subarray(0, startIndex), 0);
            this.values.set(oldValues.subarray(startIndex + cnt), startIndex);
            this.prefixSum = new Uint32Array(this.values.length);
            if (startIndex - 1 < this.prefixSumValidIndex[0]) {
                this.prefixSumValidIndex[0] = startIndex - 1;
            }
            if (this.prefixSumValidIndex[0] >= 0) {
                this.prefixSum.set(oldPrefixSum.subarray(0, this.prefixSumValidIndex[0] + 1));
            }
            return true;
        };
        PrefixSumComputer.prototype.getTotalValue = function () {
            if (this.values.length === 0) {
                return 0;
            }
            return this._getAccumulatedValue(this.values.length - 1);
        };
        PrefixSumComputer.prototype.getAccumulatedValue = function (index) {
            if (index < 0) {
                return 0;
            }
            index = toUint32(index);
            return this._getAccumulatedValue(index);
        };
        PrefixSumComputer.prototype._getAccumulatedValue = function (index) {
            if (index <= this.prefixSumValidIndex[0]) {
                return this.prefixSum[index];
            }
            var startIndex = this.prefixSumValidIndex[0] + 1;
            if (startIndex === 0) {
                this.prefixSum[0] = this.values[0];
                startIndex++;
            }
            if (index >= this.values.length) {
                index = this.values.length - 1;
            }
            for (var i = startIndex; i <= index; i++) {
                this.prefixSum[i] = this.prefixSum[i - 1] + this.values[i];
            }
            this.prefixSumValidIndex[0] = Math.max(this.prefixSumValidIndex[0], index);
            return this.prefixSum[index];
        };
        PrefixSumComputer.prototype.getIndexOf = function (accumulatedValue) {
            accumulatedValue = Math.floor(accumulatedValue); //@perf
            // Compute all sums (to get a fully valid prefixSum)
            this.getTotalValue();
            var low = 0;
            var high = this.values.length - 1;
            var mid;
            var midStop;
            var midStart;
            while (low <= high) {
                mid = low + ((high - low) / 2) | 0;
                midStop = this.prefixSum[mid];
                midStart = midStop - this.values[mid];
                if (accumulatedValue < midStart) {
                    high = mid - 1;
                }
                else if (accumulatedValue >= midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
            return new PrefixSumIndexOfResult(mid, accumulatedValue - midStart);
        };
        return PrefixSumComputer;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var MirrorTextModel = /** @class */ (function () {
        function MirrorTextModel(uri, lines, eol, versionId) {
            this._uri = uri;
            this._lines = lines;
            this._eol = eol;
            this._versionId = versionId;
        }
        MirrorTextModel.prototype.dispose = function () {
            this._lines.length = 0;
        };
        Object.defineProperty(MirrorTextModel.prototype, "version", {
            get: function () {
                return this._versionId;
            },
            enumerable: true,
            configurable: true
        });
        MirrorTextModel.prototype.getText = function () {
            return this._lines.join(this._eol);
        };
        MirrorTextModel.prototype.onEvents = function (e) {
            if (e.eol && e.eol !== this._eol) {
                this._eol = e.eol;
                this._lineStarts = null;
            }
            // Update my lines
            var changes = e.changes;
            for (var i = 0, len = changes.length; i < len; i++) {
                var change = changes[i];
                this._acceptDeleteRange(change.range);
                this._acceptInsertText(new Position(change.range.startLineNumber, change.range.startColumn), change.text);
            }
            this._versionId = e.versionId;
        };
        MirrorTextModel.prototype._ensureLineStarts = function () {
            if (!this._lineStarts) {
                var eolLength = this._eol.length;
                var linesLength = this._lines.length;
                var lineStartValues = new Uint32Array(linesLength);
                for (var i = 0; i < linesLength; i++) {
                    lineStartValues[i] = this._lines[i].length + eolLength;
                }
                this._lineStarts = new PrefixSumComputer(lineStartValues);
            }
        };
        /**
         * All changes to a line's text go through this method
         */
        MirrorTextModel.prototype._setLineText = function (lineIndex, newValue) {
            this._lines[lineIndex] = newValue;
            if (this._lineStarts) {
                // update prefix sum
                this._lineStarts.changeValue(lineIndex, this._lines[lineIndex].length + this._eol.length);
            }
        };
        MirrorTextModel.prototype._acceptDeleteRange = function (range) {
            if (range.startLineNumber === range.endLineNumber) {
                if (range.startColumn === range.endColumn) {
                    // Nothing to delete
                    return;
                }
                // Delete text on the affected line
                this._setLineText(range.startLineNumber - 1, this._lines[range.startLineNumber - 1].substring(0, range.startColumn - 1)
                    + this._lines[range.startLineNumber - 1].substring(range.endColumn - 1));
                return;
            }
            // Take remaining text on last line and append it to remaining text on first line
            this._setLineText(range.startLineNumber - 1, this._lines[range.startLineNumber - 1].substring(0, range.startColumn - 1)
                + this._lines[range.endLineNumber - 1].substring(range.endColumn - 1));
            // Delete middle lines
            this._lines.splice(range.startLineNumber, range.endLineNumber - range.startLineNumber);
            if (this._lineStarts) {
                // update prefix sum
                this._lineStarts.removeValues(range.startLineNumber, range.endLineNumber - range.startLineNumber);
            }
        };
        MirrorTextModel.prototype._acceptInsertText = function (position, insertText) {
            if (insertText.length === 0) {
                // Nothing to insert
                return;
            }
            var insertLines = insertText.split(/\r\n|\r|\n/);
            if (insertLines.length === 1) {
                // Inserting text on one line
                this._setLineText(position.lineNumber - 1, this._lines[position.lineNumber - 1].substring(0, position.column - 1)
                    + insertLines[0]
                    + this._lines[position.lineNumber - 1].substring(position.column - 1));
                return;
            }
            // Append overflowing text from first line to the end of text to insert
            insertLines[insertLines.length - 1] += this._lines[position.lineNumber - 1].substring(position.column - 1);
            // Delete overflowing text from first line and insert text on first line
            this._setLineText(position.lineNumber - 1, this._lines[position.lineNumber - 1].substring(0, position.column - 1)
                + insertLines[0]);
            // Insert new lines & store lengths
            var newLengths = new Uint32Array(insertLines.length - 1);
            for (var i = 1; i < insertLines.length; i++) {
                this._lines.splice(position.lineNumber + i - 1, 0, insertLines[i]);
                newLengths[i - 1] = insertLines[i].length + this._eol.length;
            }
            if (this._lineStarts) {
                // update prefix sum
                this._lineStarts.insertValues(position.lineNumber, newLengths);
            }
        };
        return MirrorTextModel;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    /**
     * A fast character classifier that uses a compact array for ASCII values.
     */
    var CharacterClassifier = /** @class */ (function () {
        function CharacterClassifier(_defaultValue) {
            var defaultValue = toUint8(_defaultValue);
            this._defaultValue = defaultValue;
            this._asciiMap = CharacterClassifier._createAsciiMap(defaultValue);
            this._map = new Map();
        }
        CharacterClassifier._createAsciiMap = function (defaultValue) {
            var asciiMap = new Uint8Array(256);
            for (var i = 0; i < 256; i++) {
                asciiMap[i] = defaultValue;
            }
            return asciiMap;
        };
        CharacterClassifier.prototype.set = function (charCode, _value) {
            var value = toUint8(_value);
            if (charCode >= 0 && charCode < 256) {
                this._asciiMap[charCode] = value;
            }
            else {
                this._map.set(charCode, value);
            }
        };
        CharacterClassifier.prototype.get = function (charCode) {
            if (charCode >= 0 && charCode < 256) {
                return this._asciiMap[charCode];
            }
            else {
                return (this._map.get(charCode) || this._defaultValue);
            }
        };
        return CharacterClassifier;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var StateMachine = /** @class */ (function () {
        function StateMachine(edges) {
            var maxCharCode = 0;
            var maxState = 0 /* Invalid */;
            for (var i = 0, len = edges.length; i < len; i++) {
                var _a = edges[i], from = _a[0], chCode = _a[1], to = _a[2];
                if (chCode > maxCharCode) {
                    maxCharCode = chCode;
                }
                if (from > maxState) {
                    maxState = from;
                }
                if (to > maxState) {
                    maxState = to;
                }
            }
            maxCharCode++;
            maxState++;
            var states = new Uint8Matrix(maxState, maxCharCode, 0 /* Invalid */);
            for (var i = 0, len = edges.length; i < len; i++) {
                var _b = edges[i], from = _b[0], chCode = _b[1], to = _b[2];
                states.set(from, chCode, to);
            }
            this._states = states;
            this._maxCharCode = maxCharCode;
        }
        StateMachine.prototype.nextState = function (currentState, chCode) {
            if (chCode < 0 || chCode >= this._maxCharCode) {
                return 0 /* Invalid */;
            }
            return this._states.get(currentState, chCode);
        };
        return StateMachine;
    }());
    // State machine for http:// or https:// or file://
    var _stateMachine = null;
    function getStateMachine() {
        if (_stateMachine === null) {
            _stateMachine = new StateMachine([
                [1 /* Start */, 104 /* h */, 2 /* H */],
                [1 /* Start */, 72 /* H */, 2 /* H */],
                [1 /* Start */, 102 /* f */, 6 /* F */],
                [1 /* Start */, 70 /* F */, 6 /* F */],
                [2 /* H */, 116 /* t */, 3 /* HT */],
                [2 /* H */, 84 /* T */, 3 /* HT */],
                [3 /* HT */, 116 /* t */, 4 /* HTT */],
                [3 /* HT */, 84 /* T */, 4 /* HTT */],
                [4 /* HTT */, 112 /* p */, 5 /* HTTP */],
                [4 /* HTT */, 80 /* P */, 5 /* HTTP */],
                [5 /* HTTP */, 115 /* s */, 9 /* BeforeColon */],
                [5 /* HTTP */, 83 /* S */, 9 /* BeforeColon */],
                [5 /* HTTP */, 58 /* Colon */, 10 /* AfterColon */],
                [6 /* F */, 105 /* i */, 7 /* FI */],
                [6 /* F */, 73 /* I */, 7 /* FI */],
                [7 /* FI */, 108 /* l */, 8 /* FIL */],
                [7 /* FI */, 76 /* L */, 8 /* FIL */],
                [8 /* FIL */, 101 /* e */, 9 /* BeforeColon */],
                [8 /* FIL */, 69 /* E */, 9 /* BeforeColon */],
                [9 /* BeforeColon */, 58 /* Colon */, 10 /* AfterColon */],
                [10 /* AfterColon */, 47 /* Slash */, 11 /* AlmostThere */],
                [11 /* AlmostThere */, 47 /* Slash */, 12 /* End */],
            ]);
        }
        return _stateMachine;
    }
    var _classifier = null;
    function getClassifier() {
        if (_classifier === null) {
            _classifier = new CharacterClassifier(0 /* None */);
            var FORCE_TERMINATION_CHARACTERS = ' \t<>\'\"、。｡､，．：；？！＠＃＄％＆＊‘“〈《「『【〔（［｛｢｣｝］）〕】』」》〉”’｀～…';
            for (var i = 0; i < FORCE_TERMINATION_CHARACTERS.length; i++) {
                _classifier.set(FORCE_TERMINATION_CHARACTERS.charCodeAt(i), 1 /* ForceTermination */);
            }
            var CANNOT_END_WITH_CHARACTERS = '.,;';
            for (var i = 0; i < CANNOT_END_WITH_CHARACTERS.length; i++) {
                _classifier.set(CANNOT_END_WITH_CHARACTERS.charCodeAt(i), 2 /* CannotEndIn */);
            }
        }
        return _classifier;
    }
    var LinkComputer = /** @class */ (function () {
        function LinkComputer() {
        }
        LinkComputer._createLink = function (classifier, line, lineNumber, linkBeginIndex, linkEndIndex) {
            // Do not allow to end link in certain characters...
            var lastIncludedCharIndex = linkEndIndex - 1;
            do {
                var chCode = line.charCodeAt(lastIncludedCharIndex);
                var chClass = classifier.get(chCode);
                if (chClass !== 2 /* CannotEndIn */) {
                    break;
                }
                lastIncludedCharIndex--;
            } while (lastIncludedCharIndex > linkBeginIndex);
            // Handle links enclosed in parens, square brackets and curlys.
            if (linkBeginIndex > 0) {
                var charCodeBeforeLink = line.charCodeAt(linkBeginIndex - 1);
                var lastCharCodeInLink = line.charCodeAt(lastIncludedCharIndex);
                if ((charCodeBeforeLink === 40 /* OpenParen */ && lastCharCodeInLink === 41 /* CloseParen */)
                    || (charCodeBeforeLink === 91 /* OpenSquareBracket */ && lastCharCodeInLink === 93 /* CloseSquareBracket */)
                    || (charCodeBeforeLink === 123 /* OpenCurlyBrace */ && lastCharCodeInLink === 125 /* CloseCurlyBrace */)) {
                    // Do not end in ) if ( is before the link start
                    // Do not end in ] if [ is before the link start
                    // Do not end in } if { is before the link start
                    lastIncludedCharIndex--;
                }
            }
            return {
                range: {
                    startLineNumber: lineNumber,
                    startColumn: linkBeginIndex + 1,
                    endLineNumber: lineNumber,
                    endColumn: lastIncludedCharIndex + 2
                },
                url: line.substring(linkBeginIndex, lastIncludedCharIndex + 1)
            };
        };
        LinkComputer.computeLinks = function (model) {
            var stateMachine = getStateMachine();
            var classifier = getClassifier();
            var result = [];
            for (var i = 1, lineCount = model.getLineCount(); i <= lineCount; i++) {
                var line = model.getLineContent(i);
                var len = line.length;
                var j = 0;
                var linkBeginIndex = 0;
                var linkBeginChCode = 0;
                var state = 1 /* Start */;
                var hasOpenParens = false;
                var hasOpenSquareBracket = false;
                var hasOpenCurlyBracket = false;
                while (j < len) {
                    var resetStateMachine = false;
                    var chCode = line.charCodeAt(j);
                    if (state === 13 /* Accept */) {
                        var chClass = void 0;
                        switch (chCode) {
                            case 40 /* OpenParen */:
                                hasOpenParens = true;
                                chClass = 0 /* None */;
                                break;
                            case 41 /* CloseParen */:
                                chClass = (hasOpenParens ? 0 /* None */ : 1 /* ForceTermination */);
                                break;
                            case 91 /* OpenSquareBracket */:
                                hasOpenSquareBracket = true;
                                chClass = 0 /* None */;
                                break;
                            case 93 /* CloseSquareBracket */:
                                chClass = (hasOpenSquareBracket ? 0 /* None */ : 1 /* ForceTermination */);
                                break;
                            case 123 /* OpenCurlyBrace */:
                                hasOpenCurlyBracket = true;
                                chClass = 0 /* None */;
                                break;
                            case 125 /* CloseCurlyBrace */:
                                chClass = (hasOpenCurlyBracket ? 0 /* None */ : 1 /* ForceTermination */);
                                break;
                            /* The following three rules make it that ' or " or ` are allowed inside links if the link began with a different one */
                            case 39 /* SingleQuote */:
                                chClass = (linkBeginChCode === 34 /* DoubleQuote */ || linkBeginChCode === 96 /* BackTick */) ? 0 /* None */ : 1 /* ForceTermination */;
                                break;
                            case 34 /* DoubleQuote */:
                                chClass = (linkBeginChCode === 39 /* SingleQuote */ || linkBeginChCode === 96 /* BackTick */) ? 0 /* None */ : 1 /* ForceTermination */;
                                break;
                            case 96 /* BackTick */:
                                chClass = (linkBeginChCode === 39 /* SingleQuote */ || linkBeginChCode === 34 /* DoubleQuote */) ? 0 /* None */ : 1 /* ForceTermination */;
                                break;
                            default:
                                chClass = classifier.get(chCode);
                        }
                        // Check if character terminates link
                        if (chClass === 1 /* ForceTermination */) {
                            result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, j));
                            resetStateMachine = true;
                        }
                    }
                    else if (state === 12 /* End */) {
                        var chClass = classifier.get(chCode);
                        // Check if character terminates link
                        if (chClass === 1 /* ForceTermination */) {
                            resetStateMachine = true;
                        }
                        else {
                            state = 13 /* Accept */;
                        }
                    }
                    else {
                        state = stateMachine.nextState(state, chCode);
                        if (state === 0 /* Invalid */) {
                            resetStateMachine = true;
                        }
                    }
                    if (resetStateMachine) {
                        state = 1 /* Start */;
                        hasOpenParens = false;
                        hasOpenSquareBracket = false;
                        hasOpenCurlyBracket = false;
                        // Record where the link started
                        linkBeginIndex = j + 1;
                        linkBeginChCode = chCode;
                    }
                    j++;
                }
                if (state === 13 /* Accept */) {
                    result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, len));
                }
            }
            return result;
        };
        return LinkComputer;
    }());
    /**
     * Returns an array of all links contains in the provided
     * document. *Note* that this operation is computational
     * expensive and should not run in the UI thread.
     */
    function computeLinks(model) {
        if (!model || typeof model.getLineCount !== 'function' || typeof model.getLineContent !== 'function') {
            // Unknown caller!
            return [];
        }
        return LinkComputer.computeLinks(model);
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var BasicInplaceReplace = /** @class */ (function () {
        function BasicInplaceReplace() {
            this._defaultValueSet = [
                ['true', 'false'],
                ['True', 'False'],
                ['Private', 'Public', 'Friend', 'ReadOnly', 'Partial', 'Protected', 'WriteOnly'],
                ['public', 'protected', 'private'],
            ];
        }
        BasicInplaceReplace.prototype.navigateValueSet = function (range1, text1, range2, text2, up) {
            if (range1 && text1) {
                var result = this.doNavigateValueSet(text1, up);
                if (result) {
                    return {
                        range: range1,
                        value: result
                    };
                }
            }
            if (range2 && text2) {
                var result = this.doNavigateValueSet(text2, up);
                if (result) {
                    return {
                        range: range2,
                        value: result
                    };
                }
            }
            return null;
        };
        BasicInplaceReplace.prototype.doNavigateValueSet = function (text, up) {
            var numberResult = this.numberReplace(text, up);
            if (numberResult !== null) {
                return numberResult;
            }
            return this.textReplace(text, up);
        };
        BasicInplaceReplace.prototype.numberReplace = function (value, up) {
            var precision = Math.pow(10, value.length - (value.lastIndexOf('.') + 1));
            var n1 = Number(value);
            var n2 = parseFloat(value);
            if (!isNaN(n1) && !isNaN(n2) && n1 === n2) {
                if (n1 === 0 && !up) {
                    return null; // don't do negative
                    //			} else if(n1 === 9 && up) {
                    //				return null; // don't insert 10 into a number
                }
                else {
                    n1 = Math.floor(n1 * precision);
                    n1 += up ? precision : -precision;
                    return String(n1 / precision);
                }
            }
            return null;
        };
        BasicInplaceReplace.prototype.textReplace = function (value, up) {
            return this.valueSetsReplace(this._defaultValueSet, value, up);
        };
        BasicInplaceReplace.prototype.valueSetsReplace = function (valueSets, value, up) {
            var result = null;
            for (var i = 0, len = valueSets.length; result === null && i < len; i++) {
                result = this.valueSetReplace(valueSets[i], value, up);
            }
            return result;
        };
        BasicInplaceReplace.prototype.valueSetReplace = function (valueSet, value, up) {
            var idx = valueSet.indexOf(value);
            if (idx >= 0) {
                idx += up ? +1 : -1;
                if (idx < 0) {
                    idx = valueSet.length - 1;
                }
                else {
                    idx %= valueSet.length;
                }
                return valueSet[idx];
            }
            return null;
        };
        BasicInplaceReplace.INSTANCE = new BasicInplaceReplace();
        return BasicInplaceReplace;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';
    /**
     * Create a word definition regular expression based on default word separators.
     * Optionally provide allowed separators that should be included in words.
     *
     * The default would look like this:
     * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
     */
    function createWordRegExp(allowInWords) {
        if (allowInWords === void 0) { allowInWords = ''; }
        var source = '(-?\\d*\\.\\d\\w*)|([^';
        for (var i = 0; i < USUAL_WORD_SEPARATORS.length; i++) {
            if (allowInWords.indexOf(USUAL_WORD_SEPARATORS[i]) >= 0) {
                continue;
            }
            source += '\\' + USUAL_WORD_SEPARATORS[i];
        }
        source += '\\s]+)';
        return new RegExp(source, 'g');
    }
    // catches numbers (including floating numbers) in the first group, and alphanum in the second
    var DEFAULT_WORD_REGEXP = createWordRegExp();
    function ensureValidWordDefinition(wordDefinition) {
        var result = DEFAULT_WORD_REGEXP;
        if (wordDefinition && (wordDefinition instanceof RegExp)) {
            if (!wordDefinition.global) {
                var flags = 'g';
                if (wordDefinition.ignoreCase) {
                    flags += 'i';
                }
                if (wordDefinition.multiline) {
                    flags += 'm';
                }
                result = new RegExp(wordDefinition.source, flags);
            }
            else {
                result = wordDefinition;
            }
        }
        result.lastIndex = 0;
        return result;
    }
    function getWordAtPosFast(column, wordDefinition, text, textOffset) {
        // find whitespace enclosed text around column and match from there
        var pos = column - 1 - textOffset;
        var start = text.lastIndexOf(' ', pos - 1) + 1;
        var end = text.indexOf(' ', pos);
        if (end === -1) {
            end = text.length;
        }
        wordDefinition.lastIndex = start;
        var match;
        while (match = wordDefinition.exec(text)) {
            if (match.index <= pos && wordDefinition.lastIndex >= pos) {
                return {
                    word: match[0],
                    startColumn: textOffset + 1 + match.index,
                    endColumn: textOffset + 1 + wordDefinition.lastIndex
                };
            }
        }
        return null;
    }
    function getWordAtPosSlow(column, wordDefinition, text, textOffset) {
        // matches all words starting at the beginning
        // of the input until it finds a match that encloses
        // the desired column. slow but correct
        var pos = column - 1 - textOffset;
        wordDefinition.lastIndex = 0;
        var match;
        while (match = wordDefinition.exec(text)) {
            if (match.index > pos) {
                // |nW -> matched only after the pos
                return null;
            }
            else if (wordDefinition.lastIndex >= pos) {
                // W|W -> match encloses pos
                return {
                    word: match[0],
                    startColumn: textOffset + 1 + match.index,
                    endColumn: textOffset + 1 + wordDefinition.lastIndex
                };
            }
        }
        return null;
    }
    function getWordAtText(column, wordDefinition, text, textOffset) {
        // if `words` can contain whitespace character we have to use the slow variant
        // otherwise we use the fast variant of finding a word
        wordDefinition.lastIndex = 0;
        var match = wordDefinition.exec(text);
        if (!match) {
            return null;
        }
        // todo@joh the `match` could already be the (first) word
        var ret = match[0].indexOf(' ') >= 0
            // did match a word which contains a space character -> use slow word find
            ? getWordAtPosSlow(column, wordDefinition, text, textOffset)
            // sane word definition -> use fast word find
            : getWordAtPosFast(column, wordDefinition, text, textOffset);
        // both (getWordAtPosFast and getWordAtPosSlow) leave the wordDefinition-RegExp
        // in an undefined state and to not confuse other users of the wordDefinition
        // we reset the lastIndex
        wordDefinition.lastIndex = 0;
        return ret;
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    function once(fn) {
        var _this = this;
        var didCall = false;
        var result;
        return function () {
            if (didCall) {
                return result;
            }
            didCall = true;
            result = fn.apply(_this, arguments);
            return result;
        };
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var empty$1 = Object.freeze({
        dispose: function () { }
    });
    function dispose(first) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        if (Array.isArray(first)) {
            first.forEach(function (d) { return d && d.dispose(); });
            return [];
        }
        else if (rest.length === 0) {
            if (first) {
                first.dispose();
                return first;
            }
            return undefined;
        }
        else {
            dispose(first);
            dispose(rest);
            return [];
        }
    }
    function toDisposable() {
        var fns = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            fns[_i] = arguments[_i];
        }
        return {
            dispose: function () {
                for (var _i = 0, fns_1 = fns; _i < fns_1.length; _i++) {
                    var fn = fns_1[_i];
                    fn();
                }
            }
        };
    }
    var Disposable = /** @class */ (function () {
        function Disposable() {
            this._toDispose = [];
        }
        Disposable.prototype.dispose = function () {
            this._toDispose = dispose(this._toDispose);
        };
        Disposable.prototype._register = function (t) {
            this._toDispose.push(t);
            return t;
        };
        return Disposable;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    // ------ BEGIN Hook up error listeners to winjs promises
    var outstandingPromiseErrors = {};
    function promiseErrorHandler(e) {
        //
        // e.detail looks like: { exception, error, promise, handler, id, parent }
        //
        var details = e.detail;
        var id = details.id;
        // If the error has a parent promise then this is not the origination of the
        //  error so we check if it has a handler, and if so we mark that the error
        //  was handled by removing it from outstandingPromiseErrors
        //
        if (details.parent) {
            if (details.handler && outstandingPromiseErrors) {
                delete outstandingPromiseErrors[id];
            }
            return;
        }
        // Indicate that this error was originated and needs to be handled
        outstandingPromiseErrors[id] = details;
        // The first time the queue fills up this iteration, schedule a timeout to
        // check if any errors are still unhandled.
        if (Object.keys(outstandingPromiseErrors).length === 1) {
            setTimeout(function () {
                var errors = outstandingPromiseErrors;
                outstandingPromiseErrors = {};
                Object.keys(errors).forEach(function (errorId) {
                    var error = errors[errorId];
                    if (error.exception) {
                        onUnexpectedError(error.exception);
                    }
                    else if (error.error) {
                        onUnexpectedError(error.error);
                    }
                    console.log('WARNING: Promise with no error callback:' + error.id);
                    console.log(error);
                    if (error.exception) {
                        console.log(error.exception.stack);
                    }
                });
            }, 0);
        }
    }
    TPromise.addEventListener('error', promiseErrorHandler);
    // Avoid circular dependency on EventEmitter by implementing a subset of the interface.
    var ErrorHandler = /** @class */ (function () {
        function ErrorHandler() {
            this.listeners = [];
            this.unexpectedErrorHandler = function (e) {
                setTimeout(function () {
                    if (e.stack) {
                        throw new Error(e.message + '\n\n' + e.stack);
                    }
                    throw e;
                }, 0);
            };
        }
        ErrorHandler.prototype.addListener = function (listener) {
            var _this = this;
            this.listeners.push(listener);
            return function () {
                _this._removeListener(listener);
            };
        };
        ErrorHandler.prototype.emit = function (e) {
            this.listeners.forEach(function (listener) {
                listener(e);
            });
        };
        ErrorHandler.prototype._removeListener = function (listener) {
            this.listeners.splice(this.listeners.indexOf(listener), 1);
        };
        ErrorHandler.prototype.setUnexpectedErrorHandler = function (newUnexpectedErrorHandler) {
            this.unexpectedErrorHandler = newUnexpectedErrorHandler;
        };
        ErrorHandler.prototype.getUnexpectedErrorHandler = function () {
            return this.unexpectedErrorHandler;
        };
        ErrorHandler.prototype.onUnexpectedError = function (e) {
            this.unexpectedErrorHandler(e);
            this.emit(e);
        };
        // For external errors, we don't want the listeners to be called
        ErrorHandler.prototype.onUnexpectedExternalError = function (e) {
            this.unexpectedErrorHandler(e);
        };
        return ErrorHandler;
    }());
    var errorHandler = new ErrorHandler();
    function onUnexpectedError(e) {
        // ignore errors from cancelled promises
        if (!isPromiseCanceledError(e)) {
            errorHandler.onUnexpectedError(e);
        }
        return undefined;
    }
    function transformErrorForSerialization(error) {
        if (error instanceof Error) {
            var name_1 = error.name, message = error.message;
            var stack = error.stacktrace || error.stack;
            return {
                $isError: true,
                name: name_1,
                message: message,
                stack: stack
            };
        }
        // return as is
        return error;
    }
    var canceledName = 'Canceled';
    /**
     * Checks if the given error is a promise in canceled state
     */
    function isPromiseCanceledError(error) {
        return error instanceof Error && error.name === canceledName && error.message === canceledName;
    }
    /**
     * Returns an error that signals cancellation.
     */
    function canceled() {
        var error = new Error(canceledName);
        error.name = error.message;
        return error;
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var Node = /** @class */ (function () {
        function Node(element) {
            this.element = element;
        }
        return Node;
    }());
    var LinkedList = /** @class */ (function () {
        function LinkedList() {
        }
        LinkedList.prototype.isEmpty = function () {
            return !this._first;
        };
        LinkedList.prototype.clear = function () {
            this._first = undefined;
            this._last = undefined;
        };
        LinkedList.prototype.unshift = function (element) {
            return this.insert(element, false);
        };
        LinkedList.prototype.push = function (element) {
            return this.insert(element, true);
        };
        LinkedList.prototype.insert = function (element, atTheEnd) {
            var _this = this;
            var newNode = new Node(element);
            if (!this._first) {
                this._first = newNode;
                this._last = newNode;
            }
            else if (atTheEnd) {
                // push
                var oldLast = this._last;
                this._last = newNode;
                newNode.prev = oldLast;
                oldLast.next = newNode;
            }
            else {
                // unshift
                var oldFirst = this._first;
                this._first = newNode;
                newNode.next = oldFirst;
                oldFirst.prev = newNode;
            }
            return function () {
                for (var candidate = _this._first; candidate instanceof Node; candidate = candidate.next) {
                    if (candidate !== newNode) {
                        continue;
                    }
                    if (candidate.prev && candidate.next) {
                        // middle
                        var anchor = candidate.prev;
                        anchor.next = candidate.next;
                        candidate.next.prev = anchor;
                    }
                    else if (!candidate.prev && !candidate.next) {
                        // only node
                        _this._first = undefined;
                        _this._last = undefined;
                    }
                    else if (!candidate.next) {
                        // last
                        _this._last = _this._last.prev;
                        _this._last.next = undefined;
                    }
                    else if (!candidate.prev) {
                        // first
                        _this._first = _this._first.next;
                        _this._first.prev = undefined;
                    }
                    // done
                    break;
                }
            };
        };
        LinkedList.prototype.iterator = function () {
            var element = {
                done: undefined,
                value: undefined,
            };
            var node = this._first;
            return {
                next: function () {
                    if (!node) {
                        element.done = true;
                        element.value = undefined;
                    }
                    else {
                        element.done = false;
                        element.value = node.element;
                        node = node.next;
                    }
                    return element;
                }
            };
        };
        LinkedList.prototype.toArray = function () {
            var result = [];
            for (var node = this._first; node instanceof Node; node = node.next) {
                result.push(node.element);
            }
            return result;
        };
        return LinkedList;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var Event;
    (function (Event) {
        var _disposable = { dispose: function () { } };
        Event.None = function () { return _disposable; };
    })(Event || (Event = {}));
    /**
     * The Emitter can be used to expose an Event to the public
     * to fire it from the insides.
     * Sample:
        class Document {

            private _onDidChange = new Emitter<(value:string)=>any>();

            public onDidChange = this._onDidChange.event;

            // getter-style
            // get onDidChange(): Event<(value:string)=>any> {
            // 	return this._onDidChange.event;
            // }

            private _doIt() {
                //...
                this._onDidChange.fire(value);
            }
        }
     */
    var Emitter = /** @class */ (function () {
        function Emitter(_options) {
            this._options = _options;
        }
        Object.defineProperty(Emitter.prototype, "event", {
            /**
             * For the public to allow to subscribe
             * to events from this Emitter
             */
            get: function () {
                var _this = this;
                if (!this._event) {
                    this._event = function (listener, thisArgs, disposables) {
                        if (!_this._listeners) {
                            _this._listeners = new LinkedList();
                        }
                        var firstListener = _this._listeners.isEmpty();
                        if (firstListener && _this._options && _this._options.onFirstListenerAdd) {
                            _this._options.onFirstListenerAdd(_this);
                        }
                        var remove = _this._listeners.push(!thisArgs ? listener : [listener, thisArgs]);
                        if (firstListener && _this._options && _this._options.onFirstListenerDidAdd) {
                            _this._options.onFirstListenerDidAdd(_this);
                        }
                        if (_this._options && _this._options.onListenerDidAdd) {
                            _this._options.onListenerDidAdd(_this, listener, thisArgs);
                        }
                        var result;
                        result = {
                            dispose: function () {
                                result.dispose = Emitter._noop;
                                if (!_this._disposed) {
                                    remove();
                                    if (_this._options && _this._options.onLastListenerRemove && _this._listeners.isEmpty()) {
                                        _this._options.onLastListenerRemove(_this);
                                    }
                                }
                            }
                        };
                        if (Array.isArray(disposables)) {
                            disposables.push(result);
                        }
                        return result;
                    };
                }
                return this._event;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * To be kept private to fire an event to
         * subscribers
         */
        Emitter.prototype.fire = function (event) {
            if (this._listeners) {
                // put all [listener,event]-pairs into delivery queue
                // then emit all event. an inner/nested event might be
                // the driver of this
                if (!this._deliveryQueue) {
                    this._deliveryQueue = [];
                }
                for (var iter = this._listeners.iterator(), e = iter.next(); !e.done; e = iter.next()) {
                    this._deliveryQueue.push([e.value, event]);
                }
                while (this._deliveryQueue.length > 0) {
                    var _a = this._deliveryQueue.shift(), listener = _a[0], event_1 = _a[1];
                    try {
                        if (typeof listener === 'function') {
                            listener.call(undefined, event_1);
                        }
                        else {
                            listener[0].call(listener[1], event_1);
                        }
                    }
                    catch (e) {
                        onUnexpectedError(e);
                    }
                }
            }
        };
        Emitter.prototype.dispose = function () {
            if (this._listeners) {
                this._listeners = undefined;
            }
            if (this._deliveryQueue) {
                this._deliveryQueue.length = 0;
            }
            this._disposed = true;
        };
        Emitter._noop = function () { };
        return Emitter;
    }());
    var EventMultiplexer = /** @class */ (function () {
        function EventMultiplexer() {
            var _this = this;
            this.hasListeners = false;
            this.events = [];
            this.emitter = new Emitter({
                onFirstListenerAdd: function () { return _this.onFirstListenerAdd(); },
                onLastListenerRemove: function () { return _this.onLastListenerRemove(); }
            });
        }
        Object.defineProperty(EventMultiplexer.prototype, "event", {
            get: function () {
                return this.emitter.event;
            },
            enumerable: true,
            configurable: true
        });
        EventMultiplexer.prototype.add = function (event) {
            var _this = this;
            var e = { event: event, listener: null };
            this.events.push(e);
            if (this.hasListeners) {
                this.hook(e);
            }
            var dispose$$1 = function () {
                if (_this.hasListeners) {
                    _this.unhook(e);
                }
                var idx = _this.events.indexOf(e);
                _this.events.splice(idx, 1);
            };
            return toDisposable(once(dispose$$1));
        };
        EventMultiplexer.prototype.onFirstListenerAdd = function () {
            var _this = this;
            this.hasListeners = true;
            this.events.forEach(function (e) { return _this.hook(e); });
        };
        EventMultiplexer.prototype.onLastListenerRemove = function () {
            var _this = this;
            this.hasListeners = false;
            this.events.forEach(function (e) { return _this.unhook(e); });
        };
        EventMultiplexer.prototype.hook = function (e) {
            var _this = this;
            e.listener = e.event(function (r) { return _this.emitter.fire(r); });
        };
        EventMultiplexer.prototype.unhook = function (e) {
            e.listener.dispose();
            e.listener = null;
        };
        EventMultiplexer.prototype.dispose = function () {
            this.emitter.dispose();
        };
        return EventMultiplexer;
    }());
    function mapEvent(event, map) {
        return function (listener, thisArgs, disposables) {
            if (thisArgs === void 0) { thisArgs = null; }
            return event(function (i) { return listener.call(thisArgs, map(i)); }, null, disposables);
        };
    }
    function forEach(event, each) {
        return function (listener, thisArgs, disposables) {
            if (thisArgs === void 0) { thisArgs = null; }
            return event(function (i) { each(i); listener.call(thisArgs, i); }, null, disposables);
        };
    }
    function filterEvent(event, filter) {
        return function (listener, thisArgs, disposables) {
            if (thisArgs === void 0) { thisArgs = null; }
            return event(function (e) { return filter(e) && listener.call(thisArgs, e); }, null, disposables);
        };
    }
    var ChainableEvent = /** @class */ (function () {
        function ChainableEvent(_event) {
            this._event = _event;
        }
        Object.defineProperty(ChainableEvent.prototype, "event", {
            get: function () { return this._event; },
            enumerable: true,
            configurable: true
        });
        ChainableEvent.prototype.map = function (fn) {
            return new ChainableEvent(mapEvent(this._event, fn));
        };
        ChainableEvent.prototype.forEach = function (fn) {
            return new ChainableEvent(forEach(this._event, fn));
        };
        ChainableEvent.prototype.filter = function (fn) {
            return new ChainableEvent(filterEvent(this._event, fn));
        };
        ChainableEvent.prototype.latch = function () {
            return new ChainableEvent(latch(this._event));
        };
        ChainableEvent.prototype.on = function (listener, thisArgs, disposables) {
            return this._event(listener, thisArgs, disposables);
        };
        return ChainableEvent;
    }());
    var Relay = /** @class */ (function () {
        function Relay() {
            this.emitter = new Emitter();
            this.event = this.emitter.event;
            this.disposable = empty$1;
        }
        Object.defineProperty(Relay.prototype, "input", {
            set: function (event) {
                this.disposable.dispose();
                this.disposable = event(this.emitter.fire, this.emitter);
            },
            enumerable: true,
            configurable: true
        });
        Relay.prototype.dispose = function () {
            this.disposable.dispose();
            this.emitter.dispose();
        };
        return Relay;
    }());
    function latch(event) {
        var firstCall = true;
        var cache;
        return filterEvent(event, function (value) {
            var shouldEmit = firstCall || value !== cache;
            firstCall = false;
            cache = value;
            return shouldEmit;
        });
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var KeyCodeStrMap = /** @class */ (function () {
        function KeyCodeStrMap() {
            this._keyCodeToStr = [];
            this._strToKeyCode = Object.create(null);
        }
        KeyCodeStrMap.prototype.define = function (keyCode, str) {
            this._keyCodeToStr[keyCode] = str;
            this._strToKeyCode[str.toLowerCase()] = keyCode;
        };
        KeyCodeStrMap.prototype.keyCodeToStr = function (keyCode) {
            return this._keyCodeToStr[keyCode];
        };
        KeyCodeStrMap.prototype.strToKeyCode = function (str) {
            return this._strToKeyCode[str.toLowerCase()] || 0 /* Unknown */;
        };
        return KeyCodeStrMap;
    }());
    var uiMap = new KeyCodeStrMap();
    var userSettingsUSMap = new KeyCodeStrMap();
    var userSettingsGeneralMap = new KeyCodeStrMap();
    (function () {
        function define(keyCode, uiLabel, usUserSettingsLabel, generalUserSettingsLabel) {
            if (usUserSettingsLabel === void 0) { usUserSettingsLabel = uiLabel; }
            if (generalUserSettingsLabel === void 0) { generalUserSettingsLabel = usUserSettingsLabel; }
            uiMap.define(keyCode, uiLabel);
            userSettingsUSMap.define(keyCode, usUserSettingsLabel);
            userSettingsGeneralMap.define(keyCode, generalUserSettingsLabel);
        }
        define(0 /* Unknown */, 'unknown');
        define(1 /* Backspace */, 'Backspace');
        define(2 /* Tab */, 'Tab');
        define(3 /* Enter */, 'Enter');
        define(4 /* Shift */, 'Shift');
        define(5 /* Ctrl */, 'Ctrl');
        define(6 /* Alt */, 'Alt');
        define(7 /* PauseBreak */, 'PauseBreak');
        define(8 /* CapsLock */, 'CapsLock');
        define(9 /* Escape */, 'Escape');
        define(10 /* Space */, 'Space');
        define(11 /* PageUp */, 'PageUp');
        define(12 /* PageDown */, 'PageDown');
        define(13 /* End */, 'End');
        define(14 /* Home */, 'Home');
        define(15 /* LeftArrow */, 'LeftArrow', 'Left');
        define(16 /* UpArrow */, 'UpArrow', 'Up');
        define(17 /* RightArrow */, 'RightArrow', 'Right');
        define(18 /* DownArrow */, 'DownArrow', 'Down');
        define(19 /* Insert */, 'Insert');
        define(20 /* Delete */, 'Delete');
        define(21 /* KEY_0 */, '0');
        define(22 /* KEY_1 */, '1');
        define(23 /* KEY_2 */, '2');
        define(24 /* KEY_3 */, '3');
        define(25 /* KEY_4 */, '4');
        define(26 /* KEY_5 */, '5');
        define(27 /* KEY_6 */, '6');
        define(28 /* KEY_7 */, '7');
        define(29 /* KEY_8 */, '8');
        define(30 /* KEY_9 */, '9');
        define(31 /* KEY_A */, 'A');
        define(32 /* KEY_B */, 'B');
        define(33 /* KEY_C */, 'C');
        define(34 /* KEY_D */, 'D');
        define(35 /* KEY_E */, 'E');
        define(36 /* KEY_F */, 'F');
        define(37 /* KEY_G */, 'G');
        define(38 /* KEY_H */, 'H');
        define(39 /* KEY_I */, 'I');
        define(40 /* KEY_J */, 'J');
        define(41 /* KEY_K */, 'K');
        define(42 /* KEY_L */, 'L');
        define(43 /* KEY_M */, 'M');
        define(44 /* KEY_N */, 'N');
        define(45 /* KEY_O */, 'O');
        define(46 /* KEY_P */, 'P');
        define(47 /* KEY_Q */, 'Q');
        define(48 /* KEY_R */, 'R');
        define(49 /* KEY_S */, 'S');
        define(50 /* KEY_T */, 'T');
        define(51 /* KEY_U */, 'U');
        define(52 /* KEY_V */, 'V');
        define(53 /* KEY_W */, 'W');
        define(54 /* KEY_X */, 'X');
        define(55 /* KEY_Y */, 'Y');
        define(56 /* KEY_Z */, 'Z');
        define(57 /* Meta */, 'Meta');
        define(58 /* ContextMenu */, 'ContextMenu');
        define(59 /* F1 */, 'F1');
        define(60 /* F2 */, 'F2');
        define(61 /* F3 */, 'F3');
        define(62 /* F4 */, 'F4');
        define(63 /* F5 */, 'F5');
        define(64 /* F6 */, 'F6');
        define(65 /* F7 */, 'F7');
        define(66 /* F8 */, 'F8');
        define(67 /* F9 */, 'F9');
        define(68 /* F10 */, 'F10');
        define(69 /* F11 */, 'F11');
        define(70 /* F12 */, 'F12');
        define(71 /* F13 */, 'F13');
        define(72 /* F14 */, 'F14');
        define(73 /* F15 */, 'F15');
        define(74 /* F16 */, 'F16');
        define(75 /* F17 */, 'F17');
        define(76 /* F18 */, 'F18');
        define(77 /* F19 */, 'F19');
        define(78 /* NumLock */, 'NumLock');
        define(79 /* ScrollLock */, 'ScrollLock');
        define(80 /* US_SEMICOLON */, ';', ';', 'OEM_1');
        define(81 /* US_EQUAL */, '=', '=', 'OEM_PLUS');
        define(82 /* US_COMMA */, ',', ',', 'OEM_COMMA');
        define(83 /* US_MINUS */, '-', '-', 'OEM_MINUS');
        define(84 /* US_DOT */, '.', '.', 'OEM_PERIOD');
        define(85 /* US_SLASH */, '/', '/', 'OEM_2');
        define(86 /* US_BACKTICK */, '`', '`', 'OEM_3');
        define(110 /* ABNT_C1 */, 'ABNT_C1');
        define(111 /* ABNT_C2 */, 'ABNT_C2');
        define(87 /* US_OPEN_SQUARE_BRACKET */, '[', '[', 'OEM_4');
        define(88 /* US_BACKSLASH */, '\\', '\\', 'OEM_5');
        define(89 /* US_CLOSE_SQUARE_BRACKET */, ']', ']', 'OEM_6');
        define(90 /* US_QUOTE */, '\'', '\'', 'OEM_7');
        define(91 /* OEM_8 */, 'OEM_8');
        define(92 /* OEM_102 */, 'OEM_102');
        define(93 /* NUMPAD_0 */, 'NumPad0');
        define(94 /* NUMPAD_1 */, 'NumPad1');
        define(95 /* NUMPAD_2 */, 'NumPad2');
        define(96 /* NUMPAD_3 */, 'NumPad3');
        define(97 /* NUMPAD_4 */, 'NumPad4');
        define(98 /* NUMPAD_5 */, 'NumPad5');
        define(99 /* NUMPAD_6 */, 'NumPad6');
        define(100 /* NUMPAD_7 */, 'NumPad7');
        define(101 /* NUMPAD_8 */, 'NumPad8');
        define(102 /* NUMPAD_9 */, 'NumPad9');
        define(103 /* NUMPAD_MULTIPLY */, 'NumPad_Multiply');
        define(104 /* NUMPAD_ADD */, 'NumPad_Add');
        define(105 /* NUMPAD_SEPARATOR */, 'NumPad_Separator');
        define(106 /* NUMPAD_SUBTRACT */, 'NumPad_Subtract');
        define(107 /* NUMPAD_DECIMAL */, 'NumPad_Decimal');
        define(108 /* NUMPAD_DIVIDE */, 'NumPad_Divide');
    })();
    var KeyCodeUtils;
    (function (KeyCodeUtils) {
        function toString(keyCode) {
            return uiMap.keyCodeToStr(keyCode);
        }
        KeyCodeUtils.toString = toString;
        function fromString(key) {
            return uiMap.strToKeyCode(key);
        }
        KeyCodeUtils.fromString = fromString;
        function toUserSettingsUS(keyCode) {
            return userSettingsUSMap.keyCodeToStr(keyCode);
        }
        KeyCodeUtils.toUserSettingsUS = toUserSettingsUS;
        function toUserSettingsGeneral(keyCode) {
            return userSettingsGeneralMap.keyCodeToStr(keyCode);
        }
        KeyCodeUtils.toUserSettingsGeneral = toUserSettingsGeneral;
        function fromUserSettings(key) {
            return userSettingsUSMap.strToKeyCode(key) || userSettingsGeneralMap.strToKeyCode(key);
        }
        KeyCodeUtils.fromUserSettings = fromUserSettings;
    })(KeyCodeUtils || (KeyCodeUtils = {}));
    function KeyChord(firstPart, secondPart) {
        var chordPart = ((secondPart & 0x0000ffff) << 16) >>> 0;
        return (firstPart | chordPart) >>> 0;
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends$3 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    /**
     * The direction of a selection.
     */
    var SelectionDirection;
    (function (SelectionDirection) {
        /**
         * The selection starts above where it ends.
         */
        SelectionDirection[SelectionDirection["LTR"] = 0] = "LTR";
        /**
         * The selection starts below where it ends.
         */
        SelectionDirection[SelectionDirection["RTL"] = 1] = "RTL";
    })(SelectionDirection || (SelectionDirection = {}));
    /**
     * A selection in the editor.
     * The selection is a range that has an orientation.
     */
    var Selection = /** @class */ (function (_super) {
        __extends$3(Selection, _super);
        function Selection(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn) {
            var _this = _super.call(this, selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn) || this;
            _this.selectionStartLineNumber = selectionStartLineNumber;
            _this.selectionStartColumn = selectionStartColumn;
            _this.positionLineNumber = positionLineNumber;
            _this.positionColumn = positionColumn;
            return _this;
        }
        /**
         * Clone this selection.
         */
        Selection.prototype.clone = function () {
            return new Selection(this.selectionStartLineNumber, this.selectionStartColumn, this.positionLineNumber, this.positionColumn);
        };
        /**
         * Transform to a human-readable representation.
         */
        Selection.prototype.toString = function () {
            return '[' + this.selectionStartLineNumber + ',' + this.selectionStartColumn + ' -> ' + this.positionLineNumber + ',' + this.positionColumn + ']';
        };
        /**
         * Test if equals other selection.
         */
        Selection.prototype.equalsSelection = function (other) {
            return (Selection.selectionsEqual(this, other));
        };
        /**
         * Test if the two selections are equal.
         */
        Selection.selectionsEqual = function (a, b) {
            return (a.selectionStartLineNumber === b.selectionStartLineNumber &&
                a.selectionStartColumn === b.selectionStartColumn &&
                a.positionLineNumber === b.positionLineNumber &&
                a.positionColumn === b.positionColumn);
        };
        /**
         * Get directions (LTR or RTL).
         */
        Selection.prototype.getDirection = function () {
            if (this.selectionStartLineNumber === this.startLineNumber && this.selectionStartColumn === this.startColumn) {
                return SelectionDirection.LTR;
            }
            return SelectionDirection.RTL;
        };
        /**
         * Create a new selection with a different `positionLineNumber` and `positionColumn`.
         */
        Selection.prototype.setEndPosition = function (endLineNumber, endColumn) {
            if (this.getDirection() === SelectionDirection.LTR) {
                return new Selection(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
            }
            return new Selection(endLineNumber, endColumn, this.startLineNumber, this.startColumn);
        };
        /**
         * Get the position at `positionLineNumber` and `positionColumn`.
         */
        Selection.prototype.getPosition = function () {
            return new Position(this.positionLineNumber, this.positionColumn);
        };
        /**
         * Create a new selection with a different `selectionStartLineNumber` and `selectionStartColumn`.
         */
        Selection.prototype.setStartPosition = function (startLineNumber, startColumn) {
            if (this.getDirection() === SelectionDirection.LTR) {
                return new Selection(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
            }
            return new Selection(this.endLineNumber, this.endColumn, startLineNumber, startColumn);
        };
        // ----
        /**
         * Create a `Selection` from one or two positions
         */
        Selection.fromPositions = function (start, end) {
            if (end === void 0) { end = start; }
            return new Selection(start.lineNumber, start.column, end.lineNumber, end.column);
        };
        /**
         * Create a `Selection` from an `ISelection`.
         */
        Selection.liftSelection = function (sel) {
            return new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
        };
        /**
         * `a` equals `b`.
         */
        Selection.selectionsArrEqual = function (a, b) {
            if (a && !b || !a && b) {
                return false;
            }
            if (!a && !b) {
                return true;
            }
            if (a.length !== b.length) {
                return false;
            }
            for (var i = 0, len = a.length; i < len; i++) {
                if (!this.selectionsEqual(a[i], b[i])) {
                    return false;
                }
            }
            return true;
        };
        /**
         * Test if `obj` is an `ISelection`.
         */
        Selection.isISelection = function (obj) {
            return (obj
                && (typeof obj.selectionStartLineNumber === 'number')
                && (typeof obj.selectionStartColumn === 'number')
                && (typeof obj.positionLineNumber === 'number')
                && (typeof obj.positionColumn === 'number'));
        };
        /**
         * Create with a direction.
         */
        Selection.createWithDirection = function (startLineNumber, startColumn, endLineNumber, endColumn, direction) {
            if (direction === SelectionDirection.LTR) {
                return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
            }
            return new Selection(endLineNumber, endColumn, startLineNumber, startColumn);
        };
        return Selection;
    }(Range));

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var shortcutEvent = Object.freeze(function (callback, context) {
        var handle = setTimeout(callback.bind(context), 0);
        return { dispose: function () { clearTimeout(handle); } };
    });
    var CancellationToken;
    (function (CancellationToken) {
        CancellationToken.None = Object.freeze({
            isCancellationRequested: false,
            onCancellationRequested: Event.None
        });
        CancellationToken.Cancelled = Object.freeze({
            isCancellationRequested: true,
            onCancellationRequested: shortcutEvent
        });
    })(CancellationToken || (CancellationToken = {}));
    var MutableToken = /** @class */ (function () {
        function MutableToken() {
            this._isCancelled = false;
        }
        MutableToken.prototype.cancel = function () {
            if (!this._isCancelled) {
                this._isCancelled = true;
                if (this._emitter) {
                    this._emitter.fire(undefined);
                    this.dispose();
                }
            }
        };
        Object.defineProperty(MutableToken.prototype, "isCancellationRequested", {
            get: function () {
                return this._isCancelled;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MutableToken.prototype, "onCancellationRequested", {
            get: function () {
                if (this._isCancelled) {
                    return shortcutEvent;
                }
                if (!this._emitter) {
                    this._emitter = new Emitter();
                }
                return this._emitter.event;
            },
            enumerable: true,
            configurable: true
        });
        MutableToken.prototype.dispose = function () {
            if (this._emitter) {
                this._emitter.dispose();
                this._emitter = undefined;
            }
        };
        return MutableToken;
    }());
    var CancellationTokenSource = /** @class */ (function () {
        function CancellationTokenSource() {
        }
        Object.defineProperty(CancellationTokenSource.prototype, "token", {
            get: function () {
                if (!this._token) {
                    // be lazy and create the token only when
                    // actually needed
                    this._token = new MutableToken();
                }
                return this._token;
            },
            enumerable: true,
            configurable: true
        });
        CancellationTokenSource.prototype.cancel = function () {
            if (!this._token) {
                // save an object by returning the default
                // cancelled token when cancellation happens
                // before someone asks for the token
                this._token = CancellationToken.Cancelled;
            }
            else if (this._token instanceof MutableToken) {
                // actually cancel
                this._token.cancel();
            }
        };
        CancellationTokenSource.prototype.dispose = function () {
            if (!this._token) {
                // ensure to initialize with an empty token if we had none
                this._token = CancellationToken.None;
            }
            else if (this._token instanceof MutableToken) {
                // actually dispose
                this._token.dispose();
            }
        };
        return CancellationTokenSource;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var Token = /** @class */ (function () {
        function Token(offset, type, language) {
            this.offset = offset | 0; // @perf
            this.type = type;
            this.language = language;
        }
        Token.prototype.toString = function () {
            return '(' + this.offset + ', ' + this.type + ')';
        };
        return Token;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    // --------------------------------------------
    // This is repeated here so it can be exported
    // because TS inlines const enums
    // --------------------------------------------
    var Severity;
    (function (Severity) {
        Severity[Severity["Ignore"] = 0] = "Ignore";
        Severity[Severity["Info"] = 1] = "Info";
        Severity[Severity["Warning"] = 2] = "Warning";
        Severity[Severity["Error"] = 3] = "Error";
    })(Severity || (Severity = {}));
    var MarkerSeverity;
    (function (MarkerSeverity) {
        MarkerSeverity[MarkerSeverity["Hint"] = 1] = "Hint";
        MarkerSeverity[MarkerSeverity["Info"] = 2] = "Info";
        MarkerSeverity[MarkerSeverity["Warning"] = 4] = "Warning";
        MarkerSeverity[MarkerSeverity["Error"] = 8] = "Error";
    })(MarkerSeverity || (MarkerSeverity = {}));
    // --------------------------------------------
    // This is repeated here so it can be exported
    // because TS inlines const enums
    // --------------------------------------------
    var KeyMod = /** @class */ (function () {
        function KeyMod() {
        }
        KeyMod.chord = function (firstPart, secondPart) {
            return KeyChord(firstPart, secondPart);
        };
        KeyMod.CtrlCmd = 2048 /* CtrlCmd */;
        KeyMod.Shift = 1024 /* Shift */;
        KeyMod.Alt = 512 /* Alt */;
        KeyMod.WinCtrl = 256 /* WinCtrl */;
        return KeyMod;
    }());
    // --------------------------------------------
    // This is repeated here so it can be exported
    // because TS inlines const enums
    // --------------------------------------------
    /**
     * Virtual Key Codes, the value does not hold any inherent meaning.
     * Inspired somewhat from https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
     * But these are "more general", as they should work across browsers & OS`s.
     */
    var KeyCode;
    (function (KeyCode) {
        /**
         * Placed first to cover the 0 value of the enum.
         */
        KeyCode[KeyCode["Unknown"] = 0] = "Unknown";
        KeyCode[KeyCode["Backspace"] = 1] = "Backspace";
        KeyCode[KeyCode["Tab"] = 2] = "Tab";
        KeyCode[KeyCode["Enter"] = 3] = "Enter";
        KeyCode[KeyCode["Shift"] = 4] = "Shift";
        KeyCode[KeyCode["Ctrl"] = 5] = "Ctrl";
        KeyCode[KeyCode["Alt"] = 6] = "Alt";
        KeyCode[KeyCode["PauseBreak"] = 7] = "PauseBreak";
        KeyCode[KeyCode["CapsLock"] = 8] = "CapsLock";
        KeyCode[KeyCode["Escape"] = 9] = "Escape";
        KeyCode[KeyCode["Space"] = 10] = "Space";
        KeyCode[KeyCode["PageUp"] = 11] = "PageUp";
        KeyCode[KeyCode["PageDown"] = 12] = "PageDown";
        KeyCode[KeyCode["End"] = 13] = "End";
        KeyCode[KeyCode["Home"] = 14] = "Home";
        KeyCode[KeyCode["LeftArrow"] = 15] = "LeftArrow";
        KeyCode[KeyCode["UpArrow"] = 16] = "UpArrow";
        KeyCode[KeyCode["RightArrow"] = 17] = "RightArrow";
        KeyCode[KeyCode["DownArrow"] = 18] = "DownArrow";
        KeyCode[KeyCode["Insert"] = 19] = "Insert";
        KeyCode[KeyCode["Delete"] = 20] = "Delete";
        KeyCode[KeyCode["KEY_0"] = 21] = "KEY_0";
        KeyCode[KeyCode["KEY_1"] = 22] = "KEY_1";
        KeyCode[KeyCode["KEY_2"] = 23] = "KEY_2";
        KeyCode[KeyCode["KEY_3"] = 24] = "KEY_3";
        KeyCode[KeyCode["KEY_4"] = 25] = "KEY_4";
        KeyCode[KeyCode["KEY_5"] = 26] = "KEY_5";
        KeyCode[KeyCode["KEY_6"] = 27] = "KEY_6";
        KeyCode[KeyCode["KEY_7"] = 28] = "KEY_7";
        KeyCode[KeyCode["KEY_8"] = 29] = "KEY_8";
        KeyCode[KeyCode["KEY_9"] = 30] = "KEY_9";
        KeyCode[KeyCode["KEY_A"] = 31] = "KEY_A";
        KeyCode[KeyCode["KEY_B"] = 32] = "KEY_B";
        KeyCode[KeyCode["KEY_C"] = 33] = "KEY_C";
        KeyCode[KeyCode["KEY_D"] = 34] = "KEY_D";
        KeyCode[KeyCode["KEY_E"] = 35] = "KEY_E";
        KeyCode[KeyCode["KEY_F"] = 36] = "KEY_F";
        KeyCode[KeyCode["KEY_G"] = 37] = "KEY_G";
        KeyCode[KeyCode["KEY_H"] = 38] = "KEY_H";
        KeyCode[KeyCode["KEY_I"] = 39] = "KEY_I";
        KeyCode[KeyCode["KEY_J"] = 40] = "KEY_J";
        KeyCode[KeyCode["KEY_K"] = 41] = "KEY_K";
        KeyCode[KeyCode["KEY_L"] = 42] = "KEY_L";
        KeyCode[KeyCode["KEY_M"] = 43] = "KEY_M";
        KeyCode[KeyCode["KEY_N"] = 44] = "KEY_N";
        KeyCode[KeyCode["KEY_O"] = 45] = "KEY_O";
        KeyCode[KeyCode["KEY_P"] = 46] = "KEY_P";
        KeyCode[KeyCode["KEY_Q"] = 47] = "KEY_Q";
        KeyCode[KeyCode["KEY_R"] = 48] = "KEY_R";
        KeyCode[KeyCode["KEY_S"] = 49] = "KEY_S";
        KeyCode[KeyCode["KEY_T"] = 50] = "KEY_T";
        KeyCode[KeyCode["KEY_U"] = 51] = "KEY_U";
        KeyCode[KeyCode["KEY_V"] = 52] = "KEY_V";
        KeyCode[KeyCode["KEY_W"] = 53] = "KEY_W";
        KeyCode[KeyCode["KEY_X"] = 54] = "KEY_X";
        KeyCode[KeyCode["KEY_Y"] = 55] = "KEY_Y";
        KeyCode[KeyCode["KEY_Z"] = 56] = "KEY_Z";
        KeyCode[KeyCode["Meta"] = 57] = "Meta";
        KeyCode[KeyCode["ContextMenu"] = 58] = "ContextMenu";
        KeyCode[KeyCode["F1"] = 59] = "F1";
        KeyCode[KeyCode["F2"] = 60] = "F2";
        KeyCode[KeyCode["F3"] = 61] = "F3";
        KeyCode[KeyCode["F4"] = 62] = "F4";
        KeyCode[KeyCode["F5"] = 63] = "F5";
        KeyCode[KeyCode["F6"] = 64] = "F6";
        KeyCode[KeyCode["F7"] = 65] = "F7";
        KeyCode[KeyCode["F8"] = 66] = "F8";
        KeyCode[KeyCode["F9"] = 67] = "F9";
        KeyCode[KeyCode["F10"] = 68] = "F10";
        KeyCode[KeyCode["F11"] = 69] = "F11";
        KeyCode[KeyCode["F12"] = 70] = "F12";
        KeyCode[KeyCode["F13"] = 71] = "F13";
        KeyCode[KeyCode["F14"] = 72] = "F14";
        KeyCode[KeyCode["F15"] = 73] = "F15";
        KeyCode[KeyCode["F16"] = 74] = "F16";
        KeyCode[KeyCode["F17"] = 75] = "F17";
        KeyCode[KeyCode["F18"] = 76] = "F18";
        KeyCode[KeyCode["F19"] = 77] = "F19";
        KeyCode[KeyCode["NumLock"] = 78] = "NumLock";
        KeyCode[KeyCode["ScrollLock"] = 79] = "ScrollLock";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the ';:' key
         */
        KeyCode[KeyCode["US_SEMICOLON"] = 80] = "US_SEMICOLON";
        /**
         * For any country/region, the '+' key
         * For the US standard keyboard, the '=+' key
         */
        KeyCode[KeyCode["US_EQUAL"] = 81] = "US_EQUAL";
        /**
         * For any country/region, the ',' key
         * For the US standard keyboard, the ',<' key
         */
        KeyCode[KeyCode["US_COMMA"] = 82] = "US_COMMA";
        /**
         * For any country/region, the '-' key
         * For the US standard keyboard, the '-_' key
         */
        KeyCode[KeyCode["US_MINUS"] = 83] = "US_MINUS";
        /**
         * For any country/region, the '.' key
         * For the US standard keyboard, the '.>' key
         */
        KeyCode[KeyCode["US_DOT"] = 84] = "US_DOT";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the '/?' key
         */
        KeyCode[KeyCode["US_SLASH"] = 85] = "US_SLASH";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the '`~' key
         */
        KeyCode[KeyCode["US_BACKTICK"] = 86] = "US_BACKTICK";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the '[{' key
         */
        KeyCode[KeyCode["US_OPEN_SQUARE_BRACKET"] = 87] = "US_OPEN_SQUARE_BRACKET";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the '\|' key
         */
        KeyCode[KeyCode["US_BACKSLASH"] = 88] = "US_BACKSLASH";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the ']}' key
         */
        KeyCode[KeyCode["US_CLOSE_SQUARE_BRACKET"] = 89] = "US_CLOSE_SQUARE_BRACKET";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         * For the US standard keyboard, the ''"' key
         */
        KeyCode[KeyCode["US_QUOTE"] = 90] = "US_QUOTE";
        /**
         * Used for miscellaneous characters; it can vary by keyboard.
         */
        KeyCode[KeyCode["OEM_8"] = 91] = "OEM_8";
        /**
         * Either the angle bracket key or the backslash key on the RT 102-key keyboard.
         */
        KeyCode[KeyCode["OEM_102"] = 92] = "OEM_102";
        KeyCode[KeyCode["NUMPAD_0"] = 93] = "NUMPAD_0";
        KeyCode[KeyCode["NUMPAD_1"] = 94] = "NUMPAD_1";
        KeyCode[KeyCode["NUMPAD_2"] = 95] = "NUMPAD_2";
        KeyCode[KeyCode["NUMPAD_3"] = 96] = "NUMPAD_3";
        KeyCode[KeyCode["NUMPAD_4"] = 97] = "NUMPAD_4";
        KeyCode[KeyCode["NUMPAD_5"] = 98] = "NUMPAD_5";
        KeyCode[KeyCode["NUMPAD_6"] = 99] = "NUMPAD_6";
        KeyCode[KeyCode["NUMPAD_7"] = 100] = "NUMPAD_7";
        KeyCode[KeyCode["NUMPAD_8"] = 101] = "NUMPAD_8";
        KeyCode[KeyCode["NUMPAD_9"] = 102] = "NUMPAD_9";
        KeyCode[KeyCode["NUMPAD_MULTIPLY"] = 103] = "NUMPAD_MULTIPLY";
        KeyCode[KeyCode["NUMPAD_ADD"] = 104] = "NUMPAD_ADD";
        KeyCode[KeyCode["NUMPAD_SEPARATOR"] = 105] = "NUMPAD_SEPARATOR";
        KeyCode[KeyCode["NUMPAD_SUBTRACT"] = 106] = "NUMPAD_SUBTRACT";
        KeyCode[KeyCode["NUMPAD_DECIMAL"] = 107] = "NUMPAD_DECIMAL";
        KeyCode[KeyCode["NUMPAD_DIVIDE"] = 108] = "NUMPAD_DIVIDE";
        /**
         * Cover all key codes when IME is processing input.
         */
        KeyCode[KeyCode["KEY_IN_COMPOSITION"] = 109] = "KEY_IN_COMPOSITION";
        KeyCode[KeyCode["ABNT_C1"] = 110] = "ABNT_C1";
        KeyCode[KeyCode["ABNT_C2"] = 111] = "ABNT_C2";
        /**
         * Placed last to cover the length of the enum.
         * Please do not depend on this value!
         */
        KeyCode[KeyCode["MAX_VALUE"] = 112] = "MAX_VALUE";
    })(KeyCode || (KeyCode = {}));
    function createMonacoBaseAPI() {
        return {
            editor: undefined,
            languages: undefined,
            CancellationTokenSource: CancellationTokenSource,
            Emitter: Emitter,
            KeyCode: KeyCode,
            KeyMod: KeyMod,
            Position: Position,
            Range: Range,
            Selection: Selection,
            SelectionDirection: SelectionDirection,
            Severity: Severity,
            MarkerSeverity: MarkerSeverity,
            Promise: TPromise,
            Uri: URI,
            Token: Token
        };
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends$4 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    /**
     * @internal
     */
    var MirrorModel = /** @class */ (function (_super) {
        __extends$4(MirrorModel, _super);
        function MirrorModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(MirrorModel.prototype, "uri", {
            get: function () {
                return this._uri;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MirrorModel.prototype, "version", {
            get: function () {
                return this._versionId;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MirrorModel.prototype, "eol", {
            get: function () {
                return this._eol;
            },
            enumerable: true,
            configurable: true
        });
        MirrorModel.prototype.getValue = function () {
            return this.getText();
        };
        MirrorModel.prototype.getLinesContent = function () {
            return this._lines.slice(0);
        };
        MirrorModel.prototype.getLineCount = function () {
            return this._lines.length;
        };
        MirrorModel.prototype.getLineContent = function (lineNumber) {
            return this._lines[lineNumber - 1];
        };
        MirrorModel.prototype.getWordAtPosition = function (position, wordDefinition) {
            var wordAtText = getWordAtText(position.column, ensureValidWordDefinition(wordDefinition), this._lines[position.lineNumber - 1], 0);
            if (wordAtText) {
                return new Range(position.lineNumber, wordAtText.startColumn, position.lineNumber, wordAtText.endColumn);
            }
            return null;
        };
        MirrorModel.prototype.getWordUntilPosition = function (position, wordDefinition) {
            var wordAtPosition = this.getWordAtPosition(position, wordDefinition);
            if (!wordAtPosition) {
                return {
                    word: '',
                    startColumn: position.column,
                    endColumn: position.column
                };
            }
            return {
                word: this._lines[position.lineNumber - 1].substring(wordAtPosition.startColumn - 1, position.column - 1),
                startColumn: wordAtPosition.startColumn,
                endColumn: position.column
            };
        };
        MirrorModel.prototype.createWordIterator = function (wordDefinition) {
            var _this = this;
            var obj = {
                done: false,
                value: ''
            };
            var lineNumber = 0;
            var lineText;
            var wordRangesIdx = 0;
            var wordRanges = [];
            var next = function () {
                if (wordRangesIdx < wordRanges.length) {
                    obj.done = false;
                    obj.value = lineText.substring(wordRanges[wordRangesIdx].start, wordRanges[wordRangesIdx].end);
                    wordRangesIdx += 1;
                }
                else if (lineNumber >= _this._lines.length) {
                    obj.done = true;
                    obj.value = undefined;
                }
                else {
                    lineText = _this._lines[lineNumber];
                    wordRanges = _this._wordenize(lineText, wordDefinition);
                    wordRangesIdx = 0;
                    lineNumber += 1;
                    return next();
                }
                return obj;
            };
            return { next: next };
        };
        MirrorModel.prototype._wordenize = function (content, wordDefinition) {
            var result = [];
            var match;
            wordDefinition.lastIndex = 0; // reset lastIndex just to be sure
            while (match = wordDefinition.exec(content)) {
                if (match[0].length === 0) {
                    // it did match the empty string
                    break;
                }
                result.push({ start: match.index, end: match.index + match[0].length });
            }
            return result;
        };
        MirrorModel.prototype.getValueInRange = function (range) {
            range = this._validateRange(range);
            if (range.startLineNumber === range.endLineNumber) {
                return this._lines[range.startLineNumber - 1].substring(range.startColumn - 1, range.endColumn - 1);
            }
            var lineEnding = this._eol;
            var startLineIndex = range.startLineNumber - 1;
            var endLineIndex = range.endLineNumber - 1;
            var resultLines = [];
            resultLines.push(this._lines[startLineIndex].substring(range.startColumn - 1));
            for (var i = startLineIndex + 1; i < endLineIndex; i++) {
                resultLines.push(this._lines[i]);
            }
            resultLines.push(this._lines[endLineIndex].substring(0, range.endColumn - 1));
            return resultLines.join(lineEnding);
        };
        MirrorModel.prototype.offsetAt = function (position) {
            position = this._validatePosition(position);
            this._ensureLineStarts();
            return this._lineStarts.getAccumulatedValue(position.lineNumber - 2) + (position.column - 1);
        };
        MirrorModel.prototype.positionAt = function (offset) {
            offset = Math.floor(offset);
            offset = Math.max(0, offset);
            this._ensureLineStarts();
            var out = this._lineStarts.getIndexOf(offset);
            var lineLength = this._lines[out.index].length;
            // Ensure we return a valid position
            return {
                lineNumber: 1 + out.index,
                column: 1 + Math.min(out.remainder, lineLength)
            };
        };
        MirrorModel.prototype._validateRange = function (range) {
            var start = this._validatePosition({ lineNumber: range.startLineNumber, column: range.startColumn });
            var end = this._validatePosition({ lineNumber: range.endLineNumber, column: range.endColumn });
            if (start.lineNumber !== range.startLineNumber
                || start.column !== range.startColumn
                || end.lineNumber !== range.endLineNumber
                || end.column !== range.endColumn) {
                return {
                    startLineNumber: start.lineNumber,
                    startColumn: start.column,
                    endLineNumber: end.lineNumber,
                    endColumn: end.column
                };
            }
            return range;
        };
        MirrorModel.prototype._validatePosition = function (position) {
            if (!Position.isIPosition(position)) {
                throw new Error('bad position');
            }
            var lineNumber = position.lineNumber, column = position.column;
            var hasChanged = false;
            if (lineNumber < 1) {
                lineNumber = 1;
                column = 1;
                hasChanged = true;
            }
            else if (lineNumber > this._lines.length) {
                lineNumber = this._lines.length;
                column = this._lines[lineNumber - 1].length + 1;
                hasChanged = true;
            }
            else {
                var maxCharacter = this._lines[lineNumber - 1].length + 1;
                if (column < 1) {
                    column = 1;
                    hasChanged = true;
                }
                else if (column > maxCharacter) {
                    column = maxCharacter;
                    hasChanged = true;
                }
            }
            if (!hasChanged) {
                return position;
            }
            else {
                return { lineNumber: lineNumber, column: column };
            }
        };
        return MirrorModel;
    }(MirrorTextModel));
    /**
     * @internal
     */
    var BaseEditorSimpleWorker = /** @class */ (function () {
        function BaseEditorSimpleWorker(foreignModuleFactory) {
            this._foreignModuleFactory = foreignModuleFactory;
            this._foreignModule = null;
        }
        // ---- BEGIN diff --------------------------------------------------------------------------
        BaseEditorSimpleWorker.prototype.computeDiff = function (originalUrl, modifiedUrl, ignoreTrimWhitespace) {
            var original = this._getModel(originalUrl);
            var modified = this._getModel(modifiedUrl);
            if (!original || !modified) {
                return null;
            }
            var originalLines = original.getLinesContent();
            var modifiedLines = modified.getLinesContent();
            var diffComputer = new DiffComputer(originalLines, modifiedLines, {
                shouldPostProcessCharChanges: true,
                shouldIgnoreTrimWhitespace: ignoreTrimWhitespace,
                shouldMakePrettyDiff: true
            });
            return TPromise.as(diffComputer.computeDiff());
        };
        BaseEditorSimpleWorker.prototype.computeDirtyDiff = function (originalUrl, modifiedUrl, ignoreTrimWhitespace) {
            var original = this._getModel(originalUrl);
            var modified = this._getModel(modifiedUrl);
            if (!original || !modified) {
                return null;
            }
            var originalLines = original.getLinesContent();
            var modifiedLines = modified.getLinesContent();
            var diffComputer = new DiffComputer(originalLines, modifiedLines, {
                shouldPostProcessCharChanges: false,
                shouldIgnoreTrimWhitespace: ignoreTrimWhitespace,
                shouldMakePrettyDiff: true
            });
            return TPromise.as(diffComputer.computeDiff());
        };
        BaseEditorSimpleWorker.prototype.computeMoreMinimalEdits = function (modelUrl, edits) {
            var model = this._getModel(modelUrl);
            if (!model) {
                return TPromise.as(edits);
            }
            var result = [];
            var lastEol;
            for (var _i = 0, edits_1 = edits; _i < edits_1.length; _i++) {
                var _a = edits_1[_i], range = _a.range, text = _a.text, eol = _a.eol;
                if (typeof eol === 'number') {
                    lastEol = eol;
                }
                if (!range) {
                    // eol-change only
                    continue;
                }
                var original = model.getValueInRange(range);
                text = text.replace(/\r\n|\n|\r/g, model.eol);
                if (original === text) {
                    // noop
                    continue;
                }
                // make sure diff won't take too long
                if (Math.max(text.length, original.length) > BaseEditorSimpleWorker._diffLimit) {
                    result.push({ range: range, text: text });
                    continue;
                }
                // compute diff between original and edit.text
                var changes = stringDiff(original, text, false);
                var editOffset = model.offsetAt(Range.lift(range).getStartPosition());
                for (var _b = 0, changes_1 = changes; _b < changes_1.length; _b++) {
                    var change = changes_1[_b];
                    var start = model.positionAt(editOffset + change.originalStart);
                    var end = model.positionAt(editOffset + change.originalStart + change.originalLength);
                    var newEdit = {
                        text: text.substr(change.modifiedStart, change.modifiedLength),
                        range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column }
                    };
                    if (model.getValueInRange(newEdit.range) !== newEdit.text) {
                        result.push(newEdit);
                    }
                }
            }
            if (typeof lastEol === 'number') {
                result.push({ eol: lastEol, text: undefined, range: undefined });
            }
            return TPromise.as(result);
        };
        // ---- END minimal edits ---------------------------------------------------------------
        BaseEditorSimpleWorker.prototype.computeLinks = function (modelUrl) {
            var model = this._getModel(modelUrl);
            if (!model) {
                return null;
            }
            return TPromise.as(computeLinks(model));
        };
        BaseEditorSimpleWorker.prototype.textualSuggest = function (modelUrl, position, wordDef, wordDefFlags) {
            var model = this._getModel(modelUrl);
            if (model) {
                var suggestions = [];
                var wordDefRegExp = new RegExp(wordDef, wordDefFlags);
                var currentWord = model.getWordUntilPosition(position, wordDefRegExp).word;
                var seen = Object.create(null);
                seen[currentWord] = true;
                for (var iter = model.createWordIterator(wordDefRegExp), e = iter.next(); !e.done && suggestions.length <= BaseEditorSimpleWorker._suggestionsLimit; e = iter.next()) {
                    var word = e.value;
                    if (seen[word]) {
                        continue;
                    }
                    seen[word] = true;
                    if (!isNaN(Number(word))) {
                        continue;
                    }
                    suggestions.push({
                        type: 'text',
                        label: word,
                        insertText: word,
                        noAutoAccept: true,
                        overwriteBefore: currentWord.length
                    });
                }
                return TPromise.as({ suggestions: suggestions });
            }
            return undefined;
        };
        // ---- END suggest --------------------------------------------------------------------------
        BaseEditorSimpleWorker.prototype.navigateValueSet = function (modelUrl, range, up, wordDef, wordDefFlags) {
            var model = this._getModel(modelUrl);
            if (!model) {
                return null;
            }
            var wordDefRegExp = new RegExp(wordDef, wordDefFlags);
            if (range.startColumn === range.endColumn) {
                range = {
                    startLineNumber: range.startLineNumber,
                    startColumn: range.startColumn,
                    endLineNumber: range.endLineNumber,
                    endColumn: range.endColumn + 1
                };
            }
            var selectionText = model.getValueInRange(range);
            var wordRange = model.getWordAtPosition({ lineNumber: range.startLineNumber, column: range.startColumn }, wordDefRegExp);
            var word = null;
            if (wordRange !== null) {
                word = model.getValueInRange(wordRange);
            }
            var result = BasicInplaceReplace.INSTANCE.navigateValueSet(range, selectionText, wordRange, word, up);
            return TPromise.as(result);
        };
        // ---- BEGIN foreign module support --------------------------------------------------------------------------
        BaseEditorSimpleWorker.prototype.loadForeignModule = function (moduleId, createData) {
            var _this = this;
            var ctx = {
                getMirrorModels: function () {
                    return _this._getModels();
                }
            };
            if (this._foreignModuleFactory) {
                this._foreignModule = this._foreignModuleFactory(ctx, createData);
                // static foreing module
                var methods = [];
                for (var prop in this._foreignModule) {
                    if (typeof this._foreignModule[prop] === 'function') {
                        methods.push(prop);
                    }
                }
                return TPromise.as(methods);
            }
            return new TPromise(function (c, e) {
                require([moduleId], function (foreignModule) {
                    _this._foreignModule = foreignModule.create(ctx, createData);
                    var methods = [];
                    for (var prop in _this._foreignModule) {
                        if (typeof _this._foreignModule[prop] === 'function') {
                            methods.push(prop);
                        }
                    }
                    c(methods);
                }, e);
            });
        };
        // foreign method request
        BaseEditorSimpleWorker.prototype.fmr = function (method, args) {
            if (!this._foreignModule || typeof this._foreignModule[method] !== 'function') {
                return TPromise.wrapError(new Error('Missing requestHandler or method: ' + method));
            }
            try {
                return TPromise.as(this._foreignModule[method].apply(this._foreignModule, args));
            }
            catch (e) {
                return TPromise.wrapError(e);
            }
        };
        // ---- END diff --------------------------------------------------------------------------
        // ---- BEGIN minimal edits ---------------------------------------------------------------
        BaseEditorSimpleWorker._diffLimit = 10000;
        // ---- BEGIN suggest --------------------------------------------------------------------------
        BaseEditorSimpleWorker._suggestionsLimit = 10000;
        return BaseEditorSimpleWorker;
    }());
    /**
     * @internal
     */
    var EditorSimpleWorkerImpl = /** @class */ (function (_super) {
        __extends$4(EditorSimpleWorkerImpl, _super);
        function EditorSimpleWorkerImpl(foreignModuleFactory) {
            var _this = _super.call(this, foreignModuleFactory) || this;
            _this._models = Object.create(null);
            return _this;
        }
        EditorSimpleWorkerImpl.prototype.dispose = function () {
            this._models = Object.create(null);
        };
        EditorSimpleWorkerImpl.prototype._getModel = function (uri) {
            return this._models[uri];
        };
        EditorSimpleWorkerImpl.prototype._getModels = function () {
            var _this = this;
            var all = [];
            Object.keys(this._models).forEach(function (key) { return all.push(_this._models[key]); });
            return all;
        };
        EditorSimpleWorkerImpl.prototype.acceptNewModel = function (data) {
            this._models[data.url] = new MirrorModel(URI.parse(data.url), data.lines, data.EOL, data.versionId);
        };
        EditorSimpleWorkerImpl.prototype.acceptModelChanged = function (strURL, e) {
            if (!this._models[strURL]) {
                return;
            }
            var model = this._models[strURL];
            model.onEvents(e);
        };
        EditorSimpleWorkerImpl.prototype.acceptRemovedModel = function (strURL) {
            if (!this._models[strURL]) {
                return;
            }
            delete this._models[strURL];
        };
        return EditorSimpleWorkerImpl;
    }(BaseEditorSimpleWorker));
    if (typeof importScripts === 'function') {
        // Running in a web worker
        globals.monaco = createMonacoBaseAPI();
    }

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends$5 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    /**
     * A helper to prevent accumulation of sequential async tasks.
     *
     * Imagine a mail man with the sole task of delivering letters. As soon as
     * a letter submitted for delivery, he drives to the destination, delivers it
     * and returns to his base. Imagine that during the trip, N more letters were submitted.
     * When the mail man returns, he picks those N letters and delivers them all in a
     * single trip. Even though N+1 submissions occurred, only 2 deliveries were made.
     *
     * The throttler implements this via the queue() method, by providing it a task
     * factory. Following the example:
     *
     * 		const throttler = new Throttler();
     * 		const letters = [];
     *
     * 		function deliver() {
     * 			const lettersToDeliver = letters;
     * 			letters = [];
     * 			return makeTheTrip(lettersToDeliver);
     * 		}
     *
     * 		function onLetterReceived(l) {
     * 			letters.push(l);
     * 			throttler.queue(deliver);
     * 		}
     */
    var Throttler = /** @class */ (function () {
        function Throttler() {
            this.activePromise = null;
            this.queuedPromise = null;
            this.queuedPromiseFactory = null;
        }
        Throttler.prototype.queue = function (promiseFactory) {
            var _this = this;
            if (this.activePromise) {
                this.queuedPromiseFactory = promiseFactory;
                if (!this.queuedPromise) {
                    var onComplete_1 = function () {
                        _this.queuedPromise = null;
                        var result = _this.queue(_this.queuedPromiseFactory);
                        _this.queuedPromiseFactory = null;
                        return result;
                    };
                    this.queuedPromise = new TPromise(function (c, e, p) {
                        _this.activePromise.then(onComplete_1, onComplete_1, p).done(c);
                    }, function () {
                        _this.activePromise.cancel();
                    });
                }
                return new TPromise(function (c, e, p) {
                    _this.queuedPromise.then(c, e, p);
                }, function () {
                    // no-op
                });
            }
            this.activePromise = promiseFactory();
            return new TPromise(function (c, e, p) {
                _this.activePromise.done(function (result) {
                    _this.activePromise = null;
                    c(result);
                }, function (err) {
                    _this.activePromise = null;
                    e(err);
                }, p);
            }, function () {
                _this.activePromise.cancel();
            });
        };
        return Throttler;
    }());
    /**
     * A helper to delay execution of a task that is being requested often.
     *
     * Following the throttler, now imagine the mail man wants to optimize the number of
     * trips proactively. The trip itself can be long, so the he decides not to make the trip
     * as soon as a letter is submitted. Instead he waits a while, in case more
     * letters are submitted. After said waiting period, if no letters were submitted, he
     * decides to make the trip. Imagine that N more letters were submitted after the first
     * one, all within a short period of time between each other. Even though N+1
     * submissions occurred, only 1 delivery was made.
     *
     * The delayer offers this behavior via the trigger() method, into which both the task
     * to be executed and the waiting period (delay) must be passed in as arguments. Following
     * the example:
     *
     * 		const delayer = new Delayer(WAITING_PERIOD);
     * 		const letters = [];
     *
     * 		function letterReceived(l) {
     * 			letters.push(l);
     * 			delayer.trigger(() => { return makeTheTrip(); });
     * 		}
     */
    var Delayer = /** @class */ (function () {
        function Delayer(defaultDelay) {
            this.defaultDelay = defaultDelay;
            this.timeout = null;
            this.completionPromise = null;
            this.onSuccess = null;
            this.task = null;
        }
        Delayer.prototype.trigger = function (task, delay) {
            var _this = this;
            if (delay === void 0) { delay = this.defaultDelay; }
            this.task = task;
            this.cancelTimeout();
            if (!this.completionPromise) {
                this.completionPromise = new TPromise(function (c) {
                    _this.onSuccess = c;
                }, function () {
                    // no-op
                }).then(function () {
                    _this.completionPromise = null;
                    _this.onSuccess = null;
                    var task = _this.task;
                    _this.task = null;
                    return task();
                });
            }
            this.timeout = setTimeout(function () {
                _this.timeout = null;
                _this.onSuccess(null);
            }, delay);
            return this.completionPromise;
        };
        Delayer.prototype.isTriggered = function () {
            return this.timeout !== null;
        };
        Delayer.prototype.cancel = function () {
            this.cancelTimeout();
            if (this.completionPromise) {
                this.completionPromise.cancel();
                this.completionPromise = null;
            }
        };
        Delayer.prototype.cancelTimeout = function () {
            if (this.timeout !== null) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
        };
        return Delayer;
    }());
    /**
     * A helper to delay execution of a task that is being requested often, while
     * preventing accumulation of consecutive executions, while the task runs.
     *
     * Simply combine the two mail man strategies from the Throttler and Delayer
     * helpers, for an analogy.
     */
    var ThrottledDelayer = /** @class */ (function (_super) {
        __extends$5(ThrottledDelayer, _super);
        function ThrottledDelayer(defaultDelay) {
            var _this = _super.call(this, defaultDelay) || this;
            _this.throttler = new Throttler();
            return _this;
        }
        ThrottledDelayer.prototype.trigger = function (promiseFactory, delay) {
            var _this = this;
            return _super.prototype.trigger.call(this, function () { return _this.throttler.queue(promiseFactory); }, delay);
        };
        return ThrottledDelayer;
    }(Delayer));
    var ShallowCancelThenPromise = /** @class */ (function (_super) {
        __extends$5(ShallowCancelThenPromise, _super);
        function ShallowCancelThenPromise(outer) {
            var _this = this;
            var completeCallback, errorCallback, progressCallback;
            _this = _super.call(this, function (c, e, p) {
                completeCallback = c;
                errorCallback = e;
                progressCallback = p;
            }, function () {
                // cancel this promise but not the
                // outer promise
                errorCallback(canceled());
            }) || this;
            outer.then(completeCallback, errorCallback, progressCallback);
            return _this;
        }
        return ShallowCancelThenPromise;
    }(TPromise));
    function isWinJSPromise(candidate) {
        return TPromise.is(candidate) && typeof candidate.done === 'function';
    }
    function always(winjsPromiseOrPromiseLike, f) {
        if (isWinJSPromise(winjsPromiseOrPromiseLike)) {
            return new TPromise(function (c, e, p) {
                winjsPromiseOrPromiseLike.done(function (result) {
                    try {
                        f(result);
                    }
                    catch (e1) {
                        onUnexpectedError(e1);
                    }
                    c(result);
                }, function (err) {
                    try {
                        f(err);
                    }
                    catch (e1) {
                        onUnexpectedError(e1);
                    }
                    e(err);
                }, function (progress) {
                    p(progress);
                });
            }, function () {
                winjsPromiseOrPromiseLike.cancel();
            });
        }
        else {
            // simple
            winjsPromiseOrPromiseLike.then(function (_) { return f(); }, function (_) { return f(); });
            return winjsPromiseOrPromiseLike;
        }
    }
    /**
     * A helper to queue N promises and run them all with a max degree of parallelism. The helper
     * ensures that at any time no more than M promises are running at the same time.
     */
    var Limiter = /** @class */ (function () {
        function Limiter(maxDegreeOfParalellism) {
            this.maxDegreeOfParalellism = maxDegreeOfParalellism;
            this.outstandingPromises = [];
            this.runningPromises = 0;
            this._onFinished = new Emitter();
        }
        Object.defineProperty(Limiter.prototype, "onFinished", {
            get: function () {
                return this._onFinished.event;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Limiter.prototype, "size", {
            get: function () {
                return this.runningPromises + this.outstandingPromises.length;
            },
            enumerable: true,
            configurable: true
        });
        Limiter.prototype.queue = function (promiseFactory) {
            var _this = this;
            return new TPromise(function (c, e, p) {
                _this.outstandingPromises.push({
                    factory: promiseFactory,
                    c: c,
                    e: e,
                    p: p
                });
                _this.consume();
            });
        };
        Limiter.prototype.consume = function () {
            var _this = this;
            while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
                var iLimitedTask = this.outstandingPromises.shift();
                this.runningPromises++;
                var promise = iLimitedTask.factory();
                promise.done(iLimitedTask.c, iLimitedTask.e, iLimitedTask.p);
                promise.done(function () { return _this.consumed(); }, function () { return _this.consumed(); });
            }
        };
        Limiter.prototype.consumed = function () {
            this.runningPromises--;
            if (this.outstandingPromises.length > 0) {
                this.consume();
            }
            else {
                this._onFinished.fire();
            }
        };
        Limiter.prototype.dispose = function () {
            this._onFinished.dispose();
        };
        return Limiter;
    }());
    /**
     * A queue is handles one promise at a time and guarantees that at any time only one promise is executing.
     */
    var Queue = /** @class */ (function (_super) {
        __extends$5(Queue, _super);
        function Queue() {
            return _super.call(this, 1) || this;
        }
        return Queue;
    }(Limiter));
    var TimeoutTimer = /** @class */ (function (_super) {
        __extends$5(TimeoutTimer, _super);
        function TimeoutTimer() {
            var _this = _super.call(this) || this;
            _this._token = -1;
            return _this;
        }
        TimeoutTimer.prototype.dispose = function () {
            this.cancel();
            _super.prototype.dispose.call(this);
        };
        TimeoutTimer.prototype.cancel = function () {
            if (this._token !== -1) {
                clearTimeout(this._token);
                this._token = -1;
            }
        };
        TimeoutTimer.prototype.cancelAndSet = function (runner, timeout) {
            var _this = this;
            this.cancel();
            this._token = setTimeout(function () {
                _this._token = -1;
                runner();
            }, timeout);
        };
        TimeoutTimer.prototype.setIfNotSet = function (runner, timeout) {
            var _this = this;
            if (this._token !== -1) {
                // timer is already set
                return;
            }
            this._token = setTimeout(function () {
                _this._token = -1;
                runner();
            }, timeout);
        };
        return TimeoutTimer;
    }(Disposable));
    var IntervalTimer = /** @class */ (function (_super) {
        __extends$5(IntervalTimer, _super);
        function IntervalTimer() {
            var _this = _super.call(this) || this;
            _this._token = -1;
            return _this;
        }
        IntervalTimer.prototype.dispose = function () {
            this.cancel();
            _super.prototype.dispose.call(this);
        };
        IntervalTimer.prototype.cancel = function () {
            if (this._token !== -1) {
                clearInterval(this._token);
                this._token = -1;
            }
        };
        IntervalTimer.prototype.cancelAndSet = function (runner, interval) {
            this.cancel();
            this._token = setInterval(function () {
                runner();
            }, interval);
        };
        return IntervalTimer;
    }(Disposable));
    /**
     * An emitter that will ignore any events that occur during a specific code
     * execution triggered via throttle() until the promise has finished (either
     * successfully or with an error). Only after the promise has finished, the
     * last event that was fired during the operation will get emitted.
     *
     */
    var ThrottledEmitter = /** @class */ (function (_super) {
        __extends$5(ThrottledEmitter, _super);
        function ThrottledEmitter() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ThrottledEmitter.prototype.throttle = function (promise) {
            var _this = this;
            this.suspended = true;
            return always(promise, function () { return _this.resume(); });
        };
        ThrottledEmitter.prototype.fire = function (event) {
            if (this.suspended) {
                this.lastEvent = event;
                this.hasLastEvent = true;
                return;
            }
            return _super.prototype.fire.call(this, event);
        };
        ThrottledEmitter.prototype.resume = function () {
            this.suspended = false;
            if (this.hasLastEvent) {
                this.fire(this.lastEvent);
            }
            this.hasLastEvent = false;
            this.lastEvent = void 0;
        };
        return ThrottledEmitter;
    }(Emitter));

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var __extends$6 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var INITIALIZE = '$initialize';
    var SimpleWorkerProtocol = /** @class */ (function () {
        function SimpleWorkerProtocol(handler) {
            this._workerId = -1;
            this._handler = handler;
            this._lastSentReq = 0;
            this._pendingReplies = Object.create(null);
        }
        SimpleWorkerProtocol.prototype.setWorkerId = function (workerId) {
            this._workerId = workerId;
        };
        SimpleWorkerProtocol.prototype.sendMessage = function (method, args) {
            var req = String(++this._lastSentReq);
            var reply = {
                c: null,
                e: null
            };
            var result = new TPromise(function (c, e, p) {
                reply.c = c;
                reply.e = e;
            }, function () {
                // Cancel not supported
            });
            this._pendingReplies[req] = reply;
            this._send({
                vsWorker: this._workerId,
                req: req,
                method: method,
                args: args
            });
            return result;
        };
        SimpleWorkerProtocol.prototype.handleMessage = function (serializedMessage) {
            var message;
            try {
                message = JSON.parse(serializedMessage);
            }
            catch (e) {
                // nothing
            }
            if (!message || !message.vsWorker) {
                return;
            }
            if (this._workerId !== -1 && message.vsWorker !== this._workerId) {
                return;
            }
            this._handleMessage(message);
        };
        SimpleWorkerProtocol.prototype._handleMessage = function (msg) {
            var _this = this;
            if (msg.seq) {
                var replyMessage = msg;
                if (!this._pendingReplies[replyMessage.seq]) {
                    console.warn('Got reply to unknown seq');
                    return;
                }
                var reply = this._pendingReplies[replyMessage.seq];
                delete this._pendingReplies[replyMessage.seq];
                if (replyMessage.err) {
                    var err = replyMessage.err;
                    if (replyMessage.err.$isError) {
                        err = new Error();
                        err.name = replyMessage.err.name;
                        err.message = replyMessage.err.message;
                        err.stack = replyMessage.err.stack;
                    }
                    reply.e(err);
                    return;
                }
                reply.c(replyMessage.res);
                return;
            }
            var requestMessage = msg;
            var req = requestMessage.req;
            var result = this._handler.handleMessage(requestMessage.method, requestMessage.args);
            result.then(function (r) {
                _this._send({
                    vsWorker: _this._workerId,
                    seq: req,
                    res: r,
                    err: undefined
                });
            }, function (e) {
                if (e.detail instanceof Error) {
                    // Loading errors have a detail property that points to the actual error
                    e.detail = transformErrorForSerialization(e.detail);
                }
                _this._send({
                    vsWorker: _this._workerId,
                    seq: req,
                    res: undefined,
                    err: transformErrorForSerialization(e)
                });
            });
        };
        SimpleWorkerProtocol.prototype._send = function (msg) {
            var strMsg = JSON.stringify(msg);
            // console.log('SENDING: ' + strMsg);
            this._handler.sendMessage(strMsg);
        };
        return SimpleWorkerProtocol;
    }());
    /**
     * Main thread side
     */
    var SimpleWorkerClient = /** @class */ (function (_super) {
        __extends$6(SimpleWorkerClient, _super);
        function SimpleWorkerClient(workerFactory, moduleId) {
            var _this = _super.call(this) || this;
            var lazyProxyFulfill = null;
            var lazyProxyReject = null;
            _this._worker = _this._register(workerFactory.create('vs/base/common/worker/simpleWorker', function (msg) {
                _this._protocol.handleMessage(msg);
            }, function (err) {
                // in Firefox, web workers fail lazily :(
                // we will reject the proxy
                lazyProxyReject(err);
            }));
            _this._protocol = new SimpleWorkerProtocol({
                sendMessage: function (msg) {
                    _this._worker.postMessage(msg);
                },
                handleMessage: function (method, args) {
                    // Intentionally not supporting worker -> main requests
                    return TPromise.as(null);
                }
            });
            _this._protocol.setWorkerId(_this._worker.getId());
            // Gather loader configuration
            var loaderConfiguration = null;
            if (typeof self.require !== 'undefined' && typeof self.require.getConfig === 'function') {
                // Get the configuration from the Monaco AMD Loader
                loaderConfiguration = self.require.getConfig();
            }
            else if (typeof self.requirejs !== 'undefined') {
                // Get the configuration from requirejs
                loaderConfiguration = self.requirejs.s.contexts._.config;
            }
            _this._lazyProxy = new TPromise(function (c, e, p) {
                lazyProxyFulfill = c;
                lazyProxyReject = e;
            }, function () { });
            // Send initialize message
            _this._onModuleLoaded = _this._protocol.sendMessage(INITIALIZE, [
                _this._worker.getId(),
                moduleId,
                loaderConfiguration
            ]);
            _this._onModuleLoaded.then(function (availableMethods) {
                var proxy = {};
                for (var i = 0; i < availableMethods.length; i++) {
                    proxy[availableMethods[i]] = createProxyMethod(availableMethods[i], proxyMethodRequest);
                }
                lazyProxyFulfill(proxy);
            }, function (e) {
                lazyProxyReject(e);
                _this._onError('Worker failed to load ' + moduleId, e);
            });
            // Create proxy to loaded code
            var proxyMethodRequest = function (method, args) {
                return _this._request(method, args);
            };
            var createProxyMethod = function (method, proxyMethodRequest) {
                return function () {
                    var args = Array.prototype.slice.call(arguments, 0);
                    return proxyMethodRequest(method, args);
                };
            };
            return _this;
        }
        SimpleWorkerClient.prototype.getProxyObject = function () {
            // Do not allow chaining promises to cancel the proxy creation
            return new ShallowCancelThenPromise(this._lazyProxy);
        };
        SimpleWorkerClient.prototype._request = function (method, args) {
            var _this = this;
            return new TPromise(function (c, e, p) {
                _this._onModuleLoaded.then(function () {
                    _this._protocol.sendMessage(method, args).then(c, e);
                }, e);
            }, function () {
                // Cancel intentionally not supported
            });
        };
        SimpleWorkerClient.prototype._onError = function (message, error) {
            console.error(message);
            console.info(error);
        };
        return SimpleWorkerClient;
    }(Disposable));
    /**
     * Worker side
     */
    var SimpleWorkerServer = /** @class */ (function () {
        function SimpleWorkerServer(postSerializedMessage, requestHandler) {
            var _this = this;
            this._requestHandler = requestHandler;
            this._protocol = new SimpleWorkerProtocol({
                sendMessage: function (msg) {
                    postSerializedMessage(msg);
                },
                handleMessage: function (method, args) { return _this._handleMessage(method, args); }
            });
        }
        SimpleWorkerServer.prototype.onmessage = function (msg) {
            this._protocol.handleMessage(msg);
        };
        SimpleWorkerServer.prototype._handleMessage = function (method, args) {
            if (method === INITIALIZE) {
                return this.initialize(args[0], args[1], args[2]);
            }
            if (!this._requestHandler || typeof this._requestHandler[method] !== 'function') {
                return TPromise.wrapError(new Error('Missing requestHandler or method: ' + method));
            }
            try {
                return TPromise.as(this._requestHandler[method].apply(this._requestHandler, args));
            }
            catch (e) {
                return TPromise.wrapError(e);
            }
        };
        SimpleWorkerServer.prototype.initialize = function (workerId, moduleId, loaderConfig) {
            var _this = this;
            this._protocol.setWorkerId(workerId);
            if (this._requestHandler) {
                // static request handler
                var methods = [];
                for (var prop in this._requestHandler) {
                    if (typeof this._requestHandler[prop] === 'function') {
                        methods.push(prop);
                    }
                }
                return TPromise.as(methods);
            }
            if (loaderConfig) {
                // Remove 'baseUrl', handling it is beyond scope for now
                if (typeof loaderConfig.baseUrl !== 'undefined') {
                    delete loaderConfig['baseUrl'];
                }
                if (typeof loaderConfig.paths !== 'undefined') {
                    if (typeof loaderConfig.paths.vs !== 'undefined') {
                        delete loaderConfig.paths['vs'];
                    }
                }
                // Since this is in a web worker, enable catching errors
                loaderConfig.catchError = true;
                self.require.config(loaderConfig);
            }
            var cc;
            var ee;
            var r = new TPromise(function (c, e, p) {
                cc = c;
                ee = e;
            });
            // Use the global require to be sure to get the global config
            self.require([moduleId], function () {
                var result = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    result[_i] = arguments[_i];
                }
                var handlerModule = result[0];
                _this._requestHandler = handlerModule.create();
                var methods = [];
                for (var prop in _this._requestHandler) {
                    if (typeof _this._requestHandler[prop] === 'function') {
                        methods.push(prop);
                    }
                }
                cc(methods);
            }, ee);
            return r;
        };
        return SimpleWorkerServer;
    }());

    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    var initialized = false;
    function initialize(foreignModule) {
        if (initialized) {
            return;
        }
        initialized = true;
        var editorWorker = new EditorSimpleWorkerImpl(foreignModule);
        var simpleWorker = new SimpleWorkerServer(function (msg) {
            self.postMessage(msg);
        }, editorWorker);
        self.onmessage = function (e) {
            simpleWorker.onmessage(e.data);
        };
    }
    self.onmessage = function (e) {
        // Ignore first message in this case and initialize if not yet initialized
        if (!initialized) {
            initialize(null);
        }
    };

    exports.initialize = initialize;

    return exports;

}({}));
