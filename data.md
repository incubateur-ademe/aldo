# Les données

Les données sont disponibles en format CSV, encodage UTF-8.

Pour que les nombres décimal sont bien formattés en LibreOffice, assurez-vous que le langage utilisé pour ouvrir le fichier est anglais.

[Stocks](./data/dataByCommune/stocks.csv)

## Valeurs de France

Pour les calculs de stocks et fluxs de produits bois, on utilise les valeurs suivantes:

- les stocks par usage : [getFranceStocksWoodProducts](./data/stocks.js#L209)
- le récolte par usage : [getAnnualFranceWoodProductsHarvest](./data/stocks.js#L217)
- la population de France : [totalPopulation](./data/dataByEpci/france.json#L48673)
