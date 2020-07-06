'use strict'

const fs = require('fs')
const utils = require('./utils')

module.exports = async (event, context) => {
  const secretKey = fs.readFileSync('/var/openfaas/secrets/secret-key', 'utf8');
  const result = {
    'IP address': 'Your Ip is ' + utils.getClientIp(event),
    'random-key': secretKey
  }

  return context
    .status(200)
    .succeed(result)
}

