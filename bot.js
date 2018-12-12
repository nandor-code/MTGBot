const ver = require('./version.json').version.substring(1,8);

// include image recognition
const AWS = require('aws-sdk');

const AWSParameters = require('../config/aws.json');
AWS.config.update({
    accessKeyId: AWSParameters.AWS.aws_access_key_id,
    secretAccessKey: AWSParameters.AWS.aws_secret_access_key,
    region: AWSParameters.AWS.region
});

const rp = require('request-promise');
const querystring = require('querystring');

const uri_base = 'api.tcgplayer.com';
const api_ver  = 'v1.17.0';

const docClient = new AWS.DynamoDB.DocumentClient({region: "us-east-2"});

const rekognition = new AWS.Rekognition();

// include helpers
const cmdList = require("../config/commands.json");

// Load config file
const config = require("../config/config.json");

const client_id=config.client_id;
const client_secret=config.client_secret;

// Import HTTP libs
const http   = require('http'),
      https  = require('https');

// Debug Mode - gives me access by user id to certain commands while on
const debugMode = config.debugMode;

// Developer ID - Set this to bypass all permissions checks for this user id. Set it 
// to letters (something it could never be) when not in use
const bypassId = config.owner_id;

logIt(`DiscordBot ${config.version} (${ver}) starting up with owner ${config.owner_id}.`);

// Anti-Spam Functions - Do not let users flood the bot/channel
var lastResponse = new Array ("Empty");
var spamTimeout = 600000;
var maxFileSize = 5 * 1024 * 1024; // 5 MB
    
// Load base, create a client connection, and load our configuration
const Discord = require("discord.js");
const client = new Discord.Client();

