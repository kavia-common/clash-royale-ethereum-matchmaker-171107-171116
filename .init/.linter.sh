#!/bin/bash
cd /home/kavia/workspace/code-generation/clash-royale-ethereum-matchmaker-171107-171116/frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

