const net = require('net');
const fs = require('fs');
const mysql = require('mysql2/promise');
const xml2js = require('xml2js');

// Connexion à MySQL
async function connectDB() {
    return await mysql.createConnection({
        host: '10.10.50.122',
        user: 'user_reporting',
        password: 'voxtron',
        database: 'reporting'
    });
}

// Insertion des données CDR et EVENTS
async function insertDataFromXml(xmlContent) {
    try {
        const connection = await connectDB();
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xmlContent);

        const cdr = result.cdr;
        if (!cdr) {
            console.error("❌ Aucun élément <cdr> trouvé dans le XML.");
            return;
        }

        const {
            id, guid, seq, sys, pbx, node, device,
            cn, e164, h323, call, dir, utc, local, reporting
        } = cdr.$;

        await connection.execute(
            `INSERT INTO CDR (
                id, guid, seq, sys, pbx, node, device,
                cn, e164, h323, call_id, direction, utc, local_time, reporting
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, guid, seq, sys, pbx, node, device,
                cn, e164, h323, call, dir, utc, local, reporting
            ]
        );

        console.log("✅ CDR inséré.");

        const events = cdr.event;
        if (events) {
            const eventsArray = Array.isArray(events) ? events : [events];

            for (const ev of eventsArray) {
                const {
                    msg = '', time = '', e164 = '', dn = '', root = '',
                    h323 = '', conf = '', call: calls = '', cause = ''
                } = ev.$;

                await connection.execute(
                    `INSERT INTO events (
                        cdr_id, msg, \`time\`, e164, dn, root, h323, conf, \`calls\`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, msg, time, e164, dn, root, h323, conf, calls]
                );
                
                
                console.log(`✅ Event inséré : ${msg}`);
            }
        } else {
            console.log("⚠️ Aucun <event> trouvé dans le <cdr>.");
        }

        await connection.end();
    } catch (error) {
        console.error("❌ Erreur MySQL :", error.message);
    }
}

// Échappement XML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// Serveur TCP
const IP_ADDRESS = '10.10.50.106';
const PORT = 8001;

const server = net.createServer((socket) => {
    console.log("📞 Client connecté");

    let receivedData = '';

    socket.on('data', (data) => {
        const chunk = data.toString();
        console.log("📥 Données reçues :", chunk);
        receivedData += chunk;
    });

    socket.on('end', async () => {
        console.log("📴 Client déconnecté");

        const bodyStartIndex = receivedData.indexOf('\r\n\r\n');
        let xmlContent = receivedData;
        if (bodyStartIndex !== -1) {
            xmlContent = receivedData.slice(bodyStartIndex + 4).trim();
        }

        console.log("🧪 XML extrait :", xmlContent);
        await insertDataFromXml(xmlContent);

        const newCall = `
<Call>
    <Data>${escapeXml(xmlContent)}</Data>
</Call>`;

        fs.readFile('appel.xml', 'utf8', (err, data) => {
            let xmlData = '';
            if (err || !data || !data.includes('</Calls>')) {
                xmlData = `<?xml version="1.0" encoding="UTF-8"?>\n<Calls>${newCall}\n</Calls>`;
            } else {
                const insertIndex = data.lastIndexOf('</Calls>');
                xmlData = data.slice(0, insertIndex) + newCall + '\n' + data.slice(insertIndex);
            }

            fs.writeFile('appel.xml', xmlData, (err) => {
                if (err) {
                    console.log("❌ Erreur écriture appel.xml :", err);
                } else {
                    console.log("✅ Données sauvegardées dans appel.xml");
                }
            });
        });
    });

    socket.on('error', (err) => {
        console.log("❌ Erreur socket :", err.message);
    });
});

server.listen(PORT, IP_ADDRESS, () => {
    console.log(`🚀 Serveur TCP en écoute sur ${IP_ADDRESS}:${PORT}...`);
});

