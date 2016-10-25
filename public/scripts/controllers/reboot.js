'use strict';

angular.module('senzemApp').controller('RebootCtrl', function($scope, $log, $http, $timeout, $interval, $location) {

	$scope.progress = false;
	$scope.done = false;
	$scope.counter=60;

	$scope.resetDevice = function() {

		$scope.progress = true;
		
		$interval(function(){
			if ($scope.counter!=0){
				
			$scope.counter--;
			}
		}, 1000);
		
		$timeout(function(){
			$location.path("/");
		}, 60000);
		
		$http.get('/reboot').then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.working = false;
				$scope.message=response.data;
				$scope.progress = false;
				$scope.done = true;
				//update the devices
				$scope.versions = response.data;

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};
});
