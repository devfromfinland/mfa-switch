Tired of fetching mfa token and updating credentials for mfa profile everyday with MFA-enabled account? This will help

## Usage

1. Clone this repo
2. Install required packages `npm install`
3. Update the values in `config.js` according to your aws account
4. Run `node index.js`, the script will use credentials of the profile setup in the config file, fetch mfa temporary credentials after you enter the code, and update **${profile-name}-mfa** with the temporary credentials (profile will be created if not existed).
5. Switch to use mfa profile and continue your work `export AWS_PROFILE=yourprofile-mfa`

## Further tweak for Mac user

- add alias to your .zshrc file to create a quick command:
  `alias mfa="node ~/[path-to-the-repo]/mfa-switch/index.js"`
- On your next terminal session onwards, you just need to run `mfa` and then `export AWS_PROFILE=yourprofile-mfa` to use the mfa profile
