var noble = require('noble');


var express = require('express');
var bodyParser = require("body-parser");
var request = require('request');
var fs = require('fs');
var http = require('http');

var exec = require('child_process').exec;


//get btle manager instance
var BtleManager = require('./btle-manager').getBtleManager();

//create express app
var app = express();
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NOBLE CALLBACKS
//

noble.on('stateChange', function(state) {
	console.log('State changed: ' + state + " @ " + noble._bindings._hci.address);

	var address = noble._bindings._hci.address;
	address = address.replace(/:/g, "");
	BtleManager.Instance.status.id = address;
});


noble.on('discover', function(peripheral) {

	var device = {};

	device.name = peripheral.advertisement.localName;
	
	device.time = (new Date()).getTime();
	device.peripheralId = peripheral.id;
	device.address = peripheral.address;
	device.addressType = peripheral.addressType;
	device.connectable = peripheral.connectable;
	device.rssi = peripheral.rssi;
	
	device.icon = BtleManager.getIcon(device.peripheralId);

	console.log('Peripheral discovered (' + peripheral.id + ' with address <' + peripheral.address + ', ' + peripheral.addressType + '>,' + ' connectable ' + peripheral.connectable + ',' + ' RSSI ' + peripheral.rssi + ':');
	console.log('\tlocal name:');
	console.log('\t\t' + peripheral.advertisement.localName);
	console.log('\tadvertised services:');
	console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));
	console.log('\timage:');
	console.log('\t\t' + device.icon);


	var serviceData = peripheral.advertisement.serviceData;
	if (serviceData && serviceData.length) {
		console.log('\tservice data:');
		for (var i in serviceData) {
			console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': ' + JSON.stringify(serviceData[i].data.toString('hex')));
		}
	}
	if (peripheral.advertisement.manufacturerData) {
		console.log('\tmanufacturer data:');
		console.log('\t\t' + JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex')));
	}
	if (peripheral.advertisement.txPowerLevel != undefined) {
		console.log('\TX power level:');
		console.log('\t\t' + peripheral.advertisement.txPowerLevel);
	}

	//get recipes
	device.recipes = BtleManager.getRecipes(device.peripheralId);
	
	console.log();
	//push new device
	if (device.name != 'undefined' && device.name != '') {
		BtleManager.Instance.devices.push(device);
		BtleManager.Instance.peripherals.push(peripheral);
	}

});



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MAIN
//

var processData = function(device, characteristic) {
	//process data
	device.recipe.view.forEach(function(view) {
		var filters = view.filter.split('|');
		device.services.forEach(function(service) {
			if (service.uuid === filters[0]) {
				service.characteristics.forEach(function(item) {
					if (item.uuid === characteristic.uuid) {
						view.value = BtleManager.formatValue(item.value, view.format, view.script);
						//console.log(">>>>> " + view.reading.name + ":" + view.reading.deviceName + ":" + view.reading.deviceId + ":" + view.value);
						console.log(view);
						var readingName = view.name + "@" + view.reading.deviceId;
						BtleManager.Instance.readings[readingName] = {
							value : view.value,
							deviceName : view.reading.deviceName,
							name : view.reading.name
						};
						if (BtleManager.Instance.status.cloudConnected) {
							var name = view.reading.name + "." + view.reading.deviceName + "." + view.reading.deviceId;
							//name = name.replace(' ', '_');
							var value = view.reading.value;
							BtleManager.Instance.payload.d[name] = view.value;
							if (BtleManager.Instance.status.lastUploadTime === 0) {
								BtleManager.Instance.status.lastUploadTime = (new Date()).getTime();
							} else {
								var currentTime = (new Date()).getTime();
								if (currentTime - BtleManager.Instance.status.lastUploadTime > BtleManager.Instance.UPLOAD_PERIOD) {
									//add last rssi available
									BtleManager.Instance.payload.d["rssi." + view.reading.deviceName + "." + view.reading.deviceId] = device.rssi;

									request.post('https://quickstart.internetofthings.ibmcloud.com/api/v0002/device/types/version1/devices/' + BtleManager.Instance.status.id + '/events/sensor', {
										json : BtleManager.Instance.payload
									}, function(error, response, body) {
										if (!error && response.statusCode == 200) {
											console.log("UPLOADED");
											BtleManager.Instance.payload.d = {};
											BtleManager.Instance.status.lastUploadTime = (new Date()).getTime();
										} else {
											console.log("Upload error " + response.statusCode);
										}
									});
								}
							}
						}

					}
				});
			}
		});
	});

};

