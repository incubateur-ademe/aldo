const SibApiV3Sdk = require('sib-api-v3-sdk')
const defaultClient = SibApiV3Sdk.ApiClient.instance

const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.SIB_API_KEY

const api = new SibApiV3Sdk.TransactionalEmailsApi()

const sendinblue = (sendSmtpEmail) => {
  return api.sendTransacEmail(sendSmtpEmail)
}

module.exports = sendinblue
