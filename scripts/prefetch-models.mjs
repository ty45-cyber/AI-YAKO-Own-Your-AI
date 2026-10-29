#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

async function prefetchModels() {
  console.log('==============================================================');
  console.log(' AI YAKO STUDIO | QVAC Offline Model Prefetch & Verification ');
  console.log('==============================================================');

  const cacheDir = path.resolve(process.cwd(), '.qvac-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  try {
    const qvac = await import('@qvac/sdk');
    const {
      loadModel,
      unloadModel,
      getSystemResources,
      LLAMA_3_2_1B_INST_Q4_0,
      EMBEDDINGGEMMA_300M_Q4_0,
    } = qvac;

    console.log('\n[1/3] Inspecting local hardware via @qvac/sdk getSystemResources...');
    const resources = await getSystemResources({ sample: true });
    console.log('▸ Detected System Capabilities:', JSON.stringify(resources?.capabilities ?? {}, null, 2));

    console.log('\n[2/3] Prefetching Embedding Model (EMBEDDINGGEMMA_300M_Q4_0)...');
    const embedModelId = await loadModel({
      modelSrc: EMBEDDINGGEMMA_300M_Q4_0,
      modelType: 'embeddings',
      onProgress: (p) => {
        const pct = typeof p.percentage === 'number' ? p.percentage.toFixed(1) : '100.0';
        process.stdout.write(`\r▸ Downloading Embedding GGUF: ${pct}%`);
      },
    });
    console.log(`\n✓ Embedding model cached and verified (modelId: ${embedModelId})`);
    await unloadModel({ modelId: embedModelId });

    console.log('\n[3/3] Prefetching Sovereign LLM (LLAMA_3_2_1B_INST_Q4_0)...');
    const llmModelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      onProgress: (p) => {
        const pct = typeof p.percentage === 'number' ? p.percentage.toFixed(1) : '100.0';
        process.stdout.write(`\r▸ Downloading LLM GGUF: ${pct}%`);
      },
    });
    console.log(`\n✓ LLM cached and verified (modelId: ${llmModelId})`);
    await unloadModel({ modelId: llmModelId });

    console.log('\n==============================================================');
    console.log(' READY FOR AIRPLANE MODE: All QVAC models are cached on disk! ');
    console.log('==============================================================');
  } catch (err) {
    console.warn(
      '\n[Notice] Native @qvac/sdk Bare worker could not initialize in this shell:',
      err instanceof Error ? err.message : String(err)
    );
    console.warn(
      'Ensure `@qvac/sdk` is installed on a supported host (macOS/Linux/Windows) before offline demo.'
    );
  }
}

prefetchModels();