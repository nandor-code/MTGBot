module.exports = {

uri_base     : undefined,
api_ver      : undefined,
client_id    : undefined,
client_secret: undefined,
access_token : undefined,
discord      : undefined,
rp           : require('request-promise'),
https        : require('https'),

getRPBT: async function()
{
    var options = {
        method: 'POST',
        uri: 'https://' + this.uri_base + '/token',
        form: {
            'grant_type': 'client_credentials',
            'client_id' : this.client_id,
            'client_secret' : this.client_secret
        },
        json: true
    };
    try {
        const response = await this.rp(options);
        return Promise.resolve( response );
    }
    catch( error ) {
        Promise.reject(error);
    }
},

searchCards: function( term, callBack )
{
    var path = "/" + this.api_ver + "/catalog/categories/1/search";
    var data = ""
    var body = JSON.stringify({
            filters: [
                {
                  name: "ProductName",
                  values:[term]
                } ] } );

    var options = {
        method: 'POST',
        host: this.uri_base,
        path: path,
        headers: {
            'Content-Type': "application/json",
            'Content-Length': Buffer.byteLength(body),
            'Authorization': 'Bearer ' + this.access_token
        }
    };

    var request = this.https.request( options, function (res)
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
        logInfo( e.message, true );
    });

    request.write( body );
    request.end();
},

getCard: function( productId, callBack )
{
    var path = "/" + this.api_ver + "/catalog/products/" + productId + "?getExtendedFields=true";
    var data = ""

    var options = {
        method: 'GET',
        host: this.uri_base,
        path: path,
        headers: {
            'Authorization': 'Bearer ' + this.access_token
        }
    };

    var request = this.https.request( options, function (res)
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
        logInfo( e.message, true );
    });

    request.end();
},

sendCard: function( channel, card )
{
    var extData  = "";
    var embed = new this.discord.RichEmbed(
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
    channel.send( embed );
}

};
