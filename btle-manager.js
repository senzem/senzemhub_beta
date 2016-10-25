/**
 * @author Senzem
 */

var noble = require('noble');
var fs = require('fs');
var request = require('request');
var config = require('./config').config;


//defaults
var pathImages='public/images/';
var extensionImages='.png';
var pathRecipes='public/recipes/';
var extensionRecipes='.json';

var btleManagerSingleton=null;

var BtleManager = function() {
	this.Instance={
		state : 'INIT',
		status : {
			scan: 0,
			lastUploadTime : 0,
			dashboardConnected : false,
			cloudConnected : config.CLOUD_CONNECTED_INITIAL,
			localRepository : config.LOCAL,
			autoOn : false,
			id : "XXXXXX", //host BTLE adapter id,
			autoIn: 0 //number of seconds before next auto scan
		},
		
		readings:{},
		payload : {
			d: {}
		},
		BASE_URL : config.BASE_URL,
		UPLOAD_PERIOD : config.UPLOAD_PERIOD,
		AUTO_SCAN_PERIOD : config.AUTO_SCAN_PERIOD,
		AUTO_SCAN_LENGTH : config.AUTO_SCAN_LENGTH,
		SUBSTR : config.SUBSTR,
		SERVER_PORT:config.SERVER_PORT
	};

};



module.exports.getBtleManager = function() {
	if (!btleManagerSingleton){
		btleManagerSingleton=new BtleManager();
	}
	return btleManagerSingleton;
};

//get device icon
BtleManager.prototype.getIcon = function(deviceId) {

	var pattern = deviceId.substr(0, config.SUBSTR);
	try {
		fs.accessSync(pathImages + pattern + extensionImages, fs.F_OK);
		return pattern + extensionImages;
	} catch (e) {
		return "unknown"+extensionImages;
	}

};

//get recipes for device
BtleManager.prototype.getRecipes = function(deviceId) {

	var recipes = [];

	var recipePattern = deviceId.substr(0, config.SUBSTR);
	console.log("Get recipes for " + recipePattern);

	var matchingRecipes = [];

	if (this.Instance.status.localRepository) {

		try {
			var data = fs.readFileSync(pathRecipes + recipePattern + extensionRecipes, 'utf8');
			matchingRecipes = JSON.parse(data);
			console.log('Total recipes: ' + matchingRecipes.length);
			matchingRecipes.forEach(function(recipe) {
				recipes.push(recipe);
			});
		} catch(e) {
			console.log(e);
		}
	} else {
		console.log("--->REMOTE REPOSITORY");
		request.get(this.Instance.BASE_URL + recipePattern + extensionRecipes, function(error, response, data) {
			if (!error && response.statusCode == 200) {
				console.log("GOT RECIPES");
				matchingRecipes = JSON.parse(data);
				console.log('Total recipes: ' + matchingRecipes.length);
				matchingRecipes.forEach(function(recipe) {
					recipes.push(recipe);
				});
			} else {
				console.log("Upload error " + response.statusCode);
			}
		});
	}
	return recipes;
};

