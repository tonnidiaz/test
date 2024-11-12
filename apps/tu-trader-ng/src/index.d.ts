declare global {
    interface NodeRequire {
        /** A special feature supported by webpack's compiler that allows you to get all matching modules starting from some base directory.  */
        context: (
            directory: string,
            useSubdirectories: boolean,
            regExp: RegExp
        ) => any;
    }
}