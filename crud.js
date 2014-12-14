/**
 * Angular crud operations helpers intended to extend on current $scope
 * to make it easier to handle generic read/write operations transactionally
 */
/**
 * Conditionally account for requirejs if available
 */
; //defensive semi-colon
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        //define this file as a named AMD module
        define(['domReady!', 'angularSanitize', 'angular'], factory)
    } else {
        //use the global space and set this module there

        //emulate requirejs in a simplified way for getting modules
        global.require = function (name, deps, cb) {
            if (typeof name === 'string') {
                return global[name];
            }
        }

        global.crud = factory(global.domReady, global.angularSanitize, global.angular)
    }
    /**
     * Performs basic create, read, update, delete operations
     * in a uniform manner using transaction REST calls to
     * target url
     * @param domReady - primary document for applying dom operations
     * @param angularSanitize - angular extension for sanitizing calls
     * @param angular - primary angular root
     */
}(this, function (domReady, angularSanitize, angular) {
    //$this will just enclose the entire module in a local scoped variable which will be returned
    //for inclusion in the containing module

    /**
     * Crud function will extend the $scope object to simplify these common ops
     */
    var Crud = function (options) {
        /**
         * State information initial defaults for a new Crud
         */
        var defaults = {
            pending: {}, //pending crud operations to apply to the data objects. TODO: needs to be an encompassing crud txn object for child crud objects
            undo: {}, //undo all pending operations
            $http: {} //$http service from angular
        };
        var $this = this
        for (var idx in defaults) {
            this[idx] = options[idx] || defaults[idx]
        }
    }

    /**
     * Read from the target url and set targe results
     * @param readurl - url to rest query
     * @param parms - any query parms
     * @param callback - callback object for results
     * TODO: rather than store data state, it needs to defer to either the callback for storing, or have a contained child crud for storing individual results
     */
    Crud.prototype.read = function (readurl, parms, callback) {
        var $this = this
        var callback = callback
        $this.$http.post(readurl, parms).
        success(function (results, status, headers) {
            for (var i = 0; i < results.length; i++) {
                $this.undo[results[i]._id.mongoid] = results[i]
            }
            !callback || callback.success(angular.copy($this.undo), status)
        }).
        error(function (results, status, headers) {
            !callback || callback.error(results, status)
        })

    };

    /**
     * Undo all pending operations
     */
    Crud.prototype.reset = function () {
        var result = angular.copy(this.undo)
        this.pending = {}
        return result 
    };

    /**
     * Commit all pending create/update/delete operations to the updateurl
     * @param updateurl - target url handling the pending operations storage
     * @param callback - handler for results
     */
    Crud.prototype.commit = function (updateurl, callback) {
        $this = this
        this.$http.post(updateurl, this.pending).
        success(function (results, status, headers) {
            $this.undo = {}
            $this.pending = {}
            for (var i = 0; i < results.length; i++) {
                $this.undo[results[i]._id.mongoid] = results[i]
            }
            !callback || callback.success(angular.copy($this.undo), status)
            console.log(results)
        }).error(function (results, status, headers) {
            !callback || callback.error(results, status)
            console.error(results)
        })
    };

    /**
     * Create a new empty work object which can be filled in by the target data object
     */
    Crud.prototype.create = function () {
        var id = []
        for (var i = 0; i < 24; i++) {
            id.push((Math.floor(Math.random() * 16) % 16).toString(16))
        }

        var newid = id.join('')
        var dataitem = {
            _id: {
                mongoid: newid
            },
        }
        this.pending[newid] = {
            action: 'create',
            work: {},
            data: dataitem
        }
        return this.pending[newid]
    };

    /**
     * Confirm the edit changes into the pending transactional commit buffer
     * Commit call handles the sending the updated changes to the target update url handler
     * @param edit - data item to edit
     */
    Crud.prototype.update = function (work) {
        var pendingop = this.pending[work._id.mongoid] || {
            action: 'update'
        }
        pendingop.data = work
        this.pending[work._id.mongoid] = pendingop
    };

    /**
    * Delete the selected data item by storing in the pending buffer
    @ param  dataitem - item to delete
    */
    Crud.prototype.delete = function (dataitem) {
        if (this.pending[dataitem._id.mongoid] && pending[dataitem._id.mongoid].action === 'create') {
            delete this.pending[dataitem._id.mongoid] //remove pending create no need to do any action, as it was never committed
        } else {
            this.pending[dataitem._id.mongoid] = {
                action: 'delete',
                data: dataitem
            }
        }
    }
    return Crud;
}))
