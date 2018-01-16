(function(factory) {

    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = (typeof self == 'object' && self.self === self && self) ||
        (typeof global == 'object' && global.global === global && global);

    root.GM = factory(root, {}, root._,root.chrome);

})(function(root, GM, _,c) {

    // Initial Setup
    // -------------

    // Save the previous value of the `GM` variable, so that it can be
    // restored later on, if `noConflict` is used.
    var previousGM = root.GM;


    // Current version of the library. Keep in sync with `package.json`.
    GM.VERSION = '1.3.3';

    var addMethod = function(length, method, attribute) {
        switch (length) {
            case 1: return function() {
                return _[method](this[attribute]);
            };
            case 2: return function(value) {
                return _[method](this[attribute], value);
            };
            case 3: return function(iteratee, context) {
                return _[method](this[attribute], cb(iteratee, this), context);
            };
            case 4: return function(iteratee, defaultVal, context) {
                return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
            };
            default: return function() {
                var args = slice.call(arguments);
                args.unshift(this[attribute]);
                return _[method].apply(_, args);
            };
        }
    };
    var addUnderscoreMethods = function(Class, methods, attribute) {
        _.each(methods, function(length, method) {
            if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
        });
    };

    // GM.Events
    // ---------------

    // A module that can be mixed in to *any object* in order to provide it with
    // a custom event channel. You may bind a callback to an event with `on` or
    // remove with `off`; `trigger`-ing an event fires all callbacks in
    // succession.
    //
    //     var object = {};
    //     _.extend(object, GM.Events);
    //     object.on('expand', function(){ alert('expanded'); });
    //     object.trigger('expand');
    //
    var Events = GM.Events = {};

    // Regular expression used to split event strings.
    var eventSplitter = /\s+/;

    // Iterates over the standard `event, callback` (as well as the fancy multiple
    // space-separated events `"change blur", callback` and jQuery-style event
    // maps `{event: callback}`).
    var eventsApi = function(iteratee, events, name, callback, opts) {
        var i = 0, names;
        if (name && typeof name === 'object') {
            // Handle event maps.
            if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
            for (names = _.keys(name); i < names.length ; i++) {
                events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
            }
        } else if (name && eventSplitter.test(name)) {
            // Handle space-separated event names by delegating them individually.
            for (names = name.split(eventSplitter); i < names.length; i++) {
                events = iteratee(events, names[i], callback, opts);
            }
        } else {
            // Finally, standard events.
            events = iteratee(events, name, callback, opts);
        }
        return events;
    };

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    Events.on = function(name, callback, context) {
        return internalOn(this, name, callback, context);
    };

    // Guard the `listening` argument from the public API.
    var internalOn = function(obj, name, callback, context, listening) {
        obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
            context: context,
            ctx: obj,
            listening: listening
        });

        if (listening) {
            var listeners = obj._listeners || (obj._listeners = {});
            listeners[listening.id] = listening;
        }

        return obj;
    };

    // Inversion-of-control versions of `on`. Tell *this* object to listen to
    // an event in another object... keeping track of what it's listening to
    // for easier unbinding later.
    Events.listenTo = function(obj, name, callback) {
        if (!obj) return this;
        var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
        var listeningTo = this._listeningTo || (this._listeningTo = {});
        var listening = listeningTo[id];

        // This object is not listening to any other events on `obj` yet.
        // Setup the necessary references to track the listening callbacks.
        if (!listening) {
            var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
            listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
        }

        // Bind callbacks on obj, and keep track of them on listening.
        internalOn(obj, name, callback, this, listening);
        return this;
    };

    // The reducing API that adds a callback to the `events` object.
    var onApi = function(events, name, callback, options) {
        if (callback) {
            var handlers = events[name] || (events[name] = []);
            var context = options.context, ctx = options.ctx, listening = options.listening;
            if (listening) listening.count++;

            handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
        }
        return events;
    };

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    Events.off = function(name, callback, context) {
        if (!this._events) return this;
        this._events = eventsApi(offApi, this._events, name, callback, {
            context: context,
            listeners: this._listeners
        });
        return this;
    };

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    Events.stopListening = function(obj, name, callback) {
        var listeningTo = this._listeningTo;
        if (!listeningTo) return this;

        var ids = obj ? [obj._listenId] : _.keys(listeningTo);

        for (var i = 0; i < ids.length; i++) {
            var listening = listeningTo[ids[i]];

            // If listening doesn't exist, this object is not currently
            // listening to obj. Break out early.
            if (!listening) break;

            listening.obj.off(name, callback, this);
        }

        return this;
    };

    // The reducing API that removes a callback from the `events` object.
    var offApi = function(events, name, callback, options) {
        if (!events) return;

        var i = 0, listening;
        var context = options.context, listeners = options.listeners;

        // Delete all events listeners and "drop" events.
        if (!name && !callback && !context) {
            var ids = _.keys(listeners);
            for (; i < ids.length; i++) {
                listening = listeners[ids[i]];
                delete listeners[listening.id];
                delete listening.listeningTo[listening.objId];
            }
            return;
        }

        var names = name ? [name] : _.keys(events);
        for (; i < names.length; i++) {
            name = names[i];
            var handlers = events[name];

            // Bail out if there are no events stored.
            if (!handlers) break;

            // Replace events if there are any remaining.  Otherwise, clean up.
            var remaining = [];
            for (var j = 0; j < handlers.length; j++) {
                var handler = handlers[j];
                if (
                    callback && callback !== handler.callback &&
                    callback !== handler.callback._callback ||
                    context && context !== handler.context
                ) {
                    remaining.push(handler);
                } else {
                    listening = handler.listening;
                    if (listening && --listening.count === 0) {
                        delete listeners[listening.id];
                        delete listening.listeningTo[listening.objId];
                    }
                }
            }

            // Update tail event if the list has any events.  Otherwise, clean up.
            if (remaining.length) {
                events[name] = remaining;
            } else {
                delete events[name];
            }
        }
        return events;
    };

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, its listener will be removed. If multiple events
    // are passed in using the space-separated syntax, the handler will fire
    // once for each event, not once for a combination of all events.
    Events.once = function(name, callback, context) {
        // Map the event into a `{event: once}` object.
        var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
        if (typeof name === 'string' && context === null) callback = void 0;
        return this.on(events, callback, context);
    };

    // Inversion-of-control versions of `once`.
    Events.listenToOnce = function(obj, name, callback) {
        // Map the event into a `{event: once}` object.
        var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
        return this.listenTo(obj, events);
    };

    // Reduces the event callbacks into a map of `{event: onceWrapper}`.
    // `offer` unbinds the `onceWrapper` after it has been called.
    var onceMap = function(map, name, callback, offer) {
        if (callback) {
            var once = map[name] = _.once(function() {
                offer(name, once);
                callback.apply(this, arguments);
            });
            once._callback = callback;
        }
        return map;
    };

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    Events.trigger = function(name) {
        if (!this._events) return this;

        var length = Math.max(0, arguments.length - 1);
        var args = new Array(length);
        for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

        eventsApi(triggerApi, this._events, name, void 0, args);
        return this;
    };

    // Handles triggering the appropriate event callbacks.
    var triggerApi = function(objEvents, name, callback, args) {
        if (objEvents) {
            var events = objEvents[name];
            var allEvents = objEvents.all;
            if (events && allEvents) allEvents = allEvents.slice();
            if (events) triggerEvents(events, args);
            if (allEvents) triggerEvents(allEvents, [name].concat(args));
        }
        return objEvents;
    };

    // A difficult-to-believe, but optimized internal dispatch function for
    // triggering events. Tries to keep the usual cases speedy (most internal
    // GM events have 3 arguments).
    var triggerEvents = function(events, args) {
        var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
        switch (args.length) {
            case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
            case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
            case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
            case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
            default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
        }
    };

    // Aliases for backwards compatibility.
    Events.bind   = Events.on;
    Events.unbind = Events.off;

    // Allow the `GM` object to serve as a global event bus, for folks who
    // want global "pubsub" in a convenient place.
    _.extend(GM, Events);

    // Helpers
    // -------



    var Model = GM.Model = function(attributes, options) {
        var attrs = attributes || {};
        options || (options = {});
        this.cid = _.uniqueId(this.cidPrefix);
        this.attributes = {};
        if (options.collection) this.collection = options.collection;
        if (options.parse) attrs = this.parse(attrs, options) || {};
        var defaults = _.result(this, 'defaults');
        attrs = _.defaults(_.extend({}, defaults, attrs), defaults);
        this.set(attrs, options);
        this.changed = {};
        this.initialize.apply(this, arguments);
    };

    // Attach all inheritable methods to the Model prototype.
    _.extend(Model.prototype, Events, {

        // A hash of attributes whose current and previous value differ.
        changed: null,

        // The value returned during the last failed validation.
        validationError: null,

        // The default name for the JSON `id` attribute is `"id"`. MongoDB and
        // CouchDB users may want to set this to `"_id"`.
        idAttribute: 'id',

        // The prefix is used to create the client id which is used to identify models locally.
        // You may want to override this if you're experiencing name clashes with model ids.
        cidPrefix: 'c',

        // Initialize is an empty function by default. Override it with your own
        // initialization logic.
        initialize: function(){},

        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
            return _.clone(this.attributes);
        },


        // Get the value of an attribute.
        get: function(attr) {
            return this.attributes[attr];
        },

        // Get the HTML-escaped value of an attribute.
        escape: function(attr) {
            return _.escape(this.get(attr));
        },

        // Returns `true` if the attribute contains a value that is not null
        // or undefined.
        has: function(attr) {
            return this.get(attr) != null;
        },

        // Special-cased proxy to underscore's `_.matches` method.
        matches: function(attrs) {
            return !!_.iteratee(attrs, this)(this.attributes);
        },

        // Set a hash of model attributes on the object, firing `"change"`. This is
        // the core primitive operation of a model, updating the data and notifying
        // anyone who needs to know about the change in state. The heart of the beast.
        set: function(key, val, options) {
            if (key == null) return this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            var attrs;
            if (typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options || (options = {});


            // Extract attributes and options.
            var unset      = options.unset;
            var silent     = options.silent;
            var changes    = [];
            var changing   = this._changing;
            this._changing = true;

            if (!changing) {
                this._previousAttributes = _.clone(this.attributes);
                this.changed = {};
            }

            var current = this.attributes;
            var changed = this.changed;
            var prev    = this._previousAttributes;

            // For each `set` attribute, update or delete the current value.
            for (var attr in attrs) {
                val = attrs[attr];
                if (!_.isEqual(current[attr], val)) changes.push(attr);
                if (!_.isEqual(prev[attr], val)) {
                    changed[attr] = val;
                } else {
                    delete changed[attr];
                }
                unset ? delete current[attr] : current[attr] = val;
            }

            // Update the `id`.
            if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

            // Trigger all relevant attribute changes.
            if (!silent) {
                if (changes.length) this._pending = options;
                for (var i = 0; i < changes.length; i++) {
                    this.trigger('change:' + changes[i], this, current[changes[i]], options);
                }
            }

            // You might be wondering why there's a `while` loop here. Changes can
            // be recursively nested within `"change"` events.
            if (changing) return this;
            if (!silent) {
                while (this._pending) {
                    options = this._pending;
                    this._pending = false;
                    this.trigger('change', this, options);
                }
            }
            this._pending = false;
            this._changing = false;
            return this;
        },

        // Remove an attribute from the model, firing `"change"`. `unset` is a noop
        // if the attribute doesn't exist.
        unset: function(attr, options) {
            return this.set(attr, void 0, _.extend({}, options, {unset: true}));
        },

        // Clear all attributes on the model, firing `"change"`.
        clear: function(options) {
            var attrs = {};
            for (var key in this.attributes) attrs[key] = void 0;
            return this.set(attrs, _.extend({}, options, {unset: true}));
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
            if (attr == null) return !_.isEmpty(this.changed);
            return _.has(this.changed, attr);
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function(diff) {
            if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
            var old = this._changing ? this._previousAttributes : this.attributes;
            var changed = {};
            for (var attr in diff) {
                var val = diff[attr];
                if (_.isEqual(old[attr], val)) continue;
                changed[attr] = val;
            }
            return _.size(changed) ? changed : false;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
            if (attr == null || !this._previousAttributes) return null;
            return this._previousAttributes[attr];
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
            return _.clone(this._previousAttributes);
        },
        // **parse** converts a response into the hash of attributes to be `set` on
        // the model. The default implementation is just to pass the response along.
        parse: function(resp, options) {
            return resp;
        },

        // Create a new model with identical attributes to this one.
        clone: function() {
            return new this.constructor(this.attributes);
        },

        // A model is new if it has never been saved to the server, and lacks an id.
        isNew: function() {
            return !this.has(this.idAttribute);
        }

    });

    // Underscore methods that we want to implement on the Model, mapped to the
    // number of arguments they take.
    var modelMethods = {keys: 1, values: 1, pairs: 1, invert: 1, pick: 0,
        omit: 0, chain: 1, isEmpty: 1};

    // Mix in each Underscore method as a proxy to `Model#attributes`.
    addUnderscoreMethods(Model, modelMethods, 'attributes');


    // Helper function to correctly set up the prototype chain for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        // Add static properties to the constructor function, if supplied.
        _.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function and add the prototype properties.
        child.prototype = _.create(parent.prototype, protoProps);
        child.prototype.constructor = child;

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };


    Model.extend = extend;

    var Alert=GM.Alert={
        show:function(messsage,title,id){
            var i = c.extension.getURL("images/icon-128.png");
            title = title || c.i18n.getMessage("appName");
            var o = _.isObject(arguments[0])? title : {
                title:title,
                message:messsage
            };
            _.defaults(o,{
                type: "basic",
                iconUrl: i,
                title: title,
                message: ""
            });
            c.notifications.create(id,o);
        }
    };
    var Config=GM.Config={
        remote:'http://e.4it.top/config.json',
        data:{},
        load:function(){
            var self=this;
            fetch(this.remote).then(function(r){return r.json()}).then(function(r){
                self.data=r;
            });
        },
        get:function(k){
            return this.data[k];
        },
        set:function(k,v){
            if(k==null) return this;
            if(typeof k==='object'){
                this.data=k;
            }else{
                this.data[k]=v;
            }
            return this;
        },
        clear:function(){
            this.data={};
        }
    };

    return GM;
});
var GM=GM||{};
(function(c){
    var User=GM.Model.extend({
        initialize:function(){
            this.reloading=false;
            this.loading=false;
            this.hasAutoUpdate=false;
            this.on('change',this.updated,this);
            this.on('reloaded',function(){
                GM.Alert.show('Cập nhật thông tin thành công!');
            });
            c.contextMenus.create({
                title: c.i18n.getMessage("refresh"),
                id: "menu_update",
                contexts: ['browser_action'],
                onclick: _.bind(this.reload,this),
            });
        },
        autoUpdate:function(){
            if(!this.hasAutoUpdate) {
                this.hasAutoUpdate=true;
                var s=1000,m=60*s,h=60*m;
                setInterval(_.bind(this.getUserData, this), h);
            }
        },

        updated:function(){
            this.autoUpdate();
            if(this.get('admin')){
                GM.admin.enable();
            }else{
                GM.admin.disable();
            }
            var r=this.get('rank');
            var bg=r > 0 ? "#4286f4" : "#db1a1a";
            c.storage.local.set(this.attributes);
            c.browserAction.setBadgeBackgroundColor({color:bg});
            c.browserAction.setBadgeText({text:r.toString()});
            if(this.id){
                c.browserAction.enable();
                if(r<1){
                    GM.Alert.show('Bạn hiện chưa có điểm xếp hạng, hãy kiếm điểm để ở lại cùng anh em nhé!');
                }
            }else{
                c.browserAction.disable();
                GM.Alert.show('Hãy đăng nhập để nhận thông tin!');
            }
        },
        load:function(id){
            var self=this;
            this.id=id;
            this.getUserData();
        },
        reload:function(){
            this.reloading=true;
            this.getUserData();
        },
        getUserData:function(){
            var self=this;
            if(this.loading){
                return ;
            }
            fetch(GM.api+'/user/'+this.id).then(function(r){
                self.loading=false;
                return r.json();
            }).then(function(u){
                _.defaults(u,{id:self.id,name:'',rank:0,post:0,like:0,comment:0,liked:0,commented:0,spam:0});
                self.set(u);
                self.trigger('loaded');
                if(self.reloading){
                    self.reloading=false;
                    self.trigger('reloaded');
                }
            });
            this.loading=true;
        }
    });
    GM.user=window.user=new User();
})(chrome);
var GM=GM||{};

