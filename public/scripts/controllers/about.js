'use strict';

angular.module('senzemApp').controller('AboutCtrl', function($scope, $log, $http, $timeout, $interval) {

	$scope.uptime = "";

	$http.get('/uptime').then(function(response) {
		$log.info(response);
		if (response.status == 200) {
			$scope.working = false;
			//update the devices
			$scope.uptime = response.data;

		} else {
			$log.info('ERROR status: ' + response);
			$scope.working = false;
		}
	}, function(error) {
		$log.info('ERROR: ' + error);
		$scope.working = false;
	});
}); 