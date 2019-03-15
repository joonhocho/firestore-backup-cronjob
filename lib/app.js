"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const dateformat = require("dateformat");
const express = require("express");
const googleapis_1 = require("googleapis");
const { GOOGLE_CLOUD_PROJECT } = process.env;
if (!GOOGLE_CLOUD_PROJECT) {
    throw new Error('process.env.GOOGLE_CLOUD_PROJECT must be set');
}
const app = express();
app.get('/cloud-firestore-export', (req, res) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleapis_1.google.auth.getClient({
        scopes: ['https://www.googleapis.com/auth/datastore'],
    });
    const accessTokenResponse = yield auth.getAccessToken();
    const accessToken = accessTokenResponse.token;
    if (!req.get('X-Appengine-Cron')) {
        return res
            .status(403)
            .send('Forbidden')
            .end();
    }
    const { outputUriPrefix, collections } = req.query;
    if (!(outputUriPrefix && outputUriPrefix.indexOf('gs://') === 0)) {
        return res
            .status(500)
            .send(`Malformed outputUriPrefix: ${outputUriPrefix}`);
    }
    const timestamp = dateformat(Date.now(), 'yyyy-mm-dd_HH:MM:ss');
    let path = outputUriPrefix;
    if (path.endsWith('/')) {
        path += timestamp;
    }
    else {
        path += `/${timestamp}`;
    }
    const body = {
        outputUriPrefix: path,
    };
    if (collections) {
        body.collectionIds = collections.split(',');
    }
    try {
        const response = yield axios_1.default.post(`https://firestore.googleapis.com/v1beta1/projects/${GOOGLE_CLOUD_PROJECT}/databases/(default):exportDocuments`, body, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log(`Started backup to ${path}`);
        return res
            .status(200)
            .send(response.data)
            .end();
    }
    catch (e) {
        if (e.response) {
            console.error(e.response.data);
        }
        return res
            .status(500)
            .send(`Could not start backup: ${e}`)
            .end();
    }
}));
app.get('/', (_req, res) => {
    res
        .status(200)
        .send('[scheduled-backups]: Hello, world!')
        .end();
});
const PORT = process.env.PORT || 6060;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
//# sourceMappingURL=app.js.map