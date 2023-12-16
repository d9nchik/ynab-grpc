import * as grpc from '@grpc/grpc-js';
import {YnabAPIService} from './generated/contract';
import {promisify} from "util";
import {YnabAPIServ} from './src/server';


const serverBindAsync = promisify(grpc.Server.prototype.bindAsync);

(async function main() {
    const server = new grpc.Server();
    const ynabServer = new YnabAPIServ();
    server.addService(YnabAPIService, ynabServer);
    await serverBindAsync.bind(server)('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
    server.start();
})();

