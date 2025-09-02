import { GPT2LMHeadModel, GPT2Tokenizer } from 'transformers';

// Inisialisasi model GPT2
const model = GPT2LMHeadModel.from_pretrained('distil-gpt2');
const tokenizer = GPT2Tokenizer.from_pretrained('distil-gpt2');

// Fungsi untuk menghasilkan respons dari model GPT-2
export async function generateResponse(inputText) {
  const inputs = tokenizer.encode(inputText, { add_special_tokens: false });
  const outputs = await model.generate(inputs, { max_length: 50, num_return_sequences: 1 });
  const response = tokenizer.decode(outputs[0], { skip_special_tokens: true });
  return response;
}
