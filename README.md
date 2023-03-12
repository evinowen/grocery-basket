# Grocery Basket
This is an attempt at an automated process to order groceries via a cron process.

# Configuration
At the moment this runs on compute that is started on a schedule in order to establish
the simplest solution for the environment.  In other words, a GCP VM is configured with
the required prerequisites and shut down, each week a scheduler runs that starts the VM
and allows it to boot before the configured cron for the Grocery Basket process to start.

Reference the following for setting up `gcsfuse`:
https://github.com/GoogleCloudPlatform/gcsfuse/blob/master/docs/installing.md

The VM must be configured with the following metadata:
- `SAFEWAY_USERNAME_SECRET` The full path of the Secret Manager secret used for the site username
- `SAFEWAY_PASSWORD_SECRET` The full path of the Secret Manager secret used for the site password
- `SENDGRID_API_KEY_SECRET` The API key for the SendGrid account that will be sending notifications
- `SENDGRID_FROM_EMAIL` The from address that matches the configuration in SendGrid
- `SENDGRID_TO_EMAIL` The destination e-mail address(es) for notifications
- `OUTPUT_BUCKET` The name of a storage bucket used for storing the process run output

## Linux User
```
sudo useradd -m grocery-daemon
sudo usermod -L grocery-daemon
sudo usermod -s /bin/bash grocery-daemon
```

## Install Chrome
```
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get -f install
sudo rm google-chrome-stable_current_amd64.deb
```

## Install Selenium ChromeDriver
```
sudo apt install unzip
sudo wget https://chromedriver.storage.googleapis.com/110.0.5481.77/chromedriver_linux64.zip
sudo unzip ./chromedriver_linux64.zip
sudo mv chromedriver /usr/bin/chromedriver
sudo chown root:root /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver
rm -f LICENSE.chromedriver chromedriver_linux64.zip
```

## Assume `grocery-daemon` user
Execute the remaining steps as the `grocery-daemon` user.

## Install Node.js + NPM with NVM
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh
nvm install v17.4.0
```

## Compute Engine IAM Service Account
In order to use GCP Secrets Manager the service account of the VM instance will require
access to secrets containing login username and password for the API.  When stored in GCP
Secrets Manager, the "Secret Manager Secret Accessor" role will need to be added to the
service account accessing the secret as well.

Also the Compute Engine service account will require Read/Write access to the GCP Storage
Bucket used for output.

## Execute run.sh
Start the process by executing the `run.sh` script, which will pull the secret information
and pass the data along as it starts the main process.

# List Items
The list items that will be added to the cart are pulled from Firebase, each item should use
the identifier from the Safeway site for the ID, and have at least a `quantity` numeric field
to identify how many of the item should be added.  If there is a `name` string field it will
be used in the console output while the process is running.
