import { TuConfig } from "@cmn/models";
import { taskManager } from "@cmn/utils/consts3";
import { addBooksTask } from "@cmn/utils/funcs4";
import { error, json } from "@sveltejs/kit";

export const GET = async()=>{
    const config = await TuConfig.findOne({}).exec();
    return json(config?.toJSON())
}

export const POST = async({request: req}) =>{
    try {
        const body = await req.json();
        const config = await TuConfig.findOne({}).exec();
        const oldInterval = config?.book_fetch_interval;

        const booksTask = taskManager.tasks.find(el=> el.id == 'task-books')
        if (oldInterval != body.book_fetch_interval) {
            console.log("CANCELLING OLD BOOK JOBS");
            taskManager.rmTask(booksTask?.id)
        }

        for (let k of Object.keys(body)) {
            const v = body[k];
            config?.set(k, v);
        }
        await config?.save();
        if (config?.fetch_orderbook_enabled) {
            console.log("RESCHEDULING BOOK JOBS");
            addBooksTask(config)
        } else {
            console.log("CANCELLING BOOK JOBS");
            taskManager.rmTask('task-books')
        }
        return json(config?.toJSON());
    } catch (e) {
        console.log(e);
        return error(500, { message: "Something went wrong!" });
    }
}