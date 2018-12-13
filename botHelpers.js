module.exports = {
    appName: undefined,
    debugMode: 0,

    config: function (params)
    {
        this.appName = params.appName;
        this.debugMopde = params.debugMode;
    },
    // Log certain items or errors
    logDebug: function (message)
    {
        if (this.debugMode) { this.logInfo(message); }
    },

    logInfo: function (message, isError = false)
    {
        if (!isError)
        {
            console.log(`[${this.appName}] ` + this.displayTime() + "> " + message);
        }
        else
        {
            console.error(`[${this.appName}] ` + this.displayTime() + "> " + message);
        }
    },

    // Format Timestamps
    displayTime: function ()
    {
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

        if (hours > 11)
        {
            str += "PM"
        }
        else
        {
            str += "AM"
        }
        return str;
    },

    // Remove item from array when callback is needed.
    arrayRemove: function (arr, item)
    {
        for (var i = arr.length; i--;)
        {
            if (arr[i] === item)
            {
                arr.splice(i, 1);
            }
        }
    },

    // Is passed variable a number?
    isNumeric: function (n)
    {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    // Is passed variable or array empty
    isEmpty: function (obj)
    {
        for (var key in obj)
        {
            if (obj.hasOwnProperty(key))
            {
                return false;
            }
        }
        return true;
    }

};