var callbackCharacteristic = function(characteristic) {
	characteristic.on('data', function(data, isNotification) {

		if (isNotification) {
			BtleManager.Instance.devices.forEach(function(device) {
				if (device.peripheralId === characteristic._peripheralId) {
					device.services.forEach(function(service) {
						if (service.uuid === characteristic._serviceUuid) {
							service.characteristics.forEach(function(item) {
								if (item.uuid === characteristic.uuid) {
									if (data) {
										var string = data.toString('ascii');
										var characteristicInfo = data.toString('hex') + '|' + string;
										console.log("###C@" + characteristic.uuid + " = " + characteristicInfo);
										//console.log("Refresh char: " + characteristicInfo);
										item.value = characteristicInfo;
										processData(device, characteristic);
									}
								}
							});
						}
					});
				}
			});
		}

	});
};



var updateDeviceListOnDashboard = function(devices) {
	var dashboardId = BtleManager.Instance.status.id;
	fs.readFile('public/local/' + dashboardId + '.json', 'utf8', function(err, data) {
		if (err) {
			console.log('ERROR: reading dashboard id ' + dashboardId);
			return dashboard;
		};
		console.log('OK: reading dashboard id ' + dashboardId);
		var dashboard = JSON.parse(data);

		//TODO ovde napravi dashboardDevices koji su available a koji nisu

		devices.forEach(function(device) {
			var index = -1;
			for (var i = 0; i < dashboard.devices.length; i++) {
				if (dashboard.devices[i].deviceId === device.peripheralId) {
					index = i;
					break;
				}
			}
			if (index == -1) {
				//initial
				var newDevice = {
					deviceId : device.peripheralId,
					name : device.name,
					firstDetected : (new Date()).getTime()
				};
				dashboard.devices.push(newDevice);
				fs.writeFile('public/local/' + dashboard.uuid + '.json', JSON.stringify(dashboard, null, 3), function(err) {
					if (err) {
						return console.log(err);
					}

					console.log("The file was saved!");
					return dashboard;

				});
			} else {
				return null;
			}
		});
	});

};

var scan = function() {
	return new Promise(function(resolveGlobal, rejectGlobal) {
		BtleManager.Instance.devices = [];
		BtleManager.Instance.peripherals = [];
		BtleManager.Instance.status.scan++;
		console.log('Start scanning...');
		noble.startScanning();
		setTimeout(function() {
			console.log('Done');
			noble.stopScanning();
			//update list of devices
			var dashboard = updateDeviceListOnDashboard(BtleManager.Instance.devices);
			var ret = {
				devices : BtleManager.Instance.devices,
				dashboard : dashboard
			};
			resolveGlobal(ret);
		}, 1000);
	});
};


var callbackDescriptor = function(descriptor) {
	descriptor.on('valueRead', function(data) {
		console.log("### D read from " + descriptor.uuid);

	});
};




var disconnectDevice = function(peripheralId) {
	console.log("Disconnecting device " + peripheralId);
	return new Promise(function(resolveGlobal, rejectGlobal) {

		var peripheral = null;
		var device = null;

		console.log("finding " + peripheralId);
		BtleManager.Instance.peripherals.forEach(function(item) {
			if (item.id === peripheralId) {
				console.log('Found peripheral!');
				peripheral = item;
			}
		});

		var index = -1;
		for ( i = 0; i < BtleManager.Instance.devices.length; i++) {
			var item = BtleManager.Instance.devices[i];
			if (item.peripheralId === peripheralId) {
				console.log('Found device!');
				index = i;
				break;
			}
		};

		peripheral.disconnect(function(error) {
			console.log('disconneting peripheral: ' + peripheral.uuid + " - " + error);

			
			console.log('disconnected from peripheral: ' + peripheral.uuid);
			console.log("DONE");
			BtleManager.Instance.state = 'DEVICES';

			BtleManager.Instance.devices[index].Bconnected = false;
			resolveGlobal(BtleManager.Instance.devices);
		});

	});
};


