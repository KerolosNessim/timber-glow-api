import { Schema, model, type ClientSession } from 'mongoose'

const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } })

export const Counter = model('Counter', CounterSchema)

/** Atomic sequence (1, 2, 3…), safe when several serverless instances create orders at once. */
export async function nextSequence(name: string, session?: ClientSession) {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true, session })
  return doc.seq
}

/** Order numbers start at TG-1001 so the first customers don't see "order #1". */
export const ORDER_NUMBER_OFFSET = 1000
