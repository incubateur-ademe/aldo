#!/bin/bash
# this file converts original CSV data into JSON data
# this makes it quicker to work with

cd ./data/dataByEpci;
for file in *.csv;
# looks a bit funny because filenames become X.csv.json but it works
do touch $file.json;
npx csvtojson $file > $file.json;
done;

cd ../dataByCommune;
for file in *.csv;
# looks a bit funny because filenames become X.csv.json but it works
do touch $file.json;
npx csvtojson $file > $file.json;
done;
