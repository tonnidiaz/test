import { test_platforms } from '@cmn/utils/consts.js'
import { handleErrs } from '@cmn/utils/functions.js'
import { error, json } from '@sveltejs/kit'

export const GET = async ({url}) =>{
    try {
        const {plat: platname, offline} = Object.fromEntries(url.searchParams)
        const Plat = new test_platforms[platname as any]({demo: false, name: platname as any})
        const r = await Plat.getNets(undefined, offline == 'true')
        return json(r)
    } catch (e) {
        handleErrs(e)
       error(500, 'Something went wrong')
    }
}