BtleManager.prototype.readCharacteristic = function(deviceId, serviceId, characteristicId) {
	var self=this;
	return new Promise(function(resolve, reject) {
		self.Instance.peripherals.forEach(function(device) {
			if (device.id === deviceId) {
				device.services.forEach(function(service) {
					if (service.uuid === serviceId) {
						service.characteristics.forEach(function(characteristic) {
							if (characteristic.uuid === characteristicId) {
								characteristic.read(function(error, data) {
									if (data) {
										self.Instance.devices.forEach(function(device) {
											if (device.peripheralId === deviceId) {
												device.services.forEach(function(service) {
													if (service.uuid === serviceId) {
														service.characteristics.forEach(function(item) {
															if (item.uuid === characteristicId) {

																var string = data.toString('ascii');
																var characteristicInfo = data.toString('hex') + '|' + string;
																//console.log("Read char: " + characteristicInfo);
																item.value = characteristicInfo;
																console.log('Resolved');
																resolve(device);

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
					}
				});
			}
		});
	});
}

BtleManager.prototype.writeCharacteristic = function(deviceId, serviceId, characteristicId, data) {
	var self=this;
	return new Promise(function(resolve, reject) {
		self.Instance.peripherals.forEach(function(device) {
			if (device.id === deviceId) {
				device.services.forEach(function(service) {
					if (service.uuid === serviceId) {
						service.characteristics.forEach(function(characteristic) {
							if (characteristic.uuid === characteristicId) {
								//found characteristic

								var buffer = new Buffer(1);
								if (data == '00') {
									buffer[0] = 0;
								} else if (data == '01') {
									buffer[0] = 1;
								} else {
									//convert data to buffer
									buffer = new Buffer(data, 'hex');
								}

								characteristic.write(buffer, false, function(error) {
									console.log("Characteristic write  " + characteristicId);

									characteristic.read(function(error, data) {
										if (data) {
											self.Instance.devices.forEach(function(device) {
												if (device.peripheralId === deviceId) {
													device.services.forEach(function(service) {
														if (service.uuid === serviceId) {
															service.characteristics.forEach(function(item) {
																if (item.uuid === characteristicId) {

																	var string = data.toString('ascii');
																	var characteristicInfo = data.toString('hex') + '|' + string;
																	console.log("Read char: " + characteristicInfo);
																	item.value = characteristicInfo;
																	console.log('Resolved');
																	resolve(device);

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
	});
}

BtleManager.prototype.readDescriptor = function(deviceId, serviceId, characteristicId, descriptorId) {
	var self=this;
	return new Promise(function(resolve, reject) {
		self.Instance.peripherals.forEach(function(device) {
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

												self.Instance.devices.forEach(function(device) {
													if (device.peripheralId === deviceId) {
														device.services.forEach(function(service) {
															if (service.uuid === serviceId) {
																service.characteristics.forEach(function(characteristic) {
																	if (characteristic.uuid === characteristicId) {
																		characteristic.descriptors.forEach(function(item) {
																			if (item.uuid === descriptorId) {

																				var string = data.toString('ascii');

																				var descriptorInfo = data.toString('hex') + '|' + string;
																				//console.log("Read char: " + descriptorInfo);
																				item.value = descriptorInfo;
																				resolve(device);

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

BtleManager.prototype.toggleNotification = function(deviceId, serviceId, characteristicId, enable) {
	var self=this;
	return new Promise(function(resolve, reject) {
		self.Instance.peripherals.forEach(function(device) {
			if (device.id === deviceId) {
				//console.log("Got device, looking for service "+serviceId);
				device.services.forEach(function(service) {
					//console.log("Got service "+service.uuid);
					if (service.uuid === serviceId) {
						service.characteristics.forEach(function(characteristic) {
							if (characteristic.uuid === characteristicId) {

								characteristic.descriptors.forEach(function(item) {
									//console.log("ITEM UUID "+item.uuid);
									if (item.uuid === '2902') {
										//console.log('Found descriptor for NOTIFICATION!');
										descriptor = item;

										descriptor.readValue(function(error, data) {
											if (data) {

												characteristic.notify(enable, function(error) {
													self.Instance.devices.forEach(function(device) {
														if (device.peripheralId === deviceId) {
															device.services.forEach(function(service) {
																if (service.uuid === serviceId) {
																	service.characteristics.forEach(function(characteristic) {
																		if (characteristic.uuid === characteristicId) {
																			characteristic.descriptors.forEach(function(item) {
																				if (item.uuid === '2902') {
																					console.log('Found descriptor model!');

																					descriptor.readValue(function(error, data) {
																						if (data) {
																							var string = data.toString('ascii');

																							var descriptorInfo = data.toString('hex') + '|' + string;
																							//console.log("Read char: " + descriptorInfo);
																							item.value = descriptorInfo;
																							resolve(device);
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
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//helpers

BtleManager.prototype.formatValue = function(value, format, script) {
	var index = value.indexOf('|');
	var hex = value.substring(0, index);
	var string = value.substring(index + 1);

	var ret = value;
	switch(format) {
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
		ret = eval(script);
		break;
	default:
		break;
	};
	return ret;
};

