"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
const prisma = global.prisma || new prisma_1.PrismaClient();
if (process.env.NODE_ENV === "development")
    global.prisma = prisma;
exports.default = prisma;
// import { PrismaClient } from './generated/prisma'
// const prisma = new PrismaClient()
// async function main() {
// }
// main()
// .then(async () => await prisma.$disconnect())
// .catch(async (e) => {
//         console.error(e)
//         await prisma.$disconnect()
//         process.exit(1)
// })
// import { PrismaClient } from './generated/prisma'
// const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
// const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] })
// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
// export default prisma
