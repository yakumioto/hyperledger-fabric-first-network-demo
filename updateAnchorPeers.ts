import * as Client from "fabric-client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as Config from "./config.json";

async function updateAnchorPeers(): Promise<Client.BroadcastResponse> {
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

    const signedCretPEMPath = path.join(__dirname, config.org1.user.admin.msp_signcerts);
    const keyName = fs.readdirSync(path.join(__dirname, config.org1.user.admin.msp_keystore), {encoding: "utf8"})[0];
    const privateKeyPEMPath = path.join(__dirname, config.org1.user.admin.msp_keystore, keyName);
    await client.createUser({
        username: config.org1.name,
        mspid: config.org1.mspid,
        cryptoContent: {
            signedCertPEM: fs.readFileSync(signedCretPEMPath, {encoding: "utf8"}),
            privateKeyPEM: fs.readFileSync(privateKeyPEMPath, {encoding: "utf8"}),
        },
        skipPersistence: false,
    });

    channel.addPeer(client.newPeer(config.org1.peer1.requests, {
        "pem": fs.readFileSync(path.join(__dirname, config.org1.peer1.tls_cacerts), {encoding: "utf8"}),
        "ssl-target-name-override": config.org1.peer1["server-hostname"],
    }), config.org1.mspid);

    const event = channel.newChannelEventHub(channel.getPeers()[0].getPeer());
    event.connect(true);

    await new Promise<string>((resolve, reject) => {
        const blockRegistrationNumber = event.registerBlockEvent((block) => {
            if (block.data.data.length !== 1) {
                console.log("config block must only contain one transaction");
                return;
            }

            const envelope = block.data.data[0];
            const channelHeader = envelope.payload.header.channel_header;
            console.log(JSON.stringify(channelHeader));
            resolve("test");
        }, (err) => {
            console.log("eventHub error:", err);
            event.unregisterBlockEvent(blockRegistrationNumber, true);
            event.disconnect();
            reject("error");
        });
    });

    const channelConfig = "channel-artifacts/Org1MSPanchors_testchannel.tx";
    const configTx = client.extractChannelConfig(fs.readFileSync(path.join(__dirname, channelConfig)));
    return client.updateChannel({
        config: configTx,
        signatures: [client.signChannelConfig(configTx)],
        name: channel.getName(),
        orderer: client.newOrderer(config.orderer.url, {
            "pem": fs.readFileSync(path.join(__dirname, config.orderer.tls_cacerts), {encoding: "utf8"}),
            "ssl-target-name-override": config.orderer["server-hostname"],
        }),
        txId: client.newTransactionID(),
    });
}

updateAnchorPeers().then((payloads) => {
    console.log(payloads.status);
}, (err) => {
    console.log("update anchor peer error: ", err);
});
