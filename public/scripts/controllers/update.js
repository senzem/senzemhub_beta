'use strict';

angular.module('senzemApp').controller('UpdateCtrl', function($scope, $log, $http, $timeout, $interval) {
	
	$scope.update=false;
	$scope.progress=false;
	$scope.done=false;
	
	
	$http.get('/getVersions').then(function(response) {
		$log.info(response);
		if (response.status == 200) {
			$scope.working = false;
			//update the devices
			$scope.versions=response.data;
			
			if (response.data.installed!=response.data.available){
				$scope.update=true;
			}
		} else {
			$log.info('ERROR status: ' + response);
			$scope.working = false;
		}
	}, function(error) {
		$log.info('ERROR: ' + error);
		$scope.working = false;
	});
	
	$scope.runUpdate=function(){
		$scope.update=false;
		$scope.progress=true;
		$http.get('/update').then(function(response) {
		$log.info(response);
		if (response.status == 200) {
			$scope.working = false;
			//update the devices
			$scope.message=response.data;
			$scope.progress=false;
			$scope.done=true;
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
