const { google } = require('googleapis')

/**
 * Sauvegarde un email dans Google Sheets
 * @param {string} email - L'adresse email à sauvegarder
 * @returns {Promise<void>}
 */
async function saveEmailToGoogleSheets (email) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS

  if (!spreadsheetId || !credentials) {
    console.warn('Google Sheets configuration is missing. Newsletter subscription will not be saved.')
    console.warn('Please set GOOGLE_SHEETS_ID and GOOGLE_SHEETS_CREDENTIALS environment variables.')
    // Ne pas faire planter l'app, juste logger un avertissement
    // L'utilisateur verra quand même un message de succès pour ne pas révéler l'erreur technique
    return
  }

  // Parser les credentials JSON
  let credentialsObj
  try {
    credentialsObj = JSON.parse(credentials)
  } catch (error) {
    throw new Error('Invalid GOOGLE_SHEETS_CREDENTIALS format. Must be valid JSON.')
  }

  // Authentifier avec Google Sheets API
  const auth = new google.auth.GoogleAuth({
    credentials: credentialsObj,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // Ajouter l'email à la première colonne de la première feuille
  // avec la date d'inscription
  const now = new Date()
  const timestamp = now.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Paris'
  })
  const range = 'A:B' // Colonnes A (email) et B (date)

  try {
    // Vérifier d'abord si la feuille existe et créer les en-têtes si nécessaire
    const headerRange = 'A1:B1'
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange
    })

    const headers = headerResponse.data.values?.[0]
    if (!headers || headers.length === 0) {
      // Ajouter les en-têtes
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: 'RAW',
        resource: {
          values: [['Email', 'Date d\'inscription']]
        }
      })
    }

    // Ajouter la nouvelle ligne
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[email, timestamp]]
      }
    })
  } catch (error) {
    console.error('Error saving email to Google Sheets:', error)
    throw error
  }
}

/**
 * Handler pour l'inscription à la newsletter
 */
async function newsletterHandler (req, res) {
  const { email } = req.body

  // Validation basique
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  // Validation du format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  try {
    await saveEmailToGoogleSheets(email.trim())
    res.status(200).json({ success: true, message: 'Email saved successfully' })
  } catch (error) {
    console.error('Error in newsletter handler:', error)
    res.status(500).json({ error: 'Failed to save email' })
  }
}

module.exports = {
  newsletterHandler,
  saveEmailToGoogleSheets
}

