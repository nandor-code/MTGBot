module.exports = {
// Image Detection
rekognition: undefined,
https      : undefined,
http       : undefined,
helpers    : undefined,

handleImage: function( message, url )
{
    this.helpers.logDebug(url);
    var httpHandler = this.http;

    if( url.match(/https/i) )
    {
        httpHandler = this.https;
    }
    // get image data
    httpHandler.request(url, ( function(response) {
        var data = [];

        response.on('data', ( function(chunk) {
            data.push(chunk);
        } ).bind(this) );

        response.on('end', ( function() {
            helpers.logDebug('Image Downloaded!' );
            var image = Buffer.concat(data);

            var params = {
                Image: {
                        Bytes: image
                },
                MaxLabels: 10,
                MinConfidence: 50.0
            };

            this.rekognition.detectLabels(params, function(err, data) {
                if (err) {
                    helpers.logInfo( err, true ); // an error occurred
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
            } ).bind(this) );
        } ).bind(this) );
    } ).bind(this) ).end();
}

}