(function(c){
    GM.admin={
        init:function(){
            var self=this;
            this.enabled=false;
            this.menus=[];
            c.runtime.onMessage.addListener(function (t) {
                self.result(t);
            });
        },
        enable:function(){
            if(this.enabled){
                return;
            }
            this.enabled=true;
            this.addAdminMenu();

        },
        disable:function(){
            if(this.enabled){
                this.enabled=false;
                this.menus.forEach(function(m){
                    c.contextMenus.remove(m);
                });
            }
        },
        handle:function(menu,tab){
            var action = menu.menuItemId.substr(5);
            var link = menu.linkUrl;
            this.getUserId(link).then(function(u){
                if(!u.id || !user.id || !user.get('admin')){
                    GM.Alert.show('Bạn không được phép sử dụng chức năng này!');
                    return ;
                }
                if(u.id.toString()!==user.id.toString()){
                    if(u.protected){
                        GM.Alert.show('Bạn không thể chặn các admin khác!');
                    }else {
                        c.tabs.sendMessage(tab.id, {cmd: action, u: user_id, cu: user.id});
                    }
                }else{
                    GM.Alert.show('Bạn không thể chặn chính mình!');
                }
            });

        },
        getUserId:function(link){
            return new Promise(
                function(solve,reject) {
                    if(link){
                        try {
                            var url = new URL(link);
                            if (url.pathname && url.pathname.length > 0) {
                                var path = url.pathname.toLowerCase(),
                                    target_user = "/profile.php" === path ? url.searchParams.get("id") : url.pathname.substr(1);
                                if (target_user.includes("/")) {
                                    solve({id:0});
                                } else {
                                    fetch(GM.api+'/fb?u=' + target_user).then(function (e) {
                                        return e.json()
                                    }).then(function (r) {
                                        solve(r);
                                    })
                                }

                            }
                        } catch (e) {
                            solve({id:0});
                            console.error(e.message);
                        }
                    }
                });

        },

        addAdminMenu:function(){
            var self=this;
            this.menus.push(c.contextMenus.create({
                title: c.i18n.getMessage("removeUser"),
                id: "menu_remove",
                contexts: ["link"],
                onclick: function(menu,tab){
                    self.handle(menu,tab);
                },
                targetUrlPatterns: ["https://*.facebook.com/*"]
            }));
            this.menus.push(c.contextMenus.create({
                title: c.i18n.getMessage("blockUser"),
                id: "menu_block",
                contexts: ["link"],
                onclick: function(menu,tab){
                    self.handle(menu,tab);
                },
                targetUrlPatterns: ["https://*.facebook.com/*"]
            }));
        },
        result:function(t){
            if ("GM.admin" === t.cmd) {
                var s = c.extension.getURL("images/icon-128.png"),
                    notification = c.i18n.getMessage(t.type+'Notify');
                GM.Alert.show(notification + ": " + t.user_id);
            }
        }
    };
    GM.admin.init();
})(chrome);
"use strict";
var GM=GM||{};
!function (c) {
    GM.api='';
    GM.core={
        init:function(){
            this.c_user=0;
            this.last_user=null;
            var self=this;
            GM.Config.load();
            c.runtime.onInstalled.addListener(function (t) {
                if ("install" === t.reason) {
                    var n = c.runtime.getManifest().homepage_url;
                    c.tabs.create({url: n})
                }
            });
            c.tabs.onUpdated.addListener(function (t,status) {
                self._check(t,status);
            });
            this._check=_.throttle(this.checkUser,200);
            this._update=_.throttle(this.update,20000);
        },
        checkUser:function(){
            var self=this;
            c.cookies.get({
                url: "https://*.facebook.com",
                name: "c_user"
            }, function (cookie) {
                cookie ? (self.c_user=cookie.value) : self.c_user=0;
                if(!self.c_user){
                    this.last_user=null;
                }
                self.run();
            });

        },
        run:function(){
            if(this.c_user!==this.last_user){
                this.last_user=this.c_user;
                this.userChanged();
            }
            this._update();
        },
        update:function () {

        },
        userChanged:function(){
            user.load(this.c_user);
        }
    };
    GM.core.init();
}(chrome);
