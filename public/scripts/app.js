'use strict';

/**
 * @ngdoc overview
 * @name senzemApp
 * @description
 * # senzemApp
 *
 * Main module of the application.
 */
angular.module('senzemApp', ['ngAnimate', 'ngCookies', 'ngResource', 'ngRoute', 'ngSanitize', 'ngTouch']).config(function($routeProvider) {
	$routeProvider.when('/', {
		templateUrl : 'views/app.html',
		controller : 'AppCtrl',
		controllerAs : 'app'
	}).when('/main', {
		templateUrl : 'views/main.html',
		controller : 'MainCtrl',
		controllerAs : 'main'
	}).when('/about', {
		templateUrl : 'views/about.html',
		controller : 'AboutCtrl',
		controllerAs : 'about'
	}).when('/app', {
		templateUrl : 'views/app.html',
		controller : 'AppCtrl',
		controllerAs : 'app'
	}).when('/update', {
		templateUrl : 'views/update.html',
		controller : 'UpdateCtrl',
		controllerAs : 'update'
	}).when('/reboot', {
		templateUrl : 'views/reboot.html',
		controller : 'RebootCtrl',
		controllerAs : 'reboot'
	}).otherwise({
		redirectTo : '/'
	});
});
