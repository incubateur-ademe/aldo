# Module de comparaison IGN 2022 / 2026

**Ticket** : [#144](https://github.com/incubateur-ademe/aldo/issues/144)
**Date** : 2026-03-14
**Branche** : `144-module-comparaison-ign`

---

## Contexte

ALDO utilise les données IGN (Inventaire Forestier National) pour calculer les flux de carbone en forêt. Deux campagnes de mesures sont disponibles :

- **Données 2022** (période 2016-2020) : actuellement utilisées dans ALDO — fichier `bilan-carbone-foret-par-localisation.IGN-2022.csv.json`
- **Données 2026** (période 2020-2024) : nouvelles données — fichier `bilan-carbone-foret-par-localisation.IGN-2026.csv.json`

L'objectif est d'afficher un module de comparaison de ces deux datasets dans l'onglet **Flux**, pour informer les utilisateurs sur l'évolution du bilan forestier entre les deux périodes.

---

## Objectif fonctionnel

Afficher un graphique comparatif (barres groupées) des 4 flux de carbone forestiers entre les deux campagnes IGN, **sans distinction de peuplement**, en tCO2e/ha/an.

Les 4 flux et les colonnes CSV correspondantes (lues directement — colonnes pré-calculées présentes dans les deux fichiers) :
1. **Accroissement** → `production_carbone_(tC∙ha-1∙an-1)`
2. **Mortalité** → `mortalite_carbone_(tC∙ha-1∙an-1)`
3. **Prélèvement** → `prelevement_carbone_(tC∙ha-1∙an-1)`
4. **Bilan Net** → `bilan_carbone_(tC∙ha-1∙an-1)`

> Ces colonnes sont distinctes des colonnes volumétriques `*_volume_` utilisées par `getForestBiomassFluxesByCommune`. Elles sont utilisées directement, sans re-multiplication par `fexp_vol_carb`.

---

## Architecture

### Couche données — `data/flux.js`

Nouvelle fonction exportée : `getForestBiomassComparisonByCommune(location)`

---

#### Étape 0 — Périmètre supporté

- Si `location.commune` ou `location.epci` (single EPCI) : traitement normal.
- **Regroupements** (location sans `commune` ni `epci` unique) : retourner `{ hasForestData: false }` immédiatement. Identique au comportement de `getForestBiomassFluxesByCommune`.

---

#### Étape 1 — Surfaces du territoire

Charger `./dataByCommune/surface-foret.csv.json`. Filtrer sur `location.epci.code` (CODE_EPCI) ou `location.commune.insee` (INSEE_COM), identique à l'existant (avec strip du `0` initial sur l'INSEE si besoin).

`hasForestData` = `true` si `Σ(SUR_FEUILLUS + SUR_RESINEUX + SUR_MIXTES + SUR_PEUPLERAIES) > 0` sur toutes les lignes filtrées. Si `false`, retourner `{ hasForestData: false }`.

---

#### Étape 2 — Pré-filtrage des datasets (identique à l'existant)

Chemins des fichiers :
- 2022 : `./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2022.csv.json`
- 2026 : `./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json`

Pour chaque dataset (2022 et 2026) :
```js
const significantData_XXXX = dataset_XXXX.filter(d => d.surface_ic === 's')
```
La cascade de localisation cherche uniquement dans ces lignes significatives. C'est le même comportement que `getForestBiomassFluxesByCommune`.

> Note : les colonnes `code_groupeser`, `code_greco`, `code_rad13`, `code_bassin_populicole` sont toutes présentes dans `surface-foret.csv.json` et utilisées par `getIgnLocalisation` — les 4 niveaux de cascade sont donc disponibles.

---

#### Étape 3 — Résolution de localisation et lecture des valeurs

Pour chaque ligne de `areaDataByCommune` et pour chaque composition (Feuillu, Conifere, Mixte, Peupleraie) :

1. Appeler `getIgnLocalisation(communeData, level, subtype)` et cascader `groupeser → greco → rad13 → bassin_populicole`, **séparément** sur `significantData_2022` et `significantData_2026`. La cascade s'arrête au premier niveau où le `code_localisation` est trouvé dans le dataset filtré. Si aucun niveau ne donne de résultat, fallback `France` (même comportement que l'existant ; si France non trouvé → `throw new Error(...)`).

2. Enregistrer pour chaque dataset : `{ localisationCode, localisationLevel, row }` (la ligne CSV trouvée).

3. Lire les 4 valeurs carbone par ha depuis `row` :
   - `production_carbone_(tC∙ha-1∙an-1)`
   - `mortalite_carbone_(tC∙ha-1∙an-1)`
   - `prelevement_carbone_(tC∙ha-1∙an-1)`
   - `bilan_carbone_(tC∙ha-1∙an-1)`

---

#### Étape 4 — Condition de warning

```
hasWarning = true si, pour au moins une (ligne commune × composition),
  localisationCode_2022 ≠ localisationCode_2026
  OU localisationLevel_2022 ≠ localisationLevel_2026
```

Cela capture les cas où un dataset est statistiquement significatif à un niveau plus fin que l'autre.

