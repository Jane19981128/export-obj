const fs = require('fs-extra');
const path = require('path');
const { inputPath, outputPath} = require('./src/constant');
const { exportModle } = require('./src/child_process');

const inputGLTFPath = inputPath + 'house.gltf';
const basename = path.basename(inputGLTFPath, '.gltf');

(async () => {
    const gltf = await fs.readFile( inputGLTFPath, {encoding: 'utf-8'});

    const json = JSON.parse(gltf);
    
    json.nodes.forEach(element => {
        if (element.matrix) {
            element.matrix = element.matrix.map(i => Number(i)); 
          }
    });
    
    const outputGLTFPath = outputPath + basename + '.gltf';
    await fs.writeFile(outputGLTFPath, JSON.stringify(json, null, 2));
    
    exportModle();
    
})();
