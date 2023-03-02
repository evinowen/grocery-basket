#!/bin/bash
SAFEWAY_USERNAME_SECRET=`curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/SAFEWAY_USERNAME_SECRET" -H "Metadata-Flavor: Google"`
echo "Found Username Secret: $SAFEWAY_USERNAME_SECRET"

SAFEWAY_PASSWORD_SECRET=`curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/SAFEWAY_PASSWORD_SECRET" -H "Metadata-Flavor: Google"`
echo "Found Password Secret: $SAFEWAY_PASSWORD_SECRET"

SENDGRID_API_KEY_SECRET=`curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/SAFEWAY_PASSWORD_SECRET" -H "Metadata-Flavor: Google"`
echo "Found Password Secret: $SAFEWAY_PASSWORD_SECRET"

SENDGRID_FROM_EMAIL=`curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/SAFEWAY_PASSWORD_SECRET" -H "Metadata-Flavor: Google"`
echo "Found sender e-mail: $SENDGRID_FROM_EMAIL"

SENDGRID_TO_EMAIL=`curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/SAFEWAY_PASSWORD_SECRET" -H "Metadata-Flavor: Google"`
echo "Found destination e-mail: $SENDGRID_TO_EMAIL"

OUTPUT_BUCKET=`curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/OUTPUT_BUCKET" -H "Metadata-Flavor: Google"`
echo "Found Output Bucket: $OUTPUT_BUCKET"
gcsfuse $OUTPUT_BUCKET ./output
echo "Mounted $OUTPUT_BUCKET to ./output"

SAFEWAY_USERNAME_SECRET=$SAFEWAY_USERNAME_SECRET \
SAFEWAY_PASSWORD_SECRET=$SAFEWAY_PASSWORD_SECRET \
SENDGRID_API_KEY_SECRET=$SENDGRID_API_KEY_SECRET \
SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL \
SENDGRID_TO_EMAIL=$SENDGRID_TO_EMAIL \
OUTPUT_BUCKET=$OUTPUT_BUCKET \
node src/main.js
