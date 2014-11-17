#!/usr/bin/env bash

CURRENT_PATH=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

trap "exit" INT TERM
trap "kill 0" EXIT

export NODE_PATH="$CURRENT_PATH/node_modules"

MYCOMMAND="nw ."

while true; do
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
  sleep 3;
done