var connectToDevice = function(deviceId, recipe) {

	return new Promise(function(resolveGlobal, rejectGlobal) {
		var foundDevice = false;
		BtleManager.Instance.peripherals.forEach(function(peripheral) {
			if (peripheral.id === deviceId) {
				console.log('Found peripheral!');

				BtleManager.Instance.devices.forEach(function(device) {
					if (device.peripheralId == deviceId) {
						console.log('Found device!');
						foundDevice = true;

						//console.log(device.recipes);

						peripheral.connect(function(error) {
							console.log('connected to peripheral: ' + peripheral.uuid + ' error: ' + error);

							setTimeout(function() {//STABILITY timeout 2000ms
								peripheral.discoverAllServicesAndCharacteristics(function(error, services, characteristics) {
									device.services = [];
									console.log("discoverAllServicesAndCharacteristics " + error);
									for (var i = 0; i < services.length; i++) {
										//console.log('  ' + i + ' uuid: ' + services[i].uuid);
										//console.log(services[i]);
										var serviceInfo = {
											uuid : services[i].uuid,
											characteristics : [],
											name : services[i].name
										};

										if (recipe != null) {
											if (recipe.include) {
												var match = false;
												recipe.include.forEach(function(filter) {
													if (filter.type === 'service') {
														if (filter.filter === serviceInfo.uuid) {
															match = true;
														}
													} else if (filter.type === 'characteristic') {
														var filters = filter.filter.split('|');

														if (filters[0] === serviceInfo.uuid) {
															match = true;
														}
													}
												});
												if (!match) {
													//get next service
													continue;
												}
											}
										}

										for (var j = 0; j < characteristics.length; j++) {
											//console.log('  ' + j + ' uuid: ' + characteristics[j].uuid + ' ' + characteristics[j]._serviceUuid);
											if (characteristics[j]._serviceUuid == services[i].uuid) {
												var characteristicInfo = {
													uuid : characteristics[j].uuid,
													properties : characteristics[j].properties,
													name : characteristics[j].name,
													value : 'N/A',
													descriptors : characteristics[j]
												};

												//filter characteristic
												if (recipe != null) {
													if (recipe.include) {
														var match = false;
														recipe.include.forEach(function(filter) {
															if (filter.type === 'service') {
																if (filter.filter === serviceInfo.uuid) {
																	match = true;
																}
															} else if (filter.type === 'characteristic') {
																var filters = filter.filter.split('|');

																if (filters[0] === serviceInfo.uuid) {
																	if (filters[1] === characteristicInfo.uuid) {
																		match = true;
																	}
																}
															}
														});
														if (!match) {
															//get next service
															continue;
														}
													}
												}

												callbackCharacteristic(characteristics[j]);
												serviceInfo.characteristics.push(characteristicInfo);

											}
										}

										device.services.push(serviceInfo);

									}
									//done filtering

									console.log("DONE, getting Descriptors");
									var descriptorPromises = [];

									for (var i = 0; i < device.services.length; i++) {
										for (var j = 0; j < device.services[i].characteristics.length; j++) {
											descriptorPromises.push(new Promise(function(resolve, reject) {
												//console.log("Add descriptor " + i + " " + j);
												var ii = i;
												var jj = j;
												device.services[i].characteristics[jj].descriptors.discoverDescriptors(function(error, descriptors) {

													//console.log("Got descriptor " + ii + " " + jj);
													device.services[ii].characteristics[jj].descriptors = [];
													for (var k = 0; k < descriptors.length; k++) {

														var descriptorInfo = {
															uuid : descriptors[k].uuid,
														};

														if (descriptorInfo.uuid == '2902') {
															descriptorInfo.name = 'Toggle Notification';
														};

														//callback
														callbackDescriptor(descriptors[k]);

														device.services[ii].characteristics[jj].descriptors.push(descriptorInfo);
													}

													resolve();
												});

											}));
										}

									}
									Promise.all(descriptorPromises).then(function() {
										console.log("DONE2");

										//set this device as connected
										device.Bconnected = true;
										device.recipe = recipe;

										//init the device
										if (recipe != null) {
											console.log("INIT Device");
											var instructionPromises = [];

											while (recipe.init.length > 0) {
												var instruction = recipe.init.shift();
												switch(instruction) {
												case 'READCHARACTERISTIC':
													instructionPromises.push(BtleManager.readCharacteristic(deviceId, recipe.init.shift(), recipe.init.shift()));
													break;
												case 'ENABLENOTIFICATION':
													instructionPromises.push(BtleManager.toggleNotification(deviceId, recipe.init.shift(), recipe.init.shift(), true));
													break;
												case 'WRITECHARACTERISTIC':
													instructionPromises.push(BtleManager.writeCharacteristic(deviceId, recipe.init.shift(), recipe.init.shift(), recipe.init.shift()));
													break;
												case 'END':
													break;
												default:
													break;
												}
											}
											console.log("Instruction promises count: " + instructionPromises.length);
											Promise.all(instructionPromises).then(function() {
												console.log("DONE3");

												resolveGlobal(device);
											}, function(error) {
												console.log("Error with instruction promises:");
												console.log(error);
											});

										} else {

											resolveGlobal(device);
										}
									}, function(error) {
										console.log('FAIL');
										console.log(error);
									});

								});

							}, 2000);

						});
					}

				});
			}
		});
		if (!foundDevice) {
			resolveGlobal(null);
		}

	});

};


