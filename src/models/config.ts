import { Schema, HydratedDocumentFromSchema } from "mongoose";

export const TuConfigSchema = new Schema({
    name: {type: String, default: "Tu"},
    fetch_orderbook_enabled: {type: Boolean, default: true},
    book_fetch_interval: {type: Number, default: 5}
}, {timestamps: true})

export interface ITuConfig extends HydratedDocumentFromSchema<typeof TuConfigSchema> {}
  