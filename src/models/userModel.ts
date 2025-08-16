
import prisma from "./../database"
import { UserType } from "../types/userType"

function model() {

    

    return {

        query: prisma.users,

        create: async(user: UserType) => {

            const result = await prisma.users.create({ data: user })

            return result

        }

    }

}

export const UserModel = model();