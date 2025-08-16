import prisma from "./../database"
import { PoolType } from "../types/poolType"

function model() {

    

    return {

        query: prisma.pools,

        find: async(input: any) => {

            const data = await prisma.pools.findFirst({

                where: {
                    OR: [
                        { id: input }, 
                        { name:{ contains: String(input) } }, 
                        { token:{ contains: String(input) } }, 
                    ],
                },
                include: { users: true },

            })

            return data

        },

        get: async(input?: string) => {

            const data = await prisma.pools.findMany({

                where: {
                    OR: [
                        { name:{ contains: input } }, 
                        { token:{ contains: input } }, 
                    ],
                },
                include: { users: true },
                orderBy: { id: 'desc'}

            }) || []

            return data

        },

        upsert: async(item: PoolType) => {

            const { users, ...rest } = item

            const data = await prisma.pools.upsert({
                where: {
                    id: item.id || ''
                },
                update: rest,
                create: rest,
                include: { users: true }
            })

            return data
            
        },

        delete: async(id: string) => {

            const data = await prisma.pools.delete({

                where: {
                    id: id
                },

            })

            return data

        },

        paginated: async(index: number, limit: number, input: any = null, startDate: any = '', endDate: any = '') => {

            const data = await prisma.pools.findMany({

                where: {
                    OR: [
                        { name:{ contains: input } }, 
                        { token:{ contains: input } }, 
                    ],
                    createdAt: {
                        gte: startDate !== '' ? new Date(startDate)  : undefined,
                        lte: endDate !== '' ? new Date(endDate) : undefined,
                    },
                },
                skip: index,
                take: limit,
                include: { users: true },
                orderBy: { id: 'desc'}

            }) || []

            const total = await prisma.pools.count({
                where: {
                    OR: [
                        { name:{ contains: input } }, 
                        { token:{ contains: input } }, 
                    ],
                    createdAt: {
                        gte: startDate !== '' ? new Date(startDate)  : undefined,
                        lte: endDate !== '' ? new Date(endDate) : undefined,
                    },
                },
            }) || 0

            return { data, total }

        }

    }

}

export const PoolModel = model();