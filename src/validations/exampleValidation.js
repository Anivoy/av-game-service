import { z } from 'zod';

const exampleSchema = z.object({
  exampleField: z.string().min(1, 'Example field is required')
});

export {
  exampleSchema
}