#!/bin/bash
 
function generate_ssl_cert {
  PASSWD=spacebanana
  cert_name=$1
 
  (
    openssl genrsa -des3 -passout pass:${PASSWD} -out ${cert_name}.key 1024
    openssl rsa -in ${cert_name}.key -passin pass:${PASSWD} -out ${cert_name}.pem
  )
}

cd keys
generate_ssl_cert $1
cd ..