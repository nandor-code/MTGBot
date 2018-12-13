// pull the first 8 chars of the full commit hash
const ver = require('./version.json').version.substring(0,7);

// Load config file
const config = require("../config/config.json");

// include image recognition
const AWS = require('aws-sdk');

// Import HTTP libs
const http   = require('http'),
      https  = require('https');

const AWSParameters = require('../config/aws.json');
AWS.config.update({
    accessKeyId: AWSParameters.AWS.aws_access_key_id,
    secretAccessKey: AWSParameters.AWS.aws_secret_access_key,
    region: AWSParameters.AWS.region
});

const rekognition = new AWS.Rekognition();

// Load base, create a client connection, and load our configuration
const Discord = require("discord.js");
const client = new Discord.Client();

const helpers = require("./botHelpers");
helpers.debugMode = config.debugMode;
helpers.appName   = config.appname;

const tcgApi = require("./tcgApi");
tcgApi.uri_base      = config.tcg_api_endpoint;
tcgApi.api_ver       = config.tcg_api_ver;
tcgApi.client_id     = config.client_id;
tcgApi.client_secret = config.client_secret;
tcgApi.discord       = Discord;

const cmds = require('./cmdHandlers');
cmds.cmdList = require("../config/commands.json");
cmds.initialize( config, tcgApi, helpers );

const imgRek = require("./imageRek");
imgRek.rekognition = rekognition;
imgRek.helpers     = helpers;
imgRek.http        = http;
imgRek.https       = https;

const querystring = require('querystring');

// Debug Mode - gives me access by user id to certain commands while on
const debugMode = config.debugMode;

// Developer ID - Set this to bypass all permissions checks for this user id. Set it 
// to letters (something it could never be) when not in use
const bypassId = config.owner_id;

helpers.logInfo(`DiscordBot ${config.version} (${ver}) starting up with owner ${config.owner_id}.`);

// Anti-Spam Functions - Do not let users flood the bot/channel
var lastResponse = new Array ("Empty");
var spamTimeout = 600000;
var maxFileSize = 5 * 1024 * 1024; // 5 MB
    
// Perform on connect/disconnect
client.on("ready", () => {
    helpers.logInfo(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} servers.`);
    client.user.setActivity(`MTGArena (` + ver + `)`);
});

client.on("guildCreate", guild => {
    helpers.logInfo(`New server joined: ${guild.name} (id: ${guild.id}). This server has ${guild.memberCount} members!`);
});

client.on("guildDelete", guild => {
    helpers.logInfo(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

// Listen for commands
client.on("message", async message => {
    // Ignore ourself
    if(message.author.bot) return;

    // Only listen for commands in public channels.
    if(message.channel.name == undefined) return;

    // process commands
    handleMessageCommand( message );

    // process images
    handleMessageImage( message );

})

// Run the bot
client.login(config.token);

// Main processing
function handleMessageCommand( message )
{
    // Look for command character. Else ignore command checking.
    if(message.content.indexOf(config.prefix) == 0)
    {
        let perms = message.member.permissions;

        // Separate command and arguments.
        const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        if(command in cmds.cmdList)
        {
            if(perms && !perms.has(cmds.cmdList[command].perms))
                return message.reply("Sorry, you don't have permissions to use this!");

            cmds[cmds.cmdList[command].func]( cmds.cmdList[command].args, args, message );
        }
    }
}

function handleMessageImage( message )
{
    if( config.imageDetection === 0 ) { return; }

    var url = ""
    var matchAry = message.content.match(/\bhttps?:\/\/\S+/gi);

    if( matchAry )
    {
        url = matchAry[0];
    }
    else if( message.attachments.array().length > 0 && message.attachments.array()[0].filesize < maxFileSize )
    {
        url = message.attachments.array()[0].url;
    }

    if( url && url.length > 0 )
    {
        helpers.logDebug( "Got URL: " + url );
        var type = url.match(/jpg|jpeg|png/i);

        if( type )
        {
            imgRek.handleImage( message, url );
        }
        else
        {
            helpers.logDebug( "Attachement was not valid image type: " + url );
        }
    }
}
