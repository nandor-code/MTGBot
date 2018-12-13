## Discord MTGBot Source
====

#### Requirements: Node.js, Discord.js, Supervisor, Basic knowledge of servers, json, javascript, and node.js

+ mkdir BotDeploy
+ Clone the repository
+ cd MTGBot
+ npm i discord.js
+ npm i request
+ npm i request-promise
+ npm i supervisor
+ create ../config (bot assumes it is in Bot/src)
+ mv commands.json ../config
+ mv config.default ../config/config.json
+ mv aws.json ../config
+ update all files in ../config with your correct information
+ screen -dmS bot supervisor src/bot.js
+ CTRL+A, Then D to leave bot running. CTRL+C to quit
