# Grocery Basket
This is an attempt at an automated process to order groceries via a cron process.

# Configuration
At the moment this runs on compute that is started on a schedule in order to establish
the simplest solution for the environment.  In other words, a VM is configured with the
required prerequisites and shut down, each week a scheduler runs that starts the VM and
allows it to boot before the configured cron for the Grocery Basket process to start.

Reference the following for setting up `gcsfuse`:
https://github.com/GoogleCloudPlatform/gcsfuse/blob/master/docs/installing.md

The VM userdata/boot script must be configured to run the following, that mounts the
GCP bucket to the screen output path.  This will also require that the Compute Engine
service account has Read/Write access to the GCP Storage Bucket.
```
gcsfuse --dir-mode 777 --file-mode 666 <BUCKET-ID> /opt/grocery-basket/output
```

## Install Chrome
```
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get -f install
sudo rm google-chrome-stable_current_amd64.deb
```

## Install Node.js + NPM with NVM
```
sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install v17.4.0
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
