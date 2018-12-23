module.exports = {

    uri_base: undefined,
    api_ver: undefined,
    client_id: undefined,
    client_secret: undefined,
    access_token: undefined,
    discord: undefined,
    helpers: undefined,
    rp: require('request-promise'),
    https: require('https'),

    config: function (params)
    {
        this.uri_base = params.uri_base;
        this.api_ver = params.api_ver;
        this.client_id = params.client_id;
        this.client_secret = params.client_secret;
        this.discord = params.discord;
        this.helpers = params.helpers;

        this.getRPBT().then((function (token)
        {
            this.access_token = token.access_token;
            this.helpers.logDebug("Api Token: " + this.access_token);
        }).bind(this));
    },

    getRPBT: async function ()
    {
        var options = {
            method: 'POST',
            uri: 'https://' + this.uri_base + '/token',
            form:
            {
                'grant_type': 'client_credentials',
                'client_id': this.client_id,
                'client_secret': this.client_secret
            },
            json: true
        };
        try
        {
            const response = await this.rp(options);
            return Promise.resolve(response);
        }
        catch (error)
        {
            Promise.reject(error);
        }
    },

    searchCardsByName: function (term, callBack)
    {
        this.searchCards("ProductName", term, callBack)
    },

    searchCards: function (filter, term, callBack)
    {
        var path = "/" + this.api_ver + "/catalog/categories/1/search";
        var body = JSON.stringify(
        {
            limit: 100,
            filters: [
                {
                    name: filter,
                    values: [term]
                }
            ],
            sort: "Relevance"
        });

        this.apiPostRequest(path, body, callBack);
    },

    getCard: function (productId, callBack)
    {
        var path = "/" + this.api_ver + "/catalog/products/" + productId + "?getExtendedFields=true&limit=100";
        this.helpers.logInfo(path);
        this.apiGetRequest(path, callBack);
    },

    sendCard: function (channel, card)
    {
        var extData = "";
        var embed = new this.discord.RichEmbed(
        {
            url: card.url,
            title: card.name,
            thumbnail:
            {
                url: card.imageUrl
            }
        });
        card.extendedData.forEach(function (extObj)
        {
            var value = extObj.value.replace(/<[^>]*>/g, '');
            embed.addField(extObj.displayName, value, true);
        });
        channel.send(embed);
    },

    apiGetRequest: function (path, callBack)
    {
        var data = ""

        var options = {
            method: 'GET',
            host: this.uri_base,
            path: path,
            headers:
            {
                'Authorization': 'Bearer ' + this.access_token
            }
        };

        var request = this.https.request(options, function (res)
        {
            res.on('data', function (chunk)
            {
                data += chunk;
            });
            res.on('end', function ()
            {
                callBack(data);
            });
        });

        request.on('error', function (e)
        {
            this.helpers.logInfo(e.message, true);
        });

        request.end();
    },

    apiPostRequest: function (path, body, callBack)
    {
        var data = "";

        var options = {
            method: 'POST',
            host: this.uri_base,
            path: path,
            headers:
            {
                'Content-Type': "application/json",
                'Content-Length': Buffer.byteLength(body),
                'Authorization': 'Bearer ' + this.access_token
            }
        };

        var request = this.https.request(options, function (res)
        {
            res.on('data', function (chunk)
            {
                data += chunk;
            });
            res.on('end', function ()
            {
                callBack(data);
            });
        });

        request.on('error', function (e)
        {
            this.helpers.logInfo(e.message, true);
        });

        request.write(body);
        request.end();
    },
};
