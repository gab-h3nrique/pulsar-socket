"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const prisma_1 = __importDefault(require("../database/prisma"));
function model() {
    return {
        query: prisma_1.default.users,
        create: async (user) => {
            const result = await prisma_1.default.users.create({ data: user });
            return result;
        }
    };
}
exports.UserModel = model();