var connectToDashboard = function(dashboard) {
	BtleManager.Instance.readings = {};
	return new Promise(function(resolveGlobal, rejectGlobal) {
		var recipes = [];
		dashboard.readings.forEach(function(reading) {

			dashboard.devices.forEach(function(device) {
				if (device.deviceId === reading.deviceId) {
					reading.deviceName = device.name;
				}
			});

			//find this reading recipe
			var deviceRecipes = BtleManager.getRecipes(reading.deviceId);
			var matchedDeviceRecipe = null;
			deviceRecipes.forEach(function(deviceRecipe) {
				//console.log("looking for " + deviceRecipe.uuid + "/" + reading.recipeId);
				if (deviceRecipe.uuid === reading.recipeId) {
					matchedDeviceRecipe = deviceRecipe;
				}
			});

			if (matchedDeviceRecipe != null) {
				//console.log("Found matching device recipe");
				//now add it to dashboard recipe

				var currentDeviceRecipeIndex = -1;
				for (var index = 0; index < recipes.length; index++) {
					if (recipes[index].deviceId === reading.deviceId) {
						currentDeviceRecipeIndex = index;
						break;
					}
				}

				if (currentDeviceRecipeIndex == -1) {
					matchedDeviceRecipe.deviceId = reading.deviceId;
					matchedDeviceRecipe.view.forEach(function(item) {

						item.reading = reading;
					});
					recipes.push(matchedDeviceRecipe);

				} else {
					//combine recipes for this device
					matchedDeviceRecipe.include.forEach(function(item) {
						recipes[currentDeviceRecipeIndex].include.push(item);
					});
					matchedDeviceRecipe.view.forEach(function(item) {
						item.reading = reading;
						recipes[currentDeviceRecipeIndex].view.push(item);
					});
					matchedDeviceRecipe.init.forEach(function(item) {
						recipes[currentDeviceRecipeIndex].init.push(item);
					});
				}

			}

		});

		//we have all recipes combined, now just connect and return

		console.log("Connecting...");
		var promises = [];

		BtleManager.Instance.devicesToConnect = [];

		recipes.forEach(function(recipe) {

			for (var i = 0; i < BtleManager.Instance.devices.length; i++) {
				if (BtleManager.Instance.devices[i].peripheralId === recipe.deviceId) {
					var promise = connectToDevice(recipe.deviceId, recipe);
					BtleManager.Instance.devicesToConnect.push(recipe.deviceId);
					promises.push(promise);

					console.log("Schedule: Connecting to " + recipe.deviceId);
				}
			}

		});

		console.log(BtleManager.Instance.devicesToConnect);
		//check if any of devices is available

		if (!BtleManager.Instance.devicesToConnect.length) {
			console.log("NO AVAILABLE DEVICES");
			BtleManager.Instance.status.dashboardConnected = false;
			var ret = {
				'devices' : null,
				'status' : BtleManager.Instance.status
			};
			resolveGlobal(ret);
		} else {
			console.log("Connecting to " + promises.length + " device(s)");
			Promise.all(promises).then(function() {
				BtleManager.Instance.status.dashboardConnected = true;
				BtleManager.Instance.status.dashboard = dashboard;
				BtleManager.Instance.status.dashboardConnectionTime = (new Date()).getTime();

				var indexes = [];
				//map dashboard views
				for (var dashboardReadingIndex = 0; dashboardReadingIndex < dashboard.readings.length; dashboardReadingIndex++) {
					var deviceIndex = -1;
					var viewIndex = -1;
					for (var i = 0; i < BtleManager.Instance.devices.length; i++) {
						if (BtleManager.Instance.devices[i].peripheralId === dashboard.readings[dashboardReadingIndex].deviceId) {
							deviceIndex = i;
							break;
						}
					}
					if (deviceIndex > -1) {
						//find view index
						for (var j = 0; j < BtleManager.Instance.devices[deviceIndex].recipe.view.length; j++) {
							if (BtleManager.Instance.devices[deviceIndex].recipe.view[j].reading.recipeId === dashboard.readings[dashboardReadingIndex].recipeId) {
								viewIndex = j;
								break;
							}
						}
					}
					if (viewIndex > -1) {
						var newIndex = {
							'deviceIndex' : deviceIndex,
							'viewIndex' : viewIndex
						};
						indexes.push(newIndex);
					}
				}
				BtleManager.Instance.status.dashboard.indexes = indexes;
				var ret = {
					'devices' : BtleManager.Instance.devices,
					'status' : BtleManager.Instance.status
				};

				resolveGlobal(ret);
			});
		}
	});
};

