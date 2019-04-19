"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var Client = require("fabric-client");
var fs = require("fs");
var os = require("os");
var path = require("path");
var Config = require("./config.json");
function updateAnchorPeers() {
    return __awaiter(this, void 0, void 0, function () {
        var config, client, channel, tlsSuite, tlsSuitePath, storePath, store, signedCretPEMPath, keyName, privateKeyPEMPath, event, channelConfig, configTx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = Config.network;
                    Client.setConfigSetting("request-timeout", 60000);
                    client = new Client();
                    channel = client.newChannel("testchannel");
                    tlsSuite = Client.newCryptoSuite();
                    tlsSuitePath = path.join(os.tmpdir(), "hfc", "hfc-test-kvs");
                    tlsSuite.setCryptoKeyStore(Client.newCryptoKeyStore({ path: tlsSuitePath }));
                    client.setCryptoSuite(tlsSuite);
                    storePath = path.join(os.tmpdir(), "hfc", "hfc-test-kvs");
                    return [4 /*yield*/, Client.newDefaultKeyValueStore({ path: storePath })];
                case 1:
                    store = _a.sent();
                    client.setStateStore(store);
                    client.setTlsClientCertAndKey(fs.readFileSync(path.join(__dirname, config.org1.user.admin.tls_cacerts), { encoding: "utf8" }), fs.readFileSync(path.join(__dirname, config.org1.user.admin.tls_key), { encoding: "utf8" }));
                    signedCretPEMPath = path.join(__dirname, config.org1.user.admin.msp_signcerts);
                    keyName = fs.readdirSync(path.join(__dirname, config.org1.user.admin.msp_keystore), { encoding: "utf8" })[0];
                    privateKeyPEMPath = path.join(__dirname, config.org1.user.admin.msp_keystore, keyName);
                    return [4 /*yield*/, client.createUser({
                            username: config.org1.name,
                            mspid: config.org1.mspid,
                            cryptoContent: {
                                signedCertPEM: fs.readFileSync(signedCretPEMPath, { encoding: "utf8" }),
                                privateKeyPEM: fs.readFileSync(privateKeyPEMPath, { encoding: "utf8" })
                            },
                            skipPersistence: false
                        })];
                case 2:
                    _a.sent();
                    channel.addPeer(client.newPeer(config.org1.peer1.requests, {
                        "pem": fs.readFileSync(path.join(__dirname, config.org1.peer1.tls_cacerts), { encoding: "utf8" }),
                        "ssl-target-name-override": config.org1.peer1["server-hostname"]
                    }), config.org1.mspid);
                    event = channel.newChannelEventHub(channel.getPeers()[0].getPeer());
                    event.connect(true);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var blockRegistrationNumber = event.registerBlockEvent(function (block) {
                                if (block.data.data.length !== 1) {
                                    console.log("config block must only contain one transaction");
                                    return;
                                }
                                var envelope = block.data.data[0];
                                var channelHeader = envelope.payload.header.channel_header;
                                console.log(JSON.stringify(channelHeader));
                                resolve("test");
                            }, function (err) {
                                console.log("eventHub error:", err);
                                event.unregisterBlockEvent(blockRegistrationNumber, true);
                                event.disconnect();
                                reject("error");
                            });
                        })];
                case 3:
                    _a.sent();
                    channelConfig = "channel-artifacts/Org1MSPanchors_testchannel.tx";
                    configTx = client.extractChannelConfig(fs.readFileSync(path.join(__dirname, channelConfig)));
                    return [2 /*return*/, client.updateChannel({
                            config: configTx,
                            signatures: [client.signChannelConfig(configTx)],
                            name: channel.getName(),
                            orderer: client.newOrderer(config.orderer.url, {
                                "pem": fs.readFileSync(path.join(__dirname, config.orderer.tls_cacerts), { encoding: "utf8" }),
                                "ssl-target-name-override": config.orderer["server-hostname"]
                            }),
                            txId: client.newTransactionID()
                        })];
            }
        });
    });
}
updateAnchorPeers().then(function (payloads) {
    console.log(payloads.status);
}, function (err) {
    console.log("update anchor peer error: ", err);
});