// Perform on connect/disconnect
client.on("ready", () => {
    logIt(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} servers.`);
    client.user.setActivity(`MTGArena (` + ver + `)`);
});

client.on("guildCreate", guild => {
    logIt(`New server joined: ${guild.name} (id: ${guild.id}). This server has ${guild.memberCount} members!`);
});

client.on("guildDelete", guild => {
    logIt(`I have been removed from: ${guild.name} (id: ${guild.id})`);
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

        if(command in cmdList)
        {
            if(perms && !perms.has(cmdList[command].perms))
                return message.reply("Sorry, you don't have permissions to use this!");

            cmds[cmdList[command].func]( cmdList[command].args, args, message );
        }
    }
}

function handleMessageImage( message )
{
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
}

// Command Helpers
var cmds = {};
cmds.sendMessage = function( cmdArgs, args, message )
{
     message.channel.send(eval(cmdArgs));
}

var currentSearch = { params: {}, message: undefined, resultCount: 0, term: "", topResults: [] };

cmds.findCard = function( cmdArgs, args, message )
{
    var term = eval( cmdArgs );
    getRPBT().then( function ( token ) {
        searchCards( "/" + api_ver + "/catalog/categories/1/search", token.access_token, term, function( results ) {
            var jsonResult = JSON.parse( results );
            message.channel.send( "Found " + jsonResult.totalItems + " results for: '" + term + "'" );
            if( jsonResult.totalItems > 0 )
            {
                getCard( "/" + api_ver + "/catalog/products/" + jsonResult.results[0] + "?getExtendedFields=true", token.access_token, function( cardresults ) {
                    var jsonCard = JSON.parse( cardresults );
                    //console.log( jsonCard );
                    if( jsonCard.results.length > 0 ) 
                    {
                        printCard( message, jsonCard.results[0] );
                    }
                } );
            }
        } );
    } );
}

cmds.findAllCards = function( cmdArgs, args, message )
{
    var term = eval( cmdArgs );
    getRPBT().then( function ( token ) {
        searchCards( "/" + api_ver + "/catalog/categories/1/search", token.access_token, term, function( results ) {
            var jsonResult = JSON.parse( results );
            message.author.send( "Found " + jsonResult.totalItems + " results for: '" + term + "'" );
            if( jsonResult.totalItems > 0 )
            {
                getCard( "/" + api_ver + "/catalog/products/" + jsonResult.results[0] + "?getExtendedFields=true", token.access_token, function( cardresults ) {
                    var jsonCard = JSON.parse( cardresults );
                    //console.log( jsonCard );
                    var i = 0;
                    jsonCard.results.forEach( function( card )  
                    {
                        sendCard( message, card );
                        i += 1;
                        if( i > 20 ) { return; }
                    });
                } );
            }
        } );
    } );
}

cmds.findCardDDB = function( cmdArgs, args, message )
{
    currentSearch.term = eval( cmdArgs );
    currentSearch.topResults = [];
    currentSearch.resultCount = 0;
    currentSearch.message = message;
    currentSearch.params = {
        TableName: 'TCGPlayersSync',
        ExclusiveStartKey: undefined,
        ScanFilter: {
           "name": {
                ComparisonOperator: "CONTAINS",
                AttributeValueList: [ currentSearch.term ]
           }
        }
      };

    docClient.scan(currentSearch.params, onScan);
}

function onScan( err, data )
{
    if (err) {
        console.log(err);
    }else{
        //console.log(data);
        currentSearch.resultCount += data.Items.length;
        if( data.Items.length > 0 )
        {
            data.Items.forEach( function( item ) { currentSearch.topResults.push( item ); });
            //console.log("Found Card item " + data.Items.length + " matching cards.");
            //printCard( data.Items[0] );
        }

        if (typeof data.LastEvaluatedKey != "undefined") {
            currentSearch.params.ExclusiveStartKey = data.LastEvaluatedKey;
            docClient.scan(currentSearch.params, onScan);
        }
        else
        {
            currentSearch.message.channel.send( "Found " + currentSearch.resultCount + " results for: '" + currentSearch.term + "'" );
            if( currentSearch.topResults.length > 0 )
            {
                printCard( currentSearch.message, currentSearch.topResults[0] );
            }
        }
    }
}

function printCard( message, card )
{
    var extData  = "";
    var embed = new Discord.RichEmbed(
        {
            url: card.url,
            title: card.name,
            thumbnail: {
                url: card.imageUrl
            }
        } );
    card.extendedData.forEach( function( extObj ) {
        var value = extObj.value.replace( /<[^>]*>/g, '' );
        embed.addField( extObj.displayName, value, true );
    });
    message.channel.send( embed );
}

function sendCard( message, card )
{
    var extData  = "";
    var embed = new Discord.RichEmbed(
        {
            url: card.url,
            title: card.name,
            thumbnail: {
                url: card.imageUrl
            }
        } );
    card.extendedData.forEach( function( extObj ) {
        var value = extObj.value.replace( /<[^>]*>/g, '' );
        embed.addField( extObj.displayName, value, true );
    });
    message.author.send( embed );
}

// Help Func
cmds.help = function( cmdArgs, args, message )
{
    if (args.length == 0)
    {
        generalHelp(message);
    }
    else
    {
        getHelp(args, message);
    }
}

// Image Detection
function handleImage( message, url )
{
    logIt(url);
    var httpHandler = http;

    if( url.match(/https/i) )
    {
        httpHandler = https;    
    }
    // get image data
    httpHandler.request(url, function(response) {                                        
        var data = [];

        response.on('data', function(chunk) {                                       
            data.push(chunk);
        });                                                                         

        response.on('end', function() {                                             
            logIt('Image Downloaded!' );
            var image = Buffer.concat(data);

            var params = {
                Image: {
                        Bytes: image
                },
                MaxLabels: 10,
                MinConfidence: 50.0
            };

            rekognition.detectLabels(params, function(err, data) {
                if (err) {
                    logIt(err); // an error occurred
                } else {
                   var reply = ""
                   data.Labels.forEach( function( label )
                   {
                       if( reply === "" )
                       {
                           reply += "I am ";
                       }
                       else
                       {
                          reply += " and ";
                       }
                       reply += label.Confidence.toFixed(0) + "% sure that is a " + label.Name;
                   });
                   reply += "!";
                   message.channel.send(reply);
                }
            });
        });                                                                         
    }).end();
}

//handleImage( "", "https://cdn.discordapp.com/attachments/520388629374435338/521001978860535828/mq2.png" );

// Main Help Menu
function generalHelp(message)
{
    let hArray = new Array();
    for (var key in cmdList)
    {
        hArray.push(key);
    }
    message.author.send(config.topMenu + "Command List:\n\n " + hArray.toString().replace(/,/g, " ") + "\n\n" + config.botMenu);
}

// Help Sub-Menus
function getHelp(args, message)
{
    try {
        let arg1 = args[0];
        let arg2 = args[1];
        if (!isEmpty(arg1))
        {
            if (!isEmpty(cmdList[arg1]))
            {
                let example = cmdList[arg1]['example'];
                let desc = cmdList[arg1]['desc'];
                let cmdPerm = (message.member.permissions.has(cmdList[arg1]['perms']) ? "yes" : "no" );
                if (arg1.toString().toLowerCase() === 'set' && isEmpty(arg2))
                {
                    let optionsArray = new Array();
                    for(var key in cmdList['set']['options'])
                    {
                        optionsArray.push(key);
                    }

                    message.author.send(config.topMenu + "Command: " + arg1 + "\n\nSyntax: " + example + "\n\n" + "Description: " + desc + "\n\nOptions Available: " + optionsArray.toString().replace(/,/g, " ") + "\n\nFor more information on an option '**!help set <option>**'\n\nCan I use this? " + cmdPerm);
                    return;
                }
                if (arg1.toString().toLowerCase() === 'set' && !isEmpty(arg2) && !isEmpty(cmdList[arg1]['options'][arg2]))
                {
                    example = cmdList[arg1]['options'][arg2]['example'];
                    desc = cmdList[arg1]['options'][arg2]['desc'];
                    cmdPerm = (message.member.permissions.has(cmdList[arg1]['options'][arg2]['perms']) ? "yes" : "no" );
                    message.author.send(config.topMenu + "Command: " + arg1 + " " + arg2 + "\n\nSyntax: " + example + "\n\n" + "Description: " + desc + "\n\nCan I use this? " + cmdPerm);
                    return;
                }
                else
                {
                    message.author.send(config.topMenu + "Command: " + arg1 + "\n\nSyntax: " + example + "\n\n" + "Description: " + desc + "\n\nCan I use this? " + cmdPerm);
                    return;
                }
            }
            else
            {
                message.author.send(`[${config.appname}] Error: No such command. For a list of commands type '**!help**' with no arguments in any channel.`);
                return;
            }
        }
    }
    catch(error)
    {
        logIt(error.message, true);
    }
}

// Generic Helpers
function getUrl( hostName, pathToData, callBack )
{
    var data = '';

    var request = http.request( { host: hostName, path: pathToData }, function (res)
    {
        res.on('data', function (chunk)
        {
            data += chunk;
        });
        res.on('end', function ()
        {
           callBack( data );
        });
    });

    request.on('error', function (e)
    {
        logIt(e.message);
    });

    request.end();
}

// Log certain items or errors
function logIt(message, isError = false)
{
    if (!isError)
    {
        console.log(`[${config.appname}] ` + displayTime() + "> " + message);
    }
    else
    {
        console.error(`[${config.appname}] ` + displayTime() + "> " + message);
    }
}

// Format Timestamps
function displayTime() {
    var str = "";
    var currentTime = new Date()
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()

    if (minutes < 10)
    {
        minutes = "0" + minutes
    }

    if (seconds < 10)
    {
        seconds = "0" + seconds
    }

    str += hours + ":" + minutes + ":" + seconds + " ";

    if(hours > 11)
    {
        str += "PM"
    }
    else
    {
        str += "AM"
    }
    return str;
}

// Remove item from array when callback is needed.
function arrayRemove(arr, item)
{
    for (var i = arr.length; i--;)
    {
        if (arr[i] === item)
        {
            arr.splice(i, 1);
            logIt("Removed " + item + " from " + arr + " array at index [" + i + "]");
        }
    }
}

// Is passed variable a number?
function isNumeric(n)
{
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Is passed variable or array empty
function isEmpty(obj)
{
    for(var key in obj)
    {
        if(obj.hasOwnProperty(key))
        {
            return false;
        }
    }
    return true;
}

// Prototype Extensions
// Does an array contain an item?
Array.prototype.contains = function(obj)
{
    return this.indexOf(obj) > -1;
};

// Remove all instances of an item from an array
Array.prototype.remove = function(item)
{
    for (var i = this.length; i--;)
    {
        if (this[i] === item)
        {
            this.splice(i, 1);
        }
    }
}

async function getRPBT()
{
    var options = {
        method: 'POST',
        uri: 'https://' + uri_base + '/token',
        form: {
            'grant_type': 'client_credentials',
            'client_id' : client_id,
            'client_secret' : client_secret
        },
        json: true
    };
    try {
        const response = await rp(options);
        return Promise.resolve( response );
    }
    catch( error ) {
        Promise.reject(error);
    }
}

function searchCards( path, access_token, term, callBack )
{
    var data = ""
    var body = JSON.stringify({
            filters: [
                {
                  name: "ProductName",
                  values:[term]
                } ] } );

    var options = {
        method: 'POST',
        host: uri_base,
        path: path,
        headers: {
            'Content-Type': "application/json",
            'Content-Length': Buffer.byteLength(body),
            'Authorization': 'Bearer ' + access_token
        }
    };

    var request = https.request( options, function (res)
    {
        res.on('data', function (chunk)
        {
            data += chunk;
        });
        res.on('end', function ()
        {
           callBack( data );
        });
    });

    request.on('error', function (e)
    {
        console.log(e.message);
    });

    request.write( body );
    request.end();
}

function getCard( path, access_token, callBack )
{
    var data = ""

    var options = {
        method: 'GET',
        host: uri_base,
        path: path,
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    };

    var request = https.request( options, function (res)
    {
        res.on('data', function (chunk)
        {
            data += chunk;
        });
        res.on('end', function ()
        {
           callBack( data );
        });
    });

    request.on('error', function (e)
    {
        console.log(e.message);
    });

    request.end();
}
