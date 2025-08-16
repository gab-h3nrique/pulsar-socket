"use strict";
// 200 OK
// 201 Created
// 202 Accepted
// 203 Non-Authoritative Information
// 204 No Content
// 205 Reset Content
// 206 Partial Content
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const poolModel_1 = require("../models/poolModel");
const auth_1 = __importDefault(require("../socket/auth"));
const SECRET = String(process.env.SECRET);
// 400 Bad Request
// 401 Unauthorized
// 402 Payment Required
// 403 Forbidden
// 405 Method Not Allowed
// 406 Not Acceptable
// 429 Too Many Requests
// 500 Internal Server Error
// 501 Not Implemented
// 502 Bad Gateway
// 503 Service Unavailable
function factory() {
    return {
        get: async (req, res) => {
            const { query } = req;
            const id = query.id ? String(query.id) : null;
            const input = query.input ? String(query.input) : '';
            const startDate = query.startDate ? String(query.startDate) : '';
            const endDate = query.endDate ? String(query.endDate) : '';
            const page = query.page ? Number(query.page) : null;
            const limit = query.limit ? Number(query.limit) : null;
            if (id)
                return res.status(200).json({ success: true, data: await poolModel_1.PoolModel.find(id), message: '' });
            if (!page || !limit)
                return res.status(200).json({ success: true, data: await poolModel_1.PoolModel.get(input), message: '' });
            const index = (Number(page) - 1) * Number(limit);
            const { data, total } = await poolModel_1.PoolModel.paginated(index, Number(limit), (input || ''), startDate, endDate);
            return res.status(200).json({ success: true, data, total, message: '' });
        },
        post: async (req, res) => {
            const { body } = req;
            const item = {
                id: body.id ? String(body.id) : undefined,
                name: body.name ? String(body.name) : '',
                token: body.url ? String(body.token) : '',
            };
            if (!item.name)
                return res.status(400).json({ success: false, data: null, message: 'Name is required.' });
            if (item.id && !item.token)
                return res.status(400).json({ success: false, data: null, message: 'Token is required.' });
            let data = await poolModel_1.PoolModel.upsert(item);
            if (!data.token)
                data.token = auth_1.default.generateToken(data.id, data.name);
            if (!item.id)
                data = await poolModel_1.PoolModel.upsert(data);
            return res.status(200).json({ success: true, data: data, message: '', });
        },
        delete: async (req, res) => {
            const { query } = req;
            const id = query.id ? String(query.id) : undefined;
            if (!id)
                return res.status(400).json({ success: false, data: null, message: 'ID is required' });
            const data = await poolModel_1.PoolModel.find(id);
            if (!data)
                return res.status(404).json({ success: false, data: null, message: 'Data not found' });
            await poolModel_1.PoolModel.delete(data.id);
            return res.status(200).json({ success: true, data: null, message: 'Data deleted successfully' });
        },
    };
}
const poolController = factory();
exports.default = poolController;
