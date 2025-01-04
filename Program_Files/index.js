const fs = require("fs");
const http = require("http");
const https = require("https");
const querystring = require("querystring");

// port and tenor api key
const port = 3000;
const tenorApiKey = "ENTER API KEY HERE";

// create server and event handlers
const server = http.createServer();
server.on("listening", listen_handler);
server.on("request", request_handler);
// terminal shows port number for localhost
server.listen(port);

// listen_handler consoles port #
function listen_handler() {
    console.log(`listening on port ${port}`);
}

// request_handler receives and handles HTTP requests with responses
function request_handler(req, res) {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    // based on method and url, create ReadStream, receive chunks, or error for no route
    if (req.method === "GET") {
        // first page, nation and character selection page
        console.log("Serving the form at '/'");
        // create read stream to html form, show html form on page
        const form = fs.createReadStream("html/form.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        form.pipe(res);
        console.log("Connection to html/form.html made");
    }
    // when user submits selection, process user selection and start api requests
    else if (req.method === "POST") {
        console.log("Processing form submission at '/select'");
        let userInput = "";
        req.on("data", chunk => userInput += chunk);

        // on receiving end flag from user input, begin first API contact, genshin API
        req.on("end", () => {
            console.log("raw form data:", userInput);
            // seperate selected nation and character name from userInput var, then console out parsed status
            const parsedBody = querystring.parse(userInput);
            console.log("parsed form data:", parsedBody);
            // character var holds picked character name value
            const character = parsedBody.characterMenu;

            // gif limit variable, minimum is 1 and max is 15
            const gifLimit = parseInt(parsedBody.gifLimit);  
            // error handling if no character
            if (!character) {
                console.warn("error: no character selected.");
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end("<h1>INVALID INPUT: Please select a character.</h1>");
            } else {
                // contact Genshin API with url with character name cleaned up, then console out status
                const genshinApiUrl = `https://genshin.jmp.blue/characters/${character.toLowerCase()}`;
                console.log(`fetching Genshin API for character: ${genshinApiUrl}`);

                // begin receiving chunks from Genshin API
                https.get(genshinApiUrl, (genshinApiRes) => {
                    let data = "";

                    genshinApiRes.on("data", (chunk) => {
                        data += chunk;
                    });
                    // when receives end flag from Genshin API, parse to characterData and console out
                    genshinApiRes.on("end", () => {
                        try {
                            const characterData = JSON.parse(data);
                            // create a list of arrays that has the character's ability names and descriptions
                            const characterAttacks = {
                                "Normal" : [characterData.skillTalents[0].name , characterData.skillTalents[0].description],
                                "Skill" : [characterData.skillTalents[1].name, characterData.skillTalents[1].description],
                                "Burst" : [characterData.skillTalents[2].name, characterData.skillTalents[1].description]
                            };
                            console.log(`parsed genshindev API response data saved to characterData: ${characterData.name}, ${characterData.title}`);
                            // begin contact on second API, Tenor API for gifs, with authentification key, limited to 5 gifs
                            const tenorApiUrl = `https://tenor.googleapis.com/v2/search?q=genshin impact ${characterData.name}&key=${tenorApiKey}&limit=${gifLimit}`;
                            console.log(`fetching Tenor API: ${tenorApiUrl}`);

                            // begin receiving chunks from Tenor API
                            https.get(tenorApiUrl, (tenorApiRes) => {
                                let gifData = "";
                                tenorApiRes.on("data", (chunk) => {
                                    gifData += chunk;
                                });
                                // on receiving end flag from Tenor API, try and catch for errors
                                tenorApiRes.on("end", () => {
                                    try {
                                        // parse gif data to gifs, with console out
                                        const gifs = JSON.parse(gifData);
                                        console.log("tenor API response:", gifs);
                                        // if no gifs received, console a warning and write a message to webpage with back button
                                        if (!gifs.results || gifs.results.length === 0) {
                                            console.warn("no GIFs found in tenor API response.");
                                            res.writeHead(200, { "Content-Type": "text/html" });
                                            res.end(
                                                `
                                                <h1>${characterData.name}</h1>
                                                <p>No GIFs found for this character.</p>
                                                <button onclick="window.location.href='/'">Go Back</button>
                                                `
                                            );
                                            return;
                                        }
                                        // each gif url is put into the gifUrls array var
                                        const gifUrls = gifs.results.map((gif) => gif.media_formats.gif.url);

                                        // begin HTML of new webpage with character info and gifs
                                        res.writeHead(200, { "Content-Type": "text/html" });
                                        res.end(
                                            `
                                            <!DOCTYPE html>
                                            <head>
                                                <title>${characterData.name} Info</title>
                                                <link href='https://fonts.googleapis.com/css?family=Aboreto' rel='stylesheet'>
                                                <link href='https://fonts.googleapis.com/css?family=Tilt+Neon' rel='stylesheet'>
                                                <link href='https://fonts.googleapis.com/css?family=Sumana' rel='stylesheet'>
                                                <style>
                                                    body {
                                                        font-family: 'Tilt Neon', sans-serif;
                                                        font-size: 15px;
                                                        margin: 20px;
                                                    }
                                                    h1 {
                                                        font-family: 'Aboreto', sans-serif;
                                                        color: #9c663a;
                                                    }
                                                    p {
                                                        font-family: 'Sumana', serif;
                                                        font-size: 18px;
                                                        margin: 3px 0;
                                                    }
                                                    .gifs img {
                                                        width: 200px;
                                                        margin: 10px;
                                                        border-radius: 8px;
                                                    }
                                                    button {
                                                        font-family: 'Sumana', serif;
                                                        font-size: 16px;
                                                        padding: 10px 20px;
                                                        margin-top: 20px;
                                                        cursor: pointer;
                                                        background-color: #f4e0d3;
                                                        border: 1px solid #9c663a;
                                                        border-radius: 5px;
                                                        color: #9c663a;
                                                    }
                                                    button:hover {
                                                        background-color: #e4c2b0;
                                                    }
                                                </style>
                                            </head>

                                            <body style="background-color: #d6ebff">
                                                <h1>${characterData.name}</h1>
                                                <p><strong>Title:</strong> ${characterData.title}</p>
                                                <p><strong>Vision:</strong> ${characterData.vision}</p>
                                                <p><strong>Weapon:</strong> ${characterData.weapon}</p>
                                                <p><strong>Gender:</strong> ${characterData.gender}</p>
                                                <p><strong>Affiliation:</strong> ${characterData.affiliation}</p>
                                                <p><strong>Rarity:</strong> ${characterData.rarity} Stars</p>

                                                <p><strong>Description:</strong></p>
                                                <p>${characterData.description}</p>

                                                <p><strong>Normal Attack:</strong> ${characterAttacks.Normal[0]}</p>
                                                <p style="font-size: 15px">${characterAttacks.Normal[1]}</p>
                                                <p><strong>Skill:</strong> ${characterAttacks.Skill[0]}</p>
                                                <p style="font-size: 15px">${characterAttacks.Skill[1]}</p>
                                                <p><strong>Elemental Burst:</strong> ${characterAttacks.Burst[0]}</p>
                                                <p style="font-size: 15px">${characterAttacks.Burst[1]}</p>
                                                <p><strong>GIFs:</strong></p>

                                                <div class="gifs" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; align-items: flex-start; border-radius: 25px; background: #9c663a;">
                                                    ${gifUrls.map((url) => `<img src="${url}" alt="GIF" style="object-fit: contain; max-width: none; max-height: none">`).join("")}
                                                </div>

                                                <button onclick="window.location.href='/'">Go Back</button>
                                            </body>
                                            </html>
                                            `
                                        );
                                    }
                                    // catch if Tenor API gives invalid data, console out and write to webpage
                                    catch (err) {
                                        console.error("error parsing tenor API response:", err);
                                        res.writeHead(500, { "Content-Type": "text/html" });
                                        res.end("<h1>Error fetching GIFs.</h1>");
                                    }
                                });
                            // catch error flag when connecting to Tenor API, console out and write to webpage
                            }).on("error", (err) => {
                                console.error("tenor API request error:", err.message);
                                res.writeHead(500, { "Content-Type": "text/html" });
                                res.end("<h1>Error connecting to the Tenor API.</h1>");
                            });
                        // catch if Genshin API gives invalid data, console out and write to webpage
                        } catch (err) {
                            console.error("error parsing genshindev API response:", err);
                            res.writeHead(500, { "Content-Type": "text/html" });
                            res.end("<h1>Error fetching character details.</h1>");
                        }
                    });
                // catch error flag when connecting to Genshin API, console out and write to webpage
                }).on("error", (err) => {
                    console.error("genshindev API request error:", err.message);
                    res.writeHead(500, { "Content-Type": "text/html" });
                    res.end("<h1>Error connecting to the Genshindev API.</h1>");
                });
            }
        });
    // else when no route made with req values, console warn and write to webpage
    } else {
        console.warn("unhandled route:", req.method, req.url);
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 NOT FOUND</h1>");
    }
}
