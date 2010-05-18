/*!
 * jQuery Webcam Plugin v1.0.3
 *
 * Plugin which allows jQuery to read data from a user's webcam or other video capture device.
 *
 * Copyright 2010, David "Mackers" McNamara (http://mackers.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * This plugin uses code from CamCanvas API 0.2
 * Copyright 2009 Taboca (http://www.taboca.com/p/camcanvas/)
 *
 * Date: Tue Mar  9 14:42:05 CET 2010
 */

(function($)
{
	$.webcam = {};

    $.webcam._initialized = false;
    $.webcam._capturing = false;
    $.webcam._flashready = false;
    $.webcam._width = 320;
    $.webcam._height = 240;
    $.webcam._interval = 100;
    $.webcam._imageData = null;
    $.webcam._imageDataCount = 0;
    $.webcam._flash = null;
    $.webcam._canvas = null;
    $.webcam._triggerCaptureTimeout = null;
    $.webcam._callbacks = [];
    $.webcam._filters = [];
    $.webcam._dialogBody = "<p>This site wants to access your webcam.</p><p>Please ensure you can see yourself above. Some visitors may have to right-click or context-click then choose \'Settings\'.</p>";
    $.webcam._dialogProperties = null;
    $.webcam._imageSize = 0;

	$.webcam.init = function(canvas, flashContainer, properties)
    {
        $.webcam._imageData = null;
        $.webcam._imageDataCount = 0;

        if (properties)
        {
            if (properties.width)
                $.webcam._width = properties.width;

            if (properties.height)
                $.webcam._height = properties.height;

            if (properties.interval)
                $.webcam._interval = properties.interval;

            if (properties.dialogBody)
                $.webcam._dialogBody = properties.dialogBody;

            if (properties.dialogProperties)
                $.webcam._dialogProperties = properties.dialogProperties;
        }

        $.webcam._imageSize = $.webcam._width*$.webcam._height*4;

        $.webcam._flash = flashContainer;
        $.webcam._initFlash();

        $.webcam._canvas = canvas;
        $.webcam._initCanvas();

        $.webcam._initialized = true;
	};

    $.webcam.startCapture = function(fn)
    {
        if (!$.webcam._initialized)
            return;

        $.webcam._capturing = true;

        if (fn)
            $.webcam.addCallback(fn, $.webcam._interval);

        $.webcam._triggerCapture();
    }

    $.webcam.stopCapture = function()
    {
        $.webcam._capturing = false;
        window.clearTimeout($.webcam._triggerCaptureTimeout);
    }

    $.webcam.addCallback = function(fn, interval)
    {
        $.webcam._callbacks.push({fn: fn, interval: interval, last: 0});
    }

    $.webcam.addFilter = function(fn)
    {
        $.webcam._filters.push({fn: fn});
    }

    $.webcam._triggerCapture = function()
    {
        try
        {
            if (!$.webcam._flashready)
                throw("Flash not ready");

            $.webcam._flash.find('embed').get(0).ccCapture();
        }
        catch (e)
        {
            // flash may not be loaded yet
            window.clearTimeout($.webcam._triggerCaptureTimeout);
            $.webcam._triggerCaptureTimeout = window.setTimeout($.webcam._triggerCapture, $.webcam._interval);
        }
    }

    $.webcam._initFlash = function()
    {
        if ($($.webcam._flash).length == 0)
        {
            var onclose = function()
            {
                $.webcam._flash = $("#jquerywebcamflash");
                $.webcam._flash.find("embed").attr("width", "0");
                $.webcam._flash.find("embed").attr("height", "0");
                $.webcam._flash.find("embed").attr("allowScriptAccess", "always");
                $.webcam._flash.find("embed").attr("mayscript", "true");
                //$(document).find("body").append($.webcam._flash);
                dialog.dialog('close');
                setTimeout(function()
                {
                    $('#jquerywebcamdialog').parent().get(0).style.display = "block";
                    $('#jquerywebcamdialog').parent().get(0).style.left = "-1000px";
                    $.webcam._flashready = true;
                }, 200);
            }

            // the user did not specify a flash container to use - therefore we'll create our own container to prompt the user to accept video in flash.
            var blah = ""+$.webcam._dialogClose;
            var dialog = $('<div id="jquerywebcamdialog"></div>')
                .html('<div id="jquerywebcamflash"></div>'+$.webcam._dialogBody)
                .dialog($.webcam._dialogProperties?$.webcam._dialogProperties:{
                    autoOpen: false,
                    modal: true,
                    title: "Allow Access to Webcam?",
                    width: ($.webcam._width + 40),
                    position: 'top',
                    buttons: {"I Can See Myself": onclose}
                });

            dialog.dialog('open');

            $.webcam._flash = $("#jquerywebcamflash");
        }
        else
        {
            $.webcam._flashready = true;
        }

        $.webcam._flash.flash(
            {
                src: 'jquerywebcamhelper.swf',
                width: $.webcam._width,
                height: $.webcam._height,
            },
            {
                version: 8
            }
        );
    }

    $.webcam._initCanvas = function()
    {
        if ($($.webcam._canvas).length == 0)
        {
            var canvas = document.createElement("canvas");
            canvas.setAttribute("id", "jquerywebcamcanvas");
            canvas.setAttribute("width", $.webcam._width);
            canvas.setAttribute("height", $.webcam._height);
            canvas.setAttribute("style", "position: absolute; top: 0; left: -1000px;");
            $(document).find("body").append($(canvas));
            $.webcam._canvas = $('#jquerywebcamcanvas');
        }

        $.webcam._canvas.each(function()
        {
            var e = $(this).get(0);
            e.style.width = $.webcam._width + "px";
            e.style.height = $.webcam._height + "px";
            e.width = $.webcam._width;
            e.height = $.webcam._height;

            var ctx = e.getContext("2d");
            ctx.clearRect(0, 0, $.webcam._width, $.webcam._height);
            $.webcam._imageData = ctx.getImageData(0, 0, 320, 240);

            $(this).data('ctx', ctx);
        });
    }
    
    $.webcam._passLine = function(data)
    {
        if (!$.webcam._initialized || !$.webcam._capturing || !$.webcam._flashready)
            return;

		var coll = data.split("-");
	
		for(var i=0; i<$.webcam._width; i++) 
        {
			var intVal = parseInt(coll[i]);
			r = (intVal >> 16) & 0xff;
			g = (intVal >> 8) & 0xff;
			b = (intVal ) & 0xff;
			$.webcam._imageData.data[$.webcam._imageDataCount+0]=r;
			$.webcam._imageData.data[$.webcam._imageDataCount+1]=g;
			$.webcam._imageData.data[$.webcam._imageDataCount+2]=b;
			$.webcam._imageData.data[$.webcam._imageDataCount+3]=255;

            for (var j=0; j<$.webcam._filters.length; j++)
            {
                var filtered = {
                    r: $.webcam._imageData.data[$.webcam._imageDataCount+0],
                    g: $.webcam._imageData.data[$.webcam._imageDataCount+1],
                    b: $.webcam._imageData.data[$.webcam._imageDataCount+2],
                    a: $.webcam._imageData.data[$.webcam._imageDataCount+3]
                    };

                $.webcam._filters[j].fn(filtered);

                $.webcam._imageData.data[$.webcam._imageDataCount+0]=filtered.r;
                $.webcam._imageData.data[$.webcam._imageDataCount+1]=filtered.g;
                $.webcam._imageData.data[$.webcam._imageDataCount+2]=filtered.b;
                $.webcam._imageData.data[$.webcam._imageDataCount+3]=filtered.a;
            }

			$.webcam._imageDataCount+=4;
		} 

        if ($.webcam._imageDataCount >= $.webcam._imageSize)
        {
            $.webcam._imageDataCount = 0;

            $.webcam._canvas.each(function()
            {
                var ctx = $(this).data('ctx');
                ctx.putImageData($.webcam._imageData, 0, 0);
            });

            for (var i=0; i<$.webcam._callbacks.length; i++)
            {
                var d = (new Date()).getTime();

                if ($.webcam._callbacks[i].last < d - $.webcam._callbacks[i].interval)
                {
                    $.webcam._callbacks[i].last = d;
                    $.webcam._callbacks[i].fn($.webcam._imageData);
                }
            }

            $.webcam._triggerCaptureTimeout = window.setTimeout($.webcam._triggerCapture, $.webcam._interval);
        }
    }
})(jQuery);

// TODO fix this global function
function passLine(data) { $.webcam._passLine(data); }

