 #!/bin/bash

echo "1---- START"

echo "2---- Getting the latest SenzemHub version"
SERVER_VERSION=$(curl https://raw.githubusercontent.com/senzem/senzemhub_beta/master/version)

echo "3---- Server version is" $SERVER_VERSION

echo "4---- Getting current installed version"


LOCAL_VERSION="0.1"

if [ -e /home/pi/senzem/version ]; then
  LOCAL_VERSION=$(cat /home/pi/senzem/version)
fi


echo "5---- Local Version Is" $LOCAL_VERSION

if [ $LOCAL_VERSION = $SERVER_VERSION ]; then
  echo "6---- No updates available. Current version is the latest"
  echo "7---- DONE"
else
  echo "6---- Updated version found"
  echo " --------------------------"
  ARCHIVE_NAME="senzemhub-"$LOCAL_VERSION"-archive.tar.gz"
  echo "7---- Archiving existing version to" $ARCHIVE_NAME
  echo " ------PLEASE WAIT---------"
  ARCHIVE=$(tar -zcvf $ARCHIVE_NAME /home/pi/senzem)


  UPDATE_NAME="senzemhub-"$SERVER_VERSION".tar.gz"
  echo "8---- Downloading new version" $UPDATE_NAME

  UPDATE_PATH="https://raw.githubusercontent.com/senzem/senzemhub_beta/master/"$UPDATE_NAME

  UPDATE=$(curl -O $UPDATE_PATH)

  echo "9---- Extracting new version"
  echo " ------PLEASE WAIT----------"
  EXTRACT=$(tar -xvf $UPDATE_NAME -C /home/pi/senzem)

  SLEEP=$(sleep 1)
  echo "11---- DONE"

fi
