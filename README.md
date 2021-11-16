Tired of fetching mfa token and updating credentials for mfa profile everyday with MFA-enabled account? This will help

## Usage

1. Clone this repo
2. Install required packages `npm install`
3. Update config file to match your aws credentials
4. Run `node index.js`, the script will use credentials of the profile in the config file, fetch mfa temporary credentials after you enter the code, and create/update another profile with postfix **-mfa** in the aws credentials file
5. Switch to use mfa profile and continue your work `export AWS_PROFILE=profile-mfa`
