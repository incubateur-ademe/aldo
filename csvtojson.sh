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

# Ces fichiers sont chargés en mémoire au démarrage du serveur : on ne garde que
# les colonnes utilisées (cf. SurfaceForetRow et HedgerowLengthRow dans data/csv.ts)
# pour tenir dans la mémoire d'une instance Koyeb micro.
npx csvtojson --includeColumns='/^(INSEE_COM|CODE_EPCI|SUR_(FEUILLUS|RESINEUX|MIXTES|PEUPLERAIES)|code_(groupeser|greco|rad13|bassin_populicole))$/' surface-foret.csv > surface-foret.csv.json;
# 85 % des cellules CLC_* valent 0 : getHedgerowsDataForCommunes traite une colonne absente comme 0.
npx csvtojson --includeColumns='/^(INSEE_COM|INSEE_DEP|TOTKM_HAIE|CLC_\d+)$/' haie-clc18.csv > haie-clc18.csv.json;
node -e "
const fs = require('node:fs')
const rows = JSON.parse(fs.readFileSync('haie-clc18.csv.json', 'utf8'))
rows.forEach((row) => { for (const k in row) if (k.startsWith('CLC_') && !+row[k]) delete row[k] })
fs.writeFileSync('haie-clc18.csv.json', JSON.stringify(rows))
";
