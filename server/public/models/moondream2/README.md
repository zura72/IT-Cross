---
base_model: vikhyatk/moondream2
library_name: transformers.js
license: apache-2.0
pipeline_tag: image-text-to-text
---

https://huggingface.co/vikhyatk/moondream2 with ONNX weights to be compatible with Transformers.js.


## Usage (Transformers.js)

If you haven't already, you can install the [Transformers.js](https://huggingface.co/docs/transformers.js) JavaScript library from [NPM](https://www.npmjs.com/package/@huggingface/transformers) using:
```bash
npm install @huggingface/transformers
```

**Example:**
```js
import { AutoProcessor, AutoTokenizer, Moondream1ForConditionalGeneration, RawImage } from '@huggingface/transformers';

// Load processor, tokenizer and model
const model_id = 'Xenova/moondream2';
const processor = await AutoProcessor.from_pretrained(model_id);
const tokenizer = await AutoTokenizer.from_pretrained(model_id);
const model = await Moondream1ForConditionalGeneration.from_pretrained(model_id, {
    dtype: {
        embed_tokens: 'fp16', // or 'fp32'
        vision_encoder: 'fp16', // or 'q8'
        decoder_model_merged: 'q4', // or 'q4f16' or 'q8'
    },
    device: 'webgpu',
});

// Prepare text inputs
const prompt = 'Describe this image.';
const text = `<image>\n\nQuestion: ${prompt}\n\nAnswer:`;
const text_inputs = tokenizer(text);

// Prepare vision inputs
const url = 'https://huggingface.co/vikhyatk/moondream1/resolve/main/assets/demo-1.jpg';
const image = await RawImage.fromURL(url);
const vision_inputs = await processor(image);

// Generate response
const output = await model.generate({
    ...text_inputs,
    ...vision_inputs,
    do_sample: false,
    max_new_tokens: 64,
});
const decoded = tokenizer.batch_decode(output, { skip_special_tokens: false });
console.log(decoded);
// [
//     '<|endoftext|><image>\n\n' +
//     'Question: Describe this image.\n\n' +
//     'Answer: A hand is holding a white book titled "The Little Book of Deep Learning" against a backdrop of a balcony with a railing and a view of a building and trees.<|endoftext|>'
// ]
```

We also released an online demo, which you can try yourself: https://huggingface.co/spaces/Xenova/experimental-moondream-webgpu

<video controls autoplay src="https://cdn-uploads.huggingface.co/production/uploads/61b253b7ac5ecaae3d1efe0c/9q6LTQIYiI3qKrKfAb4D8.mp4"></video>

---

Note: Having a separate repo for ONNX weights is intended to be a temporary solution until WebML gains more traction. If you would like to make your models web-ready, we recommend converting to ONNX using [🤗 Optimum](https://huggingface.co/docs/optimum/index) and structuring your repo like this one (with ONNX weights located in a subfolder named `onnx`).