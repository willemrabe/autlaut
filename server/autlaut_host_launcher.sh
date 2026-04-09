#!/usr/bin/env bash
# Breadcrumb: if this file gets created, bash started OK
echo "$(date)" > "/Users/willemrabe/Desktop/autlaut/server/.host-launched.log"
exec "/usr/bin/python3" "/Users/willemrabe/Desktop/autlaut/server/autlaut_host.py" 2>>"/Users/willemrabe/Desktop/autlaut/server/.host-stderr.log"