var disconnectFromDashboard = function() {
	BtleManager.Instance.readings = {};
	return new Promise(function(resolveGlobal, rejectGlobal) {
		var promises = [];
		if (BtleManager.Instance.status.dashboardConnected) {
			//BtleManager.Instance.status.dashboard.readings.forEach(function(reading) {
			//	promises.push(disconnectDevice(reading.deviceId));
			//});
			BtleManager.Instance.devicesToConnect.forEach(function(deviceId) {
				promises.push(disconnectDevice(deviceId));
			});
		}

		Promise.all(promises).then(function() {
			BtleManager.Instance.status.dashboardConnected = false;
			BtleManager.Instance.status.dashboard = null;
			BtleManager.Instance.status.dashboardConnectionTime = 0;
			resolveGlobal(BtleManager.Instance.status);
		});
	});
};

var autoScanAndConnect = function() {
	if (!BtleManager.Instance.status.dashboardConnected) {
		console.log("---------------------> TASK");
		BtleManager.Instance.status.autoOn = true;
		scan().then(function(scanResults) {
			if (scanResults.devices.length > 0) {
				var dashboard = {};
				fs.readFile('public/local/' + BtleManager.Instance.status.id + '.json', 'utf8', function(err, data) {
					if (err) {
						console.log('ERROR: reading dashboard id ' + BtleManager.Instance.status.id);
						return dashboard;
					};
					console.log('OK: reading dashboard id ' + BtleManager.Instance.status.id);
					dashboard = JSON.parse(data);

					//now we have the dashboard
					//let's compile dashboard recipe

					console.log('-------------> AUTO CONNECTED TO DASHBOARD');
					connectToDashboard(dashboard).then(function(ret) {
						setTimeout(function() {
							console.log('-------------> AUTO DISCONNECT FROM DASHBOARD');
							disconnectFromDashboard().then(function() {
								BtleManager.Instance.status.autoOn = false;
							});
						}, BtleManager.Instance.AUTO_SCAN_LENGTH);
					});
				});
			} else {
				BtleManager.Instance.status.autoOn = false;
			}
		});
	} else {
		console.log("---------------------> TASK SKIP");
	}

};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SERVER API
//


app.get('/scan', function(req, res) {
	scan().then(function(ret) {
		res.send(ret);
	});
});

//debug only
app.get('/getInstance', function(req, res) {
	res.send(BtleManager.Instance);
});

app.get('/getDevices', function(req, res) {
	res.send(BtleManager.Instance.devices);
});

app.get('/getStatus', function(req, res) {
	res.send(BtleManager.Instance.status);
});

app.get('/getReadings', function(req, res) {
	if (!BtleManager.Instance.status.dashboardConnected) {
		BtleManager.Instance.readings = {};
	}
	res.send(BtleManager.Instance.readings);
});

//params:
// deviceId - peripheral id
app.get('/getDevice', function(req, res) {
	var deviceId = req.query.deviceId;
	if (BtleManager.Instance.devices) {
		BtleManager.Instance.devices.forEach(function(device) {
			if (device.peripheralId === deviceId) {
				res.send(device);
			}
		});
	}
});

//params: 
// id - peripheral id
app.get('/disconnect', function(req, res) {
	var peripheralId = req.query.id;
	disconnectDevice(peripheralId).then(function(devices) {
		res.send(devices);
	});

});

