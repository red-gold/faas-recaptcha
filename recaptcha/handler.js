'use strict'

const fs = require('fs')
const utils = require('./utils')
const nodemailer = require('nodemailer')
const fetch = require('node-fetch');

const secretKey = fs.readFileSync('/var/openfaas/secrets/secret-key', 'utf8');
const gmailEmail = fs.readFileSync('/var/openfaas/secrets/gmail', 'utf8');
const gmailPassword = fs.readFileSync('/var/openfaas/secrets/gmail-pass', 'utf8');
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
})

module.exports = async (event, context) => {
  console.log(event.query, event.path)
  const remoteIpAddress = utils.getClientIp(event)
  const gReCaptcha = event.body['g-recaptcha-response']
  const firstName = event.body['firstName']
  const lastName = event.body['lastName']
  const email = event.body['email']
  const company = event.body['company']
  const message = event.body['message']
  const country = event.body['country']

  if (gReCaptcha === undefined || gReCaptcha === '' || gReCaptcha === null) {
    return context.status(400).fail({ error: { code: 'ServerError/NullCaptchaValue', message: 'Please select captcha first' } })
  }
  const verificationURL = 'https://www.google.com/recaptcha/api/siteverify?secret=' + secretKey + '&response=' + gReCaptcha + '&remoteip=' + remoteIpAddress

  try {
    const resCap = await fetch(verificationURL, { method: 'POST' })
    const parsedRecap = resCap.json()

    if (parsedRecap.success !== undefined && !parsedRecap.success) {
      console.log('Captha/responseError', resCap)
      console.log('Captha/responseError', parsedRecap)
      return context.status(400).fail({ error: { code: 'ServerError/ResponseCaptchaError', message: 'Failed captcha verification' } })
    }

  } catch (error) {
    console.log('[ERROR]{RECAPTCHA} - ', error)
    return context.status(400).fail({ error: { code: 'ServerError/ResponseCaptchaError', message: 'Failed captcha verification' } })

  }

  const from = `${company} contact <${gmailEmail}>`
  const to = 'amir.gholzam@live.com'

  const html = `
        <!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
<html>
  <head>
    <style>
      button:hover{opacity:0.7}
      a:hover{opacity:0.7}
    </style>
    
  </head>
  <body>
    <div class="card" style="box-shadow:0 4px 8px 0 rgba(0, 0, 0, 0.2);margin:auto;text-align:center;font-family:arial;">
      <h1>${company} from ${country}</h1>
      <p>First Name: ${firstName}, Last Name: ${lastName}</p>
      <p>Email: ${email}</p>
      <div style="margin: 24px 0;">
      </div>
      <p> ${message}</p>
      
    </div>
  </body>
</html>
              `
  const mailOptions = {
    from: from,
    to: to,
    subject: `Telar Social Company Contact - ${company}`,
    html: html
  }

  try {
    const result = await mailTransport.sendMail(mailOptions)
    return context
      .status(200)
      .succeed({})

  } catch (error) {
    console.log('[ERROR] send email ', error)
    return context
      .status(400)
      .fail({ error: 'Error on sending email!' })
  }

}

