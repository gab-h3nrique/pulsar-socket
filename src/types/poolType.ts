import { UserType } from "./userType";

export interface PoolType {

    id?: string,

    name: string,
    token: string,

    users?: UserType[],

    updatedAt?: string,
    createdAt?: string,
}

export const EMPTY_POOL = {

    id: undefined,


    name: '',
    token: '',

    users: [],

    updatedAt: undefined,
    createdAt: undefined,

}