"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolModel = void 0;
const prisma_1 = __importDefault(require("../database/prisma"));
function model() {
    return {
        query: prisma_1.default.pools,
        find: async (input) => {
            const data = await prisma_1.default.pools.findFirst({
                where: {
                    OR: [
                        { id: input },
                        { name: { contains: String(input) } },
                        { token: { contains: String(input) } },
                    ],
                },
                include: { users: true },
            });
            return data;
        },
        get: async (input) => {
            const data = await prisma_1.default.pools.findMany({
                where: {
                    OR: [
                        { name: { contains: input } },
                        { token: { contains: input } },
                    ],
                },
                include: { users: true },
                orderBy: { id: 'desc' }
            }) || [];
            return data;
        },
        upsert: async (item) => {
            const { users, ...rest } = item;
            const data = await prisma_1.default.pools.upsert({
                where: {
                    id: item.id || ''
                },
                update: rest,
                create: rest,
                include: { users: true }
            });
            return data;
        },
        delete: async (id) => {
            const data = await prisma_1.default.pools.delete({
                where: {
                    id: id
                },
            });
            return data;
        },
        paginated: async (index, limit, input = null, startDate = '', endDate = '') => {
            const data = await prisma_1.default.pools.findMany({
                where: {
                    OR: [
                        { name: { contains: input } },
                        { token: { contains: input } },
                    ],
                    createdAt: {
                        gte: startDate !== '' ? new Date(startDate) : undefined,
                        lte: endDate !== '' ? new Date(endDate) : undefined,
                    },
                },
                skip: index,
                take: limit,
                include: { users: true },
                orderBy: { id: 'desc' }
            }) || [];
            const total = await prisma_1.default.pools.count({
                where: {
                    OR: [
                        { name: { contains: input } },
                        { token: { contains: input } },
                    ],
                    createdAt: {
                        gte: startDate !== '' ? new Date(startDate) : undefined,
                        lte: endDate !== '' ? new Date(endDate) : undefined,
                    },
                },
            }) || 0;
            return { data, total };
        }
    };
}
exports.PoolModel = model();
