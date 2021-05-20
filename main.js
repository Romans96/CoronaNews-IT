const axios  = require("axios");
const cheerio = require('cheerio');
const back = require('androidjs').back;
const { MongoClient } = require('mongodb');

back.on('get-urls', async function() {
    const url = "mongodb://user@password@mongourlproject";
    MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
        if (err) {
            return back.send('reload-app', "connession_error");
            // return back.send('use-html', "<p>"+err+"</p>", "");
        }
        var dbo = db.db("covid19news");
        
        dbo.collection("urls").findOne({}, async function(err, result) {
            if (err) return back.send('reload-app', "db_error");
            // if (err) return back.send('use-html', "<p>"+err+"</p>", "");
            db.close();
            back.send('use-urls', result.urls);
        })
    });
});

back.on('get-html', async function(url, nome) {
    axios.get(url).then(async (response) => {
        if ( response.status == 200) {
            const myUrl = url;
            const html = response.data;
            var $ = cheerio.load(html);

            // ## Sommario pagina
            var summary = $('p[itemprop=description]').map(function() {
                var htm = $(this).html();
                return htm;
            }).get().join("\n");
            $ = cheerio.load(summary);
            $("strong").remove();
            $("a").remove();
            $("br").remove();
            var sommario = $.text();
            if (sommario.length < 20) sommario = "";
            else sommario = "<h2>Sommario generale:</h2><p>"+sommario+"</p>";

            // ## Entire page text informations
            $ = cheerio.load(html);
            var myPage = $('span[itemprop=articleBody]').map(function(i,el)  {
                var htm = $(this).html();
                return htm;
                $ = cheerio.load(htm);
                var h_d = $('u').first().text();
                // console.log(h_d)
            }).get().join("\n")//.split("<br>");

            $ = cheerio.load(myPage);
            $("figure").remove();
            $('a').each(function() {
                $(this).attr("target","_blank");
                //$(this).removeAttr("href");

                // Check if the link is not correct:
                var attr = $(this).attr('href');
                if (attr.startsWith('#')) {
                    $(this).attr("href", myUrl+attr)
                }
                var elem_text = $(this).text();
                if (elem_text.startsWith(">")) $(this).remove();
            });
            // $('<hr align="center" size="1" color="red" width="100%"/>').insertBefore("u")
            $('u').each(function() {
                var p = $(
                    `<hr />
                    <div style="margin:auto; width: 50%; text-align: center;">`
                    +"<u>"+$(this).html()+"</u>" +
                    '</div>'
                )
                $(this).replaceWith(p);
            });
            $('img').each(function() {
                $(this).attr("class","pageImgs")
            });

            back.send('use-html', sommario + $.html(), nome);
        }
    })
    .catch((err) => {
        //throw new Error(err);
        const e = new Error(err);
        if (err.errno === "ENOTFOUND") {
            /* back.send('use-html', 
            `<center><h3>Nessuna connessione a internet</h3></center>
            <br>
            <center><h3>Collegarsi ad una rete e riprovare!</h3></center>`
            ); */
            return back.send('reload-app', "connession_error");
        }
        else if (e) {
            back.send('use-html', 
            `<center><h3>Pagina attualmente non disponibile </h3></center>
            <br>
            <center><h3>Riprovare più tardi o con un'altra pagina</h3></center>`
            );
        }
            
    });
});
