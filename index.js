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

const DEFAULT_REGION = 'eu-central-1'
const DEFAULT_EMAIL = 'test@test.com'
const DEFAULT_DEV_ACCOUNT = '00000000'
const DEFAULT_SERIAL_NUMBER = `arn:aws:iam::${DEFAULT_DEV_ACCOUNT}:mfa/${DEFAULT_EMAIL}`
const DEFAULT_DURATION = 86400 // 24 hours
const DEFAULT_PROFILE = 'test'

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
    console.log('main profile credentials do not exist')
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

      console.log('fetching temporary credentials')
      mfaToken = await STS.getSessionToken({
        DurationSeconds: DEFAULT_DURATION,
        SerialNumber: DEFAULT_SERIAL_NUMBER,
        TokenCode: tokenCode
      }).promise()

      codeAccepted = true
    } catch (error) {
      console.log('failed fetching temporary credentials: ', error.message)
      console.log('trying again')
      codeAccepted = false
    }
  } while (!codeAccepted);
  
  // update to credentials file
  console.log(`updating profile ${profileMfa} to credentials file`)
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
  console.log(`export AWS_PROFILE=${profileMfa}`)
}

main()