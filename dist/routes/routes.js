"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = routes;
const handler_1 = __importDefault(require("../utils/handler"));
const failController_1 = __importDefault(require("./failController"));
const poolController_1 = __importDefault(require("./poolController"));
function routes(app) {
    app.get('/fail', handler_1.default.error(failController_1.default.get));
    app.post('/fail', handler_1.default.error(failController_1.default.post));
    app.delete('/fail', handler_1.default.error(failController_1.default.delete));
    app.get('/pool', handler_1.default.error(poolController_1.default.get));
    app.post('/pool', handler_1.default.error(poolController_1.default.post));
    app.delete('/pool', handler_1.default.error(poolController_1.default.delete));
}
