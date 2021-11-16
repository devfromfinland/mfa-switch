/**
 * inspired from Jakov's util in kp-infra repo
 * 
 * node index.js [profile] [profile-mfa]
 */

import AWS from 'aws-sdk'
import fs from 'fs'
import readline from 'readline'
import { homedir } from 'os'
import ini from 'ini'
import { exit } from 'process'
import { DEFAULT_REGION, DEFAULT_SERIAL_NUMBER, DEFAULT_DURATION, DEFAULT_PROFILE } from './config.js'

const getMFAToken = () => {
  const ui = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => ui.question('Enter MFA token: ', (res) => {
    ui.close();
    resolve(res);
  }));
}

const main = async () => {
  const profile = process.argv[2] || DEFAULT_PROFILE
  const profileMfa = process.argv[3] || `${profile}-mfa`
  const credentialsPath = `${homedir}/.aws/credentials`;
  const credentials = ini.parse(fs.readFileSync(credentialsPath, 'utf8'))

  // check credentials of the input 'profile'
  const profiles = Object.keys(credentials)
  if (!profiles.includes(profile)) {
    console.log('Main profile credentials do not exist')
    exit(1)
  }

  // use input profile to fetch MFA credentials
  const STS = new AWS.STS({
    credentials: {
      accessKeyId: credentials[profile].aws_access_key_id,
      secretAccessKey: credentials[profile].aws_secret_access_key
    }
  });

  // get MFA temporary session credentials
  let codeAccepted = false
  let mfaToken
  do {
    try {
      const tokenCode = await getMFAToken();

      console.log('Fetching temporary credentials')
      mfaToken = await STS.getSessionToken({
        DurationSeconds: DEFAULT_DURATION,
        SerialNumber: DEFAULT_SERIAL_NUMBER,
        TokenCode: tokenCode
      }).promise()

      codeAccepted = true
    } catch (error) {
      console.log('Failed fetching temporary credentials: ', error.message)
      console.log('Trying again')
      codeAccepted = false
    }
  } while (!codeAccepted);
  
  // update to credentials file
  console.log(`Updating profile ${profileMfa} to credentials file`)
  if (credentials[profileMfa]) {
    delete credentials[profileMfa]
  }
  credentials[profileMfa] = {
    aws_access_key_id: mfaToken.Credentials.AccessKeyId,
    aws_secret_access_key: mfaToken.Credentials.SecretAccessKey,
    aws_session_token: mfaToken.Credentials.SessionToken,
    region: DEFAULT_REGION
  }
  const updatedCredentials = ini.stringify(credentials).replace(/\"+/g, '')
  fs.writeFileSync(credentialsPath, updatedCredentials);

  // completed
  console.log(`Completed! You should switch profile to ${profileMfa} if you are not there yet`)
  console.log(`Command: export AWS_PROFILE=${profileMfa}`)
}

main()