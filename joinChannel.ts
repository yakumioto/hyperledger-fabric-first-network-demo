import * as Client from "fabric-client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as Config from "./config.json";

async function joinChannel(): Promise<Client.ProposalResponse[]> {
    const config = Config.network;

    Client.setConfigSetting("request-timeout", 60000);

    const client = new Client();
    const channel = client.newChannel("testchannel");

    const tlsSuite = Client.newCryptoSuite();
    const tlsSuitePath = path.join(os.tmpdir(), "hfc", "hfc-test-kvs");
    tlsSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: tlsSuitePath}));
    client.setCryptoSuite(tlsSuite);

    const storePath = path.join(os.tmpdir(), "hfc", "hfc-test-kvs");
    const store = await Client.newDefaultKeyValueStore({path: storePath});
    client.setStateStore(store);

    client.setTlsClientCertAndKey(
        fs.readFileSync(path.join(__dirname, config.org1.user.admin.tls_cacerts), {encoding: "utf8"}),
        fs.readFileSync(path.join(__dirname, config.org1.user.admin.tls_key), {encoding: "utf8"}));

    let signedCretPEMPath = path.join(__dirname, config.orderer.user.admin.msp_signcerts);
    let keyName = fs.readdirSync(path.join(__dirname, config.orderer.user.admin.msp_keystore), {encoding: "utf8"})[0];
    let privateKeyPEMPath = path.join(__dirname, config.orderer.user.admin.msp_keystore, keyName);
    await client.createUser({
        username: config.orderer.name,
        mspid: config.orderer.mspid,
        cryptoContent: {
            signedCertPEM: fs.readFileSync(signedCretPEMPath, {encoding: "utf8"}),
            privateKeyPEM: fs.readFileSync(privateKeyPEMPath, {encoding: "utf8"}),
        },
        skipPersistence: false,
    });

    channel.addOrderer(client.newOrderer(config.orderer.url, {
        "pem": fs.readFileSync(path.join(__dirname, config.orderer.tls_cacerts), {encoding: "utf8"}),
        "ssl-target-name-override": config.orderer["server-hostname"],
    }));

    const block = await channel.getGenesisBlock({
        txId: client.newTransactionID(),
    });

    // Org1 加入 channel
    signedCretPEMPath = path.join(__dirname, config.org1.user.admin.msp_signcerts);
    keyName = fs.readdirSync(path.join(__dirname, config.org1.user.admin.msp_keystore), {encoding: "utf8"})[0];
    privateKeyPEMPath = path.join(__dirname, config.org1.user.admin.msp_keystore, keyName);
    await client.createUser({
        username: config.org1.name,
        mspid: config.org1.mspid,
        cryptoContent: {
            signedCertPEM: fs.readFileSync(signedCretPEMPath, {encoding: "utf8"}),
            privateKeyPEM: fs.readFileSync(privateKeyPEMPath, {encoding: "utf8"}),
        },
        skipPersistence: false,
    });

    let targets: Client.Peer[] = [
        client.newPeer(config.org1.peer1.requests, {
            "pem": fs.readFileSync(path.join(__dirname, config.org1.peer1.tls_cacerts), {encoding: "utf8"}),
            "ssl-target-name-override": config.org1.peer1["server-hostname"],
        }),
        client.newPeer(config.org1.peer2.requests, {
           "pem": fs.readFileSync(path.join(__dirname, config.org1.peer2.tls_cacerts), {encoding: "utf8"}),
           "ssl-target-name-override": config.org1.peer2["server-hostname"],
        }),
    ];

    await channel.joinChannel({
        targets,
        block,
        txId: client.newTransactionID(),
    }, 30000);

    // Org2
    signedCretPEMPath = path.join(__dirname, config.org2.user.admin.msp_signcerts);
    keyName = fs.readdirSync(path.join(__dirname, config.org2.user.admin.msp_keystore), {encoding: "utf8"})[0];
    privateKeyPEMPath = path.join(__dirname, config.org2.user.admin.msp_keystore, keyName);
    await client.createUser({
        username: config.org2.name,
        mspid: config.org2.mspid,
        cryptoContent: {
            signedCertPEM: fs.readFileSync(signedCretPEMPath, {encoding: "utf8"}),
            privateKeyPEM: fs.readFileSync(privateKeyPEMPath, {encoding: "utf8"}),
        },
        skipPersistence: false,
    });

    targets = [
        client.newPeer(config.org2.peer1.requests, {
            "pem": fs.readFileSync(path.join(__dirname, config.org2.peer1.tls_cacerts), {encoding: "utf8"}),
            "ssl-target-name-override": config.org2.peer1["server-hostname"],
        }),
        client.newPeer(config.org2.peer2.requests, {
            "pem": fs.readFileSync(path.join(__dirname, config.org2.peer2.tls_cacerts), {encoding: "utf8"}),
            "ssl-target-name-override": config.org2.peer2["server-hostname"],
        }),
    ];

    return channel.joinChannel({
        targets,
        block,
        txId: client.newTransactionID(),
    }, 30000);
}

joinChannel().then((payloads) => {
    console.log(payloads.toString());
}, (err) => {
    console.log("joinChannel error: ", err);
});