app.get('/readCharacteristic', function(req, res) {
	//find this characteristic
	var deviceId = req.query.deviceId;
	var serviceId = req.query.serviceId;
	var characteristicId = req.query.characteristicId;

	BtleManager.readCharacteristic(deviceId, serviceId, characteristicId).then(function(device) {
		res.send(device);
	}, function(error) {
		console.log('Error while reading C ' + error);
	});
});

app.get('/writeCharacteristic', function(req, res) {
	//find this characteristic
	var deviceId = req.query.deviceId;
	var serviceId = req.query.serviceId;
	var characteristicId = req.query.characteristicId;
	var data = req.query.data;

	BtleManager.writeCharacteristic(deviceId, serviceId, characteristicId, data).then(function(device) {
		res.send(device);
	}, function(error) {
		console.log('Error while writing to C ' + error);
	});
});

app.get('/readDescriptor', function(req, res) {
	//find this characteristic
	var deviceId = req.query.deviceId;
	var serviceId = req.query.serviceId;
	var characteristicId = req.query.characteristicId;
	var descriptorId = req.query.descriptorId;

	BtleManager.readDescriptor(deviceId, serviceId, characteristicId, descriptorId).then(function(device) {
		res.send(device);
	}, function(error) {
		console.log('Error while writing to C ' + error);
	});
});

