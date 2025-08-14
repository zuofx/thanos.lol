#!/bin/bash
cd /home/huy/GitHub/thanos.lol/front-end
npm run build
pm2 restart RUNTHANOS
