#!/usr/bin/env bash

# Exit immediately upon non-zero exit status
set -e ; set -o pipefail

# Add src/bash to PATH as necessary
if ! [[ $PATH =~ /opt/bao/bin ]]; then 
  export PATH="$PATH:../../src/bash"
fi


#Gather DHIS credentials for `curl` calls:
source dhis_config

# Set the app to download and where to get it
app_key='user-management'
app_new_version='1.1.2'
app_new_url="https://github.com/mpossumatoctc/datim-user-management/raw/schema-refactor/releases/${app_new_version}/user-management.zip"

# Gather information about existing version of the app; folderName ensures
# existing URLs will remain the same after upgrade
app_name="$( dhis_api --quiet --api-request='apps' --quiet| jq --raw-output '.[] | select(.key == "'"$app_key"'") | .name' )"
app_version="$( dhis_api --quiet --api-request='apps' --quiet| jq --raw-output '.[] | select(.key == "'"$app_key"'") | .version' )"
app_folderName="$( dhis_api --quiet --api-request='apps' --quiet| jq --raw-output '.[] | select(.key == "'"$app_key"'") | .folderName' )"

# Only proceed if the new version is different than the existing version
if [[ $app_new_version != "$app_version" ]]; then
  # Download data store
  rm --force "/tmp/${app_folderName}_i18n.json"
  rm --force "/tmp/${app_folderName}_stores.json"

  app_store_i18n_dl=$(
    curl "https://github.com/mpossumatoctc/datim-user-management/raw/schema-refactor/data/dataStore/datim-user-management/i18n.json" \
      --silent \
      --location \
      --connect-timeout "30" \
      --max-time "120" \
      --header 'Accept: application/octet-stream' \
      --output "/tmp/${app_folderName}_i18n.json" \
      --write-out "%{http_code}"
  )

  app_store_stores_dl=$(
    curl "https://github.com/mpossumatoctc/datim-user-management/raw/schema-refactor/data/dataStore/datim-user-management/stores.json" \
      --silent \
      --location \
      --connect-timeout "30" \
      --max-time "120" \
      --header 'Accept: application/octet-stream' \
      --output "/tmp/${app_folderName}_stores.json" \
      --write-out "%{http_code}"
  )

  # Test http response and if file size is greater than 0 bytes
  if [[ $app_store_i18n_dl -ne 200 ]] || [[ ! -s "/tmp/${app_folderName}_i18n.json" ]]; then
    echo "ERROR: Unable to download i18n data store, exiting..." >&2
    rm --force "/tmp/${app_folderName}_i18n.json" &>/dev/null
    exit 1
  fi

  # Test http response and if file size is greater than 0 bytes
  if [[ $app_store_stores_dl -ne 200 ]] || [[ ! -s "/tmp/${app_folderName}_stores.json" ]]; then
    echo "ERROR: Unable to download stores data store, exiting..." >&2
    rm --force "/tmp/${app_folderName}_stores.json" &>/dev/null
    exit 1
  fi

  # Download app as zip
  rm --force "/tmp/${app_folderName}.zip"
  app_new_version_dl=$(
    curl "${app_new_url}" \
      --silent \
      --location \
      --connect-timeout "30" \
      --max-time "120" \
      --header 'Accept: application/octet-stream' \
      --output "/tmp/${app_folderName}.zip" \
      --write-out "%{http_code}"
  )

  # Test http response and if file size is greater than 0 bytes
  if [[ $app_new_version_dl -ne 200 ]] || [[ ! -s "/tmp/${app_folderName}.zip" ]]; then
    echo "ERROR: Unable to download DHIS2 app \"${app_name}\", exiting..." >&2
    rm --force "/tmp/${app_folderName}.zip" &>/dev/null
    exit 1
  fi

  # Use additional curl headers for DHIS 2.21 and below
  CURL_ARGS_HEADERS=''
  if [[ $( dhis_build --version | sed 's/\.//g' ) -le 221 ]]; then
    # "Host" header
    appBaseUrl_HOSTNAME="$( dhis_api_setting --quiet --key='appBaseUrl' | sed -e 's%^http\(s\)\{0,1\}://%%' -e 's%:[0-9].*%%' -e 's%/.*$%%' )"
    # If appBaseUrl_HOSTNAME is localhost, null, or empty, set to the system hostname
    if [[ $appBaseUrl_HOSTNAME =~ ^localhost ]] || [[ $appBaseUrl_HOSTNAME =~ ^127\.0\.0\.1 ]] || [[ $appBaseUrl_HOSTNAME =~ ^::1 ]] || [[ $appBaseUrl_HOSTNAME =~ ^null$ ]] || [[ -z $appBaseUrl_HOSTNAME ]]; then
      appBaseUrl_HOSTNAME="$( hostname )"
    fi
    CURL_ARGS_HEADERS="--header 'Host: $appBaseUrl_HOSTNAME'"

    # "X-Forwarded-Proto" header
    appBaseUrl_PROTOCOL="$( dhis_api_setting --quiet --key='appBaseUrl' | awk -F: '{print $1}' )"
    # If appBaseUrl_PROTOCOL is null or empty, set to https
    if [[ $appBaseUrl_PROTOCOL =~ ^null$ ]] || [[ -z $appBaseUrl_PROTOCOL ]]; then
      appBaseUrl_PROTOCOL='https'
    fi
    CURL_ARGS_HEADERS="$CURL_ARGS_HEADERS --header 'X-Forwarded-Proto: $appBaseUrl_PROTOCOL'"
  fi

  # Upload and install app zip file, don't show empty line output
  CURL_ARGS="$CURL_ARGS_HEADERS --form file=@'/tmp/${app_folderName}.zip'" \
    dhis_api $DHIS_API_ARGS \
      --api-request='apps' \
      --request='POST'

  # Update Data Store
  curl -X DELETE -u "${DHIS_USERNAME:?}:${DHIS_PASSWORD:?}" "${DHIS_BASEURL:?}/api/dataStore/datim-user-management/i18n"
  curl -X DELETE -u "${DHIS_USERNAME:?}:${DHIS_PASSWORD:?}" "${DHIS_BASEURL:?}/api/dataStore/datim-user-management/stores"
  curl -X POST -H "Content-Type: application/json" -u "${DHIS_USERNAME:?}:${DHIS_PASSWORD:?}" "${DHIS_BASEURL:?}/api/dataStore/datim-user-management/i18n" --data "@/tmp/${app_folderName}_i18n.json"
  curl -X POST -H "Content-Type: application/json" -u "${DHIS_USERNAME:?}:${DHIS_PASSWORD:?}" "${DHIS_BASEURL:?}/api/dataStore/datim-user-management/stores" --data "@/tmp/${app_folderName}_stores.json"

  # Cleanup
  rm --force "/tmp/${app_folderName}.zip"
  rm --force "/tmp/${app_folderName}_i18n.json"
  rm --force "/tmp/${app_folderName}_stores.json"

  # Clear cache
  dhis_api --request="POST" --api-request="maintenance/cache"
fi



exit 0