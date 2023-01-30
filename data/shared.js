function getIgnLocalisation (communeData, level, subtype) {
  let code = communeData[`code_${level}`]
  const coniferOrMixed = subtype === 'Conifere' || subtype === 'Mixte'
  // sometimes, using a neighbouring region is preferable to using the France-wide data
  if (code === 'COR' && coniferOrMixed) {
    code = 'J'
    level = 'greco'
  } else if (code === 'HDF' && coniferOrMixed) {
    // there are some instances of NA,HDF in the data
    // IDF would have same exception, except all data is in B3, B4, or B5 so greco B already used
    code = 'B'
    level = 'greco'
  } else if (code === 'PDL' && subtype === 'Mixte') {
    // there are some instances of NA,PDL in the data
    code = 'A'
    level = 'greco'
  }
  return {
    localisationCode: code,
    localisationLevel: level
  }
}

module.exports = {
  getIgnLocalisation
}
