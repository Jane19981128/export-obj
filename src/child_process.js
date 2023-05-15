const cp = require('child_process');
const path = require('path');
const fs = require('fs-extra');
var readline = require('readline');

const input = process.argv.at(-2);
const output = process.argv.at(-1);
const outputDir = path.dirname(output);

async function exportModle() {
    await fs.remove(outputDir);
    await fs.ensureDir(outputDir);

    const cmd = `export ${input} ${output}`;

    const client = cp.spawn('./assimp/assimp.exe', cmd.split(' '));

    client.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    client.stderr.on('data', (err) => {
        console.log('extract model error' + err.toString());
    });

    client.on('close', (res) => {
        console.log('extract model end');
        extractImage();
    })
}

function extractImage() {
    const cmd = `extract ${input} ${output}`;

    const clientImage = cp.spawn('./assimp/assimp.exe', cmd.split(' '));

    clientImage.stdout.on('data', (data) => {
        console.log(data.toString())
    });

    clientImage.stderr.on('data', (err) => {
        console.log('extract image error' + err.toString());
    });
    clientImage.on('close', (res) => {
        console.log('extract iamge end');
        convertMTL()
    })
}
//读取mtl文件进行改写
async function convertMTL() {
    const basename = path.basename(output, '.obj');
    const mtlPath = outputDir + '/' + basename + '.mtl';
    const newMtlPath = outputDir + '/' + basename + '_new.mtl';

    await fs.remove(newMtlPath);
    await fs.ensureFile(newMtlPath);

    const fRead = await fs.createReadStream(mtlPath);
    const fWrite = await fs.createWriteStream(newMtlPath);

    var readlineMTL = readline.createInterface({
        input: fRead,
        // 这是另一种复制方式，这样on('line')里就不必再调用fWrite.write(line)，当只是纯粹复制文件时推荐使用
        // output: fWrite,
        // terminal: false
    });

    const imageName = basename + '_img';
    readlineMTL.on('line', (line) => {
        if (line.includes('map_Kd')) {
            line = line.trim();
            const start = line.indexOf('*');
            const count = line.substring(start + 1);
            line = line.substring(0, start) + imageName + count + `.jpg`;
        };
        fWrite.write(line + `\n`);
    });

    readlineMTL.on('close', async () => {
        await fs.remove(mtlPath);
        await fs.rename(newMtlPath, mtlPath);
        console.log('readline close...');
        process.exit(1)
    })
}

module.exports = {
    exportModle
}