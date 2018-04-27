#!/bin/bash

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Path to minifier
COMPILER=$HOME/archive/closure-stylesheets.jar

# Java requires converting paths from UNIX to Windows under Cygwin
case "$(uname -s)" in
  CYGWIN*) COMPILER=$(cygpath -w $COMPILER)
esac

# Java must be in the PATH
COMMAND="java -jar $COMPILER --allowed-unrecognized-property user-select"

# Allow overriding default filename from the command line
cd $SCRIPT_DIR

rm *.min.css > /dev/null 2>&1

# Minify all files in the directory
for f in *.css; do
  OPTIONS="$f $OPTIONS"
done

$COMMAND $OPTIONS > ivy.min.css

