/**
 * XadillaX created at 2014-09-24 12:33
 *
 * Copyright (c) 2014 Huaban.com, all rights
 * reserved.
 */
var clipboard = require("cliparoo");
var text = "";

function genCall(count) {
    var text = "callback(";
    for(var i = 0; i < count; i++) {
        if(i !== 0) text += ", ";
        text += "arguments[" + i + "]";
    }
    text += ");";
    return text;
}

for(var i = 0; i <= 100; i++) {
    if(i !== 0) text += " else ";
    else text += "    ";
    text += "if(arguments.length === " + i + ") {\n";
    text += "        if(async) {\n";
    text += "            process.nectTick(function(){\n";
    text += "                " + genCall(i) + "\n";
    text += "            });\n";
    text += "        } else {\n";
    text += "            " + genCall(i) + "\n";
    text += "        }\n";
    text += "    }"
}

text += " else {\n";
text += "        throw(new Error(\"Arguments number limit exceeded.\"));\n";
text += "    }";

console.log(text);
console.log("\nGenerated.");

clipboard(text, function(err) {
    if(err) return console.log(err);
    console.log("Use your clipboard to paste code.");
});

