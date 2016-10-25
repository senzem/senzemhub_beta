'use strict';

/**
 * @ngdoc function
 * @name senzemApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the senzemApp
 */
angular.module('senzemApp').controller('AppCtrl', function($scope, $log, $http, $timeout, $interval) {

	$scope.state = 'INIT';
	$scope.status = {};
	$scope.devices = [];
	$scope.working = false;
	$scope.showDashboard = true;
	$scope.dashboard = {};
	$scope.dashboardFullscreen = true;
	$scope.cloud = "Select Cloud Provider";
	$scope.showNodeRed = false;
	$scope.initNodeRed = false;

	$scope.dashboardMessage = null;
	$scope.recipeTooltip = null;
	$scope.deviceTooltip = null;

	var init = function() {
		$scope.working = true;
		$http.get('/getStatus').then(function(response) {
			//$log.info(response);
			if (response.status == 200) {
				$scope.status = response.data;
				$scope.dashboard = response.data.dashboard;
				$http.get('/getDevices').then(function(response) {
					//$log.info(response);
					if (response.status == 200) {
						$scope.devices = response.data;

						$http.get('/getDashboard?dashboardId=' + $scope.status.id).then(function(response) {
							$log.info(response);
							if (response.status == 200) {
								$scope.working = false;
								//update the devices
								$scope.dashboard = response.data;
							} else {
								$log.info('ERROR status: ' + response);
								$scope.working = false;
							}
						}, function(error) {
							$log.info('ERROR: ' + error);
							$scope.working = false;
						});
					} else {
						$log.info('ERROR status: ' + response);
						$scope.working = false;
					}
				}, function(error) {
					$log.info('ERROR: ' + error);
					$scope.working = false;
				});

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	//////////////////////////////////////////////////
	//init start
	//////////////////////////////////////////////////

	init();

	$scope.toggleNodeRed = function() {
		if (!$scope.initNodeRed) {
			$scope.initNodeRed = true;
			$scope.showNodeRed = true;
			$timeout(function() {
				var nodeRedUrl = 'http://' + window.location.hostname + ":1880";

				var NODERED = angular.element(document.getElementById("NODERED"));
				NODERED.attr("src", nodeRedUrl);

			}, 200);
		} else {
			$scope.showNodeRed = !$scope.showNodeRed;
		}
	};

	$interval(function() {
		if ($scope.status.dashboardConnected) {
			$http.get('/getStatus').then(function(response) {
				$log.info(response);
				if (response.status == 200) {
					//update the devices
					$scope.status = response.data;

					$http.get('/getDevices').then(function(response) {
						//$log.info(response);
						if (response.status == 200) {
							$scope.devices = response.data;

							//refresh for each device with showServices set to true
							if ($scope.devices.length > 0) {
								$scope.devices.forEach(function(device) {
									if (device.Bconnected) {
										//$scope.working = true;
										$log.info("refreshing for " + device.peripheralId);
										$http.get('/getDevice?deviceId=' + device.peripheralId).then(function(response) {
											//$log.info(response);
											if (response.status == 200) {
												//todo
												for (var index = 0; index < $scope.devices.length; index++) {
													if ($scope.devices[index].peripheralId === device.peripheralId) {
														//var showServices = $scope.devices[index].showServices;
														$scope.devices[index] = response.data;
														$scope.devices[index].showServices = true;
													}
												}
											} else {
												$log.info('ERROR status: ' + response);
											}
										}, function(error) {
											$log.info('ERROR: ' + error);
										});
									}

								});
							}
						} else {
							$log.info('ERROR status: ' + response);
							$scope.working = false;
						}
					}, function(error) {
						$log.info('ERROR: ' + error);
						$scope.working = false;
					});

				} else {
					$log.info('ERROR status: ' + response);
				}
			}, function(error) {
				$log.info('ERROR: ' + error);
			});
		}
		if ($scope.status.dashboardConnected && $scope.showNodeRed) {
			$http.get('/getReadings').then(function(response) {
				//$log.info(response);
				if (response.status == 200) {
					//todo

					$scope.readingKeys = Object.keys(response.data);
					$scope.readingValues = response.data;
				} else {
					$log.info('ERROR status: ' + response);
				}
			}, function(error) {
				$log.info('ERROR: ' + error);
			});
		} else {
			$scope.readingKeys = {};
			$scope.readingValues = {};
		}
	}, 2000);

	//////////////////////////////////////////////////
	//init end
	//////////////////////////////////////////////////
	/*
	var formatValue = function(value, view) {
	var index = value.indexOf('|');
	var hex = value.substring(0, index);
	var string = value.substring(index + 1);

	var ret = value;
	switch(view.format) {
	case 'string':
	ret = string;
	break;
	case 'hex':
	ret = hex;
	break;
	case 'script':
	//get bytes
	var bytes = [];
	for (var i = 0; i < hex.length - 1; i += 2) {
	bytes.push(parseInt(hex.substring(i, i + 2), 16));
	}
	//evalate script
	ret = eval(view.script);
	break;
	default:
	break;
	};
	return ret;
	};

	var processDisplayData = function(device) {
	if (device.recipe != null) {
	device.recipe.view.forEach(function(view) {
	var filters = view.filter.split('|');
	device.services.forEach(function(service) {
	if (service.uuid === filters[0]) {
	service.characteristics.forEach(function(characteristic) {
	if (characteristic.uuid === filters[1]) {
	view.value = formatValue(characteristic.value, view);
	}
	});
	}
	});
	});

	}
	return device;
	};
	*/

	$scope.scan = function() {
		$log.info("Scanning...");
		$scope.state = 'SCAN';
		$scope.working = true;

		$http.get('/scan').then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.devices = response.data.devices;
				if (response.data.dashboard != null) {
					$scope.dashboard = response.data.dashboard;
				}
				$scope.working = false;
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	$scope.disconnectDevice = function(id) {
		//disconnect

		$scope.working = true;
		$http.get('/disconnect?id=' + id).then(function(response) {
			$log.info(response);
			if (response.status == 200) {

				$scope.working = false;
				$scope.devices = response.data;
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	$scope.showServices = function(device) {

		device.showServices = !device.showServices;

	};

	$scope.setCloud = function(cloud) {
		$scope.cloud = cloud;
	};

	$scope.readCharacteristic = function(deviceId, serviceId, characteristicId) {
		$log.info("Reading characteristic: ");
		$scope.working = true;
		$http.get('/readCharacteristic?deviceId=' + deviceId + '&serviceId=' + serviceId + '&characteristicId=' + characteristicId).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.working = false;

				//find this device and update
				for (var index = 0; index < $scope.devices.length; index++) {
					if ($scope.devices[index].peripheralId === deviceId) {
						var showServices = $scope.devices[index].showServices;
						$scope.devices[index] = response.data;
						$scope.devices[index].showServices = showServices;
					}
				}
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.writeCharacteristic = function(deviceId, serviceId, characteristicId, data) {
		$log.info("Writing characteristic: " + data);
		$scope.working = true;
		$http.get('/writeCharacteristic?deviceId=' + deviceId + '&serviceId=' + serviceId + '&characteristicId=' + characteristicId + '&data=' + data).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.working = false;
				//find this device and update
				for (var index = 0; index < $scope.devices.length; index++) {
					if ($scope.devices[index].peripheralId === deviceId) {
						var showServices = $scope.devices[index].showServices;
						$scope.devices[index] = response.data;
						$scope.devices[index].showServices = showServices;
					}
				}
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.readDescriptor = function(deviceId, serviceId, characteristicId, descriptorId) {
		$log.info("Reading descriptor: ");
		$scope.working = true;
		$http.get('/readDescriptor?deviceId=' + deviceId + '&serviceId=' + serviceId + '&characteristicId=' + characteristicId + '&descriptorId=' + descriptorId).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.working = false;
				//find this device and update
				for (var index = 0; index < $scope.devices.length; index++) {
					if ($scope.devices[index].peripheralId === deviceId) {
						var showServices = $scope.devices[index].showServices;
						$scope.devices[index] = response.data;
						$scope.devices[index].showServices = showServices;
					}
				}
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.toggleDescriptor = function(deviceId, serviceId, characteristicId, descriptorId) {
		$log.info("Toggling descriptor: ");
		$scope.working = true;
		$http.get('/toggleDescriptor?deviceId=' + deviceId + '&serviceId=' + serviceId + '&characteristicId=' + characteristicId + '&descriptorId=' + descriptorId).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.working = false;
				//find this device and update
				for (var index = 0; index < $scope.devices.length; index++) {
					if ($scope.devices[index].peripheralId === deviceId) {
						var showServices = $scope.devices[index].showServices;
						$scope.devices[index] = response.data;
						$scope.devices[index].showServices = showServices;
					}
				}
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.selectCharacteristic = function(deviceId, serviceId, characteristicId) {
		$log.info("GETTING " + deviceId + " " + serviceId + " " + characteristicId);
	};

	$scope.showRecipeTooltip = function(recipe, device) {
		$scope.recipeTooltip = recipe;
		$scope.deviceTooltip = device;
	};

	$scope.hideRecipeTooltip = function(recipe) {
		$scope.recipeTooltip = null;
	};

	$scope.connectDevice2 = function(deviceId) {
		$log.info("Connecting to ..." + id);
		$scope.working = true;
		$http.get('/connectDevice?deviceId=' + id).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.devices = response.data;
				$scope.working = false;
				$scope.connectedTo = id;
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.connectDevice = function(deviceId, recipeId) {
		$scope.recipeTooltip = null;
		$scope.deviceTooltip = null;
		$log.info("Connect Device ");
		$scope.working = true;
		$http.get('/scan').then(function(response) {
			if (response.status == 200) {

				$http.get('/connectDevice?deviceId=' + deviceId + '&recipeId=' + recipeId).then(function(response) {
					$log.info(response);
					if (response.status == 200) {
						$scope.working = false;
						//update the devices

						for (var i = 0; i < $scope.devices.length; i++) {
							$log.info(response.data);
							$log.info("matching " + $scope.devices[i].peripheralId + ' ' + deviceId);
							if ($scope.devices[i].peripheralId === deviceId) {

								if (response.data === "") {
									$scope.devices[i].uimessage = "Device seems to be offline. Please scan and try again.";
								} else {
									$scope.devices[i] = response.data;
									//auto show services
									$scope.devices[i].showServices = true;
								}
								break;
							}
						}

					} else {
						$log.info('ERROR status: ' + response);
						$scope.working = false;
					}
				}, function(error) {
					$log.info('ERROR: ' + error);
					$scope.working = false;
				});

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	$scope.displayDashboard = function() {

		$scope.working = true;

		$http.get('/scan').then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$scope.devices = response.data.devices;
				$scope.recipeTooltip = null;
				$scope.deviceTooltip = null;

				$scope.showDashboard = !$scope.showDashboard;
				$scope.working = false;
			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	$scope.connectDashboard = function() {
		$scope.working = true;
		var dashboardId = $scope.status.id;
		//so now we are making big recipe for this dashboard
		$log.info("Showing Dashboard " + dashboardId);

		$http.get('/scan').then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				$http.get('/connectDashboard?dashboardId=' + dashboardId).then(function(response) {
					$log.info(response);
					if (response.status == 200) {
						//update the results
						$scope.working = false;
						$scope.status = response.data.status;

						if (response.data.devices == null) {
							$scope.dashboardMessage = "None of the devices on this dashboard is available";
							$timeout(function() {
								$scope.dashboardMessage = null;
							}, 3000);
						} else {
							$scope.dashboardMessage = null;
							$scope.devices = response.data.devices;
						}

					} else {
						$log.info('ERROR status: ' + response);
						$scope.working = false;
					}
				}, function(error) {
					$log.info('ERROR: ' + error);
					$scope.working = false;
				});

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	$scope.disconnectDashboard = function() {
		$scope.working = true;
		$timeout(function() {
			$log.info("Disconnect dashboard");
			$http.get('/getStatus').then(function(response) {
				$log.info(response);
				if (response.status == 200) {
					//update the results
					if (response.data.dashboardConnected) {
						//dashboard is connected, disconnect it
						$http.get('/disconnectDashboard').then(function(response) {
							$log.info(response);
							if (response.status == 200) {
								//update the results
								$scope.status = response.data;
								$scope.working = false;

							} else {
								$log.info('ERROR status: ' + response);
								$scope.working = false;
							}
						}, function(error) {
							$log.info('ERROR: ' + error);
							$scope.working = false;
						});
					}

				} else {
					$log.info('ERROR status: ' + response);
					$scope.working = false;
				}
			}, function(error) {
				$log.info('ERROR: ' + error);
				$scope.working = false;
			});
		}, 1000);

	};

	$scope.dashboardMove = function(reading, direction) {
		//find it
		var index = -1;
		for (var i = 0; i < $scope.dashboard.readings.length; i++) {
			if ($scope.dashboard.readings[i] === reading) {
				index = i;
				break;
			}
		}
		if (index == -1) {
			return;
		}
		if (direction == 1) {
			//move up
			if (index == 0) {
				return;
			} else {
				var a = $scope.dashboard.readings[i];
				var b = $scope.dashboard.readings[i - 1];
				$scope.dashboard.readings[i - 1] = a;
				$scope.dashboard.readings[i] = b;
			}
		}
		if (direction == -1) {
			//move up
			if (index == $scope.dashboard.readings.length - 1) {
				return;
			} else {
				var a = $scope.dashboard.readings[i];
				var b = $scope.dashboard.readings[i + 1];
				$scope.dashboard.readings[i + 1] = a;
				$scope.dashboard.readings[i] = b;
			}
		}
		//update
		//$scope.working = true;
		$http.post('/updateDashboard', $scope.dashboard).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				//update the results
				$scope.dashboard = response.data;
				$scope.working = false;

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.dashboardRemove = function(reading, direction) {
		//find it
		var index = -1;
		for (var i = 0; i < $scope.dashboard.readings.length; i++) {
			if ($scope.dashboard.readings[i] === reading) {
				index = i;
				break;
			}
		}
		if (index == -1) {
			return;
		}
		$scope.dashboard.readings.splice(index, 1);
		//update
		//$scope.working = true;
		$http.post('/updateDashboard', $scope.dashboard).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				//update the results
				$scope.dashboard = response.data;
				$scope.working = false;

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.isRecipeInDashboard = function(deviceId, recipeId) {
		var ret = false;
		if ($scope.dashboard != null) {
			$scope.dashboard.readings.forEach(function(reading) {
				if (reading.deviceId == deviceId) {
					if (reading.recipeId == recipeId) {
						ret = true;

					}
				}
			});
		}
		return ret;
	};

	$scope.getDeviceName = function(deviceId) {
		var ret = null;
		if ($scope.dashboard != null) {
			$scope.dashboard.devices.forEach(function(item) {
				if (item.deviceId === deviceId) {
					ret = item.name;
				}
			});
		}
		if (ret == null) {
			$scope.devices.forEach(function(item) {
				if (item.peripheralId === deviceId) {
					ret = item.name;
				}
			});

		}
		return ret;
	};

	$scope.modifyDashboard = function(deviceId, recipeId, addReading, deviceName, recipeName) {
		$log.info('to be removed ' + deviceId + "/" + recipeId);
		if (!addReading) {
			//remove
			//find it
			var index = -1;
			for (var i = 0; i < $scope.dashboard.readings.length; i++) {
				$log.info('to be removed ' + deviceId + "/" + recipeId + " " + $scope.dashboard.readings[i].deviceId);
				if ($scope.dashboard.readings[i].deviceId === deviceId) {
					$log.info('to be removed ' + deviceId + "/" + recipeId + " " + $scope.dashboard.readings[i].deviceId + "/" + $scope.dashboard.readings[i].recipeId);

					if ($scope.dashboard.readings[i].recipeId === recipeId) {
						index = i;
						break;
					}
				}
			}
			if (index != -1) {
				$log.info('to be removed found');
				$scope.dashboard.readings.splice(index, 1);
			}
		} else {

			var newReading = {
				"name" : recipeName,
				"deviceId" : deviceId,
				"recipeId" : recipeId
			};
			$scope.dashboard.readings.push(newReading);

		}
		//update
		//$scope.working = true;
		$http.post('/updateDashboard', $scope.dashboard).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				//update the results
				$scope.dashboard = response.data;
				$scope.working = false;

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});
	};

	$scope.editDeviceName = function(device) {
		device.editName = true;
	};
	$scope.cancelEditDeviceName = function(device) {
		device.editName = false;
	};

	$scope.changeDeviceName = function(device, name) {
		//find it
		var index = -1;
		for (var i = 0; i < $scope.dashboard.devices.length; i++) {
			if ($scope.dashboard.devices[i].deviceId === device.peripheralId) {
				index = i;
				break;
			}
		}
		if (index != -1) {
			$scope.dashboard.devices[i].name = name;
		} else {
			var newDevice = {
				'deviceId' : device.peripheralId,
				'name' : name
			};
			$scope.dashboard.devices.push(newDevice);
		}
		device.editName = false;
		//submit
		$scope.working = true;
		$http.post('/updateDashboard', $scope.dashboard).then(function(response) {
			$log.info(response);
			if (response.status == 200) {
				//update the results
				$scope.dashboard = response.data;
				$scope.working = false;

			} else {
				$log.info('ERROR status: ' + response);
				$scope.working = false;
			}
		}, function(error) {
			$log.info('ERROR: ' + error);
			$scope.working = false;
		});

	};

	$scope.connectCloud = function() {
		$scope.working = true;
		$timeout(function() {
			$http.get('/connectCloud').then(function(response) {
				$log.info(response);
				if (response.status == 200) {
					//update the results
					$scope.status = response.data;
					$scope.working = false;

				} else {
					$log.info('ERROR status: ' + response);
					$scope.working = false;
				}
			}, function(error) {
				$log.info('ERROR: ' + error);
				$scope.working = false;
			});
		}, 1000);

	};

	$scope.disconnectCloud = function() {
		$scope.working = true;
		$timeout(function() {
			$http.get('/disconnectCloud').then(function(response) {
				$log.info(response);
				if (response.status == 200) {
					//update the results
					$scope.status = response.data;
					$scope.working = false;

				} else {
					$log.info('ERROR status: ' + response);
					$scope.working = false;
				}
			}, function(error) {
				$log.info('ERROR: ' + error);
				$scope.working = false;
			});
		}, 1000);
	};

	$scope.toggleRepository = function() {
		$scope.working = true;
		$timeout(function() {
			$http.get('/toggleRepository').then(function(response) {
				$log.info(response);
				if (response.status == 200) {
					//update the results
					$scope.status = response.data;
					$scope.working = false;

				} else {
					$log.info('ERROR status: ' + response);
					$scope.working = false;
				}
			}, function(error) {
				$log.info('ERROR: ' + error);
				$scope.working = false;
			});
		}, 1000);

	};

	$scope.toggleDashboardFullscreen = function() {
		$scope.dashboardFullscreen = !$scope.dashboardFullscreen;
	};
});
