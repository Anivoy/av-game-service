import { exampleSchema } from "../validations/exampleValidation.js";

export async function exampleController(req, res) {
  const { exampleField } = exampleSchema.parse(req.body);

  return res.status(200).json({ 
    ok: true, 
    data: { exampleField }, 
    message: "Example controller!" });
};
