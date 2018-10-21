#!/bin/bash

cat promiseCache.js > out.js
cat $(ls *.js | grep -v 'promiseCache.js') >> out.js
sudo node out.js
