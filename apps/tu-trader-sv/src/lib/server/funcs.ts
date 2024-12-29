import { error } from "@sveltejs/kit";

export const tuErr = (status: number, msg: string) =>
    error(status, `tu:${msg}`);