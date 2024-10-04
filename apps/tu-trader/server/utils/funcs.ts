export const nuxtErr = (err: any,
    status: number = 500,
    msg: string = "Something went wrong"
) => {
    console.log(err)
    return createError({ status, message: msg });
};
