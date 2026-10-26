import SibApiV3Sdk from 'sib-api-v3-sdk'

const defaultClient = SibApiV3Sdk.ApiClient.instance

const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.SIB_API_KEY

const api = new SibApiV3Sdk.TransactionalEmailsApi()

export interface SendSmtpEmail {
  sender: { email: string, name: string }
  to: { email: string }[]
  replyTo: { email: string }
  subject: string
  textContent: string
}

export default function sendinblue (sendSmtpEmail: SendSmtpEmail): Promise<unknown> {
  return api.sendTransacEmail(sendSmtpEmail)
}
