const express = require('express');
const app = express();
const Postback = require('./db.js')

app.get('/', async(req, res) => {
    const {click,idfa,aaid,user_agent,os,os_version,app_version,country,event}=  req.query;
    console.log(`Received event: ${event}\n`,`Click ID: ${click}\n`,`IDFA: ${idfa}\n`,`AAID: ${aaid}\n`,
          `Received event: ${user_agent}\n`,`Click ID: ${os}\n`,`IDFA: ${os_version}\n`,`AAID: ${app_version}\n`,
          `county:${country}\n`
           );
           const postback = new Postback({ click, idfa, aaid, user_agent, os, os_version, app_version, country, event });

    try {
        await postback.save();
        res.status(200).send('Postback received and saved successfully');
        } catch (error) {
        console.error('Error saving postback:', error);
        res.status(500).send('Error saving postback');
        }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
