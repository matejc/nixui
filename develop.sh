#!/usr/bin/env bash

CURRENT_PATH=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cleanup() {
  echo "Killing server ..."
  fuser -k 8000/tcp;

  exit
}
# # This will take down the whole process tree on script exit
trap cleanup INT
trap "exit" TERM
trap "kill 0" EXIT

export NODE_PATH="$CURRENT_PATH/node_modules"

MYCOMMAND="node $CURRENT_PATH/src/server.js"

while true; do
  sleep 3;
  NEW_OUTPUT=`find "$CURRENT_PATH"/src -type f \( -iname '*.js' -o -iname '*.json' \) -exec openssl sha1 {} \;`;

  if [ "$NEW_OUTPUT" != "$OLD_OUTPUT" ]
  then
    if [ "$MYPID" ]; then
      echo "Detected change, killing ...";
      kill -9 $MYPID;
    fi
    echo
    echo "starting $MYCOMMAND ..."
    bash -c "$MYCOMMAND" &  # command will output to stdout
    MYPID=$!;
    OLD_OUTPUT="$NEW_OUTPUT";
  fi
done
