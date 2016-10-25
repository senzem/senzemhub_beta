# SenzemHub Beta


### Description

Visit [Senzem](http://www.senzem.com) for more details.


### Prerequisites

  * Node.js
  * [Compatible Bluetooth 4.0 adapter](https://github.com/sandeepmistry/node-bluetooth-hci-socket)
  * **NOTE:** Raspberry Pi 3 Model B has in-build compatible adapter, no additional hardware required.


### Installation - for Raspberry Pi (SenzemHub version 0.7-raspi)

1. download latest release 
  * `wget https://github.com/senzem/senzemhub_beta/releases/download/0.7-raspi/senzemhub_beta-0.7-raspi.tar.bz2`
  
2. extract release 
  * `tar -xjvf senzemhub_beta-0.7-raspi.tar.bz2`  
  
3. go to release directory
  * `cd senzemhub_beta`
  
4. run SenzemHub
  * `sudo node senzemhub.js`  

5. browse SenzemHub (port is defined in config.js, default is 14555)
  * open http://localhost:14555 

### Installation - for developers and other systems


1. clone repository
  * `git clone https://github.com/senzem/senzemhub_beta.git`

2. go to source code directory
  * `cd senzemhub_beta`

3. install npm components
  * `npm install`

4. install bower components
  * `bower install`

5. run SenzemHub
  * `sudo node senzemhub.js`

6. browse SenzemHub (port is defined in config.js, default is 14555)
  * open http://localhost:14555 