app.get('/toggleDescriptor', function(req, res) {
	//find this characteristic
	var deviceId = req.query.deviceId;
	var serviceId = req.query.serviceId;
	var characteristicId = req.query.characteristicId;
	var descriptorId = req.query.descriptorId;
	BtleManager.Instance.peripherals.forEach(function(device) {
		if (device.id === deviceId) {
			device.services.forEach(function(service) {
				if (service.uuid === serviceId) {
					service.characteristics.forEach(function(characteristic) {
						if (characteristic.uuid === characteristicId) {

							characteristic.descriptors.forEach(function(item) {
								if (item.uuid === descriptorId) {
									console.log('Found descriptor!');
									descriptor = item;

									descriptor.readValue(function(error, data) {
										if (data) {
											var string = data.toString('hex');
											var enable = false;
											if (string == '0000') {
												enable = true;
											}
											characteristic.notify(enable, function(error) {
												console.log('turned on notifications ' + string + ' ' + enable + ' ' + ( error ? ' with error' : 'without error'));
												BtleManager.Instance.devices.forEach(function(device) {
													if (device.peripheralId === deviceId) {
														device.services.forEach(function(service) {
															if (service.uuid === serviceId) {
																service.characteristics.forEach(function(characteristic) {
																	if (characteristic.uuid === characteristicId) {
																		characteristic.descriptors.forEach(function(item) {
																			if (item.uuid === descriptorId) {
																				console.log('Found descriptor model!');

																				descriptor.readValue(function(error, data) {
																					if (data) {
																						var string = data.toString('ascii');

																						var descriptorInfo = data.toString('hex') + ' | \'' + string + '\'';
																						console.log("Read char: " + descriptorInfo);
																						item.value = descriptorInfo;
																					}
																					res.send(device);
																				});
																			}
																		});
																	}
																});
															}
														});
													}
												});
											});
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
});


app.get('/connectDevice', function(req, res) {
	//find this device first
	var deviceId = req.query.deviceId;
	var recipeId = req.query.recipeId;

	//find this reading recipe
	var deviceRecipes = BtleManager.getRecipes(deviceId);
	var matchedDeviceRecipe = null;
	deviceRecipes.forEach(function(deviceRecipe) {
		if (deviceRecipe.uuid === recipeId) {
			matchedDeviceRecipe = deviceRecipe;
		}
	});

	var promise = connectToDevice(deviceId, matchedDeviceRecipe);

	promise.then(function(device) {
		res.send(device);
	});

});

app.get('/getDashboard', function(req, res) {

	var dashboardId = req.query.dashboardId;

	var dashboard = {};
	fs.readFile('public/local/' + dashboardId + '.json', 'utf8', function(err, data) {
		if (err) {
			console.log('ERROR: reading dashboard id ' + dashboardId);

			//it seems it does not exist, create initial one

			dashboard.uuid = dashboardId;
			dashboard.name = dashboardId;
			dashboard.connection = {};
			dashboard.connection.provider = "IBM Quickstart";
			dashboard.devices = [];
			dashboard.readings = [];

			console.log("Writing initial dashboard");
			fs.writeFile('public/local/' + dashboardId + '.json', JSON.stringify(dashboard, null, 3), function(err) {
				if (err) {
					console.log("The file was not saved!");
					res.send(dashboard);
				} else {

					console.log("The file was saved!");
					res.send(dashboard);
				}
			});
		} else {
			console.log('OK: reading dashboard id ' + dashboardId);
			dashboard = JSON.parse(data);

			res.send(dashboard);
		}
	});

});

app.get('/connectDashboard', function(req, res) {

	var dashboardId = req.query.dashboardId;

	var dashboard = {};
	fs.readFile('public/local/' + dashboardId + '.json', 'utf8', function(err, data) {
		if (err) {
			console.log('ERROR: reading dashboard id ' + dashboardId);
			return dashboard;
		};
		console.log('OK: reading dashboard id ' + dashboardId);
		dashboard = JSON.parse(data);

		//now we have the dashboard
		//let's compile dashboard recipe
		connectToDashboard(dashboard).then(function(ret) {
			res.send(ret);
		});
	});

});



app.get('/disconnectDashboard', function(req, res) {
	disconnectFromDashboard().then(function(ret) {
		res.send(ret);
	});
});

app.post('/updateDashboard', function(req, res) {

	var dashboard = req.body;
	if (dashboard.uuid != null && dashboard.uuid != '') {
		fs.writeFile('public/local/' + dashboard.uuid + '.json', JSON.stringify(dashboard, null, 3), function(err) {
			if (err) {
				return console.log(err);
			}

			console.log("The file was saved!");
			res.send(dashboard);
		});

	}
});

app.get('/connectCloud', function(req, res) {
	BtleManager.Instance.status.cloudConnected = true;
	res.send(BtleManager.Instance.status);
});

app.get('/disconnectCloud', function(req, res) {
	BtleManager.Instance.status.cloudConnected = false;
	res.send(BtleManager.Instance.status);
});

app.get('/toggleRepository', function(req, res) {
	BtleManager.Instance.status.localRepository = !BtleManager.Instance.status.localRepository;
	res.send(BtleManager.Instance.status);
});

app.get('/update', function(req, res) {
	exec('sh /home/pi/updatesenzemhub.sh', function(error, stdout, stderr) {
		var ret = "";
		if (error) {
			ret += "error: " + error + "\r\n----\r\n";
		}
		ret += stdout + "\r\n----\r\n";
		res.send(ret);
	});
});

app.get('/uptime', function(req, res) {
	exec('uptime', function(error, stdout, stderr) {
		var ret = "";
		if (error) {
			ret += "error: " + error + "\r\n----\r\n";
		}
		ret += stdout + "\r\n----\r\n" + stderr;
		res.send(ret);
	});

});

app.get('/reboot', function(req, res) {
	exec('sudo shutdown -r now', function(error, stdout, stderr) {
		//exec('sudo uptime', function(error, stdout, stderr) {
		var ret = "";
		if (error) {
			ret += "error: " + error + "\r\n----\r\n";
		}
		ret += stdout + "\r\n----\r\n" + stderr;
		res.send(ret);
	});
});

app.get('/getVersions', function(req, res) {
	fs.readFile('version', 'utf8', function(err, data) {
		if (err) {
			console.log('ERROR: reading version ');
			data = "N/A";
		};

		var ret = {
			installed : data,
			available : "N/A"
		};

		request.get(BtleManager.Instance.BASE_URL + '/version', function(error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log("GOT IT");
				ret.available = body;
			} else {
				console.log("Upload error " + response.statusCode);
			}
			res.send(ret);
		});
	});

});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SERVER START
//

var server = app.listen(BtleManager.Instance.SERVER_PORT, function() {
	var host = server.address().address;
	var port = server.address().port;

	console.log('SenzemHub app listening at http://%s:%s', host, port);
	var intervalCount = BtleManager.Instance.AUTO_SCAN_PERIOD;
	if (intervalCount > 10000) {
		var interval = setInterval(function() {
			intervalCount -= 1000;
			BtleManager.Instance.status.autoIn = intervalCount / 1000;

			if (intervalCount <= 0) {
				intervalCount = BtleManager.Instance.AUTO_SCAN_PERIOD;
				autoScanAndConnect();
			}
		}, 1000);
	} else {
		console.log('Automatic scan is off');
	}
});

