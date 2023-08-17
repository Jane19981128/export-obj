const fs = require('fs-extra');
const path = require('path');
const { outputPath } = require('./src/constant');
const { exportModle, exportNoImageModle } = require('./src/child_process');

const input = process.argv.at(-2);
const basename = path.basename(input);

(async () => {
    const gltf = await fs.readFile(input, { encoding: 'utf-8' });

    const json = JSON.parse(gltf);
    json.nodes.forEach(element => {
        if (element.matrix) {
            element.matrix = element.matrix.map(i => Number(i));
        }
    });

    const outputGLTFPath = outputPath + basename;
    if (await fs.ensureFile(outputGLTFPath))
        await fs.unlink(outputGLTFPath);
    await fs.writeFile(outputGLTFPath, JSON.stringify(json, null, 2));

    const flag = process.argv.at(-3);
    if (flag === 'no-image') {
        await exportNoImageModle();
    }
    await exportModle();

    process.exit(1);
})();
