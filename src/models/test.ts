import { HydratedDocumentFromSchema, InferSchemaType, Schema } from "mongoose";


export const TestSchema = new Schema(
    {
        name: {type: String, default: ''},
        cars: {type: [{_id: false, name: String, speed: Number}], default: []}
    },
    { timestamps: true }
);
export interface ITest extends HydratedDocumentFromSchema<typeof TestSchema> {}
 