---

#### Étape 5 — Agrégation pondérée par les surfaces du territoire

Pour chacun des deux datasets, pour chacun des 4 flux :

```
surface_composition = SUR_FEUILLUS | SUR_RESINEUX | SUR_MIXTES | SUR_PEUPLERAIES
  (depuis surface-foret.csv, pour la commune courante)

// Sommer sur toutes les lignes commune × composition où surface_composition > 0
numérateur   = Σ(valeur_tC_ha_an × surface_composition)
dénominateur = Σ(surface_composition)

valeur_agrégée_tC_ha_an = numérateur / dénominateur
```

---

#### Étape 6 — Conversion et code de localisation affiché

- Conversion : `cToCo2e(valeur_agrégée)` pour chaque flux.
- `localisationCode2022` / `localisationCode2026` : code résolu pour la **composition dominante** = composition ayant la plus grande `surface_composition` totale (somme sur toutes les communes du territoire).

---

#### Valeur de retour

```js
{
  data2022: { accroissement, mortalite, prelevement, bilan },  // tCO2e/ha/an
  data2026: { accroissement, mortalite, prelevement, bilan },
  localisationCode2022: string,  // ex: "A1"
  localisationCode2026: string,
  hasWarning: boolean,
  hasForestData: boolean
}
```

---

### Handler — `front/handlers/territory.js`

Importer `getForestBiomassComparisonByCommune`. L'appeler avec `location`. Construire `forestComparisonChartConfig` (JSON.stringify'd, même pattern que `fluxCharts`) et passer les deux au template.

Structure de `forestComparisonChartConfig` (sérialisée en JSON string, parsée côté EJS) :

```js
JSON.stringify({
  type: 'bar',
  data: {
    labels: ['Accroissement', 'Mortalité', 'Prélèvement', 'Bilan Net'],
    datasets: [
      {
        label: '2016-2020',
        data: [acc2022, mort2022, prel2022, bilan2022],
        backgroundColor: '<couleur1>'
      },
      {
        label: '2020-2024',
        data: [acc2026, mort2026, prel2026, bilan2026],
        backgroundColor: '<couleur2>'
      }
    ]
  },
  options: {
    plugins: {
      title: { display: true, text: 'Comparaison du bilan forestier (Biomasse) (tCO2e/ha/an)' },
      // ChartDataLabels est enregistré globalement dans flux.ejs — l'override explicite
      // ci-dessous est nécessaire pour désactiver les labels sur ce graphique.
      datalabels: { display: false }
    },
    scales: { y: { title: { display: true, text: 'tCO2e/ha/an' } } }
  }
})
```

---

### Vue EJS

**Nouveau partial** : `front/views/territoire/fluxCalculations/ign-comparison.ejs`

Ce partial contient **uniquement du HTML** — aucune balise `<script>`.

**Inclusion dans `flux.ejs`** — insérer entre la ligne 164 (`</div>` fermant le `.fr-table`) et la ligne 165 (`</div>` fermant le conteneur principal `<div>` ouvert ligne 1). La section reste ainsi à l'intérieur du `<div>` principal, avant les balises `<script>` (lignes 166+) :

**Initialisation du graphique** — à ajouter dans le bloc `<script>` existant en bas de `flux.ejs`, après les deux `new Chart(...)` existants :

---

## Placement dans la page

```
flux.ejs
  ├── [Graphiques accordéons existants]
  ├── [Table "Flux de carbone par occupation du sol finale"]
  ├── [NOUVEAU partial ign-comparison.ejs]   ← avant le </div> de flux.ejs (ligne 165)
  └── [<script> existant + init nouveau chart]
modify-flux-areas.ejs
flux-grid.ejs  ← "Changement d'occupation des sols (ha/an)"
```

---

## Cas limites

| Situation | Comportement |
|-----------|-------------|
| Pas de forêt (`SUR_FEUILLUS + ... = 0`) | `hasForestData: false` → module non affiché |
| Regroupement de territoires | `hasForestData: false` → module non affiché |
| `surface_ic` discordant entre datasets | `hasWarning: true` → alerte affichée |
| Localisation non résolue dans cascade | Fallback `France` (identique à l'existant) |
| France fallback absent | `throw new Error(...)` (identique à l'existant) |
| Composition à surface nulle | Exclue de la pondération (numérateur et dénominateur) |

---

## Fichiers à modifier / créer

| Fichier | Action |
|---------|--------|
| `data/flux.js` | Ajouter `getForestBiomassComparisonByCommune()` + export |
| `front/handlers/territory.js` | Importer, appeler, construire `forestComparisonChartConfig`, passer au template |
| `front/views/territoire/flux.ejs` | Inclure le partial (HTML) + init Chart.js dans le `<script>` existant |
| `front/views/territoire/fluxCalculations/ign-comparison.ejs` | Créer le partial (HTML uniquement) |

---

## Hors périmètre

- Pas de comparaison dans l'onglet Stocks
- Pas de distinction par composition dans le graphique
- Pas d'export Excel de ces données (dans un premier temps)
