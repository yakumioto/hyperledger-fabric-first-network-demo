import * as Client from "fabric-client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as Config from "./config.json";

async function queryChaincode(): Promise<Buffer[]> {
    const config = Config.network;

    Client.setConfigSetting("request-timeout", 60000);

    const client = new Client();
    const channel = client.newChannel("mychannel");

    const tlsSuite = Client.newCryptoSuite();
    const tlsSuitePath = path.join(os.tmpdir(), "hfc", "hfc-test-kvs");
    tlsSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: tlsSuitePath}));
    client.setCryptoSuite(tlsSuite);

    const storePath = path.join(os.tmpdir(), "hfc", "hfc-test-kvs");
    const store = await Client.newDefaultKeyValueStore({path: storePath});
    client.setStateStore(store);

    client.setTlsClientCertAndKey(
        fs.readFileSync(path.join(__dirname, config.org2.user.admin.tls_cacerts), {encoding: "utf8"}),
        fs.readFileSync(path.join(__dirname, config.org2.user.admin.tls_key), {encoding: "utf8"}));

    const signedCretPEMPath = path.join(__dirname, config.org2.user.admin.msp_signcerts);
    const keyName = fs.readdirSync(path.join(__dirname, config.org2.user.admin.msp_keystore), {encoding: "utf8"})[0];
    const privateKeyPEMPath = path.join(__dirname, config.org2.user.admin.msp_keystore, keyName);
    await client.createUser({
        username: config.org2.name,
        mspid: config.org2.mspid,
        cryptoContent: {
            signedCertPEM: fs.readFileSync(signedCretPEMPath, {encoding: "utf8"}),
            privateKeyPEM: fs.readFileSync(privateKeyPEMPath, {encoding: "utf8"}),
        },
        skipPersistence: false,
    });

    const peer = client.newPeer(config.org2.peer1.requests, {
        "pem": fs.readFileSync(path.join(__dirname, config.org2.peer1.tls_cacerts), {encoding: "utf8"}),
        "ssl-target-name-override": config.org2.peer1["server-hostname"],
    });
    channel.addPeer(peer, config.org2.mspid);

    return await channel.queryByChaincode({
        chaincodeId: "mycc",
        fcn: "query",
        args: ["a"],
    });
}

queryChaincode().then((payloads) => {
    console.log(payloads.toString());
}, (err) => {
    console.log(err);
});
