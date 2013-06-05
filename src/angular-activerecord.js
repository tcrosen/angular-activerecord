(function(angular, undefined) {
	'use strict';

	angular.module('ActiveRecord', ['ng']).factory('ActiveRecord', function($http, $q) {
		/**
		 * @class ActiveRecord
		 * @constructor
		 * @param {Object} [properties]  Initialize the record with these property values.
		 */
		var ActiveRecord = function ActiveRecord(properties) {
			this.$initialize.apply(this, arguments);
		};
		ActiveRecord.prototype = {

			/**
			 * @property {string}
			 */
			$idAttribute: 'id',

			/**
			 * @property {string}
			 */
			$urlRoot: null,

			/**
			 * Contructor logic
			 * (which is called by autogenerated contructors via ActiveRecord.extend)
			 * @param {Object} [properties]  Initialize the record with these property values.
			 */
			$initialize: function (properties) {
				if (this.$defaults) {
					angular.extend(this, this.$defaults);
				}
				if (properties) {
					angular.extend(this, properties);
				}
			},

			/**
			 * (re)load data from the backend.
			 * @param {Object} [options] sync options
			 * @return $q.promise
			 */
			$fetch: function (options) {
				var model = this;
				var deferred = $q.defer();
				this.$sync('read', this, options).then(function (response) {
					var data = model.$parse(response.data, options);
					if (typeof data === 'object') {
						angular.extend(model, data);
						deferred.resolve(model);
					} else {
						deferred.reject('Not a valid response type');
					}
				}, deferred.reject);
				return deferred.promise;
			},

			/**
			 * Save the record to the backend.
			 * @param {Object} [values] Set these values before saving the record.
			 * @param {Object} [options] sync options
			 * @return $q.promise
			 */
			$save: function (values, options) {
				if (values) {
					angular.extend(this, values);
				}
				if (this[this.$idAttribute]) {
					return this.$sync('update', this, options);
				}
				var model = this;
				return this.$sync('create', this, options).then(function (response) {
					if (angular.isObject(response.data)) {
						angular.extend(model, model.$parse(response.data, options));
					}
					return model;
				});
			},

			/**
			 * Remove the record from the backend.
			 * @param {Object} [options] sync options
			 * @return $q.promise
			 */
			$destroy: function (options) {
				return this.$sync('delete', this, options);
			},

			/**
			 *
			 */
			$url: function() {
				var urlRoot = angular.isFunction(this.$urlRoot) ? this.$urlRoot() : this.$urlRoot;
				if (typeof this[this.$idAttribute] === 'undefined') {
					return urlRoot;
				}
				if (urlRoot === null) {
					throw 'Implement this.$url() or specify this.$urlRoot';
				}
				return urlRoot + (urlRoot.charAt(urlRoot.length - 1) === '/' ? '' : '/') + encodeURIComponent(this[this.$idAttribute]);
			},

			/**
			 * Process the data from the response and return the record-properties.
			 * @param {Object} data  The data from the sync response.
			 * @param {Object} [options] sync options
			 * @return $q.promise
			 */
			$parse: function (data, options) {
				return data;
			},

			/**
			 * The counterpart to $parse.
			 * Don't call this method directly, this method is called by JSON.stringify.
			 * Override it to filter or cast the properties for use in json.
			 */
			toJSON: function () {
				return this;
			},

			/**
			 * By default calls ActiveRecord.sync
			 * Override to change the backend implementation on a per model bases.
			 */
			$sync: function (operation, model, options) {
				return ActiveRecord.sync.apply(this, arguments);
			}
		};

		/**
		 * Preform a CRUD operation on the backend.
		 *
		 * @return $q.promise
		 */
		ActiveRecord.sync = function (operation, model, options) {
			if (typeof options === 'undefined') {
				options = {};
			}
			if (!options.method) {
				var crudMapping = {
					create: 'POST',
					read: 'GET',
					update: 'PUT',
					"delete": 'DELETE'
				};
				options.method = crudMapping[operation];
			}
			if (!options.url) {
				options.url = model.$url();
			}
			if (operation === 'create' || operation === 'update') {
				options.data = model;
			}
			return $http(options);
		};

		ActiveRecord.extend = function(protoProps, staticProps) {
			var parent = this;
			var child;

			if (protoProps && typeof protoProps.$constructor === 'function') {
				child = protoProps.$constructor;
			} else {
				child = function () { return parent.apply(this, arguments); };
			}
			angular.extend(child, parent, staticProps);
			var Surrogate = function () { this.$constructor = child; };
			Surrogate.prototype = parent.prototype;
			child.prototype = new Surrogate();
			if (protoProps) {
				angular.extend(child.prototype, protoProps);
			}
			child.__super__ = parent.prototype;
			return child;
		};

		/**
		 * Load a single record.
		 *
		 * @param {Mixed} id
		 * @param {Object} [options]
		 * @return $q.promise
		 */
		ActiveRecord.fetchOne = function (id, options) {
			var model = new this();
			model[model.$idAttribute] = id;
			return model.$fetch(options);
		};

		/**
		 * Load a collection of records.
		 *
		 * @param {Object} [options]
		 * @return $q.promise
		 */
		ActiveRecord.fetchAll = function (options) {
			var ModelType = this;
			var model = new ModelType();
			var deferred = $q.defer();
			model.$sync('read', model, options).then(function (response) {
				var data = model.$parse(response.data, options);
				if (angular.isArray(data)) {
					var models = [];
					angular.forEach(data, function (item) {
						models.push(new ModelType(item));
					});
					deferred.resolve(models);
				} else {
					deferred.reject('Not a valid response, expecting an array');
				}
			}, deferred.reject);
			return deferred.promise;
		};
		return ActiveRecord;
	});
})(window.angular);