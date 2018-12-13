module.exports = {

config : undefined,
tcgApi : undefined,
helpers: undefined,
cmdList: undefined,

config: function( params )
{
    this.config  = params.config;
    this.tcgApi  = params.tcgApi;
    this.helpers = params.helpers;
    this.cmdList = params.cmdList;
},

sendMessage: function( cmdArgs, args, message )
{
     message.channel.send(eval(cmdArgs));
},

findCard: function( cmdArgs, args, message )
{
    var term = eval( cmdArgs );
    this.tcgApi.searchCards( term, ( function( results ) 
    {
        var jsonResult = JSON.parse( results );
        message.channel.send( "Found " + jsonResult.totalItems + " results for: '" + term + "'" );
        if( jsonResult.totalItems > 0 )
        {
            this.tcgApi.getCard( jsonResult.results[0], ( function( cardresults ) {
                var jsonCard = JSON.parse( cardresults );
                this.helpers.logDebug( JSON.stringify( jsonCard ) );
                if( jsonCard.results.length > 0 ) 
                {
                    this.tcgApi.sendCard( message.channel, jsonCard.results[0] );
                }
            } ).bind(this) );
        }
    } ).bind(this) );
},

findAllCards: function( cmdArgs, args, message )
{
    var term = eval( cmdArgs );
    this.tcgApi.searchCards( term, ( function( results ) 
    {
        var jsonResult = JSON.parse( results );
        message.author.send( "Found " + jsonResult.totalItems + " results for: '" + term + "'" );
        jsonResult.results.forEach( ( function (prod)
        {
            this.tcgApi.getCard( prod, ( function( cardresults ) {
                var jsonCard = JSON.parse( cardresults );
                this.helpers.logDebug( JSON.stringify( jsonCard ) );
                var i = 0;
                jsonCard.results.forEach( ( function( card )  
                {
                    this.tcgApi.sendCard( message.author, card );
                    i += 1;
                    if( i >= this.config.maxPMs ) { return; }
                } ).bind(this) );
            } ).bind(this) );
        } ).bind(this) );
    } ).bind(this) );
},

help: function( cmdArgs, args, message )
{
    if (args.length == 0)
    {
        this.generalHelp(message);
    }
    else
    {
        this.getHelp(args, message);
    }
},

// Main Help Menu
generalHelp: function(message)
{
    let hArray = new Array();
    for (var key in this.cmdList)
    {
        hArray.push(key);
    }
    message.author.send(this.config.topMenu + "Command List:\n\n " + hArray.toString().replace(/,/g, " ") + "\n\n" + this.config.botMenu);
},

// Help Sub-Menus
getHelp: function(args, message)
{
    try {
        let arg1 = args[0];
        let arg2 = args[1];
        if (!this.helpers.isEmpty(arg1))
        {
            if (!this.helpers.isEmpty(this.cmdList[arg1]))
            {
                let example = this.cmdList[arg1]['example'];
                let desc = this.cmdList[arg1]['desc'];
                let cmdPerm = (message.member.permissions.has(this.cmdList[arg1]['perms']) ? "yes" : "no" );
                if (arg1.toString().toLowerCase() === 'set' && this.helpers.isEmpty(arg2))
                {
                    let optionsArray = new Array();
                    for(var key in this.cmdList['set']['options'])
                    {
                        optionsArray.push(key);
                    }

                    message.author.send(this.config.topMenu + "Command: " + arg1 + "\n\nSyntax: " + example + "\n\n" + "Description: " + desc + "\n\nOptions Available: " + optionsArray.toString().replace(/,/g, " ") + "\n\nFor more information on an option '**!help set <option>**'\n\nCan I use this? " + cmdPerm);
                    return;
                }
                if (arg1.toString().toLowerCase() === 'set' && !this.helpers.isEmpty(arg2) && !this.helpers.isEmpty(this.cmdList[arg1]['options'][arg2]))
                {
                    example = this.cmdList[arg1]['options'][arg2]['example'];
                    desc = this.cmdList[arg1]['options'][arg2]['desc'];
                    cmdPerm = (message.member.permissions.has(this.cmdList[arg1]['options'][arg2]['perms']) ? "yes" : "no" );
                    message.author.send(this.config.topMenu + "Command: " + arg1 + " " + arg2 + "\n\nSyntax: " + example + "\n\n" + "Description: " + desc + "\n\nCan I use this? " + cmdPerm);
                    return;
                }
                else
                {
                    message.author.send(this.config.topMenu + "Command: " + arg1 + "\n\nSyntax: " + example + "\n\n" + "Description: " + desc + "\n\nCan I use this? " + cmdPerm);
                    return;
                }
            }
            else
            {
                message.author.send(`[${this.config.appname}] Error: No such command. For a list of commands type '**!help**' with no arguments in any channel.`);
                return;
            }
        }
    }
    catch(error)
    {
        this.helpers.logInfo( error.message, true );
    }
},
};

