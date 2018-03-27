#!/bin/bash

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Path to Closure Compiler
COMPILER=$HOME/archive/closure-javascript.jar

# Java requires converting paths from UNIX to Windows under Cygwin
case "$(uname -s)" in
  CYGWIN*) COMPILER=$(cygpath -w $COMPILER)
esac

# Java must be in the PATH
COMMAND="java -jar $COMPILER"

# Allow overriding default filename from the command line
cd $SCRIPT_DIR

rm *.min.js > /dev/null 2>&1

# Minify all files in the directory
for js in *.js; do
  $COMMAND --js=$js --js_output_file=$(basename $js .js).min.js
